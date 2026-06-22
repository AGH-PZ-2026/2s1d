import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import UsersPage from './UsersPage';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      email: 'admin@agh.edu.pl',
      role: 'admin',
      is_active: true,
      is_approved: true,
    },
  }),
}));

vi.mock('../services/userService', () => ({
  userService: {
    getAll: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    updateRole: vi.fn(),
  },
}));

const { userService } = await import('../services/userService');

describe('UsersPage', () => {
  beforeEach(() => {
    vi.mocked(userService.getAll).mockResolvedValue([
      {
        id: 1,
        email: 'admin@agh.edu.pl',
        role: 'admin',
        isActive: true,
        isApproved: true,
      },
      {
        id: 2,
        email: 'nowy.pracownik@agh.edu.pl',
        role: 'user',
        isActive: true,
        isApproved: false,
      },
    ]);
    vi.mocked(userService.reject).mockResolvedValue({
      id: 2,
      email: 'nowy.pracownik@agh.edu.pl',
      role: 'user',
      isActive: false,
      isApproved: false,
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('odrzuca konto oczekujące i pokazuje status odrzucony', async () => {
    render(<UsersPage />);

    const row = await screen.findByRole('row', {
      name: /nowy\.pracownik@agh\.edu\.pl/,
    });
    expect(
      within(row).getByText('Oczekuje na zatwierdzenie')
    ).toBeInTheDocument();

    fireEvent.click(within(row).getByRole('button', { name: 'Odrzuć' }));

    expect(userService.reject).toHaveBeenCalledWith(2);
    expect(await screen.findByText('Odrzucony')).toBeInTheDocument();
  });
});
