import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { ScholarshipProgram } from '../types';
import './Programs.css';

export const Programs: React.FC = () => {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<ScholarshipProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    program_code: '',
    program_name: '',
    fiscal_year: new Date().getFullYear(),
    total_allocated: 0,
    total_disbursed: 0,
  });

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedYear !== 'all') params.fiscal_year = selectedYear;

      const { data } = await api.get<{ data: ScholarshipProgram[] }>('/scholarship-programs', { params });
      setPrograms(data.data);
    } catch (err) {
      console.error('Failed to fetch programs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, [selectedYear]);

  const handleOpenModal = (program?: ScholarshipProgram) => {
    if (program) {
      setEditingId(program.program_id);
      setForm({
        program_code: program.program_code,
        program_name: program.program_name,
        fiscal_year: program.fiscal_year,
        total_allocated: Number(program.total_allocated),
        total_disbursed: Number(program.total_disbursed),
      });
    } else {
      setEditingId(null);
      setForm({
        program_code: '',
        program_name: '',
        fiscal_year: new Date().getFullYear(),
        total_allocated: 0,
        total_disbursed: 0,
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/scholarship-programs/${editingId}`, form);
      } else {
        await api.post('/scholarship-programs', form);
      }
      setShowModal(false);
      fetchPrograms();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save scholarship program');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this scholarship program?')) return;
    try {
      await api.delete(`/scholarship-programs/${id}`);
      fetchPrograms();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete program');
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);

  const canEdit = user?.role === 'admin' || user?.role === 'evaluator';
  const canDelete = user?.role === 'admin';

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title-text">Scholarship Programs & Budget Allocations</h2>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            + Add Program
          </button>
        )}
      </div>

      <div className="year-pills">
        <button
          className={`year-pill ${selectedYear === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedYear('all')}
        >
          All Years
        </button>
        {[2026, 2025, 2024].map((year) => (
          <button
            key={year}
            className={`year-pill ${selectedYear === year ? 'active' : ''}`}
            onClick={() => setSelectedYear(year)}
          >
            FY {year}
          </button>
        ))}
      </div>

      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading programs...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Program Code</th>
                <th>Program Name</th>
                <th>Fiscal Year</th>
                <th>Allocated Budget</th>
                <th>Disbursed Amount</th>
                <th>Disbursement Ratio</th>
                {(canEdit || canDelete) && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {programs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No scholarship programs found.
                  </td>
                </tr>
              ) : (
                programs.map((prog) => {
                  const allocated = Number(prog.total_allocated);
                  const disbursed = Number(prog.total_disbursed);
                  const pct = allocated > 0 ? Math.min(100, Math.round((disbursed / allocated) * 100)) : 0;

                  return (
                    <tr key={prog.program_id}>
                      <td>
                        <strong>{prog.program_code}</strong>
                      </td>
                      <td>{prog.program_name}</td>
                      <td>
                        <span className="badge badge-verified">FY {prog.fiscal_year}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(allocated)}</td>
                      <td>{formatCurrency(disbursed)}</td>
                      <td style={{ minWidth: '140px' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{pct}%</div>
                        <div className="progress-bar-container">
                          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      {(canEdit || canDelete) && (
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {canEdit && (
                              <button className="btn btn-secondary btn-sm" onClick={() => handleOpenModal(prog)}>
                                Edit
                              </button>
                            )}
                            {canDelete && (
                              <button
                                className="btn btn-sm"
                                style={{ color: 'var(--status-rejected-text)', borderColor: 'var(--status-rejected-text)' }}
                                onClick={() => handleDelete(prog.program_id)}
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
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">{editingId ? 'Edit Scholarship Program' : 'Add Scholarship Program'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave} className="modal-form">
              <div className="form-group">
                <label>Program Code</label>
                <input
                  className="form-input"
                  value={form.program_code}
                  onChange={(e) => setForm({ ...form, program_code: e.target.value })}
                  placeholder="e.g. PROG-2025-001"
                  required
                />
              </div>

              <div className="form-group">
                <label>Program Name</label>
                <input
                  className="form-input"
                  value={form.program_name}
                  onChange={(e) => setForm({ ...form, program_name: e.target.value })}
                  placeholder="e.g. STEP Technical Training 2025"
                  required
                />
              </div>

              <div className="form-group">
                <label>Fiscal Year</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.fiscal_year}
                  onChange={(e) => setForm({ ...form, fiscal_year: parseInt(e.target.value, 10) || new Date().getFullYear() })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Total Allocated Budget (₱)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.total_allocated}
                    onChange={(e) => setForm({ ...form, total_allocated: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label>Total Disbursed Budget (₱)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.total_disbursed}
                    onChange={(e) => setForm({ ...form, total_disbursed: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
