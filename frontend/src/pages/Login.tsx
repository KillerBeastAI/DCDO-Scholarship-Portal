import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingScreen } from '../components/LoadingScreen';
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
      const errData = err.response?.data?.error || err.response?.data?.message || err.response?.data;
      if (typeof errData === 'string') {
        setError(errData);
      } else if (errData && typeof errData === 'object') {
        setError(errData.message || JSON.stringify(errData));
      } else {
        setError(err.message || 'Login failed. Please verify credentials.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      {submitting && (
        <LoadingScreen
          message="Authenticating..."
          submessage="Signing in to TESDA DCDO Portal"
        />
      )}
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
              name="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@tesda.gov.ph"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
