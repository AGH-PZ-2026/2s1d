import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthGate } from './components/AuthGate';
import { HomePage } from './pages/HomePage';
import { ErrorPage } from './pages/ErrorPage';
import StatusesPage from './pages/StatusesPage';
import CategoriesPage from './pages/CategoriesPage';
import DelegationsPage from './pages/DelegationsPage';
import BorrowingsPage from './pages/BorrowingsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import ExcelImportPage from './pages/ExcelImportPage';
import ItemsPage from './pages/ItemsPage';
import UsersPage from './pages/UsersPage';
import LoginPage from './pages/LoginPage';
import NotificationsPage from './pages/NotificationsPage';
import OverdueReportsPage from './pages/OverdueReportsPage';
import QrScannerPage from './pages/QrScannerPage';
import BatchQrPage from './pages/BatchQrPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      { path: '/', element: <AuthGate><HomePage /></AuthGate> },
      { path: '/statuses', element: <AuthGate><StatusesPage /></AuthGate> },
      { path: '/categories', element: <AuthGate><CategoriesPage /></AuthGate> },
      { path: '/delegations', element: <AuthGate><DelegationsPage /></AuthGate> },
      { path: '/borrowings', element: <AuthGate><BorrowingsPage /></AuthGate> },
      { path: '/users', element: <AuthGate requireAdmin><UsersPage /></AuthGate> },
      { path: '/audit-logs', element: <AuthGate requireAdmin><AuditLogsPage /></AuthGate> },
      { path: '/items', element: <AuthGate><ItemsPage /></AuthGate> },
      { path: '/qr', element: <AuthGate><QrScannerPage /></AuthGate> },
      { path: '/import', element: <AuthGate requireAdmin> <ExcelImportPage /></AuthGate> },
      { path: '/reports/overdue', element: <AuthGate><OverdueReportsPage /></AuthGate> },
      { path: '/batch-qr', element: <AuthGate><BatchQrPage /></AuthGate> },
      { path: '/notifications', element: <AuthGate><NotificationsPage /></AuthGate> },
      { path: '/login', element: <LoginPage /> },
    ],
  },
]);
