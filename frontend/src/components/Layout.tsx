import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="layout-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="seal-icon">
            <img src="/tesda-logo.png" alt="TESDA Logo" className="sidebar-logo-img" />
          </div>
          <div>
            <div className="sidebar-title">TESDA DCDO</div>
            <div className="sidebar-subtitle">Scholarship Portal</div>
          </div>
        </div>

        <ul className="nav-list">
          <li>
            <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              📊 Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/providers" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              🏫 Training Providers
            </NavLink>
          </li>
          <li>
            <NavLink to="/programs" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              🎓 Scholarship Programs
            </NavLink>
          </li>
          <li>
            <NavLink to="/qualification-maps" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              📜 Qualification Maps
            </NavLink>
          </li>
          <li>
            <NavLink to="/accomplishments" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              📈 Accomplishments
            </NavLink>
          </li>
          <li>
            <NavLink to="/billings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              💳 Internal Billings
            </NavLink>
          </li>

          {user?.role === 'admin' && (
            <li>
              <NavLink to="/users" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                👥 Internal Users
              </NavLink>
            </li>
          )}
        </ul>
      </aside>

      <div className="main-wrapper">
        <header className="topbar">
          <h1 className="page-title">Scholarship Programs Management System</h1>
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
