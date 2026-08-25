import React, { useEffect, useState } from 'react'
import { tokens } from '../theme/tokens'
import { GlassCard } from '../components/GlassCard'
import { GlassButton } from '../components/GlassButton'
import { Modal } from '../components/Modal'
import { api } from '../api'
import { validateCustomer, showValidationError } from '../validation'
import { MagnifyingGlass, Plus, PencilSimple, TrashSimple, Storefront, Article } from '@phosphor-icons/react'

export const CustomersScreen: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ business_name: '', vat: '', iban: '', address: '', phone: '', email: '' })
  const [search, setSearch] = useState('')

  useEffect(() => { fetchCustomers() }, [])

  const fetchCustomers = async () => {
    const result = await api.customers.list()
    if (result.success) setCustomers(result.data || [])
  }

  const openNew = () => {
    setEditing(null)
    setForm({ business_name: '', vat: '', iban: '', address: '', phone: '', email: '' })
    setShowForm(true)
  }

  const openEdit = (c: any) => {
    setEditing(c)
    setForm({ business_name: c.business_name, vat: c.vat, iban: c.iban, address: c.address, phone: c.phone, email: c.email })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (showValidationError(validateCustomer(form))) return
    if (editing) {
      await api.customers.update(editing.id, form)
    } else {
      await api.customers.create(form)
    }
    setShowForm(false)
    fetchCustomers()
  }

  const handleDelete = async (id: number) => {
    await api.customers.delete(id)
    fetchCustomers()
  }

  const filtered = customers.filter(c =>
    c.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.vat?.includes(search) || c.phone?.includes(search)
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>
      <div style={{ display: 'flex', gap: tokens.spacing.md, alignItems: 'center' }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8,
          background: tokens.colors.surface, borderRadius: tokens.radius.md,
          border: `1px solid ${tokens.colors.border}`, padding: '0 12px',
        }}>
          <MagnifyingGlass size={16} color={tokens.colors.textMuted} />
          <input placeholder="Cerca cliente..." value={search} onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, background: 'none', border: 'none', color: tokens.colors.text,
              fontSize: tokens.font.size.md, padding: '10px 0', outline: 'none',
            }} />
        </div>
        <GlassButton onClick={openNew}>
          <Plus size={16} weight="bold" />
          Nuovo Cliente
        </GlassButton>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)}
        title={editing ? 'Modifica Cliente' : 'Nuovo Cliente'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing.md }}>
          <input placeholder="Nome Attività *" value={form.business_name}
            onChange={e => setForm({ ...form, business_name: e.target.value })}
            style={{
              background: tokens.colors.surface, border: `1px solid ${tokens.colors.border}`,
              borderRadius: tokens.radius.md, padding: '10px 14px', color: tokens.colors.text,
              fontSize: tokens.font.size.md, outline: 'none',
            }} />
          <input placeholder="Partita IVA" value={form.vat}
            onChange={e => setForm({ ...form, vat: e.target.value })}
            style={{
              background: tokens.colors.surface, border: `1px solid ${tokens.colors.border}`,
              borderRadius: tokens.radius.md, padding: '10px 14px', color: tokens.colors.text,
              fontSize: tokens.font.size.md, outline: 'none',
            }} />
          <input placeholder="IBAN" value={form.iban}
            onChange={e => setForm({ ...form, iban: e.target.value })}
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
          <input placeholder="Email" type="email" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            style={{
              background: tokens.colors.surface, border: `1px solid ${tokens.colors.border}`,
              borderRadius: tokens.radius.md, padding: '10px 14px', color: tokens.colors.text,
              fontSize: tokens.font.size.md, outline: 'none',
            }} />
          <input placeholder="Indirizzo" value={form.address}
            onChange={e => setForm({ ...form, address: e.target.value })}
            style={{
              background: tokens.colors.surface, border: `1px solid ${tokens.colors.border}`,
              borderRadius: tokens.radius.md, padding: '10px 14px', color: tokens.colors.text,
              fontSize: tokens.font.size.md, outline: 'none',
            }} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: tokens.spacing.xl }}>
          <GlassButton variant="outline" onClick={() => setShowForm(false)}>Annulla</GlassButton>
          <GlassButton onClick={handleSave}>Salva</GlassButton>
        </div>
      </Modal>

      {filtered.length === 0 ? (
        <GlassCard style={{ textAlign: 'center', padding: tokens.spacing.xxxl }}>
          <div style={{
            width: 48, height: 48, borderRadius: tokens.radius.lg,
            background: tokens.colors.surface, display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
          }}>
            <Storefront size={24} color={tokens.colors.textMuted} />
          </div>
          <div style={{ color: tokens.colors.textSecondary, fontSize: tokens.font.size.md }}>
            {search ? 'Nessun cliente trovato' : 'Nessun cliente registrato'}
          </div>
        </GlassCard>
      ) : (
        filtered.map(customer => (
          <GlassCard key={customer.id} style={{
            display: 'flex', alignItems: 'center', gap: tokens.spacing.lg,
            padding: tokens.spacing.lg,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: tokens.radius.md,
              background: `${tokens.colors.primary}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: tokens.colors.primary, flexShrink: 0,
            }}>
              <Storefront size={22} weight="fill" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: tokens.font.weight.semibold, fontSize: tokens.font.size.lg, color: tokens.colors.text }}>
                {customer.business_name}
              </div>
              <div style={{ display: 'flex', gap: tokens.spacing.lg, flexWrap: 'wrap', marginTop: 4 }}>
                {customer.vat && (
                  <span style={{ fontSize: tokens.font.size.sm, color: tokens.colors.textMuted }}>
                    P.IVA: {customer.vat}
                  </span>
                )}
                {customer.iban && (
                  <span style={{ fontSize: tokens.font.size.sm, color: tokens.colors.textMuted }}>
                    IBAN: {customer.iban}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: tokens.spacing.lg, flexWrap: 'wrap', marginTop: 2 }}>
                {customer.phone && (
                  <span style={{ fontSize: tokens.font.size.sm, color: tokens.colors.textMuted }}>
                    {customer.phone}
                  </span>
                )}
                {customer.email && (
                  <span style={{ fontSize: tokens.font.size.sm, color: tokens.colors.textMuted }}>
                    {customer.email}
                  </span>
                )}
              </div>
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Article size={14} color={tokens.colors.primary} />
                <span style={{ fontSize: tokens.font.size.sm, color: tokens.colors.primary, fontWeight: 500 }}>
                  {customer.order_count || 0} ordini · €{(customer.order_total || 0).toFixed(2)}
                </span>
                {customer.user_name && (
                  <span style={{ fontSize: tokens.font.size.sm, color: tokens.colors.textMuted }}>
                    · {customer.user_name}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <GlassButton variant="outline" size="sm" onClick={() => openEdit(customer)}>
                <PencilSimple size={14} />
              </GlassButton>
              <GlassButton variant="danger" size="sm" onClick={() => handleDelete(customer.id)}>
                <TrashSimple size={14} />
              </GlassButton>
            </div>
          </GlassCard>
        ))
      )}
    </div>
  )
}
