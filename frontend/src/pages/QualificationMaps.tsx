import React, { useEffect, useState, useMemo, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { QualificationMap, ScholarshipProgram, TrainingProvider } from '../types';
import './QualificationMaps.css';

export const SCHOLARSHIP_PROGRAMS_LIST = [
  'Training for Work Scholarship Program (TWSP)',
  'Tulong Trabaho Scholarship Program (TTSP)',
  'Private Education Student Financial Assistance (PESFA)',
  'Special Training for Employment Program (STEP)',
  'Tsuper Iskolar',
  'Rice Training and Extension Services (RCEF-RTES)',
  'Coconut Farmers Scholarship Program (CFSP)',
  'Child Development Workers (CDWs) Scholarship Program',
  'Lifelong Employability and Advancement Program (LEAP)',
];

export const QualificationMaps: React.FC = () => {
  const { user } = useAuth();
  const [qms, setQms] = useState<QualificationMap[]>([]);
  const [programs, setPrograms] = useState<ScholarshipProgram[]>([]);
  const [providers, setProviders] = useState<TrainingProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fiscalYearFilter, setFiscalYearFilter] = useState<string>('all');
  const [programFilter, setProgramFilter] = useState<string>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Searchable Provider Selector state
  const [providerSearchQuery, setProviderSearchQuery] = useState<string>('');
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState<boolean>(false);
  const providerSelectorRef = useRef<HTMLDivElement>(null);
  const providerSearchInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    program_name: SCHOLARSHIP_PROGRAMS_LIST[0],
    appropriation: 'Current' as 'Current' | 'Continuing',
    fiscal_year: 'FY 2026',
    allocation: 'CO' as 'RO' | 'CO',
    rqm_code: '',
    provider_id: '',
    sector: '',
    tvet_qualification: '',
    total_slots: 25,
    training_cost_per_capita: 15000,
    support_fund_per_capita: 2000,
    book_allowance: 0,
    new_normal_assistance: 0,
    annual_accident_insurance: 0,
    entrepreneurship_fee: 0,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (fiscalYearFilter !== 'all') params.fiscal_year = fiscalYearFilter;

      const [qmRes, progRes, provRes] = await Promise.all([
        api.get<{ data: QualificationMap[] }>('/qualification-maps', { params }),
        api.get<{ data: ScholarshipProgram[] }>('/scholarship-programs'),
        api.get<{ data: TrainingProvider[] }>('/training-providers'),
      ]);

      setQms(qmRes.data.data);
      setPrograms(progRes.data.data);
      setProviders(provRes.data.data);
    } catch (err) {
      console.error('Failed to fetch qualification maps:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fiscalYearFilter]);

  // Reset pagination to page 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, fiscalYearFilter, programFilter, pageSize]);

  // Close provider selector dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        providerSelectorRef.current &&
        !providerSelectorRef.current.contains(event.target as Node)
      ) {
        setIsProviderDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Focus search input when provider dropdown opens
  useEffect(() => {
    if (isProviderDropdownOpen && providerSearchInputRef.current) {
      providerSearchInputRef.current.focus();
    }
  }, [isProviderDropdownOpen]);

  // Program condition checks
  const isPesfa = form.program_name.includes('PESFA') || form.program_name.includes('Private Education');
  const isCfsp = form.program_name.includes('CFSP') || form.program_name.includes('Coconut Farmers');
  const isStep = form.program_name.includes('STEP') || form.program_name.includes('Special Training');
  const isRtes = form.program_name.includes('RCEF-RTES') || form.program_name.includes('Rice Training');

  const isEntrepApplicable = isCfsp || isStep || isRtes;

  // Auto-select allocation and clear inactive costs when program changes
  const handleProgramChange = (progName: string) => {
    let autoAllocation: 'RO' | 'CO' = form.allocation;
    if (progName.includes('PESFA') || progName.includes('Private Education')) {
      autoAllocation = 'RO';
    } else if (
      progName.includes('STEP') ||
      progName.includes('CFSP') ||
      progName.includes('Coconut') ||
      progName.includes('RCEF-RTES') ||
      progName.includes('Rice') ||
      progName.includes('Tsuper')
    ) {
      autoAllocation = 'CO';
    }

    const nextIsPesfa = progName.includes('PESFA') || progName.includes('Private Education');
    const nextIsCfsp = progName.includes('CFSP') || progName.includes('Coconut');
    const nextIsEntrep =
      nextIsCfsp ||
      progName.includes('STEP') ||
      progName.includes('Special Training') ||
      progName.includes('RCEF-RTES') ||
      progName.includes('Rice');

    setForm((prev) => ({
      ...prev,
      program_name: progName,
      allocation: autoAllocation,
      book_allowance: nextIsPesfa ? prev.book_allowance : 0,
      new_normal_assistance: nextIsCfsp ? prev.new_normal_assistance : 0,
      annual_accident_insurance: nextIsCfsp ? prev.annual_accident_insurance : 0,
      entrepreneurship_fee: nextIsEntrep ? prev.entrepreneurship_fee : 0,
    }));
  };

  // Auto-generate fiscal year based on appropriation
  const handleAppropriationChange = (approp: 'Current' | 'Continuing') => {
    const fy = approp === 'Current' ? 'FY 2026' : 'FY 2025';
    setForm((prev) => ({
      ...prev,
      appropriation: approp,
      fiscal_year: fy,
    }));
  };

  // Selecting a specific training provider qualification record
  const handleProviderSelect = (prov: TrainingProvider) => {
    setForm((prev) => ({
      ...prev,
      provider_id: prov.provider_id,
      sector: prov.sector || prev.sector || 'Information and Communications Technology (ICT)',
      tvet_qualification: prov.qualification_title || prev.tvet_qualification || '',
    }));
    setIsProviderDropdownOpen(false);
    setProviderSearchQuery('');
  };

  // Selected provider object derived from form.provider_id
  const selectedProvider = useMemo(() => {
    return providers.find((p) => p.provider_id === form.provider_id);
  }, [providers, form.provider_id]);

  // Filtered providers list for searchable dropdown
  const filteredProviders = useMemo(() => {
    if (!providerSearchQuery.trim()) return providers;
    const q = providerSearchQuery.toLowerCase().trim();
    return providers.filter(
      (p) =>
        (p.institution_name || '').toLowerCase().includes(q) ||
        (p.sector || '').toLowerCase().includes(q) ||
        (p.type_of_program || '').toLowerCase().includes(q) ||
        (p.qualification_title || '').toLowerCase().includes(q)
    );
  }, [providers, providerSearchQuery]);

  const handleOpenModal = (qm?: QualificationMap) => {
    setProviderSearchQuery('');
    setIsProviderDropdownOpen(false);

    if (qm) {
      setEditingId(qm.qm_id);
      const progName = qm.program_name || SCHOLARSHIP_PROGRAMS_LIST[0];
      const approp = (qm.appropriation as any) || (qm.fiscal_year === 'FY 2025' ? 'Continuing' : 'Current');
      const fy = qm.fiscal_year || (approp === 'Continuing' ? 'FY 2025' : 'FY 2026');
      const alloc = (qm.allocation as any) || (progName.includes('PESFA') ? 'RO' : 'CO');

      setForm({
        program_name: progName,
        appropriation: approp,
        fiscal_year: fy,
        allocation: alloc,
        rqm_code: qm.rqm_code || '',
        provider_id: qm.provider_id,
        sector: qm.sector,
        tvet_qualification: qm.tvet_qualification,
        total_slots: Number(qm.total_slots) || 0,
        training_cost_per_capita: Number(qm.training_cost_per_capita) || 0,
        support_fund_per_capita: Number(qm.support_fund_per_capita) || 0,
        book_allowance: Number(qm.book_allowance) || 0,
        new_normal_assistance: Number(qm.new_normal_assistance) || 0,
        annual_accident_insurance: Number(qm.annual_accident_insurance) || 0,
        entrepreneurship_fee: Number(qm.entrepreneurship_fee) || 0,
      });
    } else {
      setEditingId(null);
      const defaultProv = providers[0];
      setForm({
        program_name: SCHOLARSHIP_PROGRAMS_LIST[0],
        appropriation: 'Current',
        fiscal_year: 'FY 2026',
        allocation: 'CO',
        rqm_code: '',
        provider_id: defaultProv?.provider_id || '',
        sector: defaultProv?.sector || 'Information and Communications Technology (ICT)',
        tvet_qualification: defaultProv?.qualification_title || '',
        total_slots: 25,
        training_cost_per_capita: 15000,
        support_fund_per_capita: 2000,
        book_allowance: 0,
        new_normal_assistance: 0,
        annual_accident_insurance: 0,
        entrepreneurship_fee: 0,
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.provider_id) {
      alert('Please select a Training Provider and Qualification.');
      return;
    }

    setSaving(true);
    try {
      let prog = programs.find((p) => p.program_name === form.program_name);
      if (!prog) {
        prog = programs.find((p) => form.program_name.toLowerCase().includes(p.program_code.toLowerCase()));
      }
      const programId = prog?.program_id || programs[0]?.program_id;

      const payload = {
        program_id: programId,
        provider_id: form.provider_id,
        rqm_code: form.rqm_code || null,
        appropriation: form.appropriation,
        fiscal_year: form.fiscal_year,
        allocation: form.allocation,
        sector: form.sector,
        tvet_qualification: form.tvet_qualification,
        total_slots: Number(form.total_slots) || 0,
        training_cost_per_capita: Number(form.training_cost_per_capita) || 0,
        support_fund_per_capita: Number(form.support_fund_per_capita) || 0,
        book_allowance: isPesfa ? Number(form.book_allowance) || 0 : 0,
        new_normal_assistance: isCfsp ? Number(form.new_normal_assistance) || 0 : 0,
        annual_accident_insurance: isCfsp ? Number(form.annual_accident_insurance) || 0 : 0,
        entrepreneurship_fee: isEntrepApplicable ? Number(form.entrepreneurship_fee) || 0 : 0,
      };

      if (editingId) {
        await api.put(`/qualification-maps/${editingId}`, payload);
      } else {
        await api.post('/qualification-maps', payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save qualification map');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this qualification map?')) return;
    try {
      await api.delete(`/qualification-maps/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete qualification map');
    }
  };

  const formatCurrency = (val?: number | null) => {
    if (val === null || val === undefined || isNaN(Number(val)) || Number(val) === 0) {
      return '—';
    }
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(val));
  };

  const formatCurrencyStrict = (val?: number | null) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(val) || 0);
  };

  // Filter and Search logic
  const filteredQms = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return qms.filter((qm) => {
      if (fiscalYearFilter !== 'all' && qm.fiscal_year !== fiscalYearFilter) return false;
      if (programFilter !== 'all' && qm.program_name !== programFilter) return false;

      if (q) {
        const matchRqm = (qm.rqm_code || '').toLowerCase().includes(q);
        const matchProv = (qm.institution_name || '').toLowerCase().includes(q);
        const matchQual = (qm.tvet_qualification || '').toLowerCase().includes(q);
        const matchProg = (qm.program_name || '').toLowerCase().includes(q);
        if (!matchRqm && !matchProv && !matchQual && !matchProg) {
          return false;
        }
      }
      return true;
    });
  }, [qms, fiscalYearFilter, programFilter, searchQuery]);

  // Overall summary metrics
  const metrics = useMemo(() => {
    let totalSlots = 0;
    let totalBudget = 0;
    const providerSet = new Set<string>();

    filteredQms.forEach((qm) => {
      const slots = Number(qm.total_slots) || 0;
      totalSlots += slots;

      const totalTc = Number(qm.total_training_cost) || slots * Number(qm.training_cost_per_capita || 0);
      const totalTsf = Number(qm.total_support_fund) || slots * Number(qm.support_fund_per_capita || 0);
      const totalBook = Number(qm.total_book_allowance) || slots * Number(qm.book_allowance || 0);
      const totalNewNormal =
        Number(qm.total_new_normal_assistance) || slots * Number(qm.new_normal_assistance || 0);
      const totalInsurance =
        Number(qm.total_annual_accident_insurance) || slots * Number(qm.annual_accident_insurance || 0);
      const totalEntrep = Number(qm.total_entrepreneurship_fee) || slots * Number(qm.entrepreneurship_fee || 0);
      const totalApproved =
        Number(qm.total_approved_amount) ||
        totalTc + totalTsf + totalBook + totalNewNormal + totalInsurance + totalEntrep;

      totalBudget += totalApproved;
      if (qm.provider_id) providerSet.add(qm.provider_id);
    });

    return {
      totalMaps: filteredQms.length,
      totalSlots,
      totalBudget,
      uniqueProviders: providerSet.size,
    };
  }, [filteredQms]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredQms.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedQms = filteredQms.slice(startIndex, startIndex + pageSize);

  const canEdit = user?.role === 'admin' || user?.role === 'evaluator';
  const canDelete = user?.role === 'admin';
  const isFilterActive = fiscalYearFilter !== 'all' || programFilter !== 'all' || searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setFiscalYearFilter('all');
    setProgramFilter('all');
    setSearchQuery('');
  };

  // Live Modal Cost Calculation
  const modalTotalTC = form.total_slots * form.training_cost_per_capita;
  const modalTotalTSF = form.total_slots * form.support_fund_per_capita;
  const modalTotalBook = isPesfa ? form.total_slots * form.book_allowance : 0;
  const modalTotalNewNormal = isCfsp ? form.total_slots * form.new_normal_assistance : 0;
  const modalTotalInsurance = isCfsp ? form.total_slots * form.annual_accident_insurance : 0;
  const modalTotalEntrep = isEntrepApplicable ? form.total_slots * form.entrepreneurship_fee : 0;
  const modalTotalApproved =
    modalTotalTC + modalTotalTSF + modalTotalBook + modalTotalNewNormal + modalTotalInsurance + modalTotalEntrep;

  return (
    <div className="qm-page">
      {/* ─── 1. Page Header ─────────────────────────────────────────── */}
      <div className="qm-header">
        <div className="qm-header-left">
          <h2 className="qm-title">
            <span className="qm-title-icon">📋</span>
            Qualification Maps Management
          </h2>
          <p className="qm-subtitle">Manage approved scholarship qualification allocations and funding details</p>
        </div>
        {canEdit && (
          <button className="btn-add-qm" onClick={() => handleOpenModal()} id="btn-add-qualification-map">
            <span>+</span> Add Qualification Map
          </button>
        )}
      </div>

      {/* ─── 2. Metric / Summary Cards ──────────────────────────────── */}
      <div className="qm-metrics-grid">
        <div className="qm-metric-card qm-metric--maps">
          <div className="qm-metric-content">
            <span className="qm-metric-label">Qualification Maps</span>
            <span className="qm-metric-value">{metrics.totalMaps}</span>
          </div>
          <div className="qm-metric-icon">📑</div>
        </div>

        <div className="qm-metric-card qm-metric--slots">
          <div className="qm-metric-content">
            <span className="qm-metric-label">Total Approved Slots</span>
            <span className="qm-metric-value">{metrics.totalSlots.toLocaleString()}</span>
          </div>
          <div className="qm-metric-icon">👥</div>
        </div>

        <div className="qm-metric-card qm-metric--budget">
          <div className="qm-metric-content">
            <span className="qm-metric-label">Total Approved Budget</span>
            <span className="qm-metric-value">{formatCurrencyStrict(metrics.totalBudget)}</span>
          </div>
          <div className="qm-metric-icon">₱</div>
        </div>

        <div className="qm-metric-card qm-metric--providers">
          <div className="qm-metric-content">
            <span className="qm-metric-label">Training Providers</span>
            <span className="qm-metric-value">{metrics.uniqueProviders}</span>
          </div>
          <div className="qm-metric-icon">🏛️</div>
        </div>
      </div>

      {/* ─── 3. Filter & Search Toolbar ─────────────────────────────── */}
      <div className="qm-toolbar">
        <div className="qm-toolbar-left">
          {/* Search Box */}
          <div className="qm-search-wrapper">
            <span className="qm-search-icon">🔍</span>
            <input
              type="text"
              className="qm-search-input"
              placeholder="Search RQM code, provider, qualification, program..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="qm-search-input"
            />
            {searchQuery && (
              <button
                className="qm-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Fiscal Year Filter */}
          <select
            className="qm-select-filter"
            value={fiscalYearFilter}
            onChange={(e) => setFiscalYearFilter(e.target.value)}
            id="qm-fiscal-year-filter"
            aria-label="Filter by Fiscal Year"
          >
            <option value="all">All Fiscal Years</option>
            <option value="FY 2026">FY 2026 (Current)</option>
            <option value="FY 2025">FY 2025 (Continuing)</option>
          </select>

          {/* Scholarship Program Filter */}
          <select
            className="qm-select-filter"
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            id="qm-program-filter"
            aria-label="Filter by Scholarship Program"
          >
            <option value="all">All Scholarship Programs</option>
            {SCHOLARSHIP_PROGRAMS_LIST.map((prog) => (
              <option key={prog} value={prog}>
                {prog}
              </option>
            ))}
          </select>

          {/* Reset Filters Button */}
          {isFilterActive && (
            <button className="qm-btn-reset-filters" onClick={handleResetFilters} title="Reset all active filters">
              <span>✕</span> Reset Filters
            </button>
          )}
        </div>

        <div className="qm-toolbar-right">
          <span className="qm-results-badge">
            {filteredQms.length} {filteredQms.length === 1 ? 'record' : 'records'}
          </span>
        </div>
      </div>

      {/* ─── 4. Table Card & Grouped Two-Level Header ───────────────── */}
      <div className="qm-table-card">
        {loading ? (
          <div className="qm-loading-wrap">
            <div className="qm-spinner" />
            <span>Loading qualification maps...</span>
          </div>
        ) : (
          <>
            <div className="qm-table-scroll">
              <table className="qm-table">
                <thead>
                  {/* Two-level super header row */}
                  <tr className="qm-table-super-header">
                    <th colSpan={5} className="qm-super-info">
                      Qualification Information
                    </th>
                    <th colSpan={1} className="qm-super-alloc">
                      Allocation
                    </th>
                    <th colSpan={6} className="qm-super-funding">
                      Funding Details
                    </th>
                    <th colSpan={1} className="qm-super-total">
                      Total
                    </th>
                    {(canEdit || canDelete) && (
                      <th colSpan={1} className="qm-super-actions">
                        Actions
                      </th>
                    )}
                  </tr>

                  {/* Individual column header row */}
                  <tr className="qm-table-col-header">
                    <th>RQM Code</th>
                    <th>Fiscal Year</th>
                    <th>Scholarship Program</th>
                    <th>Training Provider</th>
                    <th>TVET Qualification</th>
                    <th className="qm-th-center">Approved Slots</th>
                    <th className="qm-th-right">Total Training Cost</th>
                    <th className="qm-th-right">Total Support Fund</th>
                    <th className="qm-th-right">Total Book Allow.</th>
                    <th className="qm-th-right">Total New Normal</th>
                    <th className="qm-th-right">Total Accident Ins.</th>
                    <th className="qm-th-right">Total Entrep. Fee</th>
                    <th className="qm-th-right qm-th-total">Total Approved Amount</th>
                    {(canEdit || canDelete) && <th className="qm-th-center">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedQms.length === 0 ? (
                    <tr>
                      <td colSpan={canEdit || canDelete ? 14 : 13} style={{ padding: 0 }}>
                        <div className="qm-empty-state">
                          <div className="qm-empty-icon">📋</div>
                          <h4 className="qm-empty-title">No Qualification Maps Found</h4>
                          <p className="qm-empty-desc">
                            {isFilterActive
                              ? 'No records match your active search and filter criteria. Try resetting filters.'
                              : 'No qualification maps available. Get started by adding a new qualification map.'}
                          </p>
                          {isFilterActive ? (
                            <button className="qm-btn-secondary" onClick={handleResetFilters}>
                              Clear Filters
                            </button>
                          ) : (
                            canEdit && (
                              <button className="btn-add-qm" onClick={() => handleOpenModal()}>
                                + Add Qualification Map
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedQms.map((qm) => {
                      const slots = Number(qm.total_slots) || 0;
                      const totalTc =
                        Number(qm.total_training_cost) || slots * Number(qm.training_cost_per_capita || 0);
                      const totalTsf =
                        Number(qm.total_support_fund) || slots * Number(qm.support_fund_per_capita || 0);
                      const totalBook =
                        Number(qm.total_book_allowance) || slots * Number(qm.book_allowance || 0);
                      const totalNewNormal =
                        Number(qm.total_new_normal_assistance) ||
                        slots * Number(qm.new_normal_assistance || 0);
                      const totalInsurance =
                        Number(qm.total_annual_accident_insurance) ||
                        slots * Number(qm.annual_accident_insurance || 0);
                      const totalEntrep =
                        Number(qm.total_entrepreneurship_fee) ||
                        slots * Number(qm.entrepreneurship_fee || 0);
                      const totalApproved =
                        Number(qm.total_approved_amount) ||
                        totalTc + totalTsf + totalBook + totalNewNormal + totalInsurance + totalEntrep;

                      const isCurrentYear = qm.fiscal_year === 'FY 2026' || !qm.fiscal_year;

                      return (
                        <tr key={qm.qm_id}>
                          {/* RQM Code */}
                          <td className="qm-td-rqm">{qm.rqm_code || '—'}</td>

                          {/* Fiscal Year */}
                          <td>
                            <span
                              className={`qm-fy-badge ${
                                isCurrentYear ? 'qm-fy-badge--current' : 'qm-fy-badge--continuing'
                              }`}
                            >
                              {qm.fiscal_year || 'FY 2026'}
                            </span>
                          </td>

                          {/* Scholarship Program */}
                          <td className="qm-td-program">{qm.program_name || '—'}</td>

                          {/* Training Provider */}
                          <td className="qm-td-provider">{qm.institution_name || '—'}</td>

                          {/* TVET Qualification */}
                          <td className="qm-td-qualification">{qm.tvet_qualification}</td>

                          {/* Approved Slots */}
                          <td className="qm-td-slots">
                            <span className="qm-slots-badge">{slots}</span>
                          </td>

                          {/* Funding Details */}
                          <td className="qm-td-currency">{formatCurrency(totalTc)}</td>
                          <td className="qm-td-currency">{formatCurrency(totalTsf)}</td>
                          <td className={totalBook > 0 ? 'qm-td-currency' : 'qm-td-empty-val'}>
                            {formatCurrency(totalBook)}
                          </td>
                          <td className={totalNewNormal > 0 ? 'qm-td-currency' : 'qm-td-empty-val'}>
                            {formatCurrency(totalNewNormal)}
                          </td>
                          <td className={totalInsurance > 0 ? 'qm-td-currency' : 'qm-td-empty-val'}>
                            {formatCurrency(totalInsurance)}
                          </td>
                          <td className={totalEntrep > 0 ? 'qm-td-currency' : 'qm-td-empty-val'}>
                            {formatCurrency(totalEntrep)}
                          </td>

                          {/* Total Approved Amount */}
                          <td className="qm-td-total-approved">{formatCurrencyStrict(totalApproved)}</td>

                          {/* Actions */}
                          {(canEdit || canDelete) && (
                            <td className="qm-actions-cell">
                              <div className="qm-actions-wrap">
                                {canEdit && (
                                  <button
                                    className="qm-btn-action qm-btn-edit"
                                    onClick={() => handleOpenModal(qm)}
                                    title="Edit Qualification Map"
                                    aria-label="Edit Qualification Map"
                                  >
                                    ✏ Edit
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    className="qm-btn-action qm-btn-delete"
                                    onClick={() => handleDelete(qm.qm_id)}
                                    title="Delete Qualification Map"
                                    aria-label="Delete Qualification Map"
                                  >
                                    🗑 Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ─── 5. Pagination Bar ───────────────────────────────── */}
            {filteredQms.length > 0 && (
              <div className="qm-pagination">
                <div className="qm-pagination-info">
                  Showing <strong style={{ color: '#f8fafc' }}>{startIndex + 1}</strong> to{' '}
                  <strong style={{ color: '#f8fafc' }}>
                    {Math.min(startIndex + pageSize, filteredQms.length)}
                  </strong>{' '}
                  of <strong style={{ color: '#f8fafc' }}>{filteredQms.length}</strong> qualification maps
                </div>

                <div className="qm-pagination-controls">
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Rows per page:</span>
                  <select
                    className="qm-page-size-select"
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    aria-label="Select records per page"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>

                  <button
                    className="qm-page-btn"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    aria-label="Previous Page"
                  >
                    ‹ Prev
                  </button>

                  <span style={{ fontSize: '0.82rem', color: '#cbd5e1', padding: '0 4px' }}>
                    Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                  </span>

                  <button
                    className="qm-page-btn"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    aria-label="Next Page"
                  >
                    Next ›
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── 6. Add / Edit Qualification Map Modal ───────────────────── */}
      {showModal && (
        <div className="qm-modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="qm-modal-card" role="dialog" aria-modal="true" aria-labelledby="qm-modal-title">
            <div className="qm-modal-header">
              <h3 className="qm-modal-title" id="qm-modal-title">
                <span>{editingId ? '✏' : '➕'}</span>
                {editingId ? 'Edit Qualification Map' : 'Add Qualification Map'}
              </h3>
              <button
                className="qm-modal-close-btn"
                onClick={() => setShowModal(false)}
                aria-label="Close modal"
                title="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="qm-modal-form">
              <div className="qm-form-two-col">
                {/* ── Left Column: Scholarship / Program Information ── */}
                <div className="qm-form-col-left">
                  <div className="qm-section-title">
                    <span>📌</span> Scholarship & Program Details
                  </div>

                  {/* Scholarship Program */}
                  <div className="qm-form-group">
                    <label htmlFor="qm-form-program">
                      Scholarship Program <span className="required-star">*</span>
                    </label>
                    <select
                      id="qm-form-program"
                      className="qm-form-select"
                      value={form.program_name}
                      onChange={(e) => handleProgramChange(e.target.value)}
                      required
                    >
                      {SCHOLARSHIP_PROGRAMS_LIST.map((prog) => (
                        <option key={prog} value={prog}>
                          {prog}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Appropriation & Allocation */}
                  <div className="qm-form-row-2">
                    <div className="qm-form-group">
                      <label htmlFor="qm-form-appropriation">
                        Appropriation <span className="required-star">*</span>
                      </label>
                      <select
                        id="qm-form-appropriation"
                        className="qm-form-select"
                        value={form.appropriation}
                        onChange={(e) => handleAppropriationChange(e.target.value as any)}
                        required
                      >
                        <option value="Current">Current (FY 2026)</option>
                        <option value="Continuing">Continuing (FY 2025)</option>
                      </select>
                    </div>

                    <div className="qm-form-group">
                      <label htmlFor="qm-form-allocation">
                        Allocation <span className="required-star">*</span>
                      </label>
                      <select
                        id="qm-form-allocation"
                        className="qm-form-select"
                        value={form.allocation}
                        onChange={(e) => setForm({ ...form, allocation: e.target.value as any })}
                        required
                      >
                        <option value="RO">RO (Regional Office)</option>
                        <option value="CO">CO (Central Office)</option>
                      </select>
                    </div>
                  </div>

                  {/* RQM Code */}
                  <div className="qm-form-group">
                    <label htmlFor="qm-form-rqm-code">RQM Code</label>
                    <input
                      id="qm-form-rqm-code"
                      type="text"
                      className="qm-form-input"
                      value={form.rqm_code}
                      onChange={(e) => setForm({ ...form, rqm_code: e.target.value })}
                      placeholder="e.g. RQM11-2026-TWSP-1124-0001"
                    />
                  </div>

                  {/* ── Searchable Training Provider Record Selector ── */}
                  <div className="qm-form-group" ref={providerSelectorRef}>
                    <label htmlFor="qm-form-provider-btn">
                      Training Provider & TVET Qualification <span className="required-star">*</span>
                    </label>

                    <div className="qm-provider-selector-wrap">
                      {/* Trigger Button */}
                      <button
                        type="button"
                        id="qm-form-provider-btn"
                        className={`qm-provider-trigger ${isProviderDropdownOpen ? 'open' : ''}`}
                        onClick={() => setIsProviderDropdownOpen(!isProviderDropdownOpen)}
                        aria-expanded={isProviderDropdownOpen}
                        aria-haspopup="listbox"
                      >
                        {selectedProvider ? (
                          <div className="qm-provider-trigger-info">
                            <span className="qm-provider-trigger-title">
                              {selectedProvider.institution_name}
                            </span>
                            <span className="qm-provider-trigger-sub">
                              {selectedProvider.sector && <span>🏢 {selectedProvider.sector}</span>}
                              {selectedProvider.type_of_program && (
                                <span className="qm-provider-badge-program-type">
                                  {selectedProvider.type_of_program}
                                </span>
                              )}
                              {selectedProvider.qualification_title && (
                                <span>🎓 {selectedProvider.qualification_title}</span>
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="qm-provider-trigger-placeholder">
                            🔍 Search provider, sector, program type, or qualification...
                          </span>
                        )}
                        <span className={`qm-provider-trigger-arrow ${isProviderDropdownOpen ? 'open' : ''}`}>
                          ▼
                        </span>
                      </button>

                      {/* Dropdown Menu */}
                      {isProviderDropdownOpen && (
                        <div className="qm-provider-dropdown" role="listbox">
                          {/* Search Filter Box inside Dropdown */}
                          <div className="qm-provider-search-box">
                            <span className="qm-provider-search-icon">🔍</span>
                            <input
                              ref={providerSearchInputRef}
                              type="text"
                              className="qm-provider-search-input"
                              placeholder="Search provider, sector, program type, qualification..."
                              value={providerSearchQuery}
                              onChange={(e) => setProviderSearchQuery(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            {providerSearchQuery && (
                              <button
                                type="button"
                                className="qm-provider-search-clear"
                                onClick={() => setProviderSearchQuery('')}
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          {/* Options List */}
                          <div className="qm-provider-options-list">
                            {filteredProviders.length === 0 ? (
                              <div className="qm-provider-empty-msg">
                                No matching provider or qualification found for "{providerSearchQuery}".
                              </div>
                            ) : (
                              filteredProviders.map((pr) => {
                                const isSelected = pr.provider_id === form.provider_id;
                                return (
                                  <div
                                    key={pr.provider_id}
                                    className={`qm-provider-option-item ${isSelected ? 'selected' : ''}`}
                                    onClick={() => handleProviderSelect(pr)}
                                    role="option"
                                    aria-selected={isSelected}
                                  >
                                    <div className="qm-provider-option-title">
                                      {pr.institution_name}
                                    </div>
                                    <div className="qm-provider-option-meta">
                                      {pr.sector && (
                                        <span className="qm-provider-option-sector">{pr.sector}</span>
                                      )}
                                      {pr.type_of_program && (
                                        <span className="qm-provider-option-program-type">
                                          {pr.type_of_program}
                                        </span>
                                      )}
                                      {pr.qualification_title && (
                                        <span className="qm-provider-option-qual">
                                          🎓 {pr.qualification_title}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sector (Auto-populated from selected record, editable) */}
                  <div className="qm-form-group">
                    <label htmlFor="qm-form-sector">
                      Sector <span className="required-star">*</span>
                    </label>
                    <input
                      id="qm-form-sector"
                      type="text"
                      className="qm-form-input"
                      value={form.sector}
                      onChange={(e) => setForm({ ...form, sector: e.target.value })}
                      placeholder="e.g. Information and Communications Technology (ICT)"
                      required
                    />
                  </div>

                  {/* TVET Qualification Title (Auto-populated from selected record, editable) */}
                  <div className="qm-form-group">
                    <label htmlFor="qm-form-qualification">
                      TVET Qualification Title <span className="required-star">*</span>
                    </label>
                    <input
                      id="qm-form-qualification"
                      type="text"
                      className="qm-form-input"
                      value={form.tvet_qualification}
                      onChange={(e) => setForm({ ...form, tvet_qualification: e.target.value })}
                      placeholder="e.g. Computer Systems Servicing NC II"
                      required
                    />
                  </div>
                </div>

                {/* ── Right Column: Funding, Costs & Live Calculation ── */}
                <div className="qm-form-col-right">
                  <div className="qm-section-title">
                    <span>💰</span> Funding & Allocation Details
                  </div>

                  {/* Approved Slots, TC / Slot, TSF / Slot */}
                  <div className="qm-form-row-3">
                    <div className="qm-form-group">
                      <label htmlFor="qm-form-slots">
                        Approved Slots <span className="required-star">*</span>
                      </label>
                      <input
                        id="qm-form-slots"
                        type="number"
                        min="1"
                        className="qm-form-input"
                        value={form.total_slots}
                        onChange={(e) => setForm({ ...form, total_slots: parseInt(e.target.value, 10) || 0 })}
                        required
                      />
                    </div>

                    <div className="qm-form-group">
                      <label htmlFor="qm-form-tc">
                        TC / Slot (₱) <span className="required-star">*</span>
                      </label>
                      <input
                        id="qm-form-tc"
                        type="number"
                        min="0"
                        className="qm-form-input"
                        value={form.training_cost_per_capita}
                        onChange={(e) =>
                          setForm({ ...form, training_cost_per_capita: parseFloat(e.target.value) || 0 })
                        }
                        required
                      />
                    </div>

                    <div className="qm-form-group">
                      <label htmlFor="qm-form-tsf">TSF / Slot (₱)</label>
                      <input
                        id="qm-form-tsf"
                        type="number"
                        min="0"
                        className="qm-form-input"
                        value={form.support_fund_per_capita}
                        onChange={(e) =>
                          setForm({ ...form, support_fund_per_capita: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>

                  {/* Conditional Program-Specific Costs */}
                  {(isPesfa || isCfsp || isEntrepApplicable) && (
                    <div className="qm-conditional-box">
                      <div className="qm-conditional-title">Program-Specific Cost Components</div>
                      <div className="qm-form-row-2">
                        {isPesfa && (
                          <div className="qm-form-group">
                            <label htmlFor="qm-form-book-allowance">Book Allowance (PESFA)</label>
                            <input
                              id="qm-form-book-allowance"
                              type="number"
                              min="0"
                              className="qm-form-input"
                              value={form.book_allowance}
                              onChange={(e) =>
                                setForm({ ...form, book_allowance: parseFloat(e.target.value) || 0 })
                              }
                            />
                          </div>
                        )}

                        {isCfsp && (
                          <>
                            <div className="qm-form-group">
                              <label htmlFor="qm-form-new-normal">New Normal Assist. (CFSP)</label>
                              <input
                                id="qm-form-new-normal"
                                type="number"
                                min="0"
                                className="qm-form-input"
                                value={form.new_normal_assistance}
                                onChange={(e) =>
                                  setForm({ ...form, new_normal_assistance: parseFloat(e.target.value) || 0 })
                                }
                              />
                            </div>

                            <div className="qm-form-group">
                              <label htmlFor="qm-form-insurance">Accident Insurance (CFSP)</label>
                              <input
                                id="qm-form-insurance"
                                type="number"
                                min="0"
                                className="qm-form-input"
                                value={form.annual_accident_insurance}
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    annual_accident_insurance: parseFloat(e.target.value) || 0,
                                  })
                                }
                              />
                            </div>
                          </>
                        )}

                        {isEntrepApplicable && (
                          <div className="qm-form-group">
                            <label htmlFor="qm-form-entrep">Entrepreneurship Fee (CFSP/STEP/RTES)</label>
                            <input
                              id="qm-form-entrep"
                              type="number"
                              min="0"
                              className="qm-form-input"
                              value={form.entrepreneurship_fee}
                              onChange={(e) =>
                                setForm({ ...form, entrepreneurship_fee: parseFloat(e.target.value) || 0 })
                              }
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Live Funding Summary Card ── */}
                  <div className="qm-summary-card">
                    <div className="qm-summary-header">
                      <span className="qm-summary-title">
                        <span>📊</span> Live Funding Summary
                      </span>
                      <div className="qm-summary-badges">
                        <span className="qm-fy-badge qm-fy-badge--current">{form.fiscal_year}</span>
                        <span className="qm-fy-badge qm-fy-badge--continuing">{form.allocation}</span>
                      </div>
                    </div>

                    <div className="qm-summary-row">
                      <span>Approved Slots:</span>
                      <span>{form.total_slots} slots</span>
                    </div>

                    <div className="qm-summary-row">
                      <span>Training Cost (TC):</span>
                      <span>
                        {form.total_slots} × {formatCurrencyStrict(form.training_cost_per_capita)} ={' '}
                        {formatCurrencyStrict(modalTotalTC)}
                      </span>
                    </div>

                    <div className="qm-summary-row">
                      <span>Training Support Fund (TSF):</span>
                      <span>
                        {form.total_slots} × {formatCurrencyStrict(form.support_fund_per_capita)} ={' '}
                        {formatCurrencyStrict(modalTotalTSF)}
                      </span>
                    </div>

                    {modalTotalBook > 0 && (
                      <div className="qm-summary-row">
                        <span>Book Allowance:</span>
                        <span>{formatCurrencyStrict(modalTotalBook)}</span>
                      </div>
                    )}

                    {modalTotalNewNormal > 0 && (
                      <div className="qm-summary-row">
                        <span>New Normal Assistance:</span>
                        <span>{formatCurrencyStrict(modalTotalNewNormal)}</span>
                      </div>
                    )}

                    {modalTotalInsurance > 0 && (
                      <div className="qm-summary-row">
                        <span>Accident Insurance:</span>
                        <span>{formatCurrencyStrict(modalTotalInsurance)}</span>
                      </div>
                    )}

                    {modalTotalEntrep > 0 && (
                      <div className="qm-summary-row">
                        <span>Entrepreneurship Fee:</span>
                        <span>{formatCurrencyStrict(modalTotalEntrep)}</span>
                      </div>
                    )}

                    <div className="qm-summary-divider" />

                    <div className="qm-summary-total-row">
                      <div className="qm-summary-total-label">
                        <span className="qm-summary-total-label-text">Total Approved Amount</span>
                        <span className="qm-summary-total-formula">Slots × ∑ Unit Costs</span>
                      </div>
                      <div className="qm-summary-total-amount">{formatCurrencyStrict(modalTotalApproved)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="qm-modal-footer">
                <button
                  type="button"
                  className="qm-btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="qm-btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Update Qualification Map' : 'Save Qualification Map'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
