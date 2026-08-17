import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile sidebar on route change
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="layout-container">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="seal-icon">
            <img src="/tesda-logo.png" alt="TESDA Logo" className="sidebar-logo-img" />
          </div>
          <div className="sidebar-branding">
            <div className="sidebar-title">TESDA DCDO</div>
            <div className="sidebar-subtitle">Scholarship Portal</div>
          </div>
          <button
            className="sidebar-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
          >
            ✕
          </button>
        </div>

        <ul className="nav-list">
          <li>
            <NavLink
              to="/"
              end
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              📊 Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/providers"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              🏫 Training Providers
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/programs"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              🎓 Scholarship Programs
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/qualification-maps"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              📜 Qualification Maps
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/accomplishments"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              📈 Accomplishments
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/billings"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              💳 Internal Billings
            </NavLink>
          </li>

          {user?.role === 'admin' && (
            <li>
              <NavLink
                to="/users"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                👥 Internal Users
              </NavLink>
            </li>
          )}
        </ul>
      </aside>

      <div className="main-wrapper">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              ☰
            </button>
            <h1 className="page-title">
              <span className="page-title-full">Scholarship Programs Management System</span>
              <span className="page-title-short">DCDO Portal</span>
            </h1>
          </div>

          {user && (
            <div className="user-profile">
              <div className="user-info">
                <div className="user-name">{user.username}</div>
                <div className="user-dept">{user.department}</div>
              </div>
              <span className={`badge badge-${user.role === 'admin' ? 'active' : user.role === 'evaluator' ? 'pending' : 'verified'}`}>
                {user.role}
              </span>
              <button className="btn btn-secondary btn-sm" onClick={logout}>
                Logout
              </button>
            </div>
          )}
        </header>

        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
