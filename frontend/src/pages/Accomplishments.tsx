import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { PhysicalAccomplishment, QualificationMap } from '../types';
import './Accomplishments.css';

export const Accomplishments: React.FC = () => {
  const { user } = useAuth();
  const [qms, setQms] = useState<QualificationMap[]>([]);
  const [selectedQmId, setSelectedQmId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [accomplishment, setAccomplishment] = useState<PhysicalAccomplishment | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    enrolled_male: 0,
    enrolled_female: 0,
    dropped_male: 0,
    dropped_female: 0,
    graduated_completed_male: 0,
    graduated_completed_female: 0,
    assessed_male: 0,
    assessed_female: 0,
    certified_male: 0,
    certified_female: 0,
    employed_total: 0,
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get<{ data: QualificationMap[] }>('/qualification-maps')
      .then(({ data }) => {
        setQms(data.data);
        if (data.data.length > 0) {
          setSelectedQmId(data.data[0].qm_id);
        }
      })
      .catch((err) => console.error('Failed to load qualification maps:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedQmId) return;

    api.get<{ data: PhysicalAccomplishment }>(`/accomplishments/${selectedQmId}`)
      .then(({ data }) => {
        const acc = data.data;
        setAccomplishment(acc);
        setForm({
          enrolled_male: Number(acc.enrolled_male) || 0,
          enrolled_female: Number(acc.enrolled_female) || 0,
          dropped_male: Number(acc.dropped_male) || 0,
          dropped_female: Number(acc.dropped_female) || 0,
          graduated_completed_male: Number(acc.graduated_completed_male) || 0,
          graduated_completed_female: Number(acc.graduated_completed_female) || 0,
          assessed_male: Number(acc.assessed_male) || 0,
          assessed_female: Number(acc.assessed_female) || 0,
          certified_male: Number(acc.certified_male) || 0,
          certified_female: Number(acc.certified_female) || 0,
          employed_total: (Number(acc.employed_male) || 0) + (Number(acc.employed_female) || 0),
        });
      })
      .catch(() => {
        setAccomplishment(null);
        setForm({
          enrolled_male: 0,
          enrolled_female: 0,
          dropped_male: 0,
          dropped_female: 0,
          graduated_completed_male: 0,
          graduated_completed_female: 0,
          assessed_male: 0,
          assessed_female: 0,
          certified_male: 0,
          certified_female: 0,
          employed_total: 0,
        });
      });
  }, [selectedQmId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQmId) return;
    setSaving(true);

    try {
      const payload = {
        enrolled_male: form.enrolled_male,
        enrolled_female: form.enrolled_female,
        dropped_male: form.dropped_male,
        dropped_female: form.dropped_female,
        graduated_completed_male: form.graduated_completed_male,
        graduated_completed_female: form.graduated_completed_female,
        assessed_male: form.assessed_male,
        assessed_female: form.assessed_female,
        certified_male: form.certified_male,
        certified_female: form.certified_female,
        employed_male: form.employed_total,
        employed_female: 0,
      };

      const { data } = await api.put<{ data: PhysicalAccomplishment }>(`/accomplishments/${selectedQmId}`, payload);
      setAccomplishment(data.data);
      alert('Physical accomplishments updated successfully!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update physical accomplishments');
    } finally {
      setSaving(false);
    }
  };

  const selectedQm = qms.find((q) => q.qm_id === selectedQmId);
  const canEdit = user?.role === 'admin' || user?.role === 'evaluator';

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);

  const filteredQms = useMemo(() => {
    if (!searchTerm.trim()) return qms;
    const term = searchTerm.toLowerCase();
    return qms.filter(
      (qm) =>
        (qm.rqm_code && qm.rqm_code.toLowerCase().includes(term)) ||
        (qm.institution_name && qm.institution_name.toLowerCase().includes(term)) ||
        (qm.tvet_qualification && qm.tvet_qualification.toLowerCase().includes(term)) ||
        (qm.program_name && qm.program_name.toLowerCase().includes(term))
    );
  }, [qms, searchTerm]);

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title-text">Physical Accomplishments Tracking</h2>
      </div>

      {/* Qualification Map Selector based on RQM Code & Training Provider */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
              Filter by RQM Code / Training Provider:
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Search RQM Code or Provider..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
              Select Qualification Map:
            </label>
            <select
              className="form-input"
              value={selectedQmId}
              onChange={(e) => setSelectedQmId(e.target.value)}
              disabled={loading || filteredQms.length === 0}
            >
              {filteredQms.length === 0 ? (
                <option value="">No matching Qualification Maps found</option>
              ) : (
                filteredQms.map((qm) => (
                  <option key={qm.qm_id} value={qm.qm_id}>
                    {qm.rqm_code ? `[${qm.rqm_code}] ` : ''}
                    {qm.institution_name} — {qm.tvet_qualification} ({qm.program_name || 'Scholarship'})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {selectedQm && (
          <div
            style={{
              marginTop: '18px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              gap: '24px',
              flexWrap: 'wrap',
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
            }}
          >
            <div>
              RQM Code: <strong style={{ color: 'var(--text-main)' }}>{selectedQm.rqm_code || '—'}</strong>
            </div>
            <div>
              Provider: <strong style={{ color: 'var(--text-main)' }}>{selectedQm.institution_name || '—'}</strong>
            </div>
            <div>
              Fiscal Year: <strong style={{ color: 'var(--text-main)' }}>{selectedQm.fiscal_year || 'FY 2026'}</strong>
            </div>
            <div>
              Approved Slots: <strong style={{ color: 'var(--text-main)' }}>{selectedQm.total_slots}</strong>
            </div>
            <div>
              Total Approved Amount:{' '}
              <strong style={{ color: 'var(--primary)' }}>
                {formatCurrency(Number(selectedQm.total_approved_amount))}
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* Metrics to show: Enrolled, Dropouts, Graduates, Assessed, Certified (with gender split), Employed (single total) */}
      {accomplishment && (
        <div className="metrics-grid">
          {/* 1. Enrolled */}
          <div className="glass-card metric-card">
            <div className="metric-title">Enrolled Trainees</div>
            <div className="metric-values">
              <strong>{accomplishment.enrolled_male + accomplishment.enrolled_female} Total</strong>
              <span className="gender-split">
                M: {accomplishment.enrolled_male} | F: {accomplishment.enrolled_female}
              </span>
            </div>
          </div>

          {/* 2. Dropouts */}
          <div className="glass-card metric-card">
            <div className="metric-title">Total Drop-outs</div>
            <div className="metric-values">
              <strong style={{ color: 'var(--status-rejected-text)' }}>
                {accomplishment.dropped_male + accomplishment.dropped_female} Total
              </strong>
              <span className="gender-split">
                M: {accomplishment.dropped_male} | F: {accomplishment.dropped_female}
              </span>
            </div>
          </div>

          {/* 3. Graduates */}
          <div className="glass-card metric-card">
            <div className="metric-title">Graduates</div>
            <div className="metric-values">
              <strong>
                {accomplishment.graduated_completed_male + accomplishment.graduated_completed_female} Total
              </strong>
              <span className="gender-split">
                M: {accomplishment.graduated_completed_male} | F: {accomplishment.graduated_completed_female}
              </span>
            </div>
          </div>

          {/* 4. Assessed */}
          <div className="glass-card metric-card">
            <div className="metric-title">Assessed</div>
            <div className="metric-values">
              <strong>{accomplishment.assessed_male + accomplishment.assessed_female} Total</strong>
              <span className="gender-split">
                M: {accomplishment.assessed_male} | F: {accomplishment.assessed_female}
              </span>
            </div>
          </div>

          {/* 5. Certified */}
          <div className="glass-card metric-card">
            <div className="metric-title">Certified</div>
            <div className="metric-values">
              <strong style={{ color: 'var(--status-active-text)' }}>
                {accomplishment.certified_male + accomplishment.certified_female} Total
              </strong>
              <span className="gender-split">
                M: {accomplishment.certified_male} | F: {accomplishment.certified_female}
              </span>
            </div>
          </div>

          {/* 6. Employed (Single Total) */}
          <div className="glass-card metric-card">
            <div className="metric-title">Employed</div>
            <div className="metric-values">
              <strong style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>
                {accomplishment.employed_male + accomplishment.employed_female} Total
              </strong>
              <span className="gender-split">Total Placed</span>
            </div>
          </div>
        </div>
      )}

      {/* Gender-Disaggregated Metrics Entry */}
      {selectedQmId && (
        <div className="glass-card" style={{ padding: '32px' }}>
          <h3 style={{ marginBottom: '20px' }}>Gender-Disaggregated Metrics Entry</h3>
          <form onSubmit={handleSave}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '20px',
              }}
            >
              {/* 1. Enrolled */}
              <div className="form-group">
                <label>Enrolled (Male / Female)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    placeholder="Male"
                    value={form.enrolled_male}
                    onChange={(e) => setForm({ ...form, enrolled_male: parseInt(e.target.value, 10) || 0 })}
                    disabled={!canEdit}
                  />
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    placeholder="Female"
                    value={form.enrolled_female}
                    onChange={(e) => setForm({ ...form, enrolled_female: parseInt(e.target.value, 10) || 0 })}
                    disabled={!canEdit}
                  />
                </div>
              </div>

              {/* 2. Dropouts */}
              <div className="form-group">
                <label>Dropouts (Male / Female)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    placeholder="Male"
                    value={form.dropped_male}
                    onChange={(e) => setForm({ ...form, dropped_male: parseInt(e.target.value, 10) || 0 })}
                    disabled={!canEdit}
                  />
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    placeholder="Female"
                    value={form.dropped_female}
                    onChange={(e) => setForm({ ...form, dropped_female: parseInt(e.target.value, 10) || 0 })}
                    disabled={!canEdit}
                  />
                </div>
              </div>

              {/* 3. Graduates */}
              <div className="form-group">
                <label>Graduates (Male / Female)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    placeholder="Male"
                    value={form.graduated_completed_male}
                    onChange={(e) =>
                      setForm({ ...form, graduated_completed_male: parseInt(e.target.value, 10) || 0 })
                    }
                    disabled={!canEdit}
                  />
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    placeholder="Female"
                    value={form.graduated_completed_female}
                    onChange={(e) =>
                      setForm({ ...form, graduated_completed_female: parseInt(e.target.value, 10) || 0 })
                    }
                    disabled={!canEdit}
                  />
                </div>
              </div>

              {/* 4. Assessed */}
              <div className="form-group">
                <label>Assessed (Male / Female)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    placeholder="Male"
                    value={form.assessed_male}
                    onChange={(e) => setForm({ ...form, assessed_male: parseInt(e.target.value, 10) || 0 })}
                    disabled={!canEdit}
                  />
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    placeholder="Female"
                    value={form.assessed_female}
                    onChange={(e) => setForm({ ...form, assessed_female: parseInt(e.target.value, 10) || 0 })}
                    disabled={!canEdit}
                  />
                </div>
              </div>

              {/* 5. Certified */}
              <div className="form-group">
                <label>Certified (Male / Female)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    placeholder="Male"
                    value={form.certified_male}
                    onChange={(e) => setForm({ ...form, certified_male: parseInt(e.target.value, 10) || 0 })}
                    disabled={!canEdit}
                  />
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    placeholder="Female"
                    value={form.certified_female}
                    onChange={(e) => setForm({ ...form, certified_female: parseInt(e.target.value, 10) || 0 })}
                    disabled={!canEdit}
                  />
                </div>
              </div>

              {/* 6. Employed (Single total input) */}
              <div className="form-group">
                <label>Total Employed</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  placeholder="Total Employed Trainees"
                  value={form.employed_total}
                  onChange={(e) => setForm({ ...form, employed_total: parseInt(e.target.value, 10) || 0 })}
                  disabled={!canEdit}
                />
              </div>
            </div>

            {canEdit && (
              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Update Accomplishment Metrics'}
                </button>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
};
