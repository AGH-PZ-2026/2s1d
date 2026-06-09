import { Link } from 'react-router-dom';

const quickActions = [
  { to: '/items', icon: '⊞', label: 'Przeglądaj przedmioty' },
  { to: '/qr', icon: '⊡', label: 'Skanuj kod QR' },
  { to: '/items', icon: '+', label: 'Dodaj przedmiot' },
  { to: '/import', icon: '⇪', label: 'Importuj z Excel' },
  { to: '/batch-qr', icon: '⊞', label: 'Drukuj etykiety' },
  { to: '/reports/overdue', icon: '⎙', label: 'Raport przeterminowanych' },
];

export const HomePage = () => {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Przegląd systemu zarządzania inwentaryzacją aparatury pomiarowej AGH
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon stat-card-icon--accent">⊞</div>
          <div className="stat-card-label">Przedmioty</div>
          <div className="stat-card-value">—</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon stat-card-icon--info">◎</div>
          <div className="stat-card-label">Wypożyczone</div>
          <div className="stat-card-value">—</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon stat-card-icon--danger">⚠</div>
          <div className="stat-card-label">Przeterminowane</div>
          <div className="stat-card-value">—</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon stat-card-icon--warning">◈</div>
          <div className="stat-card-label">Kategorie</div>
          <div className="stat-card-value">—</div>
        </div>
      </div>

      <div className="section-header">
        <h2>Szybkie akcje</h2>
      </div>

      <div className="quick-actions">
        {quickActions.map((action) => (
          <Link
            key={action.to + action.label}
            to={action.to}
            className="quick-action"
          >
            <div className="quick-action-icon">{action.icon}</div>
            {action.label}
          </Link>
        ))}
      </div>

      <div className="section-header">
        <h2>Ostatnia aktywność</h2>
      </div>

      <div className="empty-state">
        <div className="empty-state-icon">◎</div>
        <p className="empty-state-text">
          Brak ostatniej aktywności. Dodaj przedmioty do systemu, aby rozpocząć
          śledzenie inwentaryzacji.
        </p>
      </div>
    </div>
  );
};
