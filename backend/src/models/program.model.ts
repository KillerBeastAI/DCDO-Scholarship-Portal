import { pool } from '../config/db.js';
import { ScholarshipProgram, ScholarshipProgramSummary } from '../types/domain.js';

export class ProgramModel {
  static async getAggregatedSummary(fiscalYear?: string): Promise<ScholarshipProgramSummary[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (fiscalYear && fiscalYear !== 'all') {
      conditions.push(`(qm.fiscal_year ILIKE $${idx} OR CONCAT('FY ', p.fiscal_year) ILIKE $${idx})`);
      values.push(`%${fiscalYear}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query<ScholarshipProgramSummary>(
      `SELECT 
        COALESCE(qm.fiscal_year, CONCAT('FY ', p.fiscal_year)) as fiscal_year,
        p.program_name,
        COALESCE(SUM(qm.total_slots), 0)::int as approved_slots,
        COALESCE(SUM(qm.total_approved_amount), 0)::float as amount,
        COALESCE(SUM(pa.enrolled_male + pa.enrolled_female), 0)::int as enrolled,
        COALESCE(SUM(pa.dropped_male + pa.dropped_female), 0)::int as dropouts,
        COALESCE(SUM(pa.graduated_completed_male + pa.graduated_completed_female), 0)::int as graduates,
        COALESCE(SUM(pa.assessed_male + pa.assessed_female), 0)::int as assessed,
        COALESCE(SUM(pa.employed_male + pa.employed_female), 0)::int as employed
       FROM scholarship_programs p
       JOIN qualification_maps qm ON qm.program_id = p.program_id
       LEFT JOIN physical_accomplishments pa ON pa.qm_id = qm.qm_id
       ${whereClause}
       GROUP BY COALESCE(qm.fiscal_year, CONCAT('FY ', p.fiscal_year)), p.program_name
       ORDER BY fiscal_year DESC, p.program_name ASC`,
      values,
    );
    return rows;
  }

  static async findAll(fiscalYear?: number): Promise<ScholarshipProgram[]> {
    if (fiscalYear) {
      const { rows } = await pool.query<ScholarshipProgram>(
        `SELECT program_id, program_code, program_name, fiscal_year, total_allocated, total_disbursed
         FROM scholarship_programs
         WHERE fiscal_year = $1
         ORDER BY fiscal_year DESC, program_code ASC`,
        [fiscalYear],
      );
      return rows;
    }
    const { rows } = await pool.query<ScholarshipProgram>(
      `SELECT program_id, program_code, program_name, fiscal_year, total_allocated, total_disbursed
       FROM scholarship_programs
       ORDER BY fiscal_year DESC, program_code ASC`,
    );
    return rows;
  }

  static async findById(id: string): Promise<ScholarshipProgram | null> {
    const { rows } = await pool.query<ScholarshipProgram>(
      `SELECT program_id, program_code, program_name, fiscal_year, total_allocated, total_disbursed
       FROM scholarship_programs
       WHERE program_id = $1`,
      [id],
    );
    return rows[0] || null;
  }

  static async findByCode(programCode: string): Promise<ScholarshipProgram | null> {
    const { rows } = await pool.query<ScholarshipProgram>(
      `SELECT program_id, program_code, program_name, fiscal_year, total_allocated, total_disbursed
       FROM scholarship_programs
       WHERE LOWER(program_code) = LOWER($1)`,
      [programCode],
    );
    return rows[0] || null;
  }

  static async create(data: {
    program_code: string;
    program_name: string;
    fiscal_year: number;
    total_allocated?: number;
    total_disbursed?: number;
  }): Promise<ScholarshipProgram> {
    const { rows } = await pool.query<ScholarshipProgram>(
      `INSERT INTO scholarship_programs (program_code, program_name, fiscal_year, total_allocated, total_disbursed)
       VALUES ($1, $2, $3, COALESCE($4, 0), COALESCE($5, 0))
       RETURNING program_id, program_code, program_name, fiscal_year, total_allocated, total_disbursed`,
      [data.program_code, data.program_name, data.fiscal_year, data.total_allocated ?? 0, data.total_disbursed ?? 0],
    );
    return rows[0];
  }

  static async update(
    id: string,
    data: Partial<Omit<ScholarshipProgram, 'program_id'>>,
  ): Promise<ScholarshipProgram | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const keys: (keyof Omit<ScholarshipProgram, 'program_id'>)[] = [
      'program_code',
      'program_name',
      'fiscal_year',
      'total_allocated',
      'total_disbursed',
    ];

    for (const key of keys) {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(data[key]);
      }
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const { rows } = await pool.query<ScholarshipProgram>(
      `UPDATE scholarship_programs
       SET ${fields.join(', ')}
       WHERE program_id = $${idx}
       RETURNING program_id, program_code, program_name, fiscal_year, total_allocated, total_disbursed`,
      values,
    );
    return rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      `DELETE FROM scholarship_programs WHERE program_id = $1`,
      [id],
    );
    return (rowCount ?? 0) > 0;
  }
}
