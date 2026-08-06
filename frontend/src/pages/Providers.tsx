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
    institution_type: 'TVI',
    classification: 'Private',
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
        institution_type: provider.institution_type,
        classification: provider.classification,
        school_id: provider.school_id || '',
        complete_address: provider.complete_address,
        contact_number: provider.contact_number || '',
        status: provider.status,
      });
    } else {
      setEditingId(null);
      setForm({
        institution_name: '',
        institution_type: 'TVI',
        classification: 'Private',
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
      if (editingId) {
        await api.put(`/training-providers/${editingId}`, form);
      } else {
        await api.post('/training-providers', form);
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
    <div>
      <div className="page-header">
        <h2 className="page-title-text">Training Providers Directory</h2>
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
          placeholder="Search by institution name or school ID..."
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

      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading providers...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Institution Name</th>
                <th>Type</th>
                <th>Classification</th>
                <th>School ID</th>
                <th>Address</th>
                <th>Status</th>
                {(canEdit || canDelete) && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {providers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No training providers found matching criteria.
                  </td>
                </tr>
              ) : (
                providers.map((p) => (
                  <tr key={p.provider_id}>
                    <td>
                      <strong>{p.institution_name}</strong>
                    </td>
                    <td>{p.institution_type}</td>
                    <td>{p.classification}</td>
                    <td>{p.school_id || '—'}</td>
                    <td>{p.complete_address}</td>
                    <td>
                      <span className={`badge badge-${p.status}`}>{p.status}</span>
                    </td>
                    {(canEdit || canDelete) && (
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {canEdit && (
                            <button className="btn btn-secondary btn-sm" onClick={() => handleOpenModal(p)}>
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="btn btn-sm"
                              style={{ color: 'var(--status-rejected-text)', borderColor: 'var(--status-rejected-text)' }}
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
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">{editingId ? 'Edit Training Provider' : 'Add Training Provider'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave} className="modal-form">
              <div className="form-group">
                <label>Institution Name</label>
                <input
                  className="form-input"
                  value={form.institution_name}
                  onChange={(e) => setForm({ ...form, institution_name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Type</label>
                  <select
                    className="form-input"
                    value={form.institution_type}
                    onChange={(e) => setForm({ ...form, institution_type: e.target.value })}
                  >
                    <option value="TVI">TVI</option>
                    <option value="HEI">HEI</option>
                    <option value="Company">Company</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Classification</label>
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

              <div className="form-group">
                <label>School ID (Optional)</label>
                <input
                  className="form-input"
                  value={form.school_id}
                  onChange={(e) => setForm({ ...form, school_id: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Complete Address</label>
                <input
                  className="form-input"
                  value={form.complete_address}
                  onChange={(e) => setForm({ ...form, complete_address: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Status</label>
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Provider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
