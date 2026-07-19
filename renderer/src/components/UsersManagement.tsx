import { useState, useEffect } from 'react';
import { UserPlus, Pencil, UserX, UserCheck, Key, Loader2, X, Shield, User } from 'lucide-react';
import type { User as AppUser, AppUserRole } from '../types';

interface Props {
  currentUserId: number;
}

interface UserFormData {
  name: string;
  username: string;
  password: string;
  pin: string;
  role: AppUserRole;
}

export function UsersManagement({ currentUserId }: Props) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [form, setForm] = useState<UserFormData>({ name: '', username: '', password: '', pin: '', role: 'operator' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<AppUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    const result = await window.electronAPI.getUsers();
    if (result.success && result.users) setUsers(result.users);
    else setError(result.error ?? 'Failed to load users');
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const openAdd = () => {
    setEditingUser(null);
    setForm({ name: '', username: '', password: '', pin: '', role: 'operator' });
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (u: AppUser) => {
    setEditingUser(u);
    setForm({ name: u.name, username: u.username, password: '', pin: '', role: u.role });
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      if (editingUser) {
        const res = await window.electronAPI.updateUser(editingUser.id, {
          name: form.name,
          username: form.username,
          role: form.role,
        });
        if (!res.success) { setFormError(res.error ?? 'Update failed'); return; }
        showToast('success', 'User updated');
      } else {
        if (form.pin.length < 4) { setFormError('PIN must be at least 4 digits'); return; }
        const res = await window.electronAPI.createUser(form);
        if (!res.success) { setFormError(res.error ?? 'Create failed'); return; }
        showToast('success', 'User created');
      }
      setShowModal(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (u: AppUser) => {
    if (!confirm(`Deactivate "${u.name}"?`)) return;
    const res = await window.electronAPI.deactivateUser(u.id);
    if (res.success) { showToast('success', 'User deactivated'); await load(); }
    else showToast('error', res.error ?? 'Failed');
  };

  const handleReactivate = async (u: AppUser) => {
    const res = await window.electronAPI.reactivateUser(u.id);
    if (res.success) { showToast('success', 'User reactivated'); await load(); }
    else showToast('error', res.error ?? 'Failed');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser) return;
    setResetting(true);
    const res = await window.electronAPI.adminResetPassword(resetPasswordUser.id, newPassword);
    setResetting(false);
    if (res.success) {
      showToast('success', 'Password reset');
      setResetPasswordUser(null);
      setNewPassword('');
    } else {
      showToast('error', res.error ?? 'Failed');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>User Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Manage local operator and administrator accounts
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <UserPlus size={15} /> Add User
        </button>
      </div>

      {error && <div style={{ color: '#f87171', fontSize: '0.875rem' }}>{error}</div>}

      {/* Users list */}
      <div style={{ background: 'var(--surface-1)', borderRadius: '0.75rem', border: '1px solid var(--surface-2)', overflow: 'hidden' }}>
        <table className="erp-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th style={{ width: 100 }}>Role</th>
              <th style={{ width: 90 }}>Status</th>
              <th style={{ width: 160 }}>Last Active</th>
              <th style={{ width: 140 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 3 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 6 }).map((_, j) => (
                  <td key={j}><div className="skeleton" style={{ height: '16px', width: '70%' }} /></td>
                ))}
              </tr>
            ))}
            {!loading && users.map((u) => (
              <tr key={u.id} style={{ opacity: u.status === 'inactive' ? 0.5 : 1 }}>
                <td style={{ fontWeight: 500 }}>
                  {u.id === currentUserId && (
                    <span style={{ marginRight: '0.4rem', fontSize: '0.7rem', color: 'var(--brand-400)' }}>YOU</span>
                  )}
                  {u.name}
                </td>
                <td className="mono" style={{ fontSize: '0.85rem' }}>{u.username}</td>
                <td>
                  <span className={`badge ${u.role === 'admin' ? 'badge-warning' : 'badge-info'}`} style={{ display: 'inline-flex', gap: '0.3rem', alignItems: 'center' }}>
                    {u.role === 'admin' ? <Shield size={10} /> : <User size={10} />}
                    {u.role}
                  </span>
                </td>
                <td>
                  <span className={`badge ${u.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
                    {u.status}
                  </span>
                </td>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {u.last_activity ? new Date(u.last_activity).toLocaleString() : '—'}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(u)} title="Edit">
                      <Pencil size={13} />
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setResetPasswordUser(u); setNewPassword(''); }} title="Reset Password">
                      <Key size={13} />
                    </button>
                    {u.status === 'active' ? (
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => void handleDeactivate(u)} title="Deactivate" disabled={u.id === currentUserId}>
                        <UserX size={13} />
                      </button>
                    ) : (
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => void handleReactivate(u)} title="Reactivate" style={{ color: '#34d399' }}>
                        <UserCheck size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                {editingUser ? 'Edit User' : 'Create User'}
              </h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowModal(false)}>
                <X size={16} />
              </button>
            </div>
            {formError && (
              <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.4rem', padding: '0.6rem 0.875rem', color: '#f87171', fontSize: '0.82rem', marginBottom: '1rem' }}>
                {formError}
              </div>
            )}
            <form onSubmit={(e) => void handleSave(e)} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label className="erp-label">Full Name</label>
                <input className="erp-input" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus />
              </div>
              <div>
                <label className="erp-label">Username</label>
                <input className="erp-input mono" value={form.username} onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))} required />
              </div>
              {!editingUser && (
                <>
                  <div>
                    <label className="erp-label">Password</label>
                    <input className="erp-input" type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} required minLength={8} />
                  </div>
                  <div>
                    <label className="erp-label">PIN (4+ digits)</label>
                    <input className="erp-input mono" type="password" inputMode="numeric" value={form.pin} onChange={(e) => setForm(f => ({ ...f, pin: e.target.value }))} required maxLength={8} />
                  </div>
                </>
              )}
              <div>
                <label className="erp-label">Role</label>
                <select className="erp-input" value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value as AppUserRole }))}>
                  <option value="operator">Operator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                  {saving ? <Loader2 size={14} className="animate-spin-slow" /> : null}
                  {saving ? 'Saving…' : editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordUser && (
        <div className="modal-overlay" onClick={() => setResetPasswordUser(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Reset Password — {resetPasswordUser.name}</h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setResetPasswordUser(null)}><X size={16} /></button>
            </div>
            <form onSubmit={(e) => void handleResetPassword(e)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="erp-label">New Password</label>
                <input className="erp-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} autoFocus placeholder="Min. 8 characters" />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setResetPasswordUser(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={resetting}>
                  {resetting ? <Loader2 size={14} className="animate-spin-slow" /> : null}
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.text}</div>
      )}
    </div>
  );
}
