import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { PhysicalAccomplishment, QualificationMap } from '../types';
import './Accomplishments.css';

export const Accomplishments: React.FC = () => {
  const { user } = useAuth();
  const [qms, setQms] = useState<QualificationMap[]>([]);
  const [selectedQmId, setSelectedQmId] = useState<string>('');
  const [accomplishment, setAccomplishment] = useState<PhysicalAccomplishment | null>(null);
  const [, setLoading] = useState(true);

  const [form, setForm] = useState({
    enrolled_male: 0,
    enrolled_female: 0,
    dropped_male: 0,
    dropped_female: 0,
    graduated_completed_male: 0,
    graduated_completed_female: 0,
    graduated_pending_assessment_male: 0,
    graduated_pending_assessment_female: 0,
    assessed_male: 0,
    assessed_female: 0,
    certified_male: 0,
    certified_female: 0,
    employed_male: 0,
    employed_female: 0,
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
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
          enrolled_male: acc.enrolled_male,
          enrolled_female: acc.enrolled_female,
          dropped_male: acc.dropped_male,
          dropped_female: acc.dropped_female,
          graduated_completed_male: acc.graduated_completed_male,
          graduated_completed_female: acc.graduated_completed_female,
          graduated_pending_assessment_male: acc.graduated_pending_assessment_male,
          graduated_pending_assessment_female: acc.graduated_pending_assessment_female,
          assessed_male: acc.assessed_male,
          assessed_female: acc.assessed_female,
          certified_male: acc.certified_male,
          certified_female: acc.certified_female,
          employed_male: acc.employed_male,
          employed_female: acc.employed_female,
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
          graduated_pending_assessment_male: 0,
          graduated_pending_assessment_female: 0,
          assessed_male: 0,
          assessed_female: 0,
          certified_male: 0,
          certified_female: 0,
          employed_male: 0,
          employed_female: 0,
        });
      });
  }, [selectedQmId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQmId) return;
    setSaving(true);

    try {
      const { data } = await api.put<{ data: PhysicalAccomplishment }>(`/accomplishments/${selectedQmId}`, form);
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

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title-text">Physical Accomplishments Tracking</h2>
      </div>

      <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
          Select Qualification Map:
        </label>
        <select
          className="form-input"
          style={{ maxWidth: '600px' }}
          value={selectedQmId}
          onChange={(e) => setSelectedQmId(e.target.value)}
        >
          {qms.map((qm) => (
            <option key={qm.qm_id} value={qm.qm_id}>
              {qm.tvet_qualification} — {qm.institution_name} ({qm.program_name})
            </option>
          ))}
        </select>

        {selectedQm && (
          <div style={{ marginTop: '16px', display: 'flex', gap: '24px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            <div>Total Slots: <strong>{selectedQm.total_slots}</strong></div>
            <div>Approved Budget: <strong>{formatCurrency(Number(selectedQm.total_approved_amount))}</strong></div>
          </div>
        )}
      </div>

      {accomplishment && (
        <div className="metrics-grid">
          <div className="glass-card metric-card">
            <div className="metric-title">Enrolled Trainees</div>
            <div className="metric-values">
              <strong>{accomplishment.enrolled_male + accomplishment.enrolled_female} Total</strong>
              <span className="gender-split">M: {accomplishment.enrolled_male} | F: {accomplishment.enrolled_female}</span>
            </div>
          </div>

          <div className="glass-card metric-card">
            <div className="metric-title">Certified Graduates</div>
            <div className="metric-values">
              <strong style={{ color: 'var(--status-active-text)' }}>
                {accomplishment.certified_male + accomplishment.certified_female} Total
              </strong>
              <span className="gender-split">M: {accomplishment.certified_male} | F: {accomplishment.certified_female}</span>
            </div>
          </div>

          <div className="glass-card metric-card">
            <div className="metric-title">Dropped Deduction</div>
            <div className="metric-values">
              <strong style={{ color: 'var(--status-rejected-text)' }}>
                {formatCurrency(Number(accomplishment.dropped_amount_deduction))}
              </strong>
            </div>
          </div>

          <div className="glass-card metric-card">
            <div className="metric-title">Unutilized Slots Value</div>
            <div className="metric-values">
              <strong>{formatCurrency(Number(accomplishment.unutilized_amount))}</strong>
              <span className="gender-split">({accomplishment.unutilized_slots} slots)</span>
            </div>
          </div>
        </div>
      )}

      {selectedQmId && (
        <div className="glass-card" style={{ padding: '32px' }}>
          <h3 style={{ marginBottom: '20px' }}>Gender-Disaggregated Metrics Entry</h3>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
              <div className="form-group">
                <label>Enrolled Male / Female</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Male"
                    value={form.enrolled_male}
                    onChange={(e) => setForm({ ...form, enrolled_male: parseInt(e.target.value, 10) || 0 })}
                    disabled={!canEdit}
                  />
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Female"
                    value={form.enrolled_female}
                    onChange={(e) => setForm({ ...form, enrolled_female: parseInt(e.target.value, 10) || 0 })}
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Dropped Male / Female</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Male"
                    value={form.dropped_male}
                    onChange={(e) => setForm({ ...form, dropped_male: parseInt(e.target.value, 10) || 0 })}
                    disabled={!canEdit}
                  />
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Female"
                    value={form.dropped_female}
                    onChange={(e) => setForm({ ...form, dropped_female: parseInt(e.target.value, 10) || 0 })}
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Certified Male / Female</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Male"
                    value={form.certified_male}
                    onChange={(e) => setForm({ ...form, certified_male: parseInt(e.target.value, 10) || 0 })}
                    disabled={!canEdit}
                  />
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Female"
                    value={form.certified_female}
                    onChange={(e) => setForm({ ...form, certified_female: parseInt(e.target.value, 10) || 0 })}
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Employed Male / Female</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Male"
                    value={form.employed_male}
                    onChange={(e) => setForm({ ...form, employed_male: parseInt(e.target.value, 10) || 0 })}
                    disabled={!canEdit}
                  />
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Female"
                    value={form.employed_female}
                    onChange={(e) => setForm({ ...form, employed_female: parseInt(e.target.value, 10) || 0 })}
                    disabled={!canEdit}
                  />
                </div>
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
