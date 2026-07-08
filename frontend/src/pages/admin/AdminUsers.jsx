import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const ROLES = ['admin', 'staff'];

const INITIAL_FORM = { name: '', email: '', phone: '', password: '', role: 'staff' };

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(INITIAL_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [msg, setMsg] = useState(null); // { type: 'ok'|'err', text }
  const [showForm, setShowForm] = useState(false);

  const notify = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data.users || []);
    } catch {
      notify('err', 'Error al cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openCreate = () => {
    setEditId(null);
    setForm(INITIAL_FORM);
    setShowForm(true);
  };

  const openEdit = (u) => {
    setEditId(u.id);
    setForm({ name: u.name, email: u.email, phone: u.phone || '', password: '', role: u.role });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        const payload = { name: form.name, phone: form.phone, role: form.role };
        if (form.password.trim()) payload.password = form.password;
        await api.put(`/admin/users/${editId}`, payload);
        notify('ok', 'Usuario actualizado correctamente.');
      } else {
        await api.post('/admin/users', form);
        notify('ok', 'Usuario creado correctamente.');
      }
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      notify('err', err?.response?.data?.message || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`¿Eliminar el usuario "${name}"? Esta acción no se puede deshacer.`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/admin/users/${id}`);
      notify('ok', `Usuario "${name}" eliminado.`);
      fetchUsers();
    } catch (err) {
      notify('err', err?.response?.data?.message || 'Error al eliminar.');
    } finally {
      setDeletingId(null);
    }
  };

  const roleBadge = (role) => {
    const styles = {
      admin: { background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' },
      staff: { background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' },
    };
    return (
      <span style={{ ...styles[role], padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {role}
      </span>
    );
  };

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>Gestión de Usuarios</h2>
          <p style={{ margin: '4px 0 0', color: '#888', fontSize: '0.85rem' }}>Administra los accesos del equipo de Studio 5</p>
        </div>
        <button
          onClick={openCreate}
          style={{ background: 'linear-gradient(135deg, #f5c518, #e6a800)', color: '#000', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span style={{ fontSize: '1.2rem' }}>＋</span> Nuevo Usuario
        </button>
      </div>

      {/* Notification */}
      {msg && (
        <div style={{ marginBottom: 16, padding: '12px 18px', borderRadius: 10, fontWeight: 600, fontSize: '0.9rem', background: msg.type === 'ok' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: msg.type === 'ok' ? '#4ade80' : '#f87171', border: `1px solid ${msg.type === 'ok' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
          {msg.type === 'ok' ? '✅' : '❌'} {msg.text}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480 }}>
            <h3 style={{ margin: '0 0 24px', color: '#fff', fontSize: '1.2rem', fontWeight: 700 }}>
              {editId ? '✏️ Editar Usuario' : '➕ Nuevo Usuario'}
            </h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', color: '#aaa', fontSize: '0.8rem', marginBottom: 6, fontWeight: 600 }}>NOMBRE COMPLETO *</label>
                <input
                  type="text" required value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Juan Pérez"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box' }}
                />
              </div>
              {!editId && (
                <div>
                  <label style={{ display: 'block', color: '#aaa', fontSize: '0.8rem', marginBottom: 6, fontWeight: 600 }}>CORREO ELECTRÓNICO *</label>
                  <input
                    type="email" required value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="correo@ejemplo.com"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box' }}
                  />
                </div>
              )}
              <div>
                <label style={{ display: 'block', color: '#aaa', fontSize: '0.8rem', marginBottom: 6, fontWeight: 600 }}>TELÉFONO</label>
                <input
                  type="tel" value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="0999999999"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#aaa', fontSize: '0.8rem', marginBottom: 6, fontWeight: 600 }}>
                  {editId ? 'NUEVA CONTRASEÑA (dejar vacío para no cambiar)' : 'CONTRASEÑA *'}
                </label>
                <input
                  type="password" required={!editId} value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder={editId ? 'Nueva contraseña (opcional)' : 'Mínimo 6 caracteres'}
                  minLength={editId ? 0 : 6}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#aaa', fontSize: '0.8rem', marginBottom: 6, fontWeight: 600 }}>ROL *</label>
                <select
                  required value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: '#1a1a2e', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box' }}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r === 'admin' ? '🛡️ Admin' : '🎭 Staff'}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                  type="button" onClick={() => setShowForm(false)}
                  style={{ flex: 1, padding: '11px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#aaa', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={saving}
                  style={{ flex: 2, padding: '11px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f5c518, #e6a800)', color: '#000', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? 'Guardando...' : (editId ? 'Guardar Cambios' : 'Crear Usuario')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users List */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#666', padding: 40 }}>Cargando usuarios...</div>
      ) : users.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#666', padding: 40 }}>No hay usuarios registrados.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {users.map(u => (
            <div key={u.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Avatar */}
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: u.role === 'admin' ? 'linear-gradient(135deg,#f5c518,#e6a800)' : 'linear-gradient(135deg,#60a5fa,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.2rem', color: '#000', flexShrink: 0 }}>
                {u.name.charAt(0).toUpperCase()}
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>{u.name}</span>
                  {roleBadge(u.role)}
                </div>
                <div style={{ color: '#888', fontSize: '0.82rem', marginTop: 3 }}>{u.email}</div>
                {u.phone && <div style={{ color: '#666', fontSize: '0.78rem' }}>{u.phone}</div>}
              </div>
              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => openEdit(u)}
                  style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(96,165,250,0.3)', background: 'rgba(96,165,250,0.1)', color: '#60a5fa', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(u.id, u.name)}
                  disabled={deletingId === u.id}
                  style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', opacity: deletingId === u.id ? 0.5 : 1 }}
                >
                  {deletingId === u.id ? '...' : 'Eliminar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
