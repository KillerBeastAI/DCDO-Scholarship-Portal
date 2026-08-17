import { pool } from '../config/db.js';
import { PhysicalAccomplishment } from '../types/domain.js';
import { QMModel } from './qm.model.js';

export class AccomplishmentModel {
  static async findAll(filters?: { qm_id?: string; program_id?: string; provider_id?: string }): Promise<PhysicalAccomplishment[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (filters?.qm_id) {
      conditions.push(`pa.qm_id = $${idx++}`);
      values.push(filters.qm_id);
    }
    if (filters?.program_id) {
      conditions.push(`qm.program_id = $${idx++}`);
      values.push(filters.program_id);
    }
    if (filters?.provider_id) {
      conditions.push(`qm.provider_id = $${idx++}`);
      values.push(filters.provider_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query<PhysicalAccomplishment>(
      `SELECT pa.*
       FROM physical_accomplishments pa
       JOIN qualification_maps qm ON pa.qm_id = qm.qm_id
       ${whereClause}
       ORDER BY pa.last_updated DESC`,
      values,
    );
    return rows;
  }

  static async findByQmId(qmId: string): Promise<PhysicalAccomplishment | null> {
    const { rows } = await pool.query<PhysicalAccomplishment>(
      `SELECT * FROM physical_accomplishments WHERE qm_id = $1`,
      [qmId],
    );
    return rows[0] || null;
  }

  static async upsert(
    qmId: string,
    data: Partial<Omit<PhysicalAccomplishment, 'accomplishment_id' | 'qm_id' | 'last_updated'>>,
  ): Promise<PhysicalAccomplishment> {
    const qm = await QMModel.findById(qmId);
    if (!qm) {
      throw new Error(`Qualification map with ID '${qmId}' not found.`);
    }

    const existing = await this.findByQmId(qmId);

    const enrolledMale = data.enrolled_male ?? existing?.enrolled_male ?? 0;
    const enrolledFemale = data.enrolled_female ?? existing?.enrolled_female ?? 0;
    const totalEnrolled = enrolledMale + enrolledFemale;

    const droppedMale = data.dropped_male ?? existing?.dropped_male ?? 0;
    const droppedFemale = data.dropped_female ?? existing?.dropped_female ?? 0;

    const perCapitaCost = qm.total_slots > 0 
      ? (Number(qm.total_approved_amount) / qm.total_slots)
      : (Number(qm.training_cost_per_capita) + Number(qm.support_fund_per_capita));
    const droppedDeduction = data.dropped_amount_deduction ?? (droppedMale + droppedFemale) * perCapitaCost;

    const unutilizedSlots = Math.max(0, qm.total_slots - totalEnrolled);
    const unutilizedAmount = unutilizedSlots * perCapitaCost;

    const graduatedMale = data.graduated_completed_male ?? existing?.graduated_completed_male ?? 0;
    const graduatedFemale = data.graduated_completed_female ?? existing?.graduated_completed_female ?? 0;
    const gradPendingMale = data.graduated_pending_assessment_male ?? existing?.graduated_pending_assessment_male ?? 0;
    const gradPendingFemale = data.graduated_pending_assessment_female ?? existing?.graduated_pending_assessment_female ?? 0;
    const assessedMale = data.assessed_male ?? existing?.assessed_male ?? 0;
    const assessedFemale = data.assessed_female ?? existing?.assessed_female ?? 0;
    const certifiedMale = data.certified_male ?? existing?.certified_male ?? 0;
    const certifiedFemale = data.certified_female ?? existing?.certified_female ?? 0;
    const employedMale = data.employed_male ?? existing?.employed_male ?? 0;
    const employedFemale = data.employed_female ?? existing?.employed_female ?? 0;

    if (existing) {
      const { rows } = await pool.query<PhysicalAccomplishment>(
        `UPDATE physical_accomplishments
         SET enrolled_male = $1, enrolled_female = $2,
             dropped_male = $3, dropped_female = $4, dropped_amount_deduction = $5,
             graduated_completed_male = $6, graduated_completed_female = $7,
             graduated_pending_assessment_male = $8, graduated_pending_assessment_female = $9,
             assessed_male = $10, assessed_female = $11,
             certified_male = $12, certified_female = $13,
             employed_male = $14, employed_female = $15,
             unutilized_slots = $16, unutilized_amount = $17,
             last_updated = NOW()
         WHERE qm_id = $18
         RETURNING *`,
        [
          enrolledMale, enrolledFemale,
          droppedMale, droppedFemale, droppedDeduction,
          graduatedMale, graduatedFemale,
          gradPendingMale, gradPendingFemale,
          assessedMale, assessedFemale,
          certifiedMale, certifiedFemale,
          employedMale, employedFemale,
          unutilizedSlots, unutilizedAmount,
          qmId,
        ],
      );
      return rows[0];
    } else {
      const { rows } = await pool.query<PhysicalAccomplishment>(
        `INSERT INTO physical_accomplishments (
          qm_id, enrolled_male, enrolled_female,
          dropped_male, dropped_female, dropped_amount_deduction,
          graduated_completed_male, graduated_completed_female,
          graduated_pending_assessment_male, graduated_pending_assessment_female,
          assessed_male, assessed_female,
          certified_male, certified_female,
          employed_male, employed_female,
          unutilized_slots, unutilized_amount, last_updated
         ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW()
         )
         RETURNING *`,
        [
          qmId, enrolledMale, enrolledFemale,
          droppedMale, droppedFemale, droppedDeduction,
          graduatedMale, graduatedFemale,
          gradPendingMale, gradPendingFemale,
          assessedMale, assessedFemale,
          certifiedMale, certifiedFemale,
          employedMale, employedFemale,
          unutilizedSlots, unutilizedAmount,
        ],
      );
      return rows[0];
    }
  }
}
