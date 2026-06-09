import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { AuthGate } from './components/AuthGate';
import { HomePage } from './pages/HomePage';
import AuditLogsPage from './pages/AuditLogsPage';
import BatchQrPage from './pages/BatchQrPage';
import { ErrorPage } from './pages/ErrorPage';
import StatusesPage from './pages/StatusesPage';
import CategoriesPage from './pages/CategoriesPage';
import DelegationsPage from './pages/DelegationsPage';
import BorrowingsPage from './pages/BorrowingsPage';
import ExcelImportPage from './pages/ExcelImportPage';
import ItemsPage from './pages/ItemsPage';
import LoginPage from './pages/LoginPage';
import NotificationsPage from './pages/NotificationsPage';
import OverdueReportsPage from './pages/OverdueReportsPage';
import QrScannerPage from './pages/QrScannerPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: '/',
        element: (
          <AuthGate>
            <HomePage />
          </AuthGate>
        ),
      },
      {
        path: '/statuses',
        element: (
          <AuthGate>
            <StatusesPage />
          </AuthGate>
        ),
      },
      {
        path: '/categories',
        element: (
          <AuthGate>
            <CategoriesPage />
          </AuthGate>
        ),
      },
      {
        path: '/delegations',
        element: (
          <AuthGate>
            <DelegationsPage />
          </AuthGate>
        ),
      },
      {
        path: '/borrowings',
        element: (
          <AuthGate>
            <BorrowingsPage />
          </AuthGate>
        ),
      },
      {
        path: '/items',
        element: (
          <AuthGate>
            <ItemsPage />
          </AuthGate>
        ),
      },
      {
        path: '/qr',
        element: (
          <AuthGate>
            <QrScannerPage />
          </AuthGate>
        ),
      },
      {
        path: '/import',
        element: (
          <AuthGate>
            <ExcelImportPage />
          </AuthGate>
        ),
      },
      {
        path: '/reports/overdue',
        element: (
          <AuthGate>
            <OverdueReportsPage />
          </AuthGate>
        ),
      },
      {
        path: '/batch-qr',
        element: (
          <AuthGate>
            <BatchQrPage />
          </AuthGate>
        ),
      },
      {
        path: '/notifications',
        element: (
          <AuthGate>
            <NotificationsPage />
          </AuthGate>
        ),
      },
      {
        path: '/audit-logs',
        element: (
          <AuthGate>
            <AuditLogsPage />
          </AuthGate>
        ),
      },
      {
        path: '/login',
        element: <LoginPage />,
      },
    ],
  },
]);
