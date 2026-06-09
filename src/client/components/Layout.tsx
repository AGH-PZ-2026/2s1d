import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  section?: string;
}

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: '◉', section: 'Główne' },
  { to: '/items', label: 'Przedmioty', icon: '⊞' },
  { to: '/categories', label: 'Kategorie', icon: '⊟' },
  { to: '/statuses', label: 'Statusy', icon: '◈' },
  { to: '/delegations', label: 'Delegacje', icon: '⊜' },
  { to: '/qr', label: 'Skaner QR', icon: '⊡', section: 'Narzędzia' },
  { to: '/batch-qr', label: 'Druk QR', icon: '⊞' },
  { to: '/import', label: 'Import Excel', icon: '⇪' },
  { to: '/reports/overdue', label: 'Raporty', icon: '⎙' },
  { to: '/notifications', label: 'Powiadomienia', icon: '◎', section: 'System' },
  { to: '/about', label: 'O systemie', icon: '◌' },
];

export const Layout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <button
        className="btn btn-ghost mobile-nav-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          display: 'none',
          position: 'fixed',
          top: 12,
          left: 12,
          zIndex: 60,
        }}
        aria-label="Menu"
      >
        ☰
      </button>

      {sidebarOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 49,
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <Link to="/" className="sidebar-brand" onClick={() => setSidebarOpen(false)}>
          <div className="sidebar-brand-icon">SZ</div>
          <div className="sidebar-brand-text">
            Inwentaryzacja
            <small>System zarządzania</small>
          </div>
        </Link>

        <nav style={{ flex: 1, padding: '8px 0' }}>
          {navItems.map((item) => {
            const isActive =
              item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.to);

            return (
              <div key={item.to}>
                {item.section && (
                  <div className="sidebar-section">
                    <div className="sidebar-section-label">{item.section}</div>
                  </div>
                )}
                <div style={{ padding: '0 10px' }}>
                  <Link
                    to={item.to}
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="nav-link-icon">{item.icon}</span>
                    {item.label}
                  </Link>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <Link to="/login" className="nav-link" style={{ marginBottom: 8 }} onClick={() => setSidebarOpen(false)}>
            <span className="nav-link-icon">⊡</span>
            Logowanie
          </Link>
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">?</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">Niezalogowany</div>
              <div className="sidebar-user-role">Zaloguj się</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};
