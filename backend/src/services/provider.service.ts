import { ProviderModel } from '../models/provider.model.js';
import { TrainingProvider, ProviderStatus } from '../types/domain.js';

export class ProviderService {
  static async getAllProviders(filters?: { status?: ProviderStatus; search?: string }): Promise<TrainingProvider[]> {
    return ProviderModel.findAll(filters);
  }

  static async getProviderById(id: string): Promise<TrainingProvider> {
    const provider = await ProviderModel.findById(id);
    if (!provider) {
      const err = new Error(`Training provider with ID '${id}' not found`) as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }
    return provider;
  }

  static async createProvider(data: {
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
    // NOTE: status is intentionally excluded — auto-derived from date_of_expiration
  }): Promise<TrainingProvider> {
    if (!data.institution_name || !data.institution_type || !data.classification) {
      const err = new Error('Missing required training provider fields') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }
    return ProviderModel.create(data);
  }

  static async updateProvider(
    id: string,
    data: Partial<Omit<TrainingProvider, 'provider_id'>>,
  ): Promise<TrainingProvider> {
    await this.getProviderById(id);
    const updated = await ProviderModel.update(id, data);
    if (!updated) {
      const err = new Error(`Failed to update provider '${id}'`) as Error & { statusCode?: number };
      err.statusCode = 500;
      throw err;
    }
    return updated;
  }

  static async deleteProvider(id: string): Promise<void> {
    await this.getProviderById(id);
    try {
      await ProviderModel.delete(id);
    } catch (err: any) {
      if (err.code === '23503') {
        const error = new Error('Cannot delete this training provider because other records still depend on it.') as Error & { statusCode?: number };
        error.statusCode = 400;
        throw error;
      }
      throw err;
    }
  }

  static async bulkDeleteProviders(ids: string[]): Promise<number> {
    if (!ids || !ids.length) {
      const err = new Error('No provider IDs provided for deletion') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }
    try {
      return await ProviderModel.bulkDelete(ids);
    } catch (err: any) {
      if (err.code === '23503') {
        const error = new Error('Cannot delete some training providers because other records still depend on them.') as Error & { statusCode?: number };
        error.statusCode = 400;
        throw error;
      }
      throw err;
    }
  }

  static async bulkCreate(rows: Record<string, any>[]) {
    return ProviderModel.bulkCreate(rows);
  }
}
