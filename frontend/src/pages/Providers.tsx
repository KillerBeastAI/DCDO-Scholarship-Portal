import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { TrainingProvider } from '../types';
import { AIImportModal } from '../components/AIImportModal';
import './Providers.css';

type SortField =
  | 'institution_name'
  | 'qualification_title'
  | 'type_of_program'
  | 'sector'
  | 'training_duration_hours'
  | 'date_of_expiration'
  | 'status';

type SortDirection = 'asc' | 'desc';

interface FilterState {
  providerTypes: string[];
  classifications: string[];
  programTypes: string[];
  sectors: string[];
  statuses: string[];
  dateFrom: string;
  dateTo: string;
  hasPrn: 'all' | 'with' | 'without';
  hasSil: 'all' | 'with' | 'without';
}

const initialFilterState: FilterState = {
  providerTypes: [],
  classifications: [],
  programTypes: [],
  sectors: [],
  statuses: [],
  dateFrom: '',
  dateTo: '',
  hasPrn: 'all',
  hasSil: 'all',
};

export const Providers: React.FC = () => {
  const { user } = useAuth();
  const [providers, setProviders] = useState<TrainingProvider[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Quick Filters
  const [search, setSearch] = useState('');
  const [quickStatus, setQuickStatus] = useState<string>('all');
  const [quickClassification, setQuickClassification] = useState<string>('all');
  const [quickProgramType, setQuickProgramType] = useState<string>('all');
  const [quickSector, setQuickSector] = useState<string>('all');

  // Advanced Filter Drawer State
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [drawerFilters, setDrawerFilters] = useState<FilterState>(initialFilterState);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(initialFilterState);

  // View Mode: 'grouped' | 'flat'
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Sorting & Pagination
  const [sortField, setSortField] = useState<SortField>('institution_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modals & Drawers
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAIImport, setShowAIImport] = useState(false);
  const [detailsDrawerItem, setDetailsDrawerItem] = useState<TrainingProvider | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Copied tooltip state
  const [copiedPrn, setCopiedPrn] = useState<string | null>(null);

  // Add/Edit Form State
  const emptyForm = {
    institution_name: '',
    email_website_fb: '',
    institution_type: 'Private',
    classification: 'TVI',
    type_of_program: 'IBT',
    sector: '',
    qualification_title: '',
    training_duration_hours: '' as string | number,
    sil_duration_hours: '' as string | number,
    program_registration_number: '',
    date_of_expiration: '',
    school_id: '',
    complete_address: '',
    contact_number: '',
  };
  const [form, setForm] = useState(emptyForm);

  // Close 3-dot menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.action-menu-wrapper')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Fetch Providers Data
  const fetchProviders = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ data: TrainingProvider[] }>('/training-providers');
      setProviders(data.data || []);
      // Expand all groups by default
      const groups: Record<string, boolean> = {};
      (data.data || []).forEach((p) => {
        groups[p.institution_name] = true;
      });
      setExpandedGroups(groups);
    } catch (err) {
      console.error('Failed to fetch training providers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  // Helper: Expiration Calculation
  const getExpirationInfo = (dateStr?: string | null) => {
    if (!dateStr) return { status: 'none', daysLeft: null, text: 'No date' };
    const expDate = new Date(dateStr);
    if (isNaN(expDate.getTime())) return { status: 'none', daysLeft: null, text: dateStr };

    expDate.setHours(23, 59, 59, 999);
    const now = new Date();
    const diffMs = expDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return { status: 'expired', daysLeft, text: `${Math.abs(daysLeft)}d expired` };
    } else if (daysLeft <= 90) {
      return { status: 'expiring', daysLeft, text: `${daysLeft}d left` };
    }
    return { status: 'valid', daysLeft, text: 'Valid' };
  };

  // Helper: Format readable date
  const formatDisplayDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // KPI Calculations
  const metrics = useMemo(() => {
    const distinctProviders = new Set(providers.map((p) => p.institution_name.trim().toLowerCase())).size;
    const totalPrograms = providers.length;
    const activePrograms = providers.filter((p) => p.status === 'active').length;
    const expiringSoon = providers.filter((p) => {
      const info = getExpirationInfo(p.date_of_expiration);
      return info.status === 'expiring';
    }).length;

    return { distinctProviders, totalPrograms, activePrograms, expiringSoon };
  }, [providers]);

  // Unique lists for dropdowns
  const availableSectors = useMemo(() => {
    const s = new Set<string>();
    providers.forEach((p) => {
      if (p.sector && p.sector.trim()) s.add(p.sector.trim());
    });
    return Array.from(s).sort();
  }, [providers]);

  const availableClassifications = useMemo(() => {
    const c = new Set<string>();
    providers.forEach((p) => {
      if (p.classification && p.classification.trim()) c.add(p.classification.trim());
    });
    return Array.from(c).sort();
  }, [providers]);

  const availableProgramTypes = useMemo(() => {
    const t = new Set<string>();
    providers.forEach((p) => {
      if (p.type_of_program && p.type_of_program.trim()) t.add(p.type_of_program.trim());
    });
    return Array.from(t).sort();
  }, [providers]);

  // Check if any advanced drawer filters are active
  const isAdvancedFiltersActive = useMemo(() => {
    return (
      appliedFilters.providerTypes.length > 0 ||
      appliedFilters.classifications.length > 0 ||
      appliedFilters.programTypes.length > 0 ||
      appliedFilters.sectors.length > 0 ||
      appliedFilters.statuses.length > 0 ||
      appliedFilters.dateFrom !== '' ||
      appliedFilters.dateTo !== '' ||
      appliedFilters.hasPrn !== 'all' ||
      appliedFilters.hasSil !== 'all'
    );
  }, [appliedFilters]);

  // Filter & Search Pipeline
  const filteredProviders = useMemo(() => {
    return providers.filter((p) => {
      // 1. Text Search across 5 key fields
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = p.institution_name?.toLowerCase().includes(q);
        const matchesQual = p.qualification_title?.toLowerCase().includes(q);
        const matchesPrn = p.program_registration_number?.toLowerCase().includes(q);
        const matchesEmail = p.email_website_fb?.toLowerCase().includes(q);
        const matchesSector = p.sector?.toLowerCase().includes(q);
        const matchesSchoolId = p.school_id?.toLowerCase().includes(q);
        if (!matchesName && !matchesQual && !matchesPrn && !matchesEmail && !matchesSector && !matchesSchoolId) {
          return false;
        }
      }

      // 2. Quick Status Filter
      if (quickStatus !== 'all') {
        if (quickStatus === 'expiring_soon') {
          const exp = getExpirationInfo(p.date_of_expiration);
          if (exp.status !== 'expiring') return false;
        } else if (quickStatus === 'expired') {
          const exp = getExpirationInfo(p.date_of_expiration);
          if (exp.status !== 'expired') return false;
        } else if (p.status !== quickStatus) {
          return false;
        }
      }

      // 3. Quick Classification Filter
      if (quickClassification !== 'all' && p.classification !== quickClassification) {
        return false;
      }

      // 4. Quick Program Type Filter
      if (quickProgramType !== 'all' && (p.type_of_program || 'IBT') !== quickProgramType) {
        return false;
      }

      // 5. Quick Sector Filter
      if (quickSector !== 'all' && p.sector !== quickSector) {
        return false;
      }

      // 6. Advanced Drawer Filters
      if (appliedFilters.providerTypes.length > 0 && !appliedFilters.providerTypes.includes(p.institution_type)) {
        return false;
      }
      if (appliedFilters.classifications.length > 0 && !appliedFilters.classifications.includes(p.classification)) {
        return false;
      }
      if (
        appliedFilters.programTypes.length > 0 &&
        !appliedFilters.programTypes.includes(p.type_of_program || 'IBT')
      ) {
        return false;
      }
      if (appliedFilters.sectors.length > 0 && (!p.sector || !appliedFilters.sectors.includes(p.sector))) {
        return false;
      }
      if (appliedFilters.statuses.length > 0) {
        const exp = getExpirationInfo(p.date_of_expiration);
        const matchesStatus = appliedFilters.statuses.some((st) => {
          if (st === 'expiring_soon') return exp.status === 'expiring';
          if (st === 'expired') return exp.status === 'expired';
          return p.status === st;
        });
        if (!matchesStatus) return false;
      }
      if (appliedFilters.dateFrom && p.date_of_expiration) {
        if (new Date(p.date_of_expiration) < new Date(appliedFilters.dateFrom)) return false;
      }
      if (appliedFilters.dateTo && p.date_of_expiration) {
        if (new Date(p.date_of_expiration) > new Date(appliedFilters.dateTo)) return false;
      }
      if (appliedFilters.hasPrn === 'with' && (!p.program_registration_number || !p.program_registration_number.trim())) {
        return false;
      }
      if (appliedFilters.hasPrn === 'without' && p.program_registration_number && p.program_registration_number.trim()) {
        return false;
      }
      if (appliedFilters.hasSil === 'with' && (!p.sil_duration_hours || Number(p.sil_duration_hours) <= 0)) {
        return false;
      }
      if (appliedFilters.hasSil === 'without' && Number(p.sil_duration_hours) > 0) {
        return false;
      }

      return true;
    });
  }, [providers, search, quickStatus, quickClassification, quickProgramType, quickSector, appliedFilters]);

  // Sort Pipeline
  const sortedProviders = useMemo(() => {
    return [...filteredProviders].sort((a, b) => {
      let aVal: any = a[sortField] ?? '';
      let bVal: any = b[sortField] ?? '';

      if (sortField === 'training_duration_hours') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else if (sortField === 'date_of_expiration') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredProviders, sortField, sortDirection]);

  // Grouped structure: Map of Provider Name -> TrainingProvider[]
  const groupedData = useMemo(() => {
    const map = new Map<string, TrainingProvider[]>();
    sortedProviders.forEach((p) => {
      const name = p.institution_name.trim();
      if (!map.has(name)) map.set(name, []);
      map.get(name)!.push(p);
    });
    return Array.from(map.entries()).map(([providerName, programs]) => ({
      providerName,
      programs,
      institutionType: programs[0]?.institution_type || 'Private',
      classification: programs[0]?.classification || 'TVI',
      schoolId: programs[0]?.school_id || '',
    }));
  }, [sortedProviders]);

  // Pagination Slice
  const totalItems = viewMode === 'grouped' ? groupedData.length : sortedProviders.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedFlatData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedProviders.slice(start, start + pageSize);
  }, [sortedProviders, currentPage, pageSize]);

  const paginatedGroupData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return groupedData.slice(start, start + pageSize);
  }, [groupedData, currentPage, pageSize]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [search, quickStatus, quickClassification, quickProgramType, quickSector, appliedFilters, pageSize, viewMode]);

  // Sorting Toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Selection Logic
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleSelectGroup = (groupPrograms: TrainingProvider[]) => {
    const groupIds = groupPrograms.map((p) => p.provider_id);
    const allGroupSelected = groupIds.every((id) => selectedIds.includes(id));
    if (allGroupSelected) {
      setSelectedIds((prev) => prev.filter((id) => !groupIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...groupIds])));
    }
  };

  const allVisibleIds = useMemo(() => {
    return viewMode === 'grouped'
      ? paginatedGroupData.flatMap((g) => g.programs.map((p) => p.provider_id))
      : paginatedFlatData.map((p) => p.provider_id);
  }, [viewMode, paginatedGroupData, paginatedFlatData]);

  const isAllSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.includes(id));
  const isSomeSelected = selectedIds.length > 0 && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProviders.map((p) => p.provider_id));
    }
  };

  // Group Accordion Toggle
  const toggleGroupExpand = (name: string) => {
    setExpandedGroups((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  // Copy PRN to Clipboard
  const handleCopyPrn = (e: React.MouseEvent, prn?: string | null) => {
    e.stopPropagation();
    if (!prn) return;
    navigator.clipboard.writeText(prn);
    setCopiedPrn(prn);
    setTimeout(() => setCopiedPrn(null), 2000);
  };

  // Bulk Operations
  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    const confirmMsg =
      selectedIds.length === 1
        ? 'Are you sure you want to delete this 1 selected record?'
        : `Are you sure you want to delete these ${selectedIds.length} selected records?`;
    if (!window.confirm(confirmMsg)) return;

    setBulkDeleting(true);
    try {
      await api.post('/training-providers/bulk-delete', { ids: selectedIds });
      setSelectedIds([]);
      await fetchProviders();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete training providers');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleExportSelectedCSV = () => {
    const targetRows = selectedIds.length > 0 ? providers.filter((p) => selectedIds.includes(p.provider_id)) : sortedProviders;
    if (!targetRows.length) return;

    const headers = [
      'Institution Name',
      'Institution Type',
      'Classification',
      'Type of Program',
      'Sector',
      'Qualification Title',
      'Training Duration (Hours)',
      'SIL Duration (Hours)',
      'Program Registration Number',
      'Date of Expiration',
      'School ID',
      'Complete Address',
      'Contact Number',
      'Email / Website / Facebook',
      'Status',
    ];

    const csvContent = [
      headers.join(','),
      ...targetRows.map((r) =>
        [
          `"${(r.institution_name || '').replace(/"/g, '""')}"`,
          `"${r.institution_type || ''}"`,
          `"${r.classification || ''}"`,
          `"${r.type_of_program || ''}"`,
          `"${(r.sector || '').replace(/"/g, '""')}"`,
          `"${(r.qualification_title || '').replace(/"/g, '""')}"`,
          r.training_duration_hours ?? 0,
          r.sil_duration_hours ?? 0,
          `"${r.program_registration_number || ''}"`,
          `"${r.date_of_expiration || ''}"`,
          `"${r.school_id || ''}"`,
          `"${(r.complete_address || '').replace(/"/g, '""')}"`,
          `"${(r.contact_number || '').replace(/"/g, '""')}"`,
          `"${(r.email_website_fb || '').replace(/"/g, '""')}"`,
          `"${r.status || ''}"`,
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Training_Providers_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintSelected = () => {
    window.print();
  };

  // Clear All Filters
  const handleClearAllFilters = () => {
    setSearch('');
    setQuickStatus('all');
    setQuickClassification('all');
    setQuickProgramType('all');
    setQuickSector('all');
    setAppliedFilters(initialFilterState);
    setDrawerFilters(initialFilterState);
  };

  // Add / Edit Modal Handlers
  const handleOpenModal = (provider?: TrainingProvider) => {
    if (provider) {
      setEditingId(provider.provider_id);
      setForm({
        institution_name: provider.institution_name,
        email_website_fb: provider.email_website_fb || '',
        institution_type: provider.institution_type,
        classification: provider.classification,
        type_of_program: provider.type_of_program || 'IBT',
        sector: provider.sector || '',
        qualification_title: provider.qualification_title || '',
        training_duration_hours: provider.training_duration_hours ?? '',
        sil_duration_hours: provider.sil_duration_hours ?? '',
        program_registration_number: provider.program_registration_number || '',
        date_of_expiration: provider.date_of_expiration || '',
        school_id: provider.school_id || '',
        complete_address: provider.complete_address || '',
        contact_number: provider.contact_number || '',
      });
    } else {
      setEditingId(null);
      setForm(emptyForm);
    }
    setShowModal(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        ...form,
        training_duration_hours: form.training_duration_hours ? Number(form.training_duration_hours) : 0,
        sil_duration_hours: form.sil_duration_hours ? Number(form.sil_duration_hours) : 0,
      };

      if (editingId) {
        await api.put(`/training-providers/${editingId}`, payload);
      } else {
        await api.post('/training-providers', payload);
      }
      setShowModal(false);
      fetchProviders();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save training provider');
    }
  };

  const handleDeleteSingle = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this training provider program?')) return;
    try {
      await api.delete(`/training-providers/${id}`);
      fetchProviders();
      if (detailsDrawerItem?.provider_id === id) setDetailsDrawerItem(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete record');
    }
  };

  const canEdit = user?.role === 'admin' || user?.role === 'evaluator';
  const canDelete = user?.role === 'admin';

  return (
    <div className="providers-page">
      {/* ─── 1. Page Header ─────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title-text">Training Providers Directory</h1>
          <div className="page-subtitle-text">
            Registered Technical Vocational Institutions and Higher Education Programs
          </div>
        </div>
        {canEdit && (
          <div className="header-action-buttons">
            <button className="btn-ai-import" onClick={() => setShowAIImport(true)}>
              <span>✨</span>
              <span>Import Excel</span>
            </button>
            <button className="btn-add-provider" onClick={() => handleOpenModal()}>
              <span>+</span>
              <span>Add Provider</span>
            </button>
          </div>
        )}
      </div>

      {/* ─── 2. Live Dynamic Summary Cards ──────────────────────────── */}
      <div className="summary-cards-grid">
        <div className="kpi-card kpi-card--providers">
          <div className="kpi-card-content">
            <span className="kpi-label">Total Providers</span>
            <div className="kpi-value">
              {loading ? <span className="skeleton-box" style={{ width: '48px', height: '32px' }} /> : metrics.distinctProviders}
            </div>
          </div>
          <div className="kpi-icon-wrap">🏛️</div>
        </div>

        <div className="kpi-card kpi-card--programs">
          <div className="kpi-card-content">
            <span className="kpi-label">Total Programs</span>
            <div className="kpi-value">
              {loading ? <span className="skeleton-box" style={{ width: '56px', height: '32px' }} /> : metrics.totalPrograms}
            </div>
          </div>
          <div className="kpi-icon-wrap">📚</div>
        </div>

        <div className="kpi-card kpi-card--active">
          <div className="kpi-card-content">
            <span className="kpi-label">Active Programs</span>
            <div className="kpi-value">
              {loading ? <span className="skeleton-box" style={{ width: '52px', height: '32px' }} /> : metrics.activePrograms}
            </div>
          </div>
          <div className="kpi-icon-wrap">🟢</div>
        </div>

        <div className="kpi-card kpi-card--expiring">
          <div className="kpi-card-content">
            <span className="kpi-label">Expiring Soon</span>
            <div className="kpi-value">
              {loading ? <span className="skeleton-box" style={{ width: '44px', height: '32px' }} /> : metrics.expiringSoon}
            </div>
          </div>
          <div className="kpi-icon-wrap">⏳</div>
        </div>
      </div>

      {/* ─── 3. Search & Filters Toolbar ────────────────────────────── */}
      <div className="toolbar-container">
        <div className="toolbar-top-row">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input-field"
              placeholder="Search provider, qualification, PRN, sector, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="quick-filters-group">
            <select
              className="quick-select"
              value={quickStatus}
              onChange={(e) => setQuickStatus(e.target.value)}
              title="Filter by Status"
            >
              <option value="all">Status: All</option>
              <option value="active">Active</option>
              <option value="expiring_soon">Expiring Soon (&le; 90d)</option>
              <option value="expired">Expired</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>

            <select
              className="quick-select"
              value={quickClassification}
              onChange={(e) => setQuickClassification(e.target.value)}
              title="Filter by Classification"
            >
              <option value="all">Classification: All</option>
              {availableClassifications.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              className="quick-select"
              value={quickProgramType}
              onChange={(e) => setQuickProgramType(e.target.value)}
              title="Filter by Program Type"
            >
              <option value="all">Program Type: All</option>
              {availableProgramTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              className="quick-select"
              value={quickSector}
              onChange={(e) => setQuickSector(e.target.value)}
              title="Filter by Sector"
            >
              <option value="all">Sector: All</option>
              {availableSectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <button
              className={`btn-more-filters ${isAdvancedFiltersActive ? 'active' : ''}`}
              onClick={() => {
                setDrawerFilters(appliedFilters);
                setShowFilterDrawer(true);
              }}
            >
              <span>⚙ More Filters</span>
              {isAdvancedFiltersActive && <span className="filter-active-dot" />}
            </button>

            <div className="view-mode-toggle">
              <button
                className={`view-mode-btn ${viewMode === 'grouped' ? 'active' : ''}`}
                onClick={() => setViewMode('grouped')}
                title="Group programs under same provider"
              >
                Group by Provider
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'flat' ? 'active' : ''}`}
                onClick={() => setViewMode('flat')}
                title="Flat table view"
              >
                Flat View
              </button>
            </div>
          </div>
        </div>

        {/* ─── 4. Bulk Actions Toolbar (Visible when items selected) ──── */}
        {selectedIds.length > 0 && (
          <div className="bulk-toolbar">
            <div className="bulk-toolbar-info">
              <span className="bulk-count-badge">{selectedIds.length} Selected</span>
              <span style={{ fontSize: '0.82rem', color: '#c7d2fe' }}>
                out of {filteredProviders.length} total records
              </span>
            </div>

            <div className="bulk-toolbar-actions">
              <button className="btn-bulk-action" onClick={handleExportSelectedCSV}>
                <span>📥</span> Export Selected
              </button>
              <button className="btn-bulk-action" onClick={handlePrintSelected}>
                <span>🖨️</span> Print / Report
              </button>
              {canDelete && (
                <button className="btn-bulk-delete" disabled={bulkDeleting} onClick={handleBulkDelete}>
                  <span>🗑️</span> {bulkDeleting ? 'Deleting…' : `Delete (${selectedIds.length})`}
                </button>
              )}
              <button className="btn-bulk-clear" onClick={() => setSelectedIds([])}>
                Deselect All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── 5. Main Directory Table ────────────────────────────────── */}
      <div className="table-card">
        <div className="table-scroll-wrapper">
          <table className="directory-table">
            <thead>
              <tr>
                <th className="col-checkbox">
                  <input
                    type="checkbox"
                    className="custom-checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeSelected;
                    }}
                    onChange={handleToggleSelectAll}
                    title="Select all visible items"
                  />
                </th>
                <th className="sortable" onClick={() => handleSort('institution_name')}>
                  Training Provider
                  {sortField === 'institution_name' && (
                    <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th className="sortable" onClick={() => handleSort('qualification_title')}>
                  Program / Qualification
                  {sortField === 'qualification_title' && (
                    <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th>Classification</th>
                <th className="sortable" onClick={() => handleSort('type_of_program')}>
                  Program Type
                  {sortField === 'type_of_program' && (
                    <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th className="sortable" onClick={() => handleSort('sector')}>
                  Sector
                  {sortField === 'sector' && (
                    <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th style={{ textAlign: 'right' }} className="sortable" onClick={() => handleSort('training_duration_hours')}>
                  Training Hrs
                  {sortField === 'training_duration_hours' && (
                    <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th>PRN</th>
                <th className="sortable" onClick={() => handleSort('date_of_expiration')}>
                  Expiration
                  {sortField === 'date_of_expiration' && (
                    <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th className="sortable" onClick={() => handleSort('status')}>
                  Status
                  {sortField === 'status' && (
                    <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                // Skeleton Rows
                Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`}>
                    <td className="col-checkbox">
                      <span className="skeleton-box" style={{ width: '16px', height: '16px' }} />
                    </td>
                    <td>
                      <div className="provider-cell">
                        <span className="skeleton-box" style={{ width: '180px', height: '16px' }} />
                        <span className="skeleton-box" style={{ width: '110px', height: '12px' }} />
                      </div>
                    </td>
                    <td>
                      <span className="skeleton-box" style={{ width: '190px', height: '16px' }} />
                    </td>
                    <td>
                      <span className="skeleton-box" style={{ width: '45px', height: '22px' }} />
                    </td>
                    <td>
                      <span className="skeleton-box" style={{ width: '50px', height: '22px' }} />
                    </td>
                    <td>
                      <span className="skeleton-box" style={{ width: '120px', height: '16px' }} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="skeleton-box" style={{ width: '50px', height: '16px' }} />
                    </td>
                    <td>
                      <span className="skeleton-box" style={{ width: '110px', height: '22px' }} />
                    </td>
                    <td>
                      <span className="skeleton-box" style={{ width: '80px', height: '16px' }} />
                    </td>
                    <td>
                      <span className="skeleton-box" style={{ width: '60px', height: '20px' }} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="skeleton-box" style={{ width: '28px', height: '28px' }} />
                    </td>
                  </tr>
                ))
              ) : filteredProviders.length === 0 ? (
                // Empty State
                <tr>
                  <td colSpan={11}>
                    <div className="empty-state-wrap">
                      <div className="empty-state-icon">🏛️</div>
                      <h3 className="empty-state-title">No training providers found</h3>
                      <p className="empty-state-subtitle">
                        Try changing your search keywords or adjusting your filter criteria.
                      </p>
                      <button className="btn-drawer-clear" style={{ marginTop: '8px' }} onClick={handleClearAllFilters}>
                        Clear All Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : viewMode === 'grouped' ? (
                // ─── Grouped Accordion Rows ─────────────────────────────
                paginatedGroupData.map((group) => {
                  const isExpanded = expandedGroups[group.providerName] !== false;
                  const groupSelected = group.programs.every((p) => selectedIds.includes(p.provider_id));
                  const groupPartiallySelected =
                    !groupSelected && group.programs.some((p) => selectedIds.includes(p.provider_id));

                  return (
                    <React.Fragment key={`group-${group.providerName}`}>
                      {/* Group Header Row */}
                      <tr className="group-header-row" onClick={() => toggleGroupExpand(group.providerName)}>
                        <td className="col-checkbox" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="custom-checkbox"
                            checked={groupSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = groupPartiallySelected;
                            }}
                            onChange={() => handleSelectGroup(group.programs)}
                          />
                        </td>
                        <td colSpan={10}>
                          <div className="group-toggle-cell">
                            <span className={`group-chevron-icon ${isExpanded ? 'expanded' : ''}`}>▶</span>
                            <span className="provider-main-name" style={{ fontSize: '0.95rem' }}>
                              {group.providerName}
                            </span>
                            <span className="provider-submeta">
                              <span>{group.institutionType}</span>
                              <span className="provider-submeta-divider">·</span>
                              <span>{group.classification}</span>
                              {group.schoolId && (
                                <>
                                  <span className="provider-submeta-divider">·</span>
                                  <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{group.schoolId}</span>
                                </>
                              )}
                            </span>
                            <span className="group-program-badge">
                              {group.programs.length} {group.programs.length === 1 ? 'Program' : 'Programs'}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Child Program Rows */}
                      {isExpanded &&
                        group.programs.map((p) => {
                          const isSelected = selectedIds.includes(p.provider_id);
                          const expInfo = getExpirationInfo(p.date_of_expiration);

                          return (
                            <tr
                              key={p.provider_id}
                              className={`group-child-row ${isSelected ? 'row-selected' : ''}`}
                              onClick={() => setDetailsDrawerItem(p)}
                            >
                              <td className="col-checkbox" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  className="custom-checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelect(p.provider_id)}
                                />
                              </td>
                              <td>
                                <div style={{ paddingLeft: '14px', fontSize: '0.78rem', color: '#94a3b8' }}>
                                  ↳ {p.institution_name}
                                </div>
                              </td>
                              <td>
                                <div className="qualification-cell">
                                  <span className="qualification-main-title" title={p.qualification_title || '—'}>
                                    {p.qualification_title || '—'}
                                  </span>
                                  <span className="qualification-submeta">
                                    {p.training_duration_hours ? `${p.training_duration_hours} hrs` : 'No hours set'}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <span className="badge-classification">{p.classification || '—'}</span>
                              </td>
                              <td>
                                <span className="badge-prog-type">{p.type_of_program || 'IBT'}</span>
                              </td>
                              <td>
                                <span className="badge-sector" title={p.sector || '—'}>
                                  {p.sector || '—'}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <span className="hours-cell-text">
                                  {p.training_duration_hours ? `${p.training_duration_hours} hrs` : '—'}
                                </span>
                              </td>
                              <td onClick={(e) => e.stopPropagation()}>
                                {p.program_registration_number ? (
                                  <div className="prn-chip" title={p.program_registration_number}>
                                    <span className="prn-text">{p.program_registration_number}</span>
                                    <button
                                      className="prn-copy-btn"
                                      onClick={(e) => handleCopyPrn(e, p.program_registration_number)}
                                      title="Copy PRN"
                                    >
                                      {copiedPrn === p.program_registration_number ? '✓' : '📋'}
                                    </button>
                                  </div>
                                ) : (
                                  <span style={{ color: '#64748b' }}>—</span>
                                )}
                              </td>
                              <td>
                                <div className={`expiration-tag expiration-tag--${expInfo.status}`}>
                                  <span className="expiration-date-str">
                                    {formatDisplayDate(p.date_of_expiration)}
                                  </span>
                                  {expInfo.status !== 'none' && (
                                    <span className="expiration-remaining-pill">{expInfo.text}</span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <span className={`status-pill status-pill--${expInfo.status === 'expired' ? 'expired' : expInfo.status === 'expiring' ? 'expiring' : p.status}`}>
                                  <span className="status-dot" />
                                  <span>
                                    {expInfo.status === 'expired'
                                      ? 'Expired'
                                      : expInfo.status === 'expiring'
                                        ? 'Expiring'
                                        : p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                                  </span>
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                                <div className="action-menu-wrapper">
                                  <button
                                    className={`btn-action-dots ${activeMenuId === p.provider_id ? 'active' : ''}`}
                                    onClick={() => setActiveMenuId(activeMenuId === p.provider_id ? null : p.provider_id)}
                                  >
                                    ⋮
                                  </button>
                                  {activeMenuId === p.provider_id && (
                                    <div className="action-dropdown-popup">
                                      <button
                                        className="dropdown-item"
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          setDetailsDrawerItem(p);
                                        }}
                                      >
                                        🔍 View Details
                                      </button>
                                      {canEdit && (
                                        <button
                                          className="dropdown-item"
                                          onClick={() => {
                                            setActiveMenuId(null);
                                            handleOpenModal(p);
                                          }}
                                        >
                                          ✏️ Edit Program
                                        </button>
                                      )}
                                      {p.program_registration_number && (
                                        <button
                                          className="dropdown-item"
                                          onClick={(e) => {
                                            setActiveMenuId(null);
                                            handleCopyPrn(e, p.program_registration_number);
                                          }}
                                        >
                                          📋 Copy PRN
                                        </button>
                                      )}
                                      {canDelete && (
                                        <button
                                          className="dropdown-item dropdown-item--danger"
                                          onClick={() => {
                                            setActiveMenuId(null);
                                            handleDeleteSingle(p.provider_id);
                                          }}
                                        >
                                          🗑️ Delete Record
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </React.Fragment>
                  );
                })
              ) : (
                // ─── Flat View Rows ─────────────────────────────────────
                paginatedFlatData.map((p) => {
                  const isSelected = selectedIds.includes(p.provider_id);
                  const expInfo = getExpirationInfo(p.date_of_expiration);

                  return (
                    <tr
                      key={p.provider_id}
                      className={isSelected ? 'row-selected' : ''}
                      onClick={() => setDetailsDrawerItem(p)}
                    >
                      <td className="col-checkbox" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="custom-checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(p.provider_id)}
                        />
                      </td>
                      <td>
                        <div className="provider-cell">
                          <span className="provider-main-name">{p.institution_name}</span>
                          <span className="provider-submeta">
                            <span>{p.institution_type}</span>
                            <span className="provider-submeta-divider">·</span>
                            <span>{p.classification}</span>
                            {p.school_id && (
                              <>
                                <span className="provider-submeta-divider">·</span>
                                <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{p.school_id}</span>
                              </>
                            )}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="qualification-cell">
                          <span className="qualification-main-title" title={p.qualification_title || '—'}>
                            {p.qualification_title || '—'}
                          </span>
                          <span className="qualification-submeta">
                            {p.training_duration_hours ? `${p.training_duration_hours} hrs` : 'No hours set'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="badge-classification">{p.classification || '—'}</span>
                      </td>
                      <td>
                        <span className="badge-prog-type">{p.type_of_program || 'IBT'}</span>
                      </td>
                      <td>
                        <span className="badge-sector" title={p.sector || '—'}>
                          {p.sector || '—'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="hours-cell-text">
                          {p.training_duration_hours ? `${p.training_duration_hours} hrs` : '—'}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {p.program_registration_number ? (
                          <div className="prn-chip" title={p.program_registration_number}>
                            <span className="prn-text">{p.program_registration_number}</span>
                            <button
                              className="prn-copy-btn"
                              onClick={(e) => handleCopyPrn(e, p.program_registration_number)}
                              title="Copy PRN"
                            >
                              {copiedPrn === p.program_registration_number ? '✓' : '📋'}
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#64748b' }}>—</span>
                        )}
                      </td>
                      <td>
                        <div className={`expiration-tag expiration-tag--${expInfo.status}`}>
                          <span className="expiration-date-str">{formatDisplayDate(p.date_of_expiration)}</span>
                          {expInfo.status !== 'none' && (
                            <span className="expiration-remaining-pill">{expInfo.text}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill status-pill--${expInfo.status === 'expired' ? 'expired' : expInfo.status === 'expiring' ? 'expiring' : p.status}`}>
                          <span className="status-dot" />
                          <span>
                            {expInfo.status === 'expired'
                              ? 'Expired'
                              : expInfo.status === 'expiring'
                                ? 'Expiring'
                                : p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                          </span>
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div className="action-menu-wrapper">
                          <button
                            className={`btn-action-dots ${activeMenuId === p.provider_id ? 'active' : ''}`}
                            onClick={() => setActiveMenuId(activeMenuId === p.provider_id ? null : p.provider_id)}
                          >
                            ⋮
                          </button>
                          {activeMenuId === p.provider_id && (
                            <div className="action-dropdown-popup">
                              <button
                                className="dropdown-item"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setDetailsDrawerItem(p);
                                }}
                              >
                                🔍 View Details
                              </button>
                              {canEdit && (
                                <button
                                  className="dropdown-item"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    handleOpenModal(p);
                                  }}
                                >
                                  ✏️ Edit Program
                                </button>
                              )}
                              {p.program_registration_number && (
                                <button
                                  className="dropdown-item"
                                  onClick={(e) => {
                                    setActiveMenuId(null);
                                    handleCopyPrn(e, p.program_registration_number);
                                  }}
                                >
                                  📋 Copy PRN
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  className="dropdown-item dropdown-item--danger"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    handleDeleteSingle(p.provider_id);
                                  }}
                                >
                                  🗑️ Delete Record
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─── 6. Pagination ──────────────────────────────────────────── */}
        {!loading && filteredProviders.length > 0 && (
          <div className="pagination-container">
            <div className="pagination-summary-text">
              Showing {Math.min((currentPage - 1) * pageSize + 1, totalItems)}–
              {Math.min(currentPage * pageSize, totalItems)} of {totalItems}{' '}
              {viewMode === 'grouped' ? 'providers' : 'programs'} (Filtered from {providers.length} total)
            </div>

            <div className="pagination-controls-group">
              <label style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Rows per page:
                <select
                  className="per-page-select"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  style={{ marginLeft: '6px' }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>

              <button
                className="page-btn"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                ←
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                .map((pageNum, idx, arr) => (
                  <React.Fragment key={pageNum}>
                    {idx > 0 && pageNum - arr[idx - 1] > 1 && <span style={{ color: '#64748b' }}>…</span>}
                    <button
                      className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  </React.Fragment>
                ))}

              <button
                className="page-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── 7. Right-side Slide-Over Filter Drawer ─────────────────── */}
      {showFilterDrawer && (
        <div className="drawer-backdrop" onClick={() => setShowFilterDrawer(false)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3 className="drawer-title">Filter Directory</h3>
              <button className="drawer-close-btn" onClick={() => setShowFilterDrawer(false)}>
                ✕
              </button>
            </div>

            <div className="drawer-body">
              {/* Provider Type */}
              <div className="filter-section">
                <span className="filter-section-title">Provider Type</span>
                <div className="filter-checkbox-grid">
                  {['Public', 'Private', 'LGU-Run'].map((type) => (
                    <label key={type} className="filter-check-label">
                      <input
                        type="checkbox"
                        checked={drawerFilters.providerTypes.includes(type)}
                        onChange={(e) => {
                          setDrawerFilters((prev) => ({
                            ...prev,
                            providerTypes: e.target.checked
                              ? [...prev.providerTypes, type]
                              : prev.providerTypes.filter((t) => t !== type),
                          }));
                        }}
                      />
                      <span>{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Classification */}
              <div className="filter-section">
                <span className="filter-section-title">Classification</span>
                <div className="filter-checkbox-grid">
                  {['TTI', 'TVI', 'SUC', 'LUC', 'HEI', 'EBT', 'EBET'].map((cls) => (
                    <label key={cls} className="filter-check-label">
                      <input
                        type="checkbox"
                        checked={drawerFilters.classifications.includes(cls)}
                        onChange={(e) => {
                          setDrawerFilters((prev) => ({
                            ...prev,
                            classifications: e.target.checked
                              ? [...prev.classifications, cls]
                              : prev.classifications.filter((c) => c !== cls),
                          }));
                        }}
                      />
                      <span>{cls}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Program Type */}
              <div className="filter-section">
                <span className="filter-section-title">Program Type</span>
                <div className="filter-checkbox-grid">
                  {['IBT', 'MTP', 'EBET', 'Bundled', 'MCC', 'Diploma'].map((pt) => (
                    <label key={pt} className="filter-check-label">
                      <input
                        type="checkbox"
                        checked={drawerFilters.programTypes.includes(pt)}
                        onChange={(e) => {
                          setDrawerFilters((prev) => ({
                            ...prev,
                            programTypes: e.target.checked
                              ? [...prev.programTypes, pt]
                              : prev.programTypes.filter((t) => t !== pt),
                          }));
                        }}
                      />
                      <span>{pt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="filter-section">
                <span className="filter-section-title">Status</span>
                <div className="filter-checkbox-grid">
                  {[
                    { id: 'active', label: '🟢 Active' },
                    { id: 'expiring_soon', label: '🟠 Expiring Soon' },
                    { id: 'expired', label: '🔴 Expired' },
                    { id: 'inactive', label: '⚪ Inactive' },
                  ].map((st) => (
                    <label key={st.id} className="filter-check-label">
                      <input
                        type="checkbox"
                        checked={drawerFilters.statuses.includes(st.id)}
                        onChange={(e) => {
                          setDrawerFilters((prev) => ({
                            ...prev,
                            statuses: e.target.checked
                              ? [...prev.statuses, st.id]
                              : prev.statuses.filter((s) => s !== st.id),
                          }));
                        }}
                      />
                      <span>{st.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Expiration Date Range */}
              <div className="filter-section">
                <span className="filter-section-title">Expiration Date Range</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                      From
                    </label>
                    <input
                      type="date"
                      className="search-input-field"
                      style={{ padding: '7px 10px' }}
                      value={drawerFilters.dateFrom}
                      onChange={(e) => setDrawerFilters({ ...drawerFilters, dateFrom: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                      To
                    </label>
                    <input
                      type="date"
                      className="search-input-field"
                      style={{ padding: '7px 10px' }}
                      value={drawerFilters.dateTo}
                      onChange={(e) => setDrawerFilters({ ...drawerFilters, dateTo: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Additional Options */}
              <div className="filter-section">
                <span className="filter-section-title">Additional Criteria</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <select
                    className="quick-select"
                    value={drawerFilters.hasPrn}
                    onChange={(e) => setDrawerFilters({ ...drawerFilters, hasPrn: e.target.value as any })}
                  >
                    <option value="all">PRN Registration: Any</option>
                    <option value="with">With PRN</option>
                    <option value="without">Without PRN</option>
                  </select>

                  <select
                    className="quick-select"
                    value={drawerFilters.hasSil}
                    onChange={(e) => setDrawerFilters({ ...drawerFilters, hasSil: e.target.value as any })}
                  >
                    <option value="all">SIL Training Hours: Any</option>
                    <option value="with">With SIL Hours</option>
                    <option value="without">Without SIL Hours</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="drawer-footer">
              <button
                className="btn-drawer-clear"
                onClick={() => {
                  setDrawerFilters(initialFilterState);
                  setAppliedFilters(initialFilterState);
                  setShowFilterDrawer(false);
                }}
              >
                Reset
              </button>
              <button
                className="btn-drawer-apply"
                onClick={() => {
                  setAppliedFilters(drawerFilters);
                  setShowFilterDrawer(false);
                }}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 8. Right-side Slide-Over Details Drawer ────────────────── */}
      {detailsDrawerItem && (
        <div className="drawer-backdrop" onClick={() => setDetailsDrawerItem(null)}>
          <div className="drawer-panel details-drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3 className="drawer-title">Program & Provider Details</h3>
              <button className="drawer-close-btn" onClick={() => setDetailsDrawerItem(null)}>
                ✕
              </button>
            </div>

            <div className="drawer-body">
              {/* Hero Header */}
              <div className="details-hero-card">
                <div>
                  <div className="details-field-label" style={{ color: '#818cf8', marginBottom: '3px' }}>
                    Training Provider
                  </div>
                  <div className="details-hero-name">{detailsDrawerItem.institution_name}</div>
                </div>

                <div>
                  <div className="details-field-label" style={{ color: '#a5b4fc', marginBottom: '3px' }}>
                    Registered Qualification
                  </div>
                  <div className="details-hero-program">
                    {detailsDrawerItem.qualification_title || 'No qualification title specified'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span className="badge-classification">{detailsDrawerItem.classification}</span>
                  <span className="badge-prog-type">{detailsDrawerItem.type_of_program || 'IBT'}</span>
                  <span className={`status-pill status-pill--${detailsDrawerItem.status}`}>
                    <span className="status-dot" />
                    <span>{detailsDrawerItem.status.toUpperCase()}</span>
                  </span>
                </div>
              </div>

              {/* Institution Information */}
              <div className="details-meta-card">
                <div className="filter-section-title">🏛️ Institution Information</div>
                <div className="details-grid">
                  <div className="details-grid-item">
                    <span className="details-field-label">Institution Type</span>
                    <span className="details-field-val">{detailsDrawerItem.institution_type}</span>
                  </div>
                  <div className="details-grid-item">
                    <span className="details-field-label">Classification</span>
                    <span className="details-field-val">{detailsDrawerItem.classification}</span>
                  </div>
                  <div className="details-grid-item">
                    <span className="details-field-label">School ID</span>
                    <span className="details-field-val" style={{ fontFamily: 'monospace', color: '#38bdf8' }}>
                      {detailsDrawerItem.school_id || '—'}
                    </span>
                  </div>
                  <div className="details-grid-item">
                    <span className="details-field-label">Contact Number</span>
                    <span className="details-field-val">{detailsDrawerItem.contact_number || '—'}</span>
                  </div>
                </div>

                <div className="details-grid-item">
                  <span className="details-field-label">Email / Website / Facebook</span>
                  <span className="details-field-val">
                    {detailsDrawerItem.email_website_fb ? (
                      <a
                        href={
                          detailsDrawerItem.email_website_fb.startsWith('http')
                            ? detailsDrawerItem.email_website_fb
                            : `mailto:${detailsDrawerItem.email_website_fb}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="details-link"
                      >
                        {detailsDrawerItem.email_website_fb}
                      </a>
                    ) : (
                      '—'
                    )}
                  </span>
                </div>

                <div className="details-grid-item">
                  <span className="details-field-label">Complete Address</span>
                  <span className="details-field-val" style={{ lineHeight: 1.4 }}>
                    {detailsDrawerItem.complete_address || '—'}
                  </span>
                </div>
              </div>

              {/* Program Information */}
              <div className="details-meta-card">
                <div className="filter-section-title">📚 Program & Training Specifications</div>
                <div className="details-grid">
                  <div className="details-grid-item">
                    <span className="details-field-label">Program Type</span>
                    <span className="details-field-val">{detailsDrawerItem.type_of_program || 'IBT'}</span>
                  </div>
                  <div className="details-grid-item">
                    <span className="details-field-label">Sector</span>
                    <span className="details-field-val">{detailsDrawerItem.sector || '—'}</span>
                  </div>
                  <div className="details-grid-item">
                    <span className="details-field-label">Training Duration</span>
                    <span className="details-field-val" style={{ color: '#60a5fa', fontWeight: 700 }}>
                      {detailsDrawerItem.training_duration_hours ? `${detailsDrawerItem.training_duration_hours} Hours` : '—'}
                    </span>
                  </div>
                  <div className="details-grid-item">
                    <span className="details-field-label">SIL Duration</span>
                    <span className="details-field-val" style={{ color: '#60a5fa', fontWeight: 700 }}>
                      {detailsDrawerItem.sil_duration_hours ? `${detailsDrawerItem.sil_duration_hours} Hours` : '0 Hours'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Registration & Expiration */}
              <div className="details-meta-card">
                <div className="filter-section-title">🛡️ Registration & Expiration Monitoring</div>
                <div className="details-grid">
                  <div className="details-grid-item">
                    <span className="details-field-label">PRN Number</span>
                    <span className="details-field-val" style={{ fontFamily: 'monospace', color: '#38bdf8' }}>
                      {detailsDrawerItem.program_registration_number || '—'}
                    </span>
                  </div>
                  <div className="details-grid-item">
                    <span className="details-field-label">Date of Expiration</span>
                    <span className="details-field-val">
                      {formatDisplayDate(detailsDrawerItem.date_of_expiration)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="drawer-footer">
              {canEdit && (
                <button
                  className="btn-drawer-apply"
                  style={{ background: '#2563eb' }}
                  onClick={() => {
                    const item = detailsDrawerItem;
                    setDetailsDrawerItem(null);
                    handleOpenModal(item);
                  }}
                >
                  ✏️ Edit Program
                </button>
              )}
              <button className="btn-drawer-clear" onClick={() => setDetailsDrawerItem(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 9. Add / Edit Provider Modal ───────────────────────────── */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card modal-card-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{editingId ? 'Edit Training Provider' : 'Add Training Provider'}</h3>
                <div className="modal-subtitle">
                  Configure institution details, sector, and qualification registration
                </div>
              </div>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveForm} className="modal-form">
              <div className="modal-form-scrollable">
                <div className="form-section-title">1. Institution Information</div>
                <div className="form-group">
                  <label>Institution Name *</label>
                  <input
                    className="form-input"
                    value={form.institution_name}
                    onChange={(e) => setForm({ ...form, institution_name: e.target.value })}
                    placeholder="e.g. Davao Technical Skills Institute"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>E-mail Address / Website / FB Account</label>
                  <input
                    className="form-input"
                    value={form.email_website_fb}
                    onChange={(e) => setForm({ ...form, email_website_fb: e.target.value })}
                    placeholder="e.g. dtsi.edu.ph@gmail.com / fb.com/dtsi"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>Type of Institution *</label>
                    <select
                      className="form-input"
                      value={form.institution_type}
                      onChange={(e) => setForm({ ...form, institution_type: e.target.value })}
                    >
                      <option value="Public">Public</option>
                      <option value="Private">Private</option>
                      <option value="LGU-RUN">LGU-RUN</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Classification of Institution *</label>
                    <select
                      className="form-input"
                      value={form.classification}
                      onChange={(e) => setForm({ ...form, classification: e.target.value })}
                    >
                      <option value="TTI">TTI</option>
                      <option value="TVI">TVI</option>
                      <option value="SUC">SUC</option>
                      <option value="LUC">LUC</option>
                      <option value="HEI">HEI</option>
                      <option value="EBT">EBT</option>
                      <option value="EBET">EBET</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>School ID</label>
                    <input
                      className="form-input"
                      value={form.school_id}
                      onChange={(e) => setForm({ ...form, school_id: e.target.value })}
                      placeholder="e.g. DTSI-2024-001"
                    />
                  </div>
                  <div className="form-group">
                    <label>Contact Number</label>
                    <input
                      className="form-input"
                      value={form.contact_number}
                      onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                      placeholder="e.g. (082) 555-0101"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Complete Address</label>
                  <input
                    className="form-input"
                    value={form.complete_address}
                    onChange={(e) => setForm({ ...form, complete_address: e.target.value })}
                    placeholder="e.g. 123 Bonifacio St., Poblacion District, Davao City"
                  />
                </div>

                <div className="form-section-title" style={{ marginTop: '16px' }}>
                  2. Program & Qualification Registration Details
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>Type of Program</label>
                    <select
                      className="form-input"
                      value={form.type_of_program}
                      onChange={(e) => setForm({ ...form, type_of_program: e.target.value })}
                    >
                      <option value="IBT">IBT</option>
                      <option value="MTP">MTP</option>
                      <option value="EBET">EBET</option>
                      <option value="Bundled">Bundled</option>
                      <option value="MCC">MCC</option>
                      <option value="Diploma">Diploma</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Sector</label>
                    <input
                      className="form-input"
                      value={form.sector}
                      onChange={(e) => setForm({ ...form, sector: e.target.value })}
                      placeholder="e.g. Information and Communications Technology (ICT)"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Program / Qualification Title</label>
                  <input
                    className="form-input"
                    value={form.qualification_title}
                    onChange={(e) => setForm({ ...form, qualification_title: e.target.value })}
                    placeholder="e.g. Computer Systems Servicing NC II"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>Training Duration (in Hours)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="form-input"
                      value={form.training_duration_hours}
                      onChange={(e) => setForm({ ...form, training_duration_hours: e.target.value })}
                      placeholder="e.g. 280"
                    />
                  </div>
                  <div className="form-group">
                    <label>SIL Duration (in Hours)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="form-input"
                      value={form.sil_duration_hours}
                      onChange={(e) => setForm({ ...form, sil_duration_hours: e.target.value })}
                      placeholder="e.g. 100"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>Program Registration Number (PRN)</label>
                    <input
                      className="form-input"
                      value={form.program_registration_number}
                      onChange={(e) => setForm({ ...form, program_registration_number: e.target.value })}
                      placeholder="e.g. WTR-2024-00142"
                    />
                  </div>
                  <div className="form-group">
                    <label>Date of Expiration</label>
                    <input
                      type="date"
                      className="form-input"
                      value={form.date_of_expiration}
                      onChange={(e) => setForm({ ...form, date_of_expiration: e.target.value })}
                    />
                    <small style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                      Status is automatically derived based on this date
                    </small>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  marginTop: '16px',
                  paddingTop: '12px',
                  borderTop: '1px solid #334155',
                }}
              >
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Training Provider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 10. AI Import Modal ────────────────────────────────────── */}
      {showAIImport && (
        <AIImportModal onClose={() => setShowAIImport(false)} onImported={fetchProviders} />
      )}
    </div>
  );
};
