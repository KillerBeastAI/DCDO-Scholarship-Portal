import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { DashboardSummary } from '../types';
import './Dashboard.css';

interface BudgetByProgram {
  program_id: string;
  program_code: string;
  program_name: string;
  fiscal_year: number;
  total_allocated: number;
  total_disbursed: number;
}

interface BillingStatusCount {
  status: string;
  count: number;
  total_amount: number;
}

export const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [budgetByProgram, setBudgetByProgram] = useState<BudgetByProgram[]>([]);
  const [billingStatus, setBillingStatus] = useState<BillingStatusCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ data: DashboardSummary }>('/dashboard/summary'),
      api.get<{ data: BudgetByProgram[] }>('/dashboard/budget-by-program'),
      api.get<{ data: BillingStatusCount[] }>('/dashboard/billing-status-counts'),
    ])
      .then(([summaryRes, budgetRes, billingRes]) => {
        setSummary(summaryRes.data.data);
        setBudgetByProgram(budgetRes.data.data);
        setBillingStatus(billingRes.data.data);
      })
      .catch((err) => console.error('Failed to load dashboard:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-spinner" />
        <span>Loading executive dashboard…</span>
      </div>
    );
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(val);

  const utilizationPct = summary && summary.totalAllocatedBudget > 0
    ? Math.min(100, Math.round((summary.totalDisbursedBudget / summary.totalAllocatedBudget) * 100))
    : 0;

  const enrollmentPct = summary && summary.totalSlots > 0
    ? Math.min(100, Math.round((summary.totalEnrolled / summary.totalSlots) * 100))
    : 0;

  const totalBillingCount = billingStatus.reduce((acc, b) => acc + b.count, 0);

  const BILLING_COLORS: Record<string, string> = {
    pending: 'var(--status-pending-text)',
    verified: 'var(--status-active-text)',
    rejected: 'var(--status-rejected-text)',
    returned: 'var(--status-verified-text)',
  };

  return (
    <div className="dashboard-root">
      {/* ── KPI Cards ── */}
      <div className="dashboard-grid">
        <div className="glass-card kpi-card">
          <div className="kpi-icon">🎓</div>
          <div className="kpi-content">
            <div className="kpi-title">Scholarship Programs</div>
            <div className="kpi-value">{summary?.totalPrograms ?? 0}</div>
            <div className="kpi-sub">Active Fiscal Programs</div>
          </div>
        </div>

        <div className="glass-card kpi-card">
          <div className="kpi-icon">🏫</div>
          <div className="kpi-content">
            <div className="kpi-title">Training Providers</div>
            <div className="kpi-value">{summary?.totalProviders ?? 0}</div>
            <div className="kpi-sub">Accredited Institutions</div>
          </div>
        </div>

        <div className="glass-card kpi-card">
          <div className="kpi-icon">💰</div>
          <div className="kpi-content">
            <div className="kpi-title">Total Allocated Budget</div>
            <div className="kpi-value kpi-value--primary">{formatCurrency(summary?.totalAllocatedBudget ?? 0)}</div>
            <div className="kpi-sub">Disbursed: {formatCurrency(summary?.totalDisbursedBudget ?? 0)}</div>
          </div>
          <div className="kpi-progress">
            <div className="kpi-progress-label">
              <span>Budget Utilization</span>
              <strong>{utilizationPct}%</strong>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill progress-fill--primary"
                style={{ width: `${utilizationPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="glass-card kpi-card">
          <div className="kpi-icon">👨‍🎓</div>
          <div className="kpi-content">
            <div className="kpi-title">Total Slots</div>
            <div className="kpi-value">{summary?.totalSlots ?? 0}</div>
            <div className="kpi-sub">Enrolled: {summary?.totalEnrolled ?? 0} · Certified: {summary?.totalCertified ?? 0}</div>
          </div>
          <div className="kpi-progress">
            <div className="kpi-progress-label">
              <span>Enrollment Rate</span>
              <strong>{enrollmentPct}%</strong>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill progress-fill--accent"
                style={{ width: `${enrollmentPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className="dashboard-charts">
        {/* Budget by Program */}
        <div className="glass-card chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Budget by Program</h3>
            <span className="chart-subtitle">Allocated vs Disbursed (PHP)</span>
          </div>
          {budgetByProgram.length === 0 ? (
            <div className="chart-empty">No program data available</div>
          ) : (
            <div className="budget-bars">
              {budgetByProgram.map((prog) => {
                const pct = prog.total_allocated > 0
                  ? Math.min(100, Math.round((prog.total_disbursed / prog.total_allocated) * 100))
                  : 0;
                return (
                  <div key={prog.program_id} className="budget-bar-row">
                    <div className="budget-bar-label">
                      <span className="budget-bar-code">{prog.program_code}</span>
                      <span className="budget-bar-year">FY {prog.fiscal_year}</span>
                    </div>
                    <div className="budget-bar-track">
                      <div
                        className="budget-bar-fill"
                        style={{ width: `${pct}%` }}
                        title={`Disbursed: ${formatCurrency(prog.total_disbursed)} / ${formatCurrency(prog.total_allocated)}`}
                      />
                    </div>
                    <div className="budget-bar-pct">{pct}%</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Billing Status Breakdown */}
        <div className="glass-card chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Billing Verification Status</h3>
            <span className="chart-subtitle">Claims by verification stage</span>
          </div>
          {billingStatus.length === 0 ? (
            <div className="chart-empty">No billing data available</div>
          ) : (
            <>
              <div className="donut-container">
                <svg viewBox="0 0 120 120" className="donut-svg">
                  {(() => {
                    let offset = 0;
                    const radius = 40;
                    const circumference = 2 * Math.PI * radius;
                    return billingStatus.map((b, i) => {
                      const pct = totalBillingCount > 0 ? b.count / totalBillingCount : 0;
                      const dash = pct * circumference;
                      const gap = circumference - dash;
                      const rotation = (offset / totalBillingCount) * 360 - 90;
                      offset += b.count;
                      const colors = ['#f59e0b', '#10b981', '#ef4444', '#6366f1'];
                      return (
                        <circle
                          key={i}
                          cx="60"
                          cy="60"
                          r={radius}
                          fill="none"
                          stroke={colors[i % colors.length]}
                          strokeWidth="18"
                          strokeDasharray={`${dash} ${gap}`}
                          strokeDashoffset={0}
                          transform={`rotate(${rotation} 60 60)`}
                        />
                      );
                    });
                  })()}
                  <text x="60" y="56" textAnchor="middle" className="donut-center-num">{totalBillingCount}</text>
                  <text x="60" y="70" textAnchor="middle" className="donut-center-label">Total</text>
                </svg>
              </div>
              <div className="billing-legend">
                {billingStatus.map((b, i) => {
                  const colors = ['#f59e0b', '#10b981', '#ef4444', '#6366f1'];
                  return (
                    <div key={i} className="billing-legend-item">
                      <span className="legend-dot" style={{ background: colors[i % colors.length] }} />
                      <span className="legend-label" style={{ color: BILLING_COLORS[b.status] ?? 'inherit' }}>
                        {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                      </span>
                      <span className="legend-count">{b.count}</span>
                      <span className="legend-amount">{formatCurrency(b.total_amount)}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
