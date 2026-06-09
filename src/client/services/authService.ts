export type UserRole = 'user' | 'admin';

export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
  is_active: boolean;
  is_approved: boolean;
}

export interface AuthSession {
  accessToken: string;
  tokenType: string;
  user: AuthUser;
}

interface MockSsoResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

const TOKEN_KEY = 'access_token';
const USER_KEY = 'auth_user';

export const authService = {
  async mockSsoLogin(email: string, role: UserRole): Promise<AuthSession> {
    const response = await fetch('/api/v1/auth/mock-sso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });
    await ensureOk(response);
    const data: MockSsoResponse = await response.json();
    const session = {
      accessToken: data.access_token,
      tokenType: data.token_type,
      user: data.user,
    };
    window.localStorage.setItem(TOKEN_KEY, session.accessToken);
    window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
    window.dispatchEvent(new Event('auth-session-changed'));
    return session;
  },

  getSessionUser(): AuthUser | null {
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },

  logout(): void {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event('auth-session-changed'));
  },
};

async function ensureOk(response: Response): Promise<void> {
  if (response.ok) return;
  let detail = `Błąd serwera (${response.status})`;
  try {
    const data = await response.json();
    if (typeof data.detail === 'string') detail = data.detail;
  } catch {
    // Keep fallback error.
  }
  throw new Error(detail);
}
