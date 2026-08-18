import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoRole = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="city-logo">
            <img src="/tesda-logo.png" alt="TESDA Logo" className="logo-img" />
          </div>
          <h2 className="portal-name">TESDA DCDO</h2>
          <div className="portal-sub">Scholarship Programs Portal</div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@davao.gov.ph"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="demo-roles">
          <div className="demo-title">Quick Demo Login</div>
          <div className="demo-buttons">
            <button
              type="button"
              className="demo-btn"
              onClick={() => fillDemoRole('admin.reyes@davao.gov.ph')}
            >
              👑 Admin
            </button>
            <button
              type="button"
              className="demo-btn"
              onClick={() => fillDemoRole('eval.santos@davao.gov.ph')}
            >
              📝 Evaluator
            </button>
            <button
              type="button"
              className="demo-btn"
              onClick={() => fillDemoRole('finance.delacruz@davao.gov.ph')}
            >
              💼 Auditor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
