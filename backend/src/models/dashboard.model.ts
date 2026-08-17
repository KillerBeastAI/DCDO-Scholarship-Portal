import { pool } from '../config/db.js';
import { DashboardSummary } from '../types/domain.js';

export class DashboardModel {
  static async getSummary(): Promise<DashboardSummary> {
    const { rows: progRows } = await pool.query<{ count: string }>(
      `SELECT COUNT(DISTINCT program_code) as count
       FROM scholarship_programs
       WHERE program_code IN ('TWSP', 'TTSP', 'PESFA', 'STEP', 'TSUPER', 'RCEF-RTES', 'CFSP', 'CDWs', 'LEAP')`,
    );

    const { rows: provRows } = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM training_providers WHERE status = 'active'`,
    );

    const { rows: qmRows } = await pool.query<{ total_slots: string; total_allocated: string }>(
      `SELECT COALESCE(SUM(total_slots), 0) as total_slots,
              COALESCE(SUM(total_approved_amount), 0) as total_allocated
       FROM qualification_maps`,
    );

    const { rows: billDisbursed } = await pool.query<{ total_disbursed: string }>(
      `SELECT COALESCE(SUM(claimed_amount), 0) as total_disbursed
       FROM internal_billings
       WHERE verification_status = 'verified'`,
    );

    const { rows: accRows } = await pool.query<{
      total_enrolled: string;
      total_dropouts: string;
      total_graduates: string;
      total_assessed: string;
      total_certified: string;
      total_employed: string;
    }>(
      `SELECT 
        COALESCE(SUM(enrolled_male + enrolled_female), 0) as total_enrolled,
        COALESCE(SUM(dropped_male + dropped_female), 0) as total_dropouts,
        COALESCE(SUM(graduated_completed_male + graduated_completed_female), 0) as total_graduates,
        COALESCE(SUM(assessed_male + assessed_female), 0) as total_assessed,
        COALESCE(SUM(certified_male + certified_female), 0) as total_certified,
        COALESCE(SUM(employed_male + employed_female), 0) as total_employed
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

    const progCount = parseInt(progRows[0]?.count || '0', 10);

    return {
      totalPrograms: progCount > 0 ? progCount : 9,
      totalProviders: parseInt(provRows[0]?.count || '0', 10),
      totalAllocatedBudget: parseFloat(qmRows[0]?.total_allocated || '0'),
      totalDisbursedBudget: parseFloat(billDisbursed[0]?.total_disbursed || '0'),
      totalSlots: parseInt(qmRows[0]?.total_slots || '0', 10),
      totalEnrolled: parseInt(accRows[0]?.total_enrolled || '0', 10),
      totalGraduates: parseInt(accRows[0]?.total_graduates || '0', 10),
      totalCertified: parseInt(accRows[0]?.total_certified || '0', 10),
      totalAssessed: parseInt(accRows[0]?.total_assessed || '0', 10),
      totalDropouts: parseInt(accRows[0]?.total_dropouts || '0', 10),
      totalEmployed: parseInt(accRows[0]?.total_employed || '0', 10),
      billingsPending: billCounts.pending,
      billingsVerified: billCounts.verified,
      billingsPaid: billCounts.verified,
    };
  }

  static async getBudgetByProgram(): Promise<
    {
      program_id: string;
      program_code: string;
      program_name: string;
      fiscal_year: number;
      total_allocated: number;
      total_disbursed: number;
      total_slots?: number;
      total_enrolled?: number;
    }[]
  > {
    const { rows } = await pool.query(
      `SELECT 
        p.program_id,
        p.program_code,
        p.program_name,
        p.fiscal_year,
        COALESCE(qm_agg.total_allocated, 0)::float as total_allocated,
        COALESCE(bill_agg.total_disbursed, 0)::float as total_disbursed,
        COALESCE(qm_agg.total_slots, 0)::int as total_slots,
        COALESCE(acc_agg.total_enrolled, 0)::int as total_enrolled
       FROM scholarship_programs p
       LEFT JOIN (
         SELECT 
           program_id,
           SUM(total_approved_amount) as total_allocated,
           SUM(total_slots) as total_slots
         FROM qualification_maps
         GROUP BY program_id
       ) qm_agg ON qm_agg.program_id = p.program_id
       LEFT JOIN (
         SELECT 
           qm.program_id,
           SUM(ib.claimed_amount) as total_disbursed
         FROM internal_billings ib
         JOIN qualification_maps qm ON qm.qm_id = ib.qm_id
         WHERE ib.verification_status = 'verified'
         GROUP BY qm.program_id
       ) bill_agg ON bill_agg.program_id = p.program_id
       LEFT JOIN (
         SELECT 
           qm.program_id,
           SUM(pa.enrolled_male + pa.enrolled_female) as total_enrolled
         FROM physical_accomplishments pa
         JOIN qualification_maps qm ON qm.qm_id = pa.qm_id
         GROUP BY qm.program_id
       ) acc_agg ON acc_agg.program_id = p.program_id
       WHERE p.program_code IN ('TWSP', 'TTSP', 'PESFA', 'STEP', 'TSUPER', 'RCEF-RTES', 'CFSP', 'CDWs', 'LEAP')
       ORDER BY p.program_code ASC`,
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

