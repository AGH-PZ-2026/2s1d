import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { delegationService } from '../services/delegationService';
import Autocomplete, { type AutocompleteOption } from '../components/Autocomplete';
import type { Delegation, CreateDelegationPayload, PermissionLevel } from '../types/delegation';

const ITEM_ID = 1;

export default function DelegationsPage() {
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fetchDelegations = useCallback(async () => {
    setLoading(true); setError(null);
    try { setDelegations(await delegationService.getAll(ITEM_ID)); } catch { setError('Nie udało się pobrać delegacji.'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void fetchDelegations(); }, [fetchDelegations]);

  const handleCreate = async (payload: CreateDelegationPayload) => {
    setFormLoading(true); setFormError(null);
    try { await delegationService.create(ITEM_ID, payload); await fetchDelegations(); setShowModal(false); }
    catch (e: unknown) { setFormError(e instanceof Error ? e.message : 'Wystąpił błąd.'); } finally { setFormLoading(false); }
  };

  const handleDelete = async (delegation: Delegation) => {
    const label = delegation.user_email ?? delegation.group_name ?? `#${delegation.id}`;
    if (!confirm(`Usunąć delegację dla: ${label}?`)) return;
    try { await delegationService.remove(ITEM_ID, delegation.id); await fetchDelegations(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Nie udało się usunąć delegacji.'); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Delegacje przedmiotu</h1>
          <p className="page-subtitle">Zarządzaj uprawnieniami do przedmiotu</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setFormError(null); setShowModal(true); }}>
          + Dodaj delegata
        </button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <div className="loading-state"><div className="spinner" /><span>Ładowanie delegacji…</span></div>
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
              <tr><td colSpan={4}>Brak delegacji.</td></tr>
            ) : (
              delegations.map((d) => (
                <tr key={d.id}>
                  <td>{d.user_email ?? '—'}</td>
                  <td>{d.group_name ?? '—'}</td>
                  <td>
                    <span className={`badge badge-${d.permission}`}>
                      {d.permission === 'manage' ? 'Zarządzanie' : 'Edycja'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(d)}>
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
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            {formError && <div className="alert alert-error">{formError}</div>}
            <CreateForm onSubmit={handleCreate} loading={formLoading} />
          </div>
        </div>
      )}
    </div>
  );
}

function CreateForm({ onSubmit, loading }: { onSubmit: (p: CreateDelegationPayload) => void; loading: boolean }) {
  const [selectedUser, setSelectedUser] = useState<AutocompleteOption | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<AutocompleteOption | null>(null);
  const [permission, setPermission] = useState<PermissionLevel>('edit');

  const submit = () => {
    if (!selectedUser && !selectedGroup) return;
    onSubmit({
      user_id: selectedUser?.value,
      group_id: selectedGroup?.value,
      permission,
    });
  };

  return (
    <div className="form">
      <label className="form-label">Użytkownik (email)</label>
      <Autocomplete
        placeholder="Wpisz email użytkownika…"
        onSearch={(q) => delegationService.searchUsers(q)}
        onSelect={(opt) => { setSelectedUser(opt); setSelectedGroup(null); }}
        onClear={() => setSelectedUser(null)}
      />

      <div style={{ textAlign: 'center', padding: '8px 0', color: '#888' }}>lub</div>

      <label className="form-label">Grupa (nazwa)</label>
      <Autocomplete
        placeholder="Wpisz nazwę grupy…"
        onSearch={(q) => delegationService.searchGroups(q)}
        onSelect={(opt) => { setSelectedGroup(opt); setSelectedUser(null); }}
        onClear={() => setSelectedGroup(null)}
      />

      <p className="form-hint">Wybierz użytkownika lub grupę.</p>

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
          disabled={loading || (!selectedUser && !selectedGroup)}
        >
          {loading ? 'Zapisywanie…' : 'Dodaj'}
        </button>
      </div>
    </div>
  );
}
