import { pool } from '../config/db.js';
import { TrainingProvider, ProviderStatus } from '../types/domain.js';

/** Derive status from expiration date: past → inactive, future/null → keep stored status */
function computeStatus(
  storedStatus: ProviderStatus,
  dateOfExpiration: string | null | undefined,
): ProviderStatus {
  if (dateOfExpiration) {
    const expiry = new Date(dateOfExpiration);
    expiry.setHours(23, 59, 59, 999); // treat the expiration day as still valid
    if (expiry < new Date()) {
      return 'inactive';
    }
  }
  return storedStatus;
}

function applyComputedStatus(rows: TrainingProvider[]): TrainingProvider[] {
  return rows.map((p) => ({
    ...p,
    status: computeStatus(p.status, p.date_of_expiration),
  }));
}

const SELECT_COLS = `
  provider_id, institution_name, email_website_fb, institution_type, classification,
  type_of_program, sector, qualification_title, training_duration_hours, sil_duration_hours,
  program_registration_number, date_of_expiration, school_id, complete_address, contact_number, status
`;

export class ProviderModel {
  static async findAll(filters?: { status?: ProviderStatus; search?: string }): Promise<TrainingProvider[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (filters?.search) {
      conditions.push(
        `(LOWER(institution_name) LIKE $${idx} OR LOWER(school_id) LIKE $${idx} OR LOWER(COALESCE(qualification_title, '')) LIKE $${idx} OR LOWER(COALESCE(sector, '')) LIKE $${idx} OR LOWER(COALESCE(program_registration_number, '')) LIKE $${idx})`,
      );
      values.push(`%${filters.search.toLowerCase()}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query<TrainingProvider>(
      `SELECT ${SELECT_COLS}
       FROM training_providers
       ${whereClause}
       ORDER BY institution_name ASC`,
      values,
    );

    // Apply computed status and optionally filter by it afterwards
    const computed = applyComputedStatus(rows);
    if (filters?.status) {
      return computed.filter((p) => p.status === filters.status);
    }
    return computed;
  }

  static async findById(id: string): Promise<TrainingProvider | null> {
    const { rows } = await pool.query<TrainingProvider>(
      `SELECT ${SELECT_COLS}
       FROM training_providers
       WHERE provider_id = $1`,
      [id],
    );
    if (!rows[0]) return null;
    const [p] = applyComputedStatus([rows[0]]);
    return p;
  }

  static async create(data: {
    institution_name: string;
    email_website_fb?: string | null;
    institution_type: string;
    classification: string;
    type_of_program?: string | null;
    sector?: string | null;
    qualification_title?: string | null;
    training_duration_hours?: number | null;
    sil_duration_hours?: number | null;
    program_registration_number?: string | null;
    date_of_expiration?: string | null;
    school_id?: string | null;
    complete_address?: string;
    contact_number?: string | null;
    // status intentionally omitted — auto-derived from date_of_expiration
  }): Promise<TrainingProvider> {
    const { rows } = await pool.query<TrainingProvider>(
      `INSERT INTO training_providers (
        institution_name, email_website_fb, institution_type, classification,
        type_of_program, sector, qualification_title, training_duration_hours,
        sil_duration_hours, program_registration_number, date_of_expiration,
        school_id, complete_address, contact_number, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, COALESCE($13, ''), $14, 'active')
      RETURNING ${SELECT_COLS}`,
      [
        data.institution_name,
        data.email_website_fb || null,
        data.institution_type,
        data.classification,
        data.type_of_program || 'WTR',
        data.sector || null,
        data.qualification_title || null,
        data.training_duration_hours ?? 0,
        data.sil_duration_hours ?? 0,
        data.program_registration_number || null,
        data.date_of_expiration || null,
        data.school_id || null,
        data.complete_address || '',
        data.contact_number || null,
      ],
    );
    const [p] = applyComputedStatus([rows[0]]);
    return p;
  }

  static async update(
    id: string,
    data: Partial<Omit<TrainingProvider, 'provider_id'>>,
  ): Promise<TrainingProvider | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const keys: (keyof Omit<TrainingProvider, 'provider_id'>)[] = [
      'institution_name',
      'email_website_fb',
      'institution_type',
      'classification',
      'type_of_program',
      'sector',
      'qualification_title',
      'training_duration_hours',
      'sil_duration_hours',
      'program_registration_number',
      'date_of_expiration',
      'school_id',
      'complete_address',
      'contact_number',
      'status',
    ];

    for (const key of keys) {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(data[key]);
      }
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const { rows } = await pool.query<TrainingProvider>(
      `UPDATE training_providers
       SET ${fields.join(', ')}
       WHERE provider_id = $${idx}
       RETURNING ${SELECT_COLS}`,
      values,
    );
    if (!rows[0]) return null;
    const [p] = applyComputedStatus([rows[0]]);
    return p;
  }

  static async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      `DELETE FROM training_providers WHERE provider_id = $1`,
      [id],
    );
    return (rowCount ?? 0) > 0;
  }

  static async bulkCreate(rows: Record<string, any>[]): Promise<TrainingProvider[]> {
    const results: TrainingProvider[] = [];
    for (const data of rows) {
      try {
        const { rows: created } = await pool.query<TrainingProvider>(
          `INSERT INTO training_providers (
            institution_name, email_website_fb, institution_type, classification,
            type_of_program, sector, qualification_title, training_duration_hours,
            sil_duration_hours, program_registration_number, date_of_expiration,
            school_id, complete_address, contact_number, status
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,COALESCE($13,''),$14,'active')
          ON CONFLICT DO NOTHING
          RETURNING ${SELECT_COLS}`,
          [
            data.institution_name,
            data.email_website_fb || null,
            data.institution_type || 'Private',
            data.classification || 'TVI',
            data.type_of_program || 'WTR',
            data.sector || null,
            data.qualification_title || null,
            isNaN(Number(data.training_duration_hours)) ? 0 : Number(data.training_duration_hours),
            isNaN(Number(data.sil_duration_hours)) ? 0 : Number(data.sil_duration_hours),
            data.program_registration_number || null,
            data.date_of_expiration || null,
            data.school_id || null,
            data.complete_address || '',
            data.contact_number || null,
          ],
        );
        if (created[0]) results.push(created[0]);
      } catch (_) {
        // skip bad rows
      }
    }
    return applyComputedStatus(results);
  }
}
