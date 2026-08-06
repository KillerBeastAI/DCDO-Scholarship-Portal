import { BillingModel } from '../models/billing.model.js';
import { InternalBilling, VerificationStatus } from '../types/domain.js';

const VALID_TRANSITIONS: Record<VerificationStatus, VerificationStatus[]> = {
  pending: ['verified', 'rejected', 'returned'],
  verified: ['rejected', 'returned'],
  rejected: ['pending'],
  returned: ['pending'],
};

export class BillingService {
  static async getAllBillings(filters?: {
    provider_id?: string;
    qm_id?: string;
    verification_status?: VerificationStatus;
  }): Promise<InternalBilling[]> {
    return BillingModel.findAll(filters);
  }

  static async getBillingById(id: string): Promise<InternalBilling> {
    const billing = await BillingModel.findById(id);
    if (!billing) {
      const err = new Error(`Billing record with ID '${id}' not found`) as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }
    return billing;
  }

  static async createBilling(data: {
    provider_id: string;
    qm_id: string;
    external_reference_no: string;
    claimed_amount: number;
    recorded_by: string;
  }): Promise<InternalBilling> {
    if (!data.provider_id || !data.qm_id || !data.external_reference_no || !data.recorded_by) {
      const err = new Error('Missing required billing fields: provider_id, qm_id, external_reference_no, recorded_by') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    if (typeof data.claimed_amount !== 'number' || data.claimed_amount <= 0) {
      const err = new Error('claimed_amount must be a positive number') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    return BillingModel.create({ ...data, verification_status: 'pending' });
  }

  static async updateBilling(
    id: string,
    data: Partial<Omit<InternalBilling, 'billing_id' | 'created_at'>>,
  ): Promise<InternalBilling> {
    await this.getBillingById(id);

    if (data.claimed_amount !== undefined && data.claimed_amount <= 0) {
      const err = new Error('claimed_amount must be a positive number') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    const updated = await BillingModel.update(id, data);
    if (!updated) {
      const err = new Error(`Failed to update billing record '${id}'`) as Error & { statusCode?: number };
      err.statusCode = 500;
      throw err;
    }
    return updated;
  }

  static async updateVerificationStatus(
    id: string,
    newStatus: VerificationStatus,
  ): Promise<InternalBilling> {
    const billing = await this.getBillingById(id);
    const allowedNext = VALID_TRANSITIONS[billing.verification_status];

    if (!allowedNext.includes(newStatus)) {
      const err = new Error(
        `Cannot transition billing status from '${billing.verification_status}' to '${newStatus}'. Allowed transitions: [${allowedNext.join(', ')}]`,
      ) as Error & { statusCode?: number };
      err.statusCode = 422;
      throw err;
    }

    const updated = await BillingModel.updateStatus(id, newStatus);
    if (!updated) {
      const err = new Error(`Failed to update verification status for billing '${id}'`) as Error & { statusCode?: number };
      err.statusCode = 500;
      throw err;
    }
    return updated;
  }

  static async deleteBilling(id: string): Promise<void> {
    await this.getBillingById(id);
    await BillingModel.delete(id);
  }
}
