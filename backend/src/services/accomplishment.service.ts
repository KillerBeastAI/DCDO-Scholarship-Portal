import { AccomplishmentModel } from '../models/accomplishment.model.js';
import { QMModel } from '../models/qm.model.js';
import { PhysicalAccomplishment } from '../types/domain.js';

export class AccomplishmentService {
  static async getAllAccomplishments(filters?: {
    qm_id?: string;
    program_id?: string;
    provider_id?: string;
  }): Promise<PhysicalAccomplishment[]> {
    return AccomplishmentModel.findAll(filters);
  }

  static async getAccomplishmentByQmId(qmId: string): Promise<PhysicalAccomplishment> {
    // Verify QM exists first
    const qm = await QMModel.findById(qmId);
    if (!qm) {
      const err = new Error(`Qualification map with ID '${qmId}' not found`) as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }

    const record = await AccomplishmentModel.findByQmId(qmId);
    if (!record) {
      const err = new Error(`No accomplishment record found for QM '${qmId}'`) as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }
    return record;
  }

  static async upsertAccomplishment(
    qmId: string,
    data: Partial<Omit<PhysicalAccomplishment, 'accomplishment_id' | 'qm_id' | 'last_updated'>>,
  ): Promise<PhysicalAccomplishment> {
    // Validate non-negative numbers
    const numericFields: (keyof typeof data)[] = [
      'enrolled_male',
      'enrolled_female',
      'dropped_male',
      'dropped_female',
      'graduated_completed_male',
      'graduated_completed_female',
      'graduated_pending_assessment_male',
      'graduated_pending_assessment_female',
      'assessed_male',
      'assessed_female',
      'certified_male',
      'certified_female',
      'employed_male',
      'employed_female',
    ];

    for (const field of numericFields) {
      const val = data[field];
      if (val !== undefined && (typeof val !== 'number' || val < 0)) {
        const err = new Error(`Field '${field}' must be a non-negative number`) as Error & { statusCode?: number };
        err.statusCode = 400;
        throw err;
      }
    }

    return AccomplishmentModel.upsert(qmId, data);
  }
}
