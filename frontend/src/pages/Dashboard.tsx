import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { DashboardSummary } from '../types';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: DashboardSummary }>('/dashboard/summary')
      .then(({ data }) => setSummary(data.data))
      .catch((err) => console.error('Failed to load dashboard summary:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ color: 'var(--text-muted)' }}>Loading executive dashboard metrics...</div>;
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);

  return (
    <div>
      <div className="dashboard-grid">
        <div className="glass-card kpi-card">
          <div className="kpi-title">Scholarship Programs</div>
          <div className="kpi-value">{summary?.totalPrograms || 0}</div>
          <div className="kpi-sub">Active Fiscal Programs</div>
        </div>

        <div className="glass-card kpi-card">
          <div className="kpi-title">Training Providers</div>
          <div className="kpi-value">{summary?.totalProviders || 0}</div>
          <div className="kpi-sub">Accredited Institutions</div>
        </div>

        <div className="glass-card kpi-card">
          <div className="kpi-title">Total Allocated Budget</div>
          <div className="kpi-value" style={{ color: 'var(--primary)' }}>
            {formatCurrency(summary?.totalAllocatedBudget || 0)}
          </div>
          <div className="kpi-sub">Disbursed: {formatCurrency(summary?.totalDisbursedBudget || 0)}</div>
        </div>

        <div className="glass-card kpi-card">
          <div className="kpi-title">Total Scholarship Slots</div>
          <div className="kpi-value">{summary?.totalSlots || 0}</div>
          <div className="kpi-sub">Enrolled: {summary?.totalEnrolled || 0}</div>
        </div>
      </div>

      <div className="dashboard-sections">
        <div className="glass-card section-card">
          <div className="section-header">
            <h3 className="section-title">Billing Ledger & Verification Status Summary</h3>
          </div>
          <div style={{ display: 'flex', gap: '32px' }}>
            <div>
              <span className="badge badge-pending" style={{ marginRight: '8px' }}>Pending</span>
              <strong>{summary?.billingsPending || 0}</strong> claims
            </div>
            <div>
              <span className="badge badge-verified" style={{ marginRight: '8px' }}>Verified</span>
              <strong>{summary?.billingsVerified || 0}</strong> claims
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
