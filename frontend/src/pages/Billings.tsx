import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { InternalBilling, QualificationMap, TrainingProvider, VerificationStatus } from '../types';

export const Billings: React.FC = () => {
  const { user } = useAuth();
  const [billings, setBillings] = useState<InternalBilling[]>([]);
  const [qms, setQms] = useState<QualificationMap[]>([]);
  const [providers, setProviders] = useState<TrainingProvider[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    provider_id: '',
    qm_id: '',
    external_reference_no: '',
    claimed_amount: 0,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'all') params.verification_status = statusFilter;

      const [bRes, qmRes, provRes] = await Promise.all([
        api.get<{ data: InternalBilling[] }>('/billings', { params }),
        api.get<{ data: QualificationMap[] }>('/qualification-maps'),
        api.get<{ data: TrainingProvider[] }>('/training-providers'),
      ]);

      setBillings(bRes.data.data);
      setQms(qmRes.data.data);
      setProviders(provRes.data.data);
    } catch (err) {
      console.error('Failed to fetch billings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleOpenModal = () => {
    setForm({
      provider_id: providers[0]?.provider_id || '',
      qm_id: qms[0]?.qm_id || '',
      external_reference_no: `REF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      claimed_amount: 100000,
    });
    setShowModal(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await api.post('/billings', {
        ...form,
        recorded_by: user.user_id,
      });
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit billing claim');
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: VerificationStatus) => {
    try {
      await api.patch(`/billings/${id}/status`, { verification_status: newStatus });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update billing verification status');
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);

  const isAuditorOrAdmin = user?.role === 'admin' || user?.role === 'finance_auditor';

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title-text">Internal Billings Ledger & Auditor Verification</h2>
        <button className="btn btn-primary" onClick={handleOpenModal}>
          + Create Billing Claim
        </button>
      </div>

      <div className="filters-bar">
        <select
          className="select-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Verification Statuses</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
          <option value="returned">Returned</option>
        </select>
      </div>

      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading billing records...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>External Reference No</th>
                <th>Training Provider</th>
                <th>TVET Qualification</th>
                <th>Claimed Amount</th>
                <th>Recorded By</th>
                <th>Verification Status</th>
                {isAuditorOrAdmin && <th>Audit Verification Actions</th>}
              </tr>
            </thead>
            <tbody>
              {billings.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No billing ledger records found.
                  </td>
                </tr>
              ) : (
                billings.map((b) => (
                  <tr key={b.billing_id}>
                    <td>
                      <strong>{b.external_reference_no}</strong>
                    </td>
                    <td>{b.institution_name || '—'}</td>
                    <td>{b.tvet_qualification || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(Number(b.claimed_amount))}</td>
                    <td>{b.recorded_by_name || '—'}</td>
                    <td>
                      <span className={`badge badge-${b.verification_status}`}>{b.verification_status}</span>
                    </td>
                    {isAuditorOrAdmin && (
                      <td>
                        {b.verification_status === 'pending' ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="btn btn-sm"
                              style={{ backgroundColor: 'var(--status-active-bg)', color: 'var(--status-active-text)' }}
                              onClick={() => handleStatusUpdate(b.billing_id, 'verified')}
                            >
                              Verify
                            </button>
                            <button
                              className="btn btn-sm"
                              style={{ backgroundColor: 'var(--status-rejected-bg)', color: 'var(--status-rejected-text)' }}
                              onClick={() => handleStatusUpdate(b.billing_id, 'rejected')}
                            >
                              Reject
                            </button>
                            <button
                              className="btn btn-sm"
                              style={{ backgroundColor: 'var(--status-verified-bg)', color: 'var(--status-verified-text)' }}
                              onClick={() => handleStatusUpdate(b.billing_id, 'returned')}
                            >
                              Return
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Actioned</span>
                        )}
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
              <h3 className="modal-title">Create Internal Billing Claim</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate} className="modal-form">
              <div className="form-group">
                <label>Training Provider</label>
                <select
                  className="form-input"
                  value={form.provider_id}
                  onChange={(e) => setForm({ ...form, provider_id: e.target.value })}
                  required
                >
                  {providers.map((p) => (
                    <option key={p.provider_id} value={p.provider_id}>
                      {p.institution_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Qualification Map</label>
                <select
                  className="form-input"
                  value={form.qm_id}
                  onChange={(e) => setForm({ ...form, qm_id: e.target.value })}
                  required
                >
                  {qms.map((q) => (
                    <option key={q.qm_id} value={q.qm_id}>
                      {q.tvet_qualification} ({q.institution_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>External Reference No</label>
                <input
                  className="form-input"
                  value={form.external_reference_no}
                  onChange={(e) => setForm({ ...form, external_reference_no: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Claimed Amount (₱)</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.claimed_amount}
                  onChange={(e) => setForm({ ...form, claimed_amount: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
