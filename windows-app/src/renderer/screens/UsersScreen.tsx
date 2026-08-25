import React, { useEffect, useState } from 'react'
import { tokens } from '../theme/tokens'
import { GlassCard } from '../components/GlassCard'
import { GlassButton } from '../components/GlassButton'
import { Modal } from '../components/Modal'
import { Badge } from '../components/Badge'
import { api } from '../api'
import { validateUser, showValidationError } from '../validation'
import {
  Plus, PencilSimple, TrashSimple, User, ShieldCheck, UserList,
} from '@phosphor-icons/react'

export const UsersScreen: React.FC = () => {
  const [users, setUsers] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ username: '', password: '', name: '', phone: '', active: true, role: 'rep' })

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    const result = await api.users.list()
    if (result.success) setUsers(result.data || [])
  }

  const openNew = () => {
    setEditing(null)
    setForm({ username: '', password: '', name: '', phone: '', active: true, role: 'rep' })
    setShowForm(true)
  }

  const openEdit = (u: any) => {
    setEditing(u)
    setForm({
      username: u.username, password: '', name: u.name, phone: u.phone,
      active: Boolean(u.active), role: u.role || 'rep',
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (showValidationError(validateUser(form, !!editing))) return
    if (editing) {
      const body: any = { name: form.name, phone: form.phone, active: form.active, role: form.role }
      if (form.password) body.password = form.password
      await api.users.update(editing.id, body)
    } else {
      await api.users.create(form)
    }
    setShowForm(false)
    fetchUsers()
  }

  const handleDelete = async (id: number) => {
    await api.users.delete(id)
    fetchUsers()
  }

  const initials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: tokens.font.size.sm, color: tokens.colors.textSecondary }}>
          {users.filter(u => u.role === 'admin').length} amministratori · {users.filter(u => u.role === 'rep').length} rappresentanti
        </div>
        <GlassButton onClick={openNew}>
          <Plus size={16} weight="bold" />
          Nuovo Utente
        </GlassButton>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)}
        title={editing ? 'Modifica Utente' : 'Nuovo Utente'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing.md }}>
          <input placeholder="Nome completo *" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            style={{
              background: tokens.colors.surface, border: `1px solid ${tokens.colors.border}`,
              borderRadius: tokens.radius.md, padding: '10px 14px', color: tokens.colors.text,
              fontSize: tokens.font.size.md, outline: 'none',
            }} />
          <input placeholder="Username *" value={form.username}
            onChange={e => setForm({ ...form, username: e.target.value })} disabled={!!editing}
            style={{
              background: tokens.colors.surface, border: `1px solid ${tokens.colors.border}`,
              borderRadius: tokens.radius.md, padding: '10px 14px', color: tokens.colors.text,
              fontSize: tokens.font.size.md, outline: 'none',
              opacity: editing ? 0.5 : 1,
            }} />
          <input placeholder={editing ? 'Nuova password (lascia vuoto per invariata)' : 'Password *'}
            type="password" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            style={{
              background: tokens.colors.surface, border: `1px solid ${tokens.colors.border}`,
              borderRadius: tokens.radius.md, padding: '10px 14px', color: tokens.colors.text,
              fontSize: tokens.font.size.md, outline: 'none',
            }} />
          <input placeholder="Telefono" value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            style={{
              background: tokens.colors.surface, border: `1px solid ${tokens.colors.border}`,
              borderRadius: tokens.radius.md, padding: '10px 14px', color: tokens.colors.text,
              fontSize: tokens.font.size.md, outline: 'none',
            }} />
          <div>
            <label style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textMuted, marginBottom: 4, display: 'block' }}>
              Ruolo
            </label>
            <select value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}
              style={{
                background: tokens.colors.surface, border: `1px solid ${tokens.colors.border}`,
                borderRadius: tokens.radius.md, padding: '10px 14px', color: tokens.colors.text,
                fontSize: tokens.font.size.md, outline: 'none', width: '100%',
              }}>
              <option value="rep" style={{ background: tokens.colors.bg }}>Rappresentante</option>
              <option value="admin" style={{ background: tokens.colors.bg }}>Amministratore</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: tokens.font.size.sm, color: tokens.colors.textSecondary }}>
              Attivo:
            </label>
            <input type="checkbox" checked={form.active}
              onChange={e => setForm({ ...form, active: e.target.checked })}
              style={{ transform: 'scale(1.2)' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: tokens.spacing.xl }}>
          <GlassButton variant="outline" onClick={() => setShowForm(false)}>Annulla</GlassButton>
          <GlassButton onClick={handleSave}>{editing ? 'Salva' : 'Crea Utente'}</GlassButton>
        </div>
      </Modal>

      {users.length === 0 ? (
        <GlassCard style={{ textAlign: 'center', padding: tokens.spacing.xxxl }}>
          <div style={{ color: tokens.colors.textSecondary, fontSize: tokens.font.size.md }}>
            Nessun utente registrato
          </div>
        </GlassCard>
      ) : (
        users.map(user => (
          <GlassCard key={user.id} style={{
            display: 'flex', alignItems: 'center', gap: tokens.spacing.lg,
            padding: tokens.spacing.lg,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: tokens.radius.md,
              background: user.role === 'admin'
                ? `linear-gradient(135deg, ${tokens.colors.accent}, ${tokens.colors.primary})`
                : `linear-gradient(135deg, ${tokens.colors.primary}, ${tokens.colors.accent})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: tokens.font.weight.bold, fontSize: tokens.font.size.xl,
              flexShrink: 0,
            }}>
              {user.name ? initials(user.name) : <User size={20} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: tokens.font.weight.semibold, fontSize: tokens.font.size.lg, color: tokens.colors.text }}>
                  {user.name}
                </span>
                {user.role === 'admin' ? (
                  <Badge variant="success" label="Admin" dot />
                ) : (
                  <Badge variant="info" label="Rappresentante" dot />
                )}
              </div>
              <div style={{ fontSize: tokens.font.size.sm, color: tokens.colors.textMuted, marginTop: 2 }}>
                @{user.username} · {user.phone || '—'}
              </div>
            </div>
            <Badge variant={user.active ? 'success' : 'danger'} label={user.active ? 'Attivo' : 'Disabilitato'} />
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <GlassButton variant="outline" size="sm" onClick={() => openEdit(user)}>
                <PencilSimple size={14} />
              </GlassButton>
              <GlassButton variant="danger" size="sm" onClick={() => handleDelete(user.id)}>
                <TrashSimple size={14} />
              </GlassButton>
            </div>
          </GlassCard>
        ))
      )}
    </div>
  )
}
