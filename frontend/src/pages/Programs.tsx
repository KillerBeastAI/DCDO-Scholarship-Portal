import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import type { ScholarshipProgramSummary } from '../types';
import './Programs.css';

export const Programs: React.FC = () => {
  const [summaries, setSummaries] = useState<ScholarshipProgramSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | 'all'>('all');
  const [programFilter, setProgramFilter] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchSummaries = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (selectedYear !== 'all') {
        params.fiscal_year = selectedYear;
      }
      const { data } = await api.get<{ data: ScholarshipProgramSummary[] }>('/scholarship-programs/summary', {
        params,
      });
      setSummaries(data.data);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Failed to fetch scholarship programs summary:', err);
      setError('Unable to load scholarship data. Please check your connection or contact the administrator.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaries();
  }, [selectedYear]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(val) || 0);

  const safePercentage = (value: number, total: number) => {
    if (!total || total === 0 || isNaN(total) || isNaN(value)) return 0;
    return Math.min(100, Math.round((value / total) * 100));
  };

  // Distinct list of program names for dropdown filtering
  const programNamesList = useMemo(() => {
    const names = new Set<string>();
    summaries.forEach((s) => {
      if (s.program_name) names.add(s.program_name);
    });
    return Array.from(names).sort();
  }, [summaries]);

  // Filtered dataset based on search and program filter
  const filteredSummaries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return summaries.filter((prog) => {
      if (programFilter !== 'all' && prog.program_name !== programFilter) {
        return false;
      }
      if (q) {
        const matchName = (prog.program_name || '').toLowerCase().includes(q);
        const matchFy = String(prog.fiscal_year || '').toLowerCase().includes(q);
        if (!matchName && !matchFy) {
          return false;
        }
      }
      return true;
    });
  }, [summaries, programFilter, searchQuery]);

  // Overall aggregate metrics
  const totals = useMemo(() => {
    return filteredSummaries.reduce(
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
  }, [filteredSummaries]);

  // Performance rate percentages
  const enrollmentRate = safePercentage(totals.enrolled, totals.slots);
  const graduationRate = safePercentage(totals.graduates, totals.enrolled);
  const assessmentRate = safePercentage(totals.assessed, totals.graduates);
  const employmentRate = safePercentage(totals.employed, totals.graduates);

  const avgCostPerSlot = totals.slots > 0 ? Math.round(totals.amount / totals.slots) : 0;

  const isFilterActive = selectedYear !== 'all' || programFilter !== 'all' || searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setSelectedYear('all');
    setProgramFilter('all');
    setSearchQuery('');
  };

  return (
    <div className="programs-page">
      {/* ─── 1. Page Header ─────────────────────────────────────────── */}
      <div className="prog-header">
        <div className="prog-header-left">
          <h2 className="prog-title">
            <span className="prog-title-icon">🎓</span>
            Scholarship Programs
          </h2>
          <p className="prog-subtitle">
            Program allocations, budget utilization, and learner accomplishments
          </p>
        </div>

        <div className="prog-header-right">
          {lastUpdated && (
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button className="prog-refresh-btn" onClick={fetchSummaries} title="Refresh data">
            <span>🔄</span> Refresh
          </button>
        </div>
      </div>

      {/* ─── 2. KPI Section (5 Distinct Cards) ──────────────────────── */}
      <div className="prog-kpi-grid">
        {/* Approved Slots */}
        <div className="prog-kpi-card prog-kpi--slots">
          <div className="prog-kpi-content">
            <span className="prog-kpi-label">Approved Slots</span>
            <span className="prog-kpi-value">{totals.slots.toLocaleString()}</span>
            <span className="prog-kpi-subtext">Total allocated slots</span>
          </div>
          <div className="prog-kpi-icon">🎓</div>
        </div>

        {/* Approved Budget */}
        <div className="prog-kpi-card prog-kpi--budget">
          <div className="prog-kpi-content">
            <span className="prog-kpi-label">Approved Budget</span>
            <span className="prog-kpi-value" style={{ color: '#38bdf8' }}>
              {formatCurrency(totals.amount)}
            </span>
            <span className="prog-kpi-subtext">Total funding allocated</span>
          </div>
          <div className="prog-kpi-icon">💼</div>
        </div>

        {/* Enrolled Learners */}
        <div className="prog-kpi-card prog-kpi--enrolled">
          <div className="prog-kpi-content">
            <span className="prog-kpi-label">Enrolled Learners</span>
            <span className="prog-kpi-value">{totals.enrolled.toLocaleString()}</span>
            <span className="prog-kpi-subtext">
              {enrollmentRate}% enrollment rate
            </span>
          </div>
          <div className="prog-kpi-icon">👥</div>
        </div>

        {/* Graduates */}
        <div className="prog-kpi-card prog-kpi--graduates">
          <div className="prog-kpi-content">
            <span className="prog-kpi-label">Graduates</span>
            <span className="prog-kpi-value">{totals.graduates.toLocaleString()}</span>
            <span className="prog-kpi-subtext">
              {graduationRate}% completion rate
            </span>
          </div>
          <div className="prog-kpi-icon">🏆</div>
        </div>

        {/* Employed */}
        <div className="prog-kpi-card prog-kpi--employed">
          <div className="prog-kpi-content">
            <span className="prog-kpi-label">Employed</span>
            <span className="prog-kpi-value" style={{ color: '#4ade80' }}>
              {totals.employed.toLocaleString()}
            </span>
            <span className="prog-kpi-subtext">
              {employmentRate}% employment rate
            </span>
          </div>
          <div className="prog-kpi-icon">👔</div>
        </div>
      </div>

      {/* ─── 3. Filter & Search Toolbar ─────────────────────────────── */}
      <div className="prog-toolbar">
        <div className="prog-toolbar-left">
          {/* Search Box */}
          <div className="prog-search-wrapper">
            <span className="prog-search-icon">🔍</span>
            <input
              type="text"
              className="prog-search-input"
              placeholder="Search scholarship program..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search scholarship program"
            />
            {searchQuery && (
              <button
                className="prog-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Fiscal Year Tabs */}
          <div className="prog-fy-pills">
            <button
              type="button"
              className={`prog-fy-pill ${selectedYear === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedYear('all')}
            >
              All Years
            </button>
            <button
              type="button"
              className={`prog-fy-pill ${selectedYear === '2026' ? 'active' : ''}`}
              onClick={() => setSelectedYear('2026')}
            >
              FY 2026 (Current)
            </button>
            <button
              type="button"
              className={`prog-fy-pill ${selectedYear === '2025' ? 'active' : ''}`}
              onClick={() => setSelectedYear('2025')}
            >
              FY 2025 (Continuing)
            </button>
          </div>

          {/* Scholarship Program Dropdown */}
          <select
            className="prog-select-filter"
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            aria-label="Filter by scholarship program"
          >
            <option value="all">All Programs</option>
            {programNamesList.map((prog) => (
              <option key={prog} value={prog}>
                {prog}
              </option>
            ))}
          </select>

          {/* Reset Filters Button */}
          {isFilterActive && (
            <button
              type="button"
              className="prog-btn-reset"
              onClick={handleResetFilters}
              title="Reset active filters"
            >
              <span>✕</span> Reset Filters
            </button>
          )}
        </div>

        <div className="prog-toolbar-right">
          <span className="prog-badge-count">
            {filteredSummaries.length} {filteredSummaries.length === 1 ? 'program' : 'programs'}
          </span>
        </div>
      </div>

      {/* ─── Error Alert State ──────────────────────────────────────── */}
      {error && (
        <div className="prog-error-banner">
          <span>⚠️ {error}</span>
          <button className="prog-error-btn" onClick={fetchSummaries}>
            Retry
          </button>
        </div>
      )}

      {/* ─── 4. Main Programs Table ─────────────────────────────────── */}
      <div className="prog-table-card">
        <div className="prog-table-header-title">
          <span className="prog-table-title-text">
            <span>📑</span> Consolidated Scholarship Program Summary
          </span>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Aggregated from Qualification Maps & Accomplishments
          </span>
        </div>

        {loading ? (
          <div className="prog-loading-wrap">
            <div className="prog-spinner" />
            <span>Loading consolidated scholarship summaries...</span>
          </div>
        ) : (
          <div className="prog-table-scroll">
            <table className="prog-table">
              <thead>
                <tr>
                  <th>Fiscal Year</th>
                  <th>Scholarship Program</th>
                  <th className="prog-th-center">Approved Slots</th>
                  <th className="prog-th-right prog-th-budget">Approved Budget</th>
                  <th className="prog-th-center">Enrolled</th>
                  <th className="prog-th-center">Graduates</th>
                  <th className="prog-th-center">Assessed</th>
                  <th className="prog-th-center">Employed</th>
                  <th className="prog-th-center">Drop-outs</th>
                </tr>
              </thead>
              <tbody>
                {filteredSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 0 }}>
                      <div className="prog-empty-state">
                        <div className="prog-empty-icon">📋</div>
                        <h4 className="prog-empty-title">No Scholarship Programs Found</h4>
                        <p className="prog-empty-desc">
                          {isFilterActive
                            ? 'No records match your active filter or search criteria.'
                            : 'No qualification maps or accomplishment data found for the selected period.'}
                        </p>
                        {isFilterActive && (
                          <button className="prog-btn-reset" onClick={handleResetFilters}>
                            Clear Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {filteredSummaries.map((prog, idx) => {
                      const fyDisplay = String(prog.fiscal_year).startsWith('FY')
                        ? String(prog.fiscal_year)
                        : `FY ${prog.fiscal_year}`;
                      const isCurrent = fyDisplay.includes('2026') || fyDisplay === 'FY 2026';

                      return (
                        <tr key={`${prog.program_name}-${prog.fiscal_year}-${idx}`}>
                          {/* Fiscal Year */}
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <span
                              className={`prog-fy-badge ${
                                isCurrent ? 'prog-fy-badge--current' : 'prog-fy-badge--continuing'
                              }`}
                            >
                              {fyDisplay}
                            </span>
                          </td>

                          {/* Scholarship Program */}
                          <td className="prog-td-program">{prog.program_name}</td>

                          {/* Approved Slots */}
                          <td className="prog-td-slots">
                            <span className="prog-slots-chip">{prog.approved_slots}</span>
                          </td>

                          {/* Amount / Budget */}
                          <td className="prog-td-amount">{formatCurrency(prog.amount)}</td>

                          {/* Enrolled */}
                          <td className="prog-td-numeric">{prog.enrolled}</td>

                          {/* Graduates */}
                          <td className="prog-td-numeric">{prog.graduates}</td>

                          {/* Assessed */}
                          <td className="prog-td-numeric">{prog.assessed}</td>

                          {/* Employed */}
                          <td className="prog-td-employed">{prog.employed}</td>

                          {/* Drop-outs */}
                          <td
                            className={`prog-td-dropouts ${
                              prog.dropouts > 0 ? 'has-dropouts' : ''
                            }`}
                          >
                            {prog.dropouts}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Summary Totals Row */}
                    <tr className="prog-tr-total">
                      <td colSpan={2} className="prog-tr-total-label">
                        Total Summary ({filteredSummaries.length} {filteredSummaries.length === 1 ? 'Program' : 'Programs'})
                      </td>
                      <td className="prog-td-slots">
                        <span className="prog-slots-chip" style={{ background: '#0f172a', borderColor: '#3b82f6', color: '#93c5fd' }}>
                          {totals.slots}
                        </span>
                      </td>
                      <td className="prog-td-amount" style={{ fontSize: '0.95rem', color: '#38bdf8' }}>
                        {formatCurrency(totals.amount)}
                      </td>
                      <td className="prog-td-numeric">{totals.enrolled}</td>
                      <td className="prog-td-numeric">{totals.graduates}</td>
                      <td className="prog-td-numeric">{totals.assessed}</td>
                      <td className="prog-td-employed" style={{ fontSize: '0.92rem' }}>
                        {totals.employed}
                      </td>
                      <td
                        className={`prog-td-dropouts ${
                          totals.dropouts > 0 ? 'has-dropouts' : ''
                        }`}
                      >
                        {totals.dropouts}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── 5. Program Performance Section ─────────────────────────── */}
      <div className="prog-performance-section">
        <div className="prog-section-header">
          <h3 className="prog-section-title">
            <span>📊</span> Program Performance Summary
          </h3>
          <span className="prog-section-badge">Calculated from verified learner accomplishments</span>
        </div>

        <div className="prog-perf-grid">
          {/* Enrollment Rate */}
          <div className="prog-perf-card prog-perf--enrollment">
            <div className="prog-perf-header">
              <span className="prog-perf-label">Enrollment Rate</span>
              <span className="prog-perf-value">{enrollmentRate}%</span>
            </div>
            <div className="prog-perf-bar-wrap">
              <div className="prog-perf-bar-fill" style={{ width: `${enrollmentRate}%` }} />
            </div>
            <div className="prog-perf-subtext">
              <span>{totals.enrolled.toLocaleString()} of {totals.slots.toLocaleString()} slots enrolled</span>
            </div>
          </div>

          {/* Graduation Rate */}
          <div className="prog-perf-card prog-perf--graduation">
            <div className="prog-perf-header">
              <span className="prog-perf-label">Graduation Rate</span>
              <span className="prog-perf-value">{graduationRate}%</span>
            </div>
            <div className="prog-perf-bar-wrap">
              <div className="prog-perf-bar-fill" style={{ width: `${graduationRate}%` }} />
            </div>
            <div className="prog-perf-subtext">
              <span>{totals.graduates.toLocaleString()} of {totals.enrolled.toLocaleString()} enrolled graduated</span>
            </div>
          </div>

          {/* Assessment Rate */}
          <div className="prog-perf-card prog-perf--assessment">
            <div className="prog-perf-header">
              <span className="prog-perf-label">Assessment Rate</span>
              <span className="prog-perf-value">{assessmentRate}%</span>
            </div>
            <div className="prog-perf-bar-wrap">
              <div className="prog-perf-bar-fill" style={{ width: `${assessmentRate}%` }} />
            </div>
            <div className="prog-perf-subtext">
              <span>{totals.assessed.toLocaleString()} of {totals.graduates.toLocaleString()} graduates assessed</span>
            </div>
          </div>

          {/* Employment Rate */}
          <div className="prog-perf-card prog-perf--employment">
            <div className="prog-perf-header">
              <span className="prog-perf-label">Employment Rate</span>
              <span className="prog-perf-value">{employmentRate}%</span>
            </div>
            <div className="prog-perf-bar-wrap">
              <div className="prog-perf-bar-fill" style={{ width: `${employmentRate}%` }} />
            </div>
            <div className="prog-perf-subtext">
              <span>{totals.employed.toLocaleString()} of {totals.graduates.toLocaleString()} graduates employed</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 6. Budget Overview Banner ──────────────────────────────── */}
      <div className="prog-budget-banner">
        <div className="prog-budget-info">
          <span className="prog-budget-title">
            <span>💼</span> Budget Allocation Overview
          </span>
          <p className="prog-budget-desc">
            Approved allocations based on active Qualification Maps for the selected period.
          </p>
        </div>

        <div className="prog-budget-stats">
          <div className="prog-budget-stat-item">
            <span className="prog-budget-stat-label">Total Approved Budget</span>
            <span className="prog-budget-stat-value">{formatCurrency(totals.amount)}</span>
          </div>

          <div className="prog-budget-stat-item">
            <span className="prog-budget-stat-label">Avg Budget / Slot</span>
            <span className="prog-budget-stat-value" style={{ color: '#60a5fa' }}>
              {formatCurrency(avgCostPerSlot)}
            </span>
          </div>

          <div className="prog-budget-stat-item">
            <span className="prog-budget-stat-label">Active Programs</span>
            <span className="prog-budget-stat-value" style={{ color: '#93c5fd' }}>
              {filteredSummaries.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
