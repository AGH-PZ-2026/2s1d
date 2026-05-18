import { useRouteError, Link } from 'react-router-dom';

export const ErrorPage = () => {
    const error = useRouteError() as any;
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Something went wrong.</h1>
      <p>{error.statusText || error.message}</p>
      <Link to="/">Back to main page</Link>
    </div>
    );
};