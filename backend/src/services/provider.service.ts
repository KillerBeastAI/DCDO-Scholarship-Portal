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
    institution_type: string;
    classification: string;
    school_id?: string | null;
    complete_address: string;
    contact_number?: string | null;
    status?: ProviderStatus;
  }): Promise<TrainingProvider> {
    if (!data.institution_name || !data.institution_type || !data.classification || !data.complete_address) {
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
    await ProviderModel.delete(id);
  }
}
