import React from 'react';
import { Link } from 'react-router-dom';

export const Unauthorized: React.FC = () => {
  return (
    <div className="glass-card" style={{ padding: '48px', textAlign: 'center', maxWidth: '500px', margin: '40px auto' }}>
      <h2 style={{ color: 'var(--status-rejected-text)', marginBottom: '12px' }}>403 Access Denied</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
        You do not have the required role permissions to access this page.
      </p>
      <Link to="/" className="btn btn-primary">
        Return to Dashboard
      </Link>
    </div>
  );
};
