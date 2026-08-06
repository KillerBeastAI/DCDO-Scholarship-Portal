import { pool } from '../config/db.js';
import { DashboardSummary } from '../types/domain.js';

export class DashboardModel {
  static async getSummary(): Promise<DashboardSummary> {
    const { rows: progRows } = await pool.query<{ count: string; total_allocated: string; total_disbursed: string }>(
      `SELECT COUNT(*) as count,
              COALESCE(SUM(total_allocated), 0) as total_allocated,
              COALESCE(SUM(total_disbursed), 0) as total_disbursed
       FROM scholarship_programs`,
    );

    const { rows: provRows } = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM training_providers WHERE status = 'active'`,
    );

    const { rows: qmRows } = await pool.query<{ total_slots: string }>(
      `SELECT COALESCE(SUM(total_slots), 0) as total_slots FROM qualification_maps`,
    );

    const { rows: accRows } = await pool.query<{ total_enrolled: string; total_certified: string }>(
      `SELECT COALESCE(SUM(enrolled_male + enrolled_female), 0) as total_enrolled,
              COALESCE(SUM(certified_male + certified_female), 0) as total_certified
       FROM physical_accomplishments`,
    );

    const { rows: billRows } = await pool.query<{ verification_status: string; count: string }>(
      `SELECT verification_status, COUNT(*) as count
       FROM internal_billings
       GROUP BY verification_status`,
    );

    const billCounts: Record<string, number> = {
      pending: 0,
      verified: 0,
      rejected: 0,
      returned: 0,
    };

    for (const r of billRows) {
      billCounts[r.verification_status] = parseInt(r.count, 10);
    }

    return {
      totalPrograms: parseInt(progRows[0]?.count || '0', 10),
      totalProviders: parseInt(provRows[0]?.count || '0', 10),
      totalAllocatedBudget: parseFloat(progRows[0]?.total_allocated || '0'),
      totalDisbursedBudget: parseFloat(progRows[0]?.total_disbursed || '0'),
      totalSlots: parseInt(qmRows[0]?.total_slots || '0', 10),
      totalEnrolled: parseInt(accRows[0]?.total_enrolled || '0', 10),
      totalCertified: parseInt(accRows[0]?.total_certified || '0', 10),
      billingsPending: billCounts.pending,
      billingsVerified: billCounts.verified,
      billingsPaid: billCounts.verified, // Map verified to paid/processed count
    };
  }

  static async getBudgetByProgram(): Promise<
    { program_id: string; program_code: string; program_name: string; fiscal_year: number; total_allocated: number; total_disbursed: number }[]
  > {
    const { rows } = await pool.query(
      `SELECT program_id, program_code, program_name, fiscal_year,
              total_allocated::float, total_disbursed::float
       FROM scholarship_programs
       ORDER BY fiscal_year DESC, program_code ASC`,
    );
    return rows;
  }

  static async getBillingStatusCounts(): Promise<{ status: string; count: number; total_amount: number }[]> {
    const { rows } = await pool.query(
      `SELECT verification_status as status,
              COUNT(*)::int as count,
              COALESCE(SUM(claimed_amount), 0)::float as total_amount
       FROM internal_billings
       GROUP BY verification_status`,
    );
    return rows;
  }
}
