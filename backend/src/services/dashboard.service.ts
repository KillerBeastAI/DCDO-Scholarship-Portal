import { DashboardModel } from '../models/dashboard.model.js';
import { DashboardSummary } from '../types/domain.js';

export class DashboardService {
  static async getSummary(): Promise<DashboardSummary> {
    return DashboardModel.getSummary();
  }

  static async getBudgetByProgram(): Promise<
    { program_id: string; program_code: string; program_name: string; fiscal_year: number; total_allocated: number; total_disbursed: number; total_slots?: number; total_enrolled?: number }[]
  > {
    return DashboardModel.getBudgetByProgram();
  }

  static async getBillingStatusCounts(): Promise<{ status: string; count: number; total_amount: number }[]> {
    return DashboardModel.getBillingStatusCounts();
  }
}
