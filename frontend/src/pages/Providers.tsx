import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { TrainingProvider, ProviderStatus } from '../types';
import './Providers.css';

export const Providers: React.FC = () => {
  const { user } = useAuth();
  const [providers, setProviders] = useState<TrainingProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    institution_name: '',
    email_website_fb: '',
    institution_type: 'TVI',
    classification: 'Private',
    type_of_program: 'WTR',
    sector: '',
    qualification_title: '',
    training_duration_hours: '' as string | number,
    sil_duration_hours: '' as string | number,
    program_registration_number: '',
    date_validity: '',
    school_id: '',
    complete_address: '',
    contact_number: '',
    status: 'active' as ProviderStatus,
  });

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search) params.search = search;

      const { data } = await api.get<{ data: TrainingProvider[] }>('/training-providers', { params });
      setProviders(data.data);
    } catch (err) {
      console.error('Failed to fetch providers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, [search, statusFilter]);

  const handleOpenModal = (provider?: TrainingProvider) => {
    if (provider) {
      setEditingId(provider.provider_id);
      setForm({
        institution_name: provider.institution_name,
        email_website_fb: provider.email_website_fb || '',
        institution_type: provider.institution_type,
        classification: provider.classification,
        type_of_program: provider.type_of_program || 'WTR',
        sector: provider.sector || '',
        qualification_title: provider.qualification_title || '',
        training_duration_hours: provider.training_duration_hours ?? '',
        sil_duration_hours: provider.sil_duration_hours ?? '',
        program_registration_number: provider.program_registration_number || '',
        date_validity: provider.date_validity || '',
        school_id: provider.school_id || '',
        complete_address: provider.complete_address || '',
        contact_number: provider.contact_number || '',
        status: provider.status,
      });
    } else {
      setEditingId(null);
      setForm({
        institution_name: '',
        email_website_fb: '',
        institution_type: 'TVI',
        classification: 'Private',
        type_of_program: 'WTR',
        sector: '',
        qualification_title: '',
        training_duration_hours: '',
        sil_duration_hours: '',
        program_registration_number: '',
        date_validity: '',
        school_id: '',
        complete_address: '',
        contact_number: '',
        status: 'active',
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
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

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this training provider?')) return;
    try {
      await api.delete(`/training-providers/${id}`);
      fetchProviders();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete provider');
    }
  };

  const canEdit = user?.role === 'admin' || user?.role === 'evaluator';
  const canDelete = user?.role === 'admin';

  return (
    <div className="providers-page">
      <div className="page-header">
        <div>
          <h2 className="page-title-text">Training Providers Directory</h2>
          <div className="page-subtitle-text">Registered Technical Vocational Institutions and Higher Education Programs</div>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            + Add Provider
          </button>
        )}
      </div>

      <div className="filters-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search by institution, sector, qualification, or PRN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="select-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div className="glass-card table-responsive-container">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading training providers...
          </div>
        ) : (
          <table className="data-table providers-table">
            <thead>
              <tr>
                <th>Institution Name</th>
                <th>E-mail / Web / FB</th>
                <th>Type</th>
                <th>Classification</th>
                <th>Type of Program</th>
                <th>Sector</th>
                <th>Program / Qualification Title</th>
                <th style={{ textAlign: 'right' }}>Training Hrs</th>
                <th style={{ textAlign: 'right' }}>SIL Hrs</th>
                <th>PRN</th>
                <th>Date Validity</th>
                {(canEdit || canDelete) && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {providers.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No training providers found matching criteria.
                  </td>
                </tr>
              ) : (
                providers.map((p) => (
                  <tr key={p.provider_id}>
                    <td>
                      <div className="provider-name-cell">
                        <strong>{p.institution_name}</strong>
                        {p.school_id && <span className="provider-subcode">{p.school_id}</span>}
                      </div>
                    </td>
                    <td>
                      <span className="contact-link-text" title={p.email_website_fb || '—'}>
                        {p.email_website_fb || '—'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-info">{p.institution_type}</span>
                    </td>
                    <td>
                      <span className="badge badge-secondary">{p.classification}</span>
                    </td>
                    <td>
                      <span className="badge badge-program">{p.type_of_program || 'WTR'}</span>
                    </td>
                    <td>
                      <span className="sector-tag">{p.sector || '—'}</span>
                    </td>
                    <td>
                      <div className="qualification-title-text">{p.qualification_title || '—'}</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="hours-val">{p.training_duration_hours ? `${p.training_duration_hours} hrs` : '—'}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="hours-val">{p.sil_duration_hours ? `${p.sil_duration_hours} hrs` : '—'}</span>
                    </td>
                    <td>
                      <span className="prn-code">{p.program_registration_number || '—'}</span>
                    </td>
                    <td>
                      <span className="validity-tag">{p.date_validity || '—'}</span>
                    </td>
                    {(canEdit || canDelete) && (
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {canEdit && (
                            <button className="btn btn-secondary btn-sm" onClick={() => handleOpenModal(p)}>
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="btn btn-sm"
                              style={{ color: 'var(--status-rejected-text)', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                              onClick={() => handleDelete(p.provider_id)}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-card modal-card-lg">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{editingId ? 'Edit Training Provider' : 'Add Training Provider'}</h3>
                <div className="modal-subtitle">Configure institution details, sector, and qualification registration</div>
              </div>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave} className="modal-form">
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
                      <option value="TVI">TVI (Technical Vocational Institution)</option>
                      <option value="HEI">HEI (Higher Education Institution)</option>
                      <option value="SUC">SUC (State University and College)</option>
                      <option value="LUC">LUC (Local University and College)</option>
                      <option value="Company">Company / Enterprise-Based</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Classification of Institution *</label>
                    <select
                      className="form-input"
                      value={form.classification}
                      onChange={(e) => setForm({ ...form, classification: e.target.value })}
                    >
                      <option value="Private">Private</option>
                      <option value="Public">Public</option>
                      <option value="LGU">LGU</option>
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
                    <label>Status *</label>
                    <select
                      className="form-input"
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as ProviderStatus })}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
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

                <div className="form-section-title" style={{ marginTop: '16px' }}>2. Program & Qualification Registration Details</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>Type of Program</label>
                    <select
                      className="form-input"
                      value={form.type_of_program}
                      onChange={(e) => setForm({ ...form, type_of_program: e.target.value })}
                    >
                      <option value="WTR">WTR (With Training Regulation)</option>
                      <option value="NTR">NTR (No Training Regulation)</option>
                      <option value="Bundled">Bundled Program</option>
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
                    <label>Date Validity</label>
                    <input
                      className="form-input"
                      value={form.date_validity}
                      onChange={(e) => setForm({ ...form, date_validity: e.target.value })}
                      placeholder="e.g. 2028-12-31 or Valid until Dec 2028"
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
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
    </div>
  );
};
