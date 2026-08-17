import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import type { ScholarshipProgramSummary } from '../types';
import './Programs.css';

export const Programs: React.FC = () => {
  const [summaries, setSummaries] = useState<ScholarshipProgramSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string | 'all'>('all');

  const fetchSummaries = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedYear !== 'all') {
        params.fiscal_year = selectedYear;
      }
      const { data } = await api.get<{ data: ScholarshipProgramSummary[] }>('/scholarship-programs/summary', { params });
      setSummaries(data.data);
    } catch (err) {
      console.error('Failed to fetch scholarship programs summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaries();
  }, [selectedYear]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(val) || 0);

  // Overall aggregate metrics for cards banner
  const totals = useMemo(() => {
    return summaries.reduce(
      (acc, curr) => ({
        slots: acc.slots + Number(curr.approved_slots || 0),
        amount: acc.amount + Number(curr.amount || 0),
        enrolled: acc.enrolled + Number(curr.enrolled || 0),
        dropouts: acc.dropouts + Number(curr.dropouts || 0),
        graduates: acc.graduates + Number(curr.graduates || 0),
        assessed: acc.assessed + Number(curr.assessed || 0),
        employed: acc.employed + Number(curr.employed || 0),
      }),
      { slots: 0, amount: 0, enrolled: 0, dropouts: 0, graduates: 0, assessed: 0, employed: 0 }
    );
  }, [summaries]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title-text">Scholarship Programs & Budget Allocations</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Consolidated program summaries dynamically aggregated from Qualification Maps and Physical Accomplishments.
          </p>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="metrics-grid" style={{ marginBottom: '20px' }}>
        <div className="glass-card metric-card">
          <div className="metric-title">Total Approved Slots</div>
          <div className="metric-values">
            <strong style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>{totals.slots}</strong>
            <span className="gender-split">Slots</span>
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-title">Total Approved Budget</div>
          <div className="metric-values">
            <strong style={{ fontSize: '1.2rem', color: 'var(--status-active-text)' }}>
              {formatCurrency(totals.amount)}
            </strong>
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-title">Total Enrolled / Graduates</div>
          <div className="metric-values">
            <strong>{totals.enrolled} Enrolled</strong>
            <span className="gender-split">{totals.graduates} Grads</span>
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-title">Total Employed Placements</div>
          <div className="metric-values">
            <strong style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>{totals.employed}</strong>
            <span className="gender-split">Placed</span>
          </div>
        </div>
      </div>

      {/* Year Filter Pills */}
      <div className="year-pills" style={{ marginBottom: '16px' }}>
        <button
          className={`year-pill ${selectedYear === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedYear('all')}
        >
          All Years
        </button>
        <button
          className={`year-pill ${selectedYear === '2026' ? 'active' : ''}`}
          onClick={() => setSelectedYear('2026')}
        >
          FY 2026 (Current)
        </button>
        <button
          className={`year-pill ${selectedYear === '2025' ? 'active' : ''}`}
          onClick={() => setSelectedYear('2025')}
        >
          FY 2025 (Continuing)
        </button>
      </div>

      {/* Programs Table */}
      <div className="glass-card" style={{ overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading consolidated scholarship summaries...
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ whiteSpace: 'nowrap' }}>Fiscal Year</th>
                <th style={{ whiteSpace: 'nowrap' }}>Scholarship Programs</th>
                <th style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>Approved Slots</th>
                <th style={{ whiteSpace: 'nowrap' }}>Amount</th>
                <th style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>Enrolled</th>
                <th style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>Total Drop-outs</th>
                <th style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>Graduates</th>
                <th style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>Assessed</th>
                <th style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>Employed</th>
              </tr>
            </thead>
            <tbody>
              {summaries.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No qualification maps or accomplishment data found for the selected period.
                  </td>
                </tr>
              ) : (
                summaries.map((prog, idx) => {
                  const fyDisplay = String(prog.fiscal_year).startsWith('FY')
                    ? String(prog.fiscal_year)
                    : `FY ${prog.fiscal_year}`;

                  return (
                    <tr key={`${prog.program_name}-${prog.fiscal_year}-${idx}`}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className="badge badge-verified">{fyDisplay}</span>
                      </td>
                      <td style={{ fontWeight: 600, minWidth: '220px' }}>{prog.program_name}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{prog.approved_slots}</td>
                      <td style={{ fontWeight: 600, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                        {formatCurrency(prog.amount)}
                      </td>
                      <td style={{ textAlign: 'center' }}>{prog.enrolled}</td>
                      <td style={{ textAlign: 'center', color: prog.dropouts > 0 ? 'var(--status-rejected-text)' : 'inherit' }}>
                        {prog.dropouts}
                      </td>
                      <td style={{ textAlign: 'center' }}>{prog.graduates}</td>
                      <td style={{ textAlign: 'center' }}>{prog.assessed}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--status-active-text)' }}>
                        {prog.employed}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
