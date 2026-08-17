import { QMModel } from '../models/qm.model.js';
import { ProgramService } from './program.service.js';
import { ProviderService } from './provider.service.js';
import { QualificationMap, QMStatus } from '../types/domain.js';

export class QMService {
  static async getAllQMs(filters?: {
    program_id?: string;
    provider_id?: string;
    status?: QMStatus;
    fiscal_year?: string;
  }): Promise<QualificationMap[]> {
    return QMModel.findAll(filters);
  }

  static async getQMById(id: string): Promise<QualificationMap> {
    const qm = await QMModel.findById(id);
    if (!qm) {
      const err = new Error(`Qualification map with ID '${id}' not found`) as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }
    return qm;
  }

  static async createQM(data: {
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
    // Validate foreign keys
    await ProgramService.getProgramById(data.program_id);
    await ProviderService.getProviderById(data.provider_id);

    if (!data.sector || !data.tvet_qualification) {
      const err = new Error('Missing required qualification map fields: sector and TVET qualification title are required.') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    if (Number(data.total_slots) < 0 || Number(data.training_cost_per_capita) < 0) {
      const err = new Error('Total slots and training cost per capita must be non-negative') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    return QMModel.create(data);
  }

  static async updateQM(
    id: string,
    data: Partial<Omit<QualificationMap, 'qm_id' | 'created_at'>>,
  ): Promise<QualificationMap> {
    await this.getQMById(id);

    if (data.program_id) {
      await ProgramService.getProgramById(data.program_id);
    }
    if (data.provider_id) {
      await ProviderService.getProviderById(data.provider_id);
    }

    const updated = await QMModel.update(id, data);
    if (!updated) {
      const err = new Error(`Failed to update qualification map '${id}'`) as Error & { statusCode?: number };
      err.statusCode = 500;
      throw err;
    }
    return updated;
  }

  static async deleteQM(id: string): Promise<void> {
    await this.getQMById(id);
    await QMModel.delete(id);
  }
}
