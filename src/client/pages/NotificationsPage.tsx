import { useEffect, useState, type FormEvent } from 'react';
import { notificationService, type NotificationEvent, type NotificationPreference } from '../services/notificationService';

export default function NotificationsPage() {
  const [preference, setPreference] = useState<NotificationPreference | null>(null); const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [error, setError] = useState<string | null>(null); const [success, setSuccess] = useState<string | null>(null); const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { async function load() { setError(null); setIsLoading(true); try { const [p, e] = await Promise.all([notificationService.getPreferences(), notificationService.listEvents()]); setPreference(p); setEvents(e); } catch { setError('Nie udało się pobrać ustawień powiadomień.'); } finally { setIsLoading(false); } } void load(); }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!preference) return; setError(null); setSuccess(null); try { setPreference(await notificationService.updatePreferences({ emailEnabled: preference.emailEnabled, pushEnabled: preference.pushEnabled, returnDueNoticeHours: preference.returnDueNoticeHours })); setSuccess('Preferencje powiadomień zostały zapisane.'); } catch (err) { setError(err instanceof Error ? err.message : 'Nie udało się zapisać ustawień.'); } }
  
  function getNotificationContent(payload: string) {
  try {
    return JSON.parse(payload) as {
      title?: string;
      message?: string;
    };
  } catch {
    return {
      title: "Powiadomienie",
      message: payload,
    };
  }
}
  const sortedEvents = [...events].sort(
  (a, b) =>
    new Date(b.scheduledAt).getTime() -
    new Date(a.scheduledAt).getTime()
);

  return (
    <section>
      <div className="page-header"><div><h1 className="page-title">Powiadomienia</h1><p className="page-subtitle">Konfiguracja kanałów e-mail i push oraz historia zdarzeń.</p></div></div>
      {error ? <div className="alert alert-error">{error}</div> : null}{success ? <div className="alert alert-success">{success}</div> : null}
      {isLoading || !preference ? (<div className="loading-state"><div className="spinner" />Ładowanie powiadomień...</div>) : (<>
        <form className="notification-form" onSubmit={handleSubmit}>
          <label><input checked={preference.emailEnabled} onChange={(e) => setPreference({ ...preference, emailEnabled: e.target.checked })} type="checkbox" />E-mail</label>
          <label><input checked={preference.pushEnabled} onChange={(e) => setPreference({ ...preference, pushEnabled: e.target.checked })} type="checkbox" />Push</label>
          <label className="form-label" htmlFor="notice-hours">Godziny przed terminem zwrotu</label>
          <input className="form-input" id="notice-hours" min={1} max={720} type="number" value={preference.returnDueNoticeHours} onChange={(e) => setPreference({ ...preference, returnDueNoticeHours: Number(e.target.value) })} />
          <button className="btn btn-primary" type="submit">Zapisz preferencje</button>
        </form>
        <table className="table">
  <thead>
    <tr>
      <th>Tytuł</th>
      <th>Treść</th>
      <th>Dostarczono</th>
    </tr>
  </thead>
  <tbody>
    {sortedEvents.map((item) => {
      const content = getNotificationContent(
        item.payload
      );

      return (
        <tr key={item.id}>
          <td>{content.title}</td>
          <td>{content.message}</td>
          <td>
            {new Date(
              item.scheduledAt
            ).toLocaleString("pl-PL")}
          </td>
        </tr>
      );
    })}
  </tbody>
</table>
      </>)}
    </section>
  );
}
