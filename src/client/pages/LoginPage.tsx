import { useState, type FormEvent } from 'react';
import {
  authService,
  type AuthUser,
  type UserRole,
} from '../services/authService';

export default function LoginPage() {
  const [email, setEmail] = useState('pracownik@agh.edu.pl');
  const [role, setRole] = useState<UserRole>('user');
  const [user, setUser] = useState<AuthUser | null>(() =>
    authService.getSessionUser()
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const session = await authService.mockSsoLogin(email, role);
      setUser(session.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zalogować.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLogout() {
    authService.logout();
    setUser(null);
  }

  return (
    <section className="login-grid">
      <div className="login-panel login-panel--primary">
        <p className="login-eyebrow">Mock SSO AGH</p>
        <h1>Logowanie do systemu aparatury pomiarowej</h1>
        <p className="login-copy">
          Ta ścieżka zastępuje integrację SSO AGH w środowisku developerskim. Po
          zalogowaniu token jest zapisywany lokalnie i używany przez usługi
          frontendowe.
        </p>
      </div>
      <div className="login-panel">
        <form className="form" onSubmit={handleSubmit}>
          <label className="form-label" htmlFor="mock-email">E-mail</label>
          <input className="form-input" id="mock-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <label className="form-label" htmlFor="mock-role">Rola</label>
          <select className="form-input" id="mock-role" value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
            <option value="user">Pracownik AGH</option>
            <option value="admin">Administrator</option>
          </select>
          {error ? <div className="alert alert-error">{error}</div> : null}
          <div className="form-actions">
            <button className="btn btn-primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Logowanie...' : 'Zaloguj'}
            </button>
          </div>
        </form>
      </div>
      <aside className="login-panel login-session">
        <p className="login-eyebrow">Aktualna sesja</p>
        {user ? (
          <>
            <dl>
              <dt>E-mail</dt><dd>{user.email}</dd>
              <dt>Rola</dt><dd>{user.role === 'admin' ? 'Administrator' : 'Pracownik AGH'}</dd>
              <dt>Status</dt><dd>{user.is_active && user.is_approved ? 'Aktywne' : 'Nieaktywne'}</dd>
            </dl>
            <button className="btn btn-secondary" type="button" onClick={handleLogout}>Wyloguj</button>
          </>
        ) : (
          <p className="login-copy">Brak zapisanej sesji w tej przeglądarce.</p>
        )}
      </aside>
    </section>
  );
}
