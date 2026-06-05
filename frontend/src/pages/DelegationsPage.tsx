import { useState, useEffect, useCallback } from 'react';
import { delegationService } from '../services/delegationService';
import type {
  Delegation,
  CreateDelegationPayload,
  PermissionLevel,
} from '../types/delegation';

// Na potrzeby demo — docelowo item_id z URL params
const ITEM_ID = 1;

export default function DelegationsPage() {
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fetchDelegations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await delegationService.getAll(ITEM_ID);
      setDelegations(data);
    } catch {
      setError('Nie udało się pobrać delegacji.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDelegations();
  }, [fetchDelegations]);

  const handleCreate = async (payload: CreateDelegationPayload) => {
    setFormLoading(true);
    setFormError(null);
    try {
      await delegationService.create(ITEM_ID, payload);
      await fetchDelegations();
      setShowModal(false);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Wystąpił błąd.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (delegation: Delegation) => {
    const label = delegation.user_id
      ? `użytkownika #${delegation.user_id}`
      : `grupę #${delegation.group_id}`;
    if (!confirm(`Usunąć delegację dla ${label}?`)) return;
    try {
      await delegationService.remove(ITEM_ID, delegation.id);
      await fetchDelegations();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Nie udało się usunąć delegacji.');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Delegacje przedmiotu</h1>
          <p className="page-subtitle">Zarządzaj uprawnieniami do przedmiotu</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setFormError(null);
            setShowModal(true);
          }}
        >
          + Dodaj delegata
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <span>Ładowanie delegacji…</span>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Użytkownik</th>
              <th>Grupa</th>
              <th>Uprawnienie</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {delegations.length === 0 ? (
              <tr>
                <td colSpan={4}>Brak delegacji.</td>
              </tr>
            ) : (
              delegations.map((d) => (
                <tr key={d.id}>
                  <td>{d.user_id ? `Użytkownik #${d.user_id}` : '—'}</td>
                  <td>{d.group_id ? `Grupa #${d.group_id}` : '—'}</td>
                  <td>
                    <span className={`badge badge-${d.permission}`}>
                      {d.permission === 'manage' ? 'Zarządzanie' : 'Edycja'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(d)}
                    >
                      Usuń
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nowa delegacja</h2>
              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            {formError && <div className="alert alert-error">{formError}</div>}
            <CreateForm onSubmit={handleCreate} loading={formLoading} />
          </div>
        </div>
      )}
    </div>
  );
}

function CreateForm({
  onSubmit,
  loading,
}: {
  onSubmit: (p: CreateDelegationPayload) => void;
  loading: boolean;
}) {
  const [userId, setUserId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [permission, setPermission] = useState<PermissionLevel>('edit');

  const submit = () => {
    if (!userId.trim() && !groupId.trim()) return;
    onSubmit({
      user_id: userId ? parseInt(userId) : undefined,
      group_id: groupId ? parseInt(groupId) : undefined,
      permission,
    });
  };

  return (
    <div className="form">
      <label className="form-label">ID użytkownika</label>
      <input
        className="form-input"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        placeholder="np. 1"
        type="number"
      />

      <label className="form-label">ID grupy</label>
      <input
        className="form-input"
        value={groupId}
        onChange={(e) => setGroupId(e.target.value)}
        placeholder="np. 1"
        type="number"
      />
      <p className="form-hint">Podaj ID użytkownika lub grupy.</p>

      <label className="form-label">Uprawnienie *</label>
      <select
        className="form-input"
        value={permission}
        onChange={(e) => setPermission(e.target.value as PermissionLevel)}
      >
        <option value="edit">Edycja</option>
        <option value="manage">Zarządzanie</option>
      </select>

      <div className="form-actions">
        <button
          className="btn btn-primary"
          onClick={submit}
          disabled={loading || (!userId.trim() && !groupId.trim())}
        >
          {loading ? 'Zapisywanie…' : 'Dodaj'}
        </button>
      </div>
    </div>
  );
}
