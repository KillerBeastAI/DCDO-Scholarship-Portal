import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { QualificationMap, QMStatus, ScholarshipProgram, TrainingProvider } from '../types';

export const QualificationMaps: React.FC = () => {
  const { user } = useAuth();
  const [qms, setQms] = useState<QualificationMap[]>([]);
  const [programs, setPrograms] = useState<ScholarshipProgram[]>([]);
  const [providers, setProviders] = useState<TrainingProvider[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    program_id: '',
    provider_id: '',
    rqm_code: '',
    sector: '',
    tvet_qualification: '',
    qualification_level: 'NC II',
    delivery_mode: 'Institution-Based',
    total_slots: 25,
    training_cost_per_capita: 15000,
    support_fund_per_capita: 2000,
    assessment_fee: 500,
    status: 'approved' as QMStatus,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;

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
  }, [statusFilter]);

  const handleOpenModal = (qm?: QualificationMap) => {
    if (qm) {
      setEditingId(qm.qm_id);
      setForm({
        program_id: qm.program_id,
        provider_id: qm.provider_id,
        rqm_code: qm.rqm_code || '',
        sector: qm.sector,
        tvet_qualification: qm.tvet_qualification,
        qualification_level: qm.qualification_level,
        delivery_mode: qm.delivery_mode,
        total_slots: qm.total_slots,
        training_cost_per_capita: Number(qm.training_cost_per_capita),
        support_fund_per_capita: Number(qm.support_fund_per_capita),
        assessment_fee: Number(qm.assessment_fee),
        status: qm.status,
      });
    } else {
      setEditingId(null);
      setForm({
        program_id: programs[0]?.program_id || '',
        provider_id: providers[0]?.provider_id || '',
        rqm_code: '',
        sector: 'ICT',
        tvet_qualification: '',
        qualification_level: 'NC II',
        delivery_mode: 'Institution-Based',
        total_slots: 25,
        training_cost_per_capita: 15000,
        support_fund_per_capita: 2000,
        assessment_fee: 500,
        status: 'approved',
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/qualification-maps/${editingId}`, form);
      } else {
        await api.post('/qualification-maps', form);
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

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);

  const canEdit = user?.role === 'admin' || user?.role === 'evaluator';
  const canDelete = user?.role === 'admin';

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

      <div className="filters-bar">
        <select
          className="select-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="approved">Approved</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading qualification maps...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>RQM Code</th>
                <th>Program</th>
                <th>Training Provider</th>
                <th>TVET Qualification</th>
                <th>Slots</th>
                <th>Cost / Capita</th>
                <th>Total Approved</th>
                <th>Status</th>
                {(canEdit || canDelete) && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {qms.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No qualification maps found matching status.
                  </td>
                </tr>
              ) : (
                qms.map((qm) => (
                  <tr key={qm.qm_id}>
                    <td>
                      <strong>{qm.rqm_code || '—'}</strong>
                    </td>
                    <td>{qm.program_name || '—'}</td>
                    <td>{qm.institution_name || '—'}</td>
                    <td>
                      {qm.tvet_qualification} <span className="badge badge-verified">{qm.qualification_level}</span>
                    </td>
                    <td>{qm.total_slots}</td>
                    <td>{formatCurrency(Number(qm.training_cost_per_capita))}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(Number(qm.total_approved_amount))}</td>
                    <td>
                      <span className={`badge badge-${qm.status}`}>{qm.status}</span>
                    </td>
                    {(canEdit || canDelete) && (
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {canEdit && (
                            <button className="btn btn-secondary btn-sm" onClick={() => handleOpenModal(qm)}>
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="btn btn-sm"
                              style={{ color: 'var(--status-rejected-text)', borderColor: 'var(--status-rejected-text)' }}
                              onClick={() => handleDelete(qm.qm_id)}
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
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">{editingId ? 'Edit Qualification Map' : 'Add Qualification Map'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave} className="modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Scholarship Program</label>
                  <select
                    className="form-input"
                    value={form.program_id}
                    onChange={(e) => setForm({ ...form, program_id: e.target.value })}
                    required
                  >
                    {programs.map((p) => (
                      <option key={p.program_id} value={p.program_id}>
                        {p.program_name} ({p.program_code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Training Provider</label>
                  <select
                    className="form-input"
                    value={form.provider_id}
                    onChange={(e) => setForm({ ...form, provider_id: e.target.value })}
                    required
                  >
                    {providers.map((pr) => (
                      <option key={pr.provider_id} value={pr.provider_id}>
                        {pr.institution_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>RQM Code</label>
                  <input
                    className="form-input"
                    value={form.rqm_code}
                    onChange={(e) => setForm({ ...form, rqm_code: e.target.value })}
                    placeholder="e.g. RQM-2025-01"
                  />
                </div>
                <div className="form-group">
                  <label>Sector</label>
                  <input
                    className="form-input"
                    value={form.sector}
                    onChange={(e) => setForm({ ...form, sector: e.target.value })}
                    required
                  />
                </div>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Total Slots</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.total_slots}
                    onChange={(e) => setForm({ ...form, total_slots: parseInt(e.target.value, 10) || 0 })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Training Cost / Capita</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.training_cost_per_capita}
                    onChange={(e) => setForm({ ...form, training_cost_per_capita: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Support Fund / Capita</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.support_fund_per_capita}
                    onChange={(e) => setForm({ ...form, support_fund_per_capita: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
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
