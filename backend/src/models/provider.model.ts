import { pool } from '../config/db.js';
import { TrainingProvider, ProviderStatus } from '../types/domain.js';

export class ProviderModel {
  static async findAll(filters?: { status?: ProviderStatus; search?: string }): Promise<TrainingProvider[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (filters?.status) {
      conditions.push(`status = $${idx++}`);
      values.push(filters.status);
    }
    if (filters?.search) {
      conditions.push(`(LOWER(institution_name) LIKE $${idx} OR LOWER(school_id) LIKE $${idx} OR LOWER(COALESCE(qualification_title, '')) LIKE $${idx} OR LOWER(COALESCE(sector, '')) LIKE $${idx} OR LOWER(COALESCE(program_registration_number, '')) LIKE $${idx})`);
      values.push(`%${filters.search.toLowerCase()}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query<TrainingProvider>(
      `SELECT provider_id, institution_name, email_website_fb, institution_type, classification,
              type_of_program, sector, qualification_title, training_duration_hours, sil_duration_hours,
              program_registration_number, date_validity, school_id, complete_address, contact_number, status
       FROM training_providers
       ${whereClause}
       ORDER BY institution_name ASC`,
      values,
    );
    return rows;
  }

  static async findById(id: string): Promise<TrainingProvider | null> {
    const { rows } = await pool.query<TrainingProvider>(
      `SELECT provider_id, institution_name, email_website_fb, institution_type, classification,
              type_of_program, sector, qualification_title, training_duration_hours, sil_duration_hours,
              program_registration_number, date_validity, school_id, complete_address, contact_number, status
       FROM training_providers
       WHERE provider_id = $1`,
      [id],
    );
    return rows[0] || null;
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
    date_validity?: string | null;
    school_id?: string | null;
    complete_address?: string;
    contact_number?: string | null;
    status?: ProviderStatus;
  }): Promise<TrainingProvider> {
    const { rows } = await pool.query<TrainingProvider>(
      `INSERT INTO training_providers (
        institution_name, email_website_fb, institution_type, classification,
        type_of_program, sector, qualification_title, training_duration_hours,
        sil_duration_hours, program_registration_number, date_validity,
        school_id, complete_address, contact_number, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, COALESCE($13, ''), $14, COALESCE($15, 'active'))
      RETURNING provider_id, institution_name, email_website_fb, institution_type, classification,
                type_of_program, sector, qualification_title, training_duration_hours, sil_duration_hours,
                program_registration_number, date_validity, school_id, complete_address, contact_number, status`,
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
        data.date_validity || null,
        data.school_id || null,
        data.complete_address || '',
        data.contact_number || null,
        data.status || 'active',
      ],
    );
    return rows[0];
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
      'date_validity',
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
       RETURNING provider_id, institution_name, email_website_fb, institution_type, classification,
                 type_of_program, sector, qualification_title, training_duration_hours, sil_duration_hours,
                 program_registration_number, date_validity, school_id, complete_address, contact_number, status`,
      values,
    );
    return rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      `DELETE FROM training_providers WHERE provider_id = $1`,
      [id],
    );
    return (rowCount ?? 0) > 0;
  }
}
