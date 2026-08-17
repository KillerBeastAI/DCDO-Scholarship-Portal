import { pool } from '../config/db.js';
import { QualificationMap, QMStatus } from '../types/domain.js';

export class QMModel {
  static async findAll(filters?: {
    program_id?: string;
    provider_id?: string;
    status?: QMStatus;
    fiscal_year?: string;
  }): Promise<QualificationMap[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (filters?.program_id) {
      conditions.push(`qm.program_id = $${idx++}`);
      values.push(filters.program_id);
    }
    if (filters?.provider_id) {
      conditions.push(`qm.provider_id = $${idx++}`);
      values.push(filters.provider_id);
    }
    if (filters?.status) {
      conditions.push(`qm.status = $${idx++}`);
      values.push(filters.status);
    }
    if (filters?.fiscal_year) {
      conditions.push(`qm.fiscal_year = $${idx++}`);
      values.push(filters.fiscal_year);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query<QualificationMap>(
      `SELECT qm.*, p.program_name, tp.institution_name
       FROM qualification_maps qm
       JOIN scholarship_programs p ON qm.program_id = p.program_id
       JOIN training_providers tp ON qm.provider_id = tp.provider_id
       ${whereClause}
       ORDER BY qm.created_at DESC`,
      values,
    );
    return rows;
  }

  static async findById(id: string): Promise<QualificationMap | null> {
    const { rows } = await pool.query<QualificationMap>(
      `SELECT qm.*, p.program_name, tp.institution_name
       FROM qualification_maps qm
       JOIN scholarship_programs p ON qm.program_id = p.program_id
       JOIN training_providers tp ON qm.provider_id = tp.provider_id
       WHERE qm.qm_id = $1`,
      [id],
    );
    return rows[0] || null;
  }

  static async create(data: {
    program_id: string;
    provider_id: string;
    rqm_code?: string | null;
    nqm_code?: string | null;
    pqm_code?: string | null;
    appropriation?: string;
    fiscal_year?: string;
    allocation?: string;
    sector: string;
    tvet_qualification: string;
    qualification_level?: string;
    delivery_mode?: string;
    total_slots: number;
    training_cost_per_capita: number;
    support_fund_per_capita?: number;
    assessment_fee?: number;
    book_allowance?: number;
    new_normal_assistance?: number;
    annual_accident_insurance?: number;
    entrepreneurship_fee?: number;
    status?: QMStatus;
  }): Promise<QualificationMap> {
    const slots = Number(data.total_slots) || 0;
    const tc = Number(data.training_cost_per_capita) || 0;
    const tsf = Number(data.support_fund_per_capita) || 0;
    const book = Number(data.book_allowance) || 0;
    const newNormal = Number(data.new_normal_assistance) || 0;
    const insurance = Number(data.annual_accident_insurance) || 0;
    const entrep = Number(data.entrepreneurship_fee) || 0;

    const totalTc = slots * tc;
    const totalTsf = slots * tsf;
    const totalBook = slots * book;
    const totalNewNormal = slots * newNormal;
    const totalInsurance = slots * insurance;
    const totalEntrep = slots * entrep;
    const totalApproved = totalTc + totalTsf + totalBook + totalNewNormal + totalInsurance + totalEntrep;

    const { rows } = await pool.query<QualificationMap>(
      `INSERT INTO qualification_maps (
        program_id, provider_id, rqm_code, nqm_code, pqm_code,
        appropriation, fiscal_year, allocation,
        sector, tvet_qualification, qualification_level, delivery_mode,
        total_slots, training_cost_per_capita, support_fund_per_capita,
        assessment_fee, book_allowance, new_normal_assistance,
        annual_accident_insurance, entrepreneurship_fee,
        total_training_cost, total_support_fund, total_book_allowance,
        total_new_normal_assistance, total_annual_accident_insurance,
        total_entrepreneurship_fee, total_approved_amount, status
       ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, $15,
        $16, $17, $18,
        $19, $20,
        $21, $22, $23,
        $24, $25,
        $26, $27, COALESCE($28, 'approved')
       )
       RETURNING *`,
      [
        data.program_id,
        data.provider_id,
        data.rqm_code || null,
        data.nqm_code || null,
        data.pqm_code || null,
        data.appropriation || 'Current',
        data.fiscal_year || 'FY 2026',
        data.allocation || 'CO',
        data.sector,
        data.tvet_qualification,
        data.qualification_level || 'NC II',
        data.delivery_mode || 'Institution-Based',
        slots,
        tc,
        tsf,
        data.assessment_fee ?? 0,
        book,
        newNormal,
        insurance,
        entrep,
        totalTc,
        totalTsf,
        totalBook,
        totalNewNormal,
        totalInsurance,
        totalEntrep,
        totalApproved,
        data.status || 'approved',
      ],
    );
    return rows[0];
  }

  static async update(
    id: string,
    data: Partial<Omit<QualificationMap, 'qm_id' | 'created_at'>>,
  ): Promise<QualificationMap | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const slots = data.total_slots !== undefined ? Number(data.total_slots) : Number(existing.total_slots);
    const tc = data.training_cost_per_capita !== undefined ? Number(data.training_cost_per_capita) : Number(existing.training_cost_per_capita || 0);
    const tsf = data.support_fund_per_capita !== undefined ? Number(data.support_fund_per_capita) : Number(existing.support_fund_per_capita || 0);
    const book = data.book_allowance !== undefined ? Number(data.book_allowance) : Number(existing.book_allowance || 0);
    const newNormal = data.new_normal_assistance !== undefined ? Number(data.new_normal_assistance) : Number(existing.new_normal_assistance || 0);
    const insurance = data.annual_accident_insurance !== undefined ? Number(data.annual_accident_insurance) : Number(existing.annual_accident_insurance || 0);
    const entrep = data.entrepreneurship_fee !== undefined ? Number(data.entrepreneurship_fee) : Number(existing.entrepreneurship_fee || 0);

    const totalTc = slots * tc;
    const totalTsf = slots * tsf;
    const totalBook = slots * book;
    const totalNewNormal = slots * newNormal;
    const totalInsurance = slots * insurance;
    const totalEntrep = slots * entrep;
    const totalApproved = totalTc + totalTsf + totalBook + totalNewNormal + totalInsurance + totalEntrep;

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const directKeys: (keyof Omit<QualificationMap, 'qm_id' | 'created_at' | 'program_name' | 'institution_name'>)[] = [
      'program_id',
      'provider_id',
      'rqm_code',
      'nqm_code',
      'pqm_code',
      'appropriation',
      'fiscal_year',
      'allocation',
      'sector',
      'tvet_qualification',
      'qualification_level',
      'delivery_mode',
      'total_slots',
      'training_cost_per_capita',
      'support_fund_per_capita',
      'assessment_fee',
      'book_allowance',
      'new_normal_assistance',
      'annual_accident_insurance',
      'entrepreneurship_fee',
      'status',
    ];

    for (const key of directKeys) {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(data[key]);
      }
    }

    // Always update computed totals
    fields.push(`total_training_cost = $${idx++}`);
    values.push(totalTc);
    fields.push(`total_support_fund = $${idx++}`);
    values.push(totalTsf);
    fields.push(`total_book_allowance = $${idx++}`);
    values.push(totalBook);
    fields.push(`total_new_normal_assistance = $${idx++}`);
    values.push(totalNewNormal);
    fields.push(`total_annual_accident_insurance = $${idx++}`);
    values.push(totalInsurance);
    fields.push(`total_entrepreneurship_fee = $${idx++}`);
    values.push(totalEntrep);
    fields.push(`total_approved_amount = $${idx++}`);
    values.push(totalApproved);

    values.push(id);
    await pool.query(
      `UPDATE qualification_maps
       SET ${fields.join(', ')}
       WHERE qm_id = $${idx}`,
      values,
    );

    return this.findById(id);
  }

  static async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      `DELETE FROM qualification_maps WHERE qm_id = $1`,
      [id],
    );
    return (rowCount ?? 0) > 0;
  }
}
