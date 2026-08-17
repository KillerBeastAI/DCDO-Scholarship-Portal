import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { QualificationMap, ScholarshipProgram, TrainingProvider } from '../types';

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

  const [fiscalYearFilter, setFiscalYearFilter] = useState<string>('all');
  const [programFilter, setProgramFilter] = useState<string>('all');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
    const nextIsEntrep = nextIsCfsp || progName.includes('STEP') || progName.includes('Special Training') || progName.includes('RCEF-RTES') || progName.includes('Rice');

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

  // Auto-fill sector and qualification from selected provider
  const handleProviderChange = (provId: string) => {
    const prov = providers.find((p) => p.provider_id === provId);
    setForm((prev) => ({
      ...prev,
      provider_id: provId,
      sector: prov?.sector || prev.sector || 'Information and Communications Technology (ICT)',
      tvet_qualification: prov?.qualification_title || prev.tvet_qualification || '',
    }));
  };

  const handleOpenModal = (qm?: QualificationMap) => {
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
    try {
      // Find matching program_id
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

  const formatCurrency = (val?: number | null) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(val) || 0);

  const filteredQms = useMemo(() => {
    return qms.filter((qm) => {
      if (fiscalYearFilter !== 'all' && qm.fiscal_year !== fiscalYearFilter) return false;
      if (programFilter !== 'all' && qm.program_name !== programFilter) return false;
      return true;
    });
  }, [qms, fiscalYearFilter, programFilter]);

  const canEdit = user?.role === 'admin' || user?.role === 'evaluator';
  const canDelete = user?.role === 'admin';

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
    <div>
      <div className="page-header">
        <h2 className="page-title-text">Qualification Maps Management</h2>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            + Add Qualification Map
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="filters-bar" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <select
          className="select-filter"
          value={fiscalYearFilter}
          onChange={(e) => setFiscalYearFilter(e.target.value)}
        >
          <option value="all">All Fiscal Years</option>
          <option value="FY 2026">FY 2026 (Current)</option>
          <option value="FY 2025">FY 2025 (Continuing)</option>
        </select>

        <select
          className="select-filter"
          value={programFilter}
          onChange={(e) => setProgramFilter(e.target.value)}
          style={{ maxWidth: '320px' }}
        >
          <option value="all">All Scholarship Programs</option>
          {SCHOLARSHIP_PROGRAMS_LIST.map((prog) => (
            <option key={prog} value={prog}>
              {prog}
            </option>
          ))}
        </select>
      </div>

      <div className="glass-card" style={{ overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading qualification maps...
          </div>
        ) : (
          <table className="data-table" style={{ fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th style={{ whiteSpace: 'nowrap' }}>RQM Code</th>
                <th style={{ whiteSpace: 'nowrap' }}>Fiscal Year</th>
                <th style={{ whiteSpace: 'nowrap' }}>Scholarship Programs</th>
                <th style={{ whiteSpace: 'nowrap' }}>Training Provider</th>
                <th style={{ whiteSpace: 'nowrap' }}>TVET Qualification</th>
                <th style={{ whiteSpace: 'nowrap' }}>Approved Slots</th>
                <th style={{ whiteSpace: 'nowrap' }}>Total Training Cost</th>
                <th style={{ whiteSpace: 'nowrap' }}>Total Training Support Fund</th>
                <th style={{ whiteSpace: 'nowrap' }}>Total Book Allowance</th>
                <th style={{ whiteSpace: 'nowrap' }}>Total New Normal Assistance</th>
                <th style={{ whiteSpace: 'nowrap' }}>Total Annual Accident Insurance</th>
                <th style={{ whiteSpace: 'nowrap' }}>Total Entrepreneurship Fee</th>
                <th style={{ whiteSpace: 'nowrap' }}>Total Approved Amount</th>
                {(canEdit || canDelete) && <th style={{ whiteSpace: 'nowrap' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredQms.length === 0 ? (
                <tr>
                  <td colSpan={14} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No qualification maps found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredQms.map((qm) => {
                  const slots = Number(qm.total_slots) || 0;
                  const totalTc = Number(qm.total_training_cost) || slots * Number(qm.training_cost_per_capita || 0);
                  const totalTsf = Number(qm.total_support_fund) || slots * Number(qm.support_fund_per_capita || 0);
                  const totalBook = Number(qm.total_book_allowance) || slots * Number(qm.book_allowance || 0);
                  const totalNewNormal =
                    Number(qm.total_new_normal_assistance) || slots * Number(qm.new_normal_assistance || 0);
                  const totalInsurance =
                    Number(qm.total_annual_accident_insurance) || slots * Number(qm.annual_accident_insurance || 0);
                  const totalEntrep =
                    Number(qm.total_entrepreneurship_fee) || slots * Number(qm.entrepreneurship_fee || 0);
                  const totalApproved = Number(qm.total_approved_amount) || (totalTc + totalTsf + totalBook + totalNewNormal + totalInsurance + totalEntrep);

                  return (
                    <tr key={qm.qm_id}>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{qm.rqm_code || '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className="badge badge-verified">{qm.fiscal_year || 'FY 2026'}</span>
                      </td>
                      <td style={{ minWidth: '180px', fontWeight: 500 }}>{qm.program_name || '—'}</td>
                      <td style={{ minWidth: '160px' }}>{qm.institution_name || '—'}</td>
                      <td style={{ minWidth: '180px' }}>{qm.tvet_qualification}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{slots}</td>
                      <td>{formatCurrency(totalTc)}</td>
                      <td>{formatCurrency(totalTsf)}</td>
                      <td>{totalBook > 0 ? formatCurrency(totalBook) : '—'}</td>
                      <td>{totalNewNormal > 0 ? formatCurrency(totalNewNormal) : '—'}</td>
                      <td>{totalInsurance > 0 ? formatCurrency(totalInsurance) : '—'}</td>
                      <td>{totalEntrep > 0 ? formatCurrency(totalEntrep) : '—'}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                        {formatCurrency(totalApproved)}
                      </td>
                      {(canEdit || canDelete) && (
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {canEdit && (
                              <button className="btn btn-secondary btn-sm" onClick={() => handleOpenModal(qm)}>
                                Edit
                              </button>
                            )}
                            {canDelete && (
                              <button
                                className="btn btn-sm"
                                style={{
                                  color: 'var(--status-rejected-text)',
                                  borderColor: 'var(--status-rejected-text)',
                                }}
                                onClick={() => handleDelete(qm.qm_id)}
                              >
                                Delete
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
        )}
      </div>

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '840px', width: '90%' }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingId ? 'Edit Qualification Map' : 'Add Qualification Map'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSave} className="modal-form">
              {/* Row 1: Scholarship Program & Appropriation */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 0.8fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Scholarship Program</label>
                  <select
                    className="form-input"
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

                <div className="form-group">
                  <label>Appropriation</label>
                  <select
                    className="form-input"
                    value={form.appropriation}
                    onChange={(e) => handleAppropriationChange(e.target.value as any)}
                    required
                  >
                    <option value="Current">Current (FY 2026)</option>
                    <option value="Continuing">Continuing (FY 2025)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Allocation</label>
                  <select
                    className="form-input"
                    value={form.allocation}
                    onChange={(e) => setForm({ ...form, allocation: e.target.value as any })}
                    required
                  >
                    <option value="RO">RO</option>
                    <option value="CO">CO</option>
                  </select>
                </div>
              </div>

              {/* Row 2: RQM Code & Training Provider */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>RQM Code</label>
                  <input
                    className="form-input"
                    value={form.rqm_code}
                    onChange={(e) => setForm({ ...form, rqm_code: e.target.value })}
                    placeholder="e.g. RQM11-2026-TWSP-1124-0001"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Training Provider</label>
                  <select
                    className="form-input"
                    value={form.provider_id}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    required
                  >
                    <option value="">Select Training Provider</option>
                    {providers.map((pr) => (
                      <option key={pr.provider_id} value={pr.provider_id}>
                        {pr.institution_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Sector & TVET Qualification Title */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Sector</label>
                  <input
                    className="form-input"
                    value={form.sector}
                    onChange={(e) => setForm({ ...form, sector: e.target.value })}
                    placeholder="e.g. Information and Communications Technology (ICT)"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>TVET Qualification Title</label>
                  <input
                    className="form-input"
                    value={form.tvet_qualification}
                    onChange={(e) => setForm({ ...form, tvet_qualification: e.target.value })}
                    placeholder="e.g. Computer Systems Servicing NC II"
                    required
                  />
                </div>
              </div>

              {/* Row 4: Base Unit Costs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Approved Slots</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={form.total_slots}
                    onChange={(e) => setForm({ ...form, total_slots: parseInt(e.target.value, 10) || 0 })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Training Cost (TC) / Slot</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={form.training_cost_per_capita}
                    onChange={(e) =>
                      setForm({ ...form, training_cost_per_capita: parseFloat(e.target.value) || 0 })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Training Support Fund (TSF) / Slot</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={form.support_fund_per_capita}
                    onChange={(e) =>
                      setForm({ ...form, support_fund_per_capita: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              {/* Row 5: Conditional Program Specific Costs */}
              {(isPesfa || isCfsp || isEntrepApplicable) && (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    marginTop: '8px',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '12px', color: 'var(--primary)' }}>
                    Program-Specific Cost Components
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                    {isPesfa && (
                      <div className="form-group">
                        <label>Book Allowance (PESFA)</label>
                        <input
                          type="number"
                          min="0"
                          className="form-input"
                          value={form.book_allowance}
                          onChange={(e) =>
                            setForm({ ...form, book_allowance: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                    )}

                    {isCfsp && (
                      <>
                        <div className="form-group">
                          <label>New Normal Assistance (CFSP)</label>
                          <input
                            type="number"
                            min="0"
                            className="form-input"
                            value={form.new_normal_assistance}
                            onChange={(e) =>
                              setForm({ ...form, new_normal_assistance: parseFloat(e.target.value) || 0 })
                            }
                          />
                        </div>

                        <div className="form-group">
                          <label>Annual Accident Insurance (CFSP)</label>
                          <input
                            type="number"
                            min="0"
                            className="form-input"
                            value={form.annual_accident_insurance}
                            onChange={(e) =>
                              setForm({ ...form, annual_accident_insurance: parseFloat(e.target.value) || 0 })
                            }
                          />
                        </div>
                      </>
                    )}

                    {isEntrepApplicable && (
                      <div className="form-group">
                        <label>Entrepreneurship Fee (CFSP/STEP/RTES)</label>
                        <input
                          type="number"
                          min="0"
                          className="form-input"
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

              {/* Total Approved Amount Summary Banner */}
              <div
                style={{
                  marginTop: '16px',
                  padding: '16px',
                  borderRadius: '8px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Total Approved Amount ({form.fiscal_year} • {form.allocation})
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    TC: {formatCurrency(modalTotalTC)} | TSF: {formatCurrency(modalTotalTSF)}
                    {modalTotalBook > 0 && ` | Book: ${formatCurrency(modalTotalBook)}`}
                    {modalTotalNewNormal > 0 && ` | New Normal: ${formatCurrency(modalTotalNewNormal)}`}
                    {modalTotalInsurance > 0 && ` | Insurance: ${formatCurrency(modalTotalInsurance)}`}
                    {modalTotalEntrep > 0 && ` | Entrep: ${formatCurrency(modalTotalEntrep)}`}
                  </div>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary)' }}>
                  {formatCurrency(modalTotalApproved)}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Qualification Map
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
