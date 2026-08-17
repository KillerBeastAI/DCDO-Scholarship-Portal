import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { User, UserRole } from '../types';
import './Users.css';

export const Users: React.FC = () => {
  const { user: currentUser, updateUser: updateAuthUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    username: '',
    email: '',
    department: '',
    role: 'evaluator' as UserRole,
    password: '',
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ data: User[] }>('/users');
      setUsers(data.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleCopyPassword = (userId: string, password?: string | null) => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopiedId(userId);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleOpenModal = (u?: User) => {
    if (u) {
      setEditingId(u.user_id);
      setForm({
        username: u.username,
        email: u.email,
        department: u.department,
        role: u.role,
        password: '',
      });
    } else {
      setEditingId(null);
      setForm({
        username: '',
        email: '',
        department: '',
        role: 'evaluator',
        password: '',
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        username: form.username,
        email: form.email,
        department: form.department,
        role: form.role,
      };
      if (form.password) payload.password = form.password;

      if (editingId) {
        const { data } = await api.put<{ data: User }>(`/users/${editingId}`, payload);
        if (currentUser && currentUser.user_id === editingId) {
          updateAuthUser(data.data);
        }
      } else {
        await api.post('/users', payload);
      }
      setShowModal(false);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save user account');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user account?')) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const roleBadgeClass = (role: UserRole) => {
    if (role === 'admin') return 'badge-active';
    if (role === 'evaluator') return 'badge-pending';
    return 'badge-verified';
  };

  const roleLabel = (role: UserRole) => {
    if (role === 'admin') return 'Admin';
    if (role === 'evaluator') return 'Evaluator';
    return 'Finance Auditor';
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title-text">Internal User Accounts Management</h2>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          + Add User Account
        </button>
      </div>

      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading user accounts...
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email Address</th>
                {isAdmin && <th>Password</th>}
                <th>Department</th>
                <th>Role</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No internal user accounts found.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isVisible = !!visiblePasswords[u.user_id];
                  const plainPass = u.password_plain || 'Password123!';

                  return (
                    <tr key={u.user_id}>
                      <td>
                        <strong>{u.username}</strong>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                      {isAdmin && (
                        <td>
                          <div className="password-cell">
                            <span className={`password-display-box ${!isVisible ? 'masked' : ''}`}>
                              {isVisible ? plainPass : '••••••••'}
                              <div style={{ display: 'inline-flex', gap: '4px', marginLeft: '6px' }}>
                                <button
                                  type="button"
                                  className="password-action-btn"
                                  onClick={() => togglePasswordVisibility(u.user_id)}
                                  title={isVisible ? 'Hide Password' : 'Show Password'}
                                >
                                  {isVisible ? '🙈' : '👁️'}
                                </button>
                                {isVisible && (
                                  <button
                                    type="button"
                                    className="password-action-btn"
                                    onClick={() => handleCopyPassword(u.user_id, plainPass)}
                                    title="Copy Password"
                                  >
                                    📋
                                  </button>
                                )}
                              </div>
                            </span>
                            {copiedId === u.user_id && (
                              <span className="copy-feedback-badge">Copied!</span>
                            )}
                          </div>
                        </td>
                      )}
                      <td>{u.department}</td>
                      <td>
                        <span className={`badge ${roleBadgeClass(u.role)}`}>{roleLabel(u.role)}</span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('en-PH') : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleOpenModal(u)}>
                            Edit
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ color: 'var(--status-rejected-text)', borderColor: 'var(--status-rejected-text)' }}
                            onClick={() => handleDelete(u.user_id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
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
              <h3 className="modal-title">{editingId ? 'Edit User Account' : 'Add User Account'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave} className="modal-form">
              <div className="form-group">
                <label htmlFor="user-username">Username</label>
                <input
                  id="user-username"
                  name="username"
                  className="form-input"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="e.g. juan.delacruz"
                  autoComplete="username"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="user-email">Email Address</label>
                <input
                  id="user-email"
                  name="email"
                  type="email"
                  className="form-input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="user@davao.gov.ph"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="user-dept">Department</label>
                <input
                  id="user-dept"
                  name="department"
                  className="form-input"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="e.g. City Social Welfare and Development Office"
                  autoComplete="organization"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="user-role">Role</label>
                <select
                  id="user-role"
                  name="role"
                  className="form-input"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                >
                  <option value="admin">Admin</option>
                  <option value="evaluator">Evaluator</option>
                  <option value="finance_auditor">Finance Auditor</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="user-password">{editingId ? 'New Password (leave blank to keep current)' : 'Password'}</label>
                <input
                  id="user-password"
                  name="password"
                  type="password"
                  className="form-input"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required={!editingId}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
