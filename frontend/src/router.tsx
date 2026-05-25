import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { ErrorPage } from './pages/ErrorPage';
import StatusesPage from './pages/StatusesPage';
import ItemsPage from './pages/ItemsPage';

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
        path: '/items',
        element: <ItemsPage />,
      },
    ],
  },
]);
