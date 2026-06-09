import { render, screen } from '@testing-library/react';
import { RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';

describe('router', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('blokuje Dashboard dla wylogowanego użytkownika', async () => {
    const { router } = await import('./router');

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('Wymagane logowanie')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).toBeNull();
  });
});
