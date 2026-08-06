import { pool } from '../config/db.js';
import { InternalBilling, VerificationStatus } from '../types/domain.js';

export class BillingModel {
  static async findAll(filters?: {
    provider_id?: string;
    qm_id?: string;
    verification_status?: VerificationStatus;
  }): Promise<InternalBilling[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (filters?.provider_id) {
      conditions.push(`b.provider_id = $${idx++}`);
      values.push(filters.provider_id);
    }
    if (filters?.qm_id) {
      conditions.push(`b.qm_id = $${idx++}`);
      values.push(filters.qm_id);
    }
    if (filters?.verification_status) {
      conditions.push(`b.verification_status = $${idx++}`);
      values.push(filters.verification_status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query<InternalBilling>(
      `SELECT b.*, tp.institution_name, qm.tvet_qualification, u.username as recorded_by_name
       FROM internal_billings b
       JOIN training_providers tp ON b.provider_id = tp.provider_id
       JOIN qualification_maps qm ON b.qm_id = qm.qm_id
       JOIN internal_users u ON b.recorded_by = u.user_id
       ${whereClause}
       ORDER BY b.created_at DESC`,
      values,
    );
    return rows;
  }

  static async findById(id: string): Promise<InternalBilling | null> {
    const { rows } = await pool.query<InternalBilling>(
      `SELECT b.*, tp.institution_name, qm.tvet_qualification, u.username as recorded_by_name
       FROM internal_billings b
       JOIN training_providers tp ON b.provider_id = tp.provider_id
       JOIN qualification_maps qm ON b.qm_id = qm.qm_id
       JOIN internal_users u ON b.recorded_by = u.user_id
       WHERE b.billing_id = $1`,
      [id],
    );
    return rows[0] || null;
  }

  static async create(data: {
    provider_id: string;
    qm_id: string;
    external_reference_no: string;
    claimed_amount: number;
    verification_status?: VerificationStatus;
    recorded_by: string;
  }): Promise<InternalBilling> {
    const { rows } = await pool.query<InternalBilling>(
      `INSERT INTO internal_billings (
        provider_id, qm_id, external_reference_no, claimed_amount, verification_status, recorded_by
       ) VALUES ($1, $2, $3, $4, COALESCE($5, 'pending'), $6)
       RETURNING *`,
      [
        data.provider_id,
        data.qm_id,
        data.external_reference_no,
        data.claimed_amount,
        data.verification_status || 'pending',
        data.recorded_by,
      ],
    );
    return rows[0];
  }

  static async updateStatus(id: string, verification_status: VerificationStatus): Promise<InternalBilling | null> {
    const { rows } = await pool.query<InternalBilling>(
      `UPDATE internal_billings
       SET verification_status = $1
       WHERE billing_id = $2
       RETURNING *`,
      [verification_status, id],
    );
    return rows[0] || null;
  }

  static async update(
    id: string,
    data: Partial<Omit<InternalBilling, 'billing_id' | 'created_at'>>,
  ): Promise<InternalBilling | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const keys: (keyof Omit<InternalBilling, 'billing_id' | 'created_at' | 'institution_name' | 'tvet_qualification' | 'recorded_by_name'>)[] = [
      'provider_id',
      'qm_id',
      'external_reference_no',
      'claimed_amount',
      'verification_status',
      'recorded_by',
    ];

    for (const key of keys) {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(data[key]);
      }
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await pool.query(
      `UPDATE internal_billings
       SET ${fields.join(', ')}
       WHERE billing_id = $${idx}`,
      values,
    );

    return this.findById(id);
  }

  static async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      `DELETE FROM internal_billings WHERE billing_id = $1`,
      [id],
    );
    return (rowCount ?? 0) > 0;
  }
}
