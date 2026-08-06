import { pool } from '../config/db.js';
import { QualificationMap, QMStatus } from '../types/domain.js';

export class QMModel {
  static async findAll(filters?: {
    program_id?: string;
    provider_id?: string;
    status?: QMStatus;
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
    sector: string;
    tvet_qualification: string;
    qualification_level: string;
    delivery_mode: string;
    total_slots: number;
    training_cost_per_capita: number;
    support_fund_per_capita?: number;
    assessment_fee?: number;
    total_approved_amount?: number;
    status?: QMStatus;
  }): Promise<QualificationMap> {
    const totalApproved = data.total_approved_amount ??
      (data.total_slots * (data.training_cost_per_capita + (data.support_fund_per_capita ?? 0) + (data.assessment_fee ?? 0)));

    const { rows } = await pool.query<QualificationMap>(
      `INSERT INTO qualification_maps (
        program_id, provider_id, rqm_code, nqm_code, pqm_code,
        sector, tvet_qualification, qualification_level, delivery_mode,
        total_slots, training_cost_per_capita, support_fund_per_capita,
        assessment_fee, total_approved_amount, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, COALESCE($15, 'draft'))
       RETURNING *`,
      [
        data.program_id,
        data.provider_id,
        data.rqm_code || null,
        data.nqm_code || null,
        data.pqm_code || null,
        data.sector,
        data.tvet_qualification,
        data.qualification_level,
        data.delivery_mode,
        data.total_slots,
        data.training_cost_per_capita,
        data.support_fund_per_capita ?? 0,
        data.assessment_fee ?? 0,
        totalApproved,
        data.status || 'draft',
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

    const updatedTotalSlots = data.total_slots ?? existing.total_slots;
    const updatedTrainingCost = data.training_cost_per_capita ?? Number(existing.training_cost_per_capita);
    const updatedSupportFund = data.support_fund_per_capita ?? Number(existing.support_fund_per_capita);
    const updatedAssessmentFee = data.assessment_fee ?? Number(existing.assessment_fee);
    const computedTotalApproved = updatedTotalSlots * (updatedTrainingCost + updatedSupportFund + updatedAssessmentFee);

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const keys: (keyof Omit<QualificationMap, 'qm_id' | 'created_at' | 'program_name' | 'institution_name'>)[] = [
      'program_id',
      'provider_id',
      'rqm_code',
      'nqm_code',
      'pqm_code',
      'sector',
      'tvet_qualification',
      'qualification_level',
      'delivery_mode',
      'total_slots',
      'training_cost_per_capita',
      'support_fund_per_capita',
      'assessment_fee',
      'status',
    ];

    for (const key of keys) {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(data[key]);
      }
    }

    fields.push(`total_approved_amount = $${idx++}`);
    values.push(data.total_approved_amount ?? computedTotalApproved);

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
