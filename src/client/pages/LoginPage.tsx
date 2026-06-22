import { useState, useEffect, type FormEvent, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, type AuthUser } from '../services/authService';

// Extend window to declare google type
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            context?: string;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number;
              locale?: string;
            }
          ) => void;
          prompt: (momentListener?: (notification: unknown) => void) => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(() =>
    authService.getSessionUser()
  );
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [devError, setDevError] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocalAuthLoading, setIsLocalAuthLoading] = useState(false);

  // ── Auth config ──────────────────────────────────────────────────────────
  const [devBypassAuth, setDevBypassAuth] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [devEmail, setDevEmail] = useState('');

  useEffect(() => {
    authService.getConfig().then((cfg) => {
      setDevBypassAuth(cfg.devBypassAuth);
      setGoogleClientId(cfg.googleClientId);
    });
  }, []);

  // ── Google Sign-In callback ──────────────────────────────────────────────

  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      setGoogleError(null);
      setDevError(null);
      setLocalError(null);
      setIsSubmitting(true);
      try {
        const session = await authService.googleLogin(credential);
        setUser(session.user);
        navigate('/');
      } catch (err) {
        setGoogleError(
          err instanceof Error
            ? err.message
            : 'Nie udało się zalogować przez Google.'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [navigate]
  );

  // Initialize Google Identity Services when client ID is available
  useEffect(() => {
    if (!googleClientId || devBypassAuth) return;

    // Load GIS script if not already loaded
    const scriptId = 'google-gis-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initGoogle();
      };
      document.head.appendChild(script);
    } else {
      initGoogle();
    }

    function initGoogle() {
      if (!window.google?.accounts) {
        // Retry after a short delay
        setTimeout(initGoogle, 200);
        return;
      }
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => {
          handleGoogleCredential(response.credential);
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      // Render the Google Sign-In button
      const btnContainer = document.getElementById('g_id_signin');
      if (btnContainer) {
        window.google.accounts.id.renderButton(btnContainer, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: btnContainer.offsetWidth > 0 ? btnContainer.offsetWidth : 360,
        });
      }
    }
  }, [googleClientId, devBypassAuth, handleGoogleCredential]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleLogout() {
    authService.logout();
    setUser(null);
  }

  async function handleLocalAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    setGoogleError(null);
    setDevError(null);
    setSuccessMessage(null);
    setIsLocalAuthLoading(true);

    try {
      if (isLoginMode) {
        const session = await authService.login({ email, password });
        setUser(session.user);
        setSuccessMessage('Zalogowano pomyślnie');
        navigate('/');
      } else {
        await authService.register({ email, password });
        setSuccessMessage('Konto wymaga zatwierdzenia przez administratora');
        setEmail('');
        setPassword('');
        setIsLoginMode(true);
      }
    } catch (err) {
      let errorMsg: string;
      if (err instanceof Error) {
        errorMsg = err.message;
      } else if (isLoginMode) {
        errorMsg = 'Nie udało się zalogować.';
      } else {
        errorMsg = 'Nie udało się zarejestrować.';
      }
      setLocalError(errorMsg);
    } finally {
      setIsLocalAuthLoading(false);
    }
  }

  async function handleDevBypassSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDevError(null);
    setGoogleError(null);
    setLocalError(null);
    setIsSubmitting(true);
    try {
      // In dev bypass mode, we send the email as credential
      const session = await authService.googleLogin(devEmail);
      setUser(session.user);
      setDevEmail('');
      navigate('/');
    } catch (err) {
      setDevError(
        err instanceof Error
          ? err.message
          : 'Nie udało się zalogować przez dev bypass.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="login-grid">
      <div className="login-panel login-panel--primary">
        <p className="login-eyebrow">
          Logowanie do systemu aparatury pomiarowej
        </p>
        <h1>Wybierz metodę logowania</h1>
        <p className="login-copy">
          Zaloguj się przez konto Google w domenie @agh.edu.pl lub użyj konta
          developerskiego.
        </p>
      </div>

      {/* ── Google Sign-In (production) ─────────────────────────────────── */}
      {!devBypassAuth && googleClientId && (
        <div className="login-panel">
          <h2>Konto Google AGH</h2>
          <p className="login-copy">
            Kliknij przycisk poniżej, aby zalogować się przez konto Google w
            domenie <strong>@agh.edu.pl</strong>.
          </p>
          {googleError && (
            <div className="alert alert-error" style={{ marginTop: 16 }}>
              {googleError}
            </div>
          )}
          <div id="g_id_signin" style={{ marginTop: 12, minHeight: 40 }} />
        </div>
      )}

      {/* ── Dev bypass ──────────────────────────────────────────────────── */}
      {devBypassAuth && (
        <div className="login-panel">
          <h2>Dev Bypass — Google OAuth (symulowane)</h2>
          <p className="login-copy">
            <strong>DEV_BYPASS_AUTH</strong> jest włączone. Podaj adres e-mail,
            a system utworzy lub znajdzie konto. W produkcji ten panel nie
            będzie widoczny.
          </p>
          <form className="form" onSubmit={handleDevBypassSubmit}>
            <label className="form-label" htmlFor="dev-email">
              E-mail
            </label>
            <input
              className="form-input"
              id="dev-email"
              type="email"
              placeholder="jan.kowalski@agh.edu.pl"
              value={devEmail}
              onChange={(event) => setDevEmail(event.target.value)}
              required
            />
            {devError && <div className="alert alert-error">{devError}</div>}
            <div className="form-actions">
              <button
                className="btn btn-primary"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? 'Logowanie...' : 'Zaloguj (dev bypass)'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Local Auth (Login / Register) ─────────────────────────────── */}
      <div className="login-panel">
        <form className="form" onSubmit={handleLocalAuth}>
          <h2>{isLoginMode ? 'Logowanie' : 'Rejestracja'}</h2>
          <label className="form-label" htmlFor="local-email">
            E-mail
          </label>
          <input
            className="form-input"
            id="local-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <label className="form-label" htmlFor="local-password">
            Hasło
          </label>
          <input
            className="form-input"
            id="local-password"
            minLength={isLoginMode ? 1 : 8}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {localError && <div className="alert alert-error">{localError}</div>}
          {successMessage ? (
            <div className="alert alert-success">{successMessage}</div>
          ) : null}
          <div
            className="form-actions"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              marginTop: '1rem',
            }}
          >
            <button
              className="btn btn-secondary"
              disabled={isLocalAuthLoading}
              type="submit"
              style={{ width: '100%' }}
            >
              {(() => {
                if (isLocalAuthLoading) {
                  return isLoginMode ? 'Logowanie...' : 'Rejestrowanie...';
                }
                return isLoginMode ? 'Zaloguj się' : 'Zarejestruj';
              })()}
            </button>
            <button
              className="btn btn-tertiary"
              type="button"
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                setLocalError(null);
                setGoogleError(null);
                setDevError(null);
                setSuccessMessage(null);
              }}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: 'var(--color-primary, #1976d2)',
                textDecoration: 'underline',
                cursor: 'pointer',
                padding: '0.5rem 0',
              }}
            >
              {isLoginMode
                ? 'Nie masz konta? Zarejestruj się'
                : 'Masz już konto? Zaloguj się'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Current session ─────────────────────────────────────────────── */}
      <aside className="login-panel login-session">
        <p className="login-eyebrow">Aktualna sesja</p>
        {user ? (
          <>
            <dl>
              <dt>E-mail</dt>
              <dd>{user.email}</dd>
              <dt>Rola</dt>
              <dd>
                {user.role === 'admin' ? 'Administrator' : 'Pracownik AGH'}
              </dd>
              <dt>Status</dt>
              <dd>
                {user.is_active && user.is_approved ? 'Aktywne' : 'Nieaktywne'}
              </dd>
            </dl>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={handleLogout}
            >
              Wyloguj
            </button>
          </>
        ) : (
          <p className="login-copy">Brak zapisanej sesji w tej przeglądarce.</p>
        )}
      </aside>
    </section>
  );
}
