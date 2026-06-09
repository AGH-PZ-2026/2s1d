import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { ErrorPage } from './pages/ErrorPage';
import StatusesPage from './pages/StatusesPage';
import CategoriesPage from './pages/CategoriesPage';
import DelegationsPage from './pages/DelegationsPage';
import ItemsPage from './pages/ItemsPage';
import LoginPage from './pages/LoginPage';
import QrScannerPage from './pages/QrScannerPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: '/',
        element: <HomePage />,
      },
      {
        path: '/about',
        element: <AboutPage />,
      },
      {
        path: '/statuses',
        element: <StatusesPage />,
      },
      {
        path: '/categories',
        element: <CategoriesPage />,
      },
      {
        path: '/delegations',
        element: <DelegationsPage />,
      },
      {
        path: '/items',
        element: <ItemsPage />,
      },
      {
        path: '/qr',
        element: <QrScannerPage />,
      },
      {
        path: '/login',
        element: <LoginPage />,
      },
    ],
  },
]);
