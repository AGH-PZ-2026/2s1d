import { Outlet, Link } from 'react-router';

export const Layout = () => {
  return (
    <div>
      <nav style={{ padding: '1rem', borderBottom: '1px solid #ccc' }}>
        <Link to="/" style={{ marginRight: '15px' }}>
          Main page
        </Link>
        <Link to="/about" style={{ marginRight: '15px' }}>
          About
        </Link>
        <Link to="/statuses" style={{ marginRight: '15px' }}>
          Statuses page
        </Link>
        <Link to="/categories" style={{ marginRight: '15px' }}>
          Categories
        </Link>
        <Link to="/delegations" style={{ marginRight: '15px' }}>
          Delegations
        </Link>
        <Link to="/items" style={{ marginRight: '15px' }}>
          Items page
        </Link>
        <Link to="/qr" style={{ marginRight: '15px' }}>
          QR
        </Link>
        <Link to="/import" style={{ marginRight: '15px' }}>
          Import
        </Link>
        <Link to="/reports/overdue" style={{ marginRight: '15px' }}>
          Reports
        </Link>
        <Link to="/login" style={{ marginRight: '15px' }}>
          Login
        </Link>
        <Link to="/contact">Non-existent page</Link>
      </nav>

      <main style={{ padding: '2rem' }}>
        <Outlet />
      </main>

      <footer style={{ marginTop: '50px', fontSize: '12px' }}>2026</footer>
    </div>
  );
};
