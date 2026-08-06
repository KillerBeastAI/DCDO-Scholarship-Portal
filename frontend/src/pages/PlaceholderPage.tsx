import React from 'react';

export const PlaceholderPage: React.FC<{ title: string; roleNeeded?: string }> = ({ title, roleNeeded }) => {
  return (
    <div className="glass-card" style={{ padding: '32px' }}>
      <h2 style={{ marginBottom: '12px' }}>{title}</h2>
      <p style={{ color: 'var(--text-muted)' }}>
        This CRUD management section will be fully implemented in the next sub-phase.
      </p>
      {roleNeeded && (
        <p style={{ marginTop: '8px', fontSize: '0.85rem' }}>
          <strong>Required Role:</strong> <span className="badge badge-verified">{roleNeeded}</span>
        </p>
      )}
    </div>
  );
};
