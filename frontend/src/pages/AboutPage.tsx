export const AboutPage = () => {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">O systemie</h1>
          <p className="page-subtitle">
            System Zarządzania Inwentaryzacją Aparatury Pomiarowej AGH
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        }}
      >
        <div className="stat-card">
          <div className="stat-card-label">Wersja</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
            1.0.0
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>
            Aktualna wersja systemu inwentaryzacji
          </p>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">Technologie</div>
          <div
            style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}
          >
            {[
              'React',
              'TypeScript',
              'Vite',
              'FastAPI',
              'PostgreSQL',
              'Docker',
            ].map((tech) => (
              <span key={tech} className="badge badge-custom">
                {tech}
              </span>
            ))}
          </div>
        </div>

        <div className="stat-card" style={{ gridColumn: '1 / -1' }}>
          <div className="stat-card-label">Opis</div>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: 14,
              marginTop: 8,
              lineHeight: 1.7,
              maxWidth: 700,
            }}
          >
            System umożliwia zarządzanie inwentaryzacją aparatury pomiarowej na
            Akademii Górniczo-Hutniczej. Umożliwia śledzenie przedmiotów,
            zarządzanie kategoriami i statusami, drukowanie kodów QR, import
            danych z arkuszy Excel oraz generowanie raportów przeterminowanych
            wypożyczeń.
          </p>
        </div>
      </div>
    </div>
  );
};
