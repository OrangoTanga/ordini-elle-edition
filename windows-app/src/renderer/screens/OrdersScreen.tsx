import React, { useEffect, useState } from 'react'
import { tokens } from '../theme/tokens'
import { GlassCard } from '../components/GlassCard'
import { GlassButton } from '../components/GlassButton'
import { OrderCard } from '../components/OrderCard'
import { Badge } from '../components/Badge'
import { api } from '../api'
import { Funnel, FadersHorizontal, ArrowsClockwise, SealCheck, SealWarning, Prohibit } from '@phosphor-icons/react'

interface OrdersScreenProps {
  onPendingCountChange: (count: number) => void
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected'

export const OrdersScreen: React.FC<OrdersScreenProps> = ({ onPendingCountChange }) => {
  const [orders, setOrders] = useState<any[]>([])
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [minTotal, setMinTotal] = useState('')
  const [maxTotal, setMaxTotal] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [users, setUsers] = useState<any[]>([])
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchOrders()
    api.users.list().then(r => { if (r.success) setUsers(r.data || []) })
  }, [filter, selectedUserId, fromDate, toDate, minTotal, maxTotal, search])

  const fetchOrders = async () => {
    const params = new URLSearchParams()
    if (filter !== 'all') params.set('status', filter)
    if (selectedUserId) params.set('user_id', selectedUserId)
    if (fromDate) params.set('from', fromDate)
    if (toDate) params.set('to', toDate)
    if (minTotal) params.set('min_total', minTotal)
    if (maxTotal) params.set('max_total', maxTotal)
    if (search) params.set('search', search)
    const qs = params.toString()
    const result = await api.orders.list(qs)
    if (result.success) {
      setOrders(result.data || [])
      onPendingCountChange(result.data?.filter((o: any) => o.status === 'pending').length || 0)
    }
  }

  const handleStatus = async (orderId: number, status: string) => {
    await api.orders.updateStatus(orderId, status)
    fetchOrders()
  }

  const clearFilters = () => {
    setSearch(''); setFromDate(''); setToDate('')
    setMinTotal(''); setMaxTotal(''); setSelectedUserId('')
  }

  const hasActiveFilters = search || fromDate || toDate || minTotal || maxTotal || selectedUserId

  const filters: { id: FilterStatus; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'Tutti', icon: <SealCheck size={16} /> },
    { id: 'pending', label: 'In attesa', icon: <SealWarning size={16} weight="fill" /> },
    { id: 'approved', label: 'Approvati', icon: <SealCheck size={16} weight="fill" /> },
    { id: 'rejected', label: 'Rifiutati', icon: <Prohibit size={16} weight="fill" /> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.xl }}>
      <div style={{ display: 'flex', gap: tokens.spacing.md, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{
          flex: 1, display: 'flex', gap: 4,
          background: tokens.colors.surface,
          borderRadius: tokens.radius.md, padding: 4,
        }}>
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 16px', borderRadius: tokens.radius.sm,
                border: 'none', cursor: 'pointer',
                background: filter === f.id ? tokens.colors.primary : 'transparent',
                color: filter === f.id ? 'white' : tokens.colors.textSecondary,
                fontWeight: filter === f.id ? 600 : 400,
                fontSize: tokens.font.size.sm,
                transition: `all ${tokens.transition.fast}`,
              }}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>

        <GlassButton
          variant={showFilters || hasActiveFilters ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <FadersHorizontal size={14} />
          {showFilters ? 'Nascondi filtri' : 'Filtri'}
        </GlassButton>

        <GlassButton variant="ghost" size="sm" onClick={fetchOrders}>
          <ArrowsClockwise size={14} />
        </GlassButton>
      </div>

      {showFilters && (
        <GlassCard>
          <div style={{
            fontSize: tokens.font.size.md, fontWeight: tokens.font.weight.semibold,
            color: tokens.colors.text, marginBottom: tokens.spacing.lg,
          }}>
            Filtri avanzati
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: tokens.spacing.md }}>
            <div>
              <label style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textSecondary, marginBottom: 4, display: 'block', fontWeight: 500 }}>
                Attività
              </label>
              <input placeholder="Cerca nome attività..." value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  background: tokens.colors.surface, border: `1px solid ${tokens.colors.border}`,
                  borderRadius: tokens.radius.md, padding: '8px 12px', color: tokens.colors.text,
                  fontSize: tokens.font.size.sm, outline: 'none', width: '100%', boxSizing: 'border-box',
                }} />
            </div>
            <div>
              <label style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textSecondary, marginBottom: 4, display: 'block', fontWeight: 500 }}>
                Rappresentante
              </label>
              <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}
                style={{
                  background: tokens.colors.surface, border: `1px solid ${tokens.colors.border}`,
                  borderRadius: tokens.radius.md, padding: '8px 12px', color: tokens.colors.text,
                  fontSize: tokens.font.size.sm, outline: 'none', width: '100%', boxSizing: 'border-box',
                }}>
                <option value="">Tutti</option>
                {users.map(u => (
                  <option key={u.id} value={u.id} style={{ background: tokens.colors.bgAlt }}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textSecondary, marginBottom: 4, display: 'block', fontWeight: 500 }}>
                Da data
              </label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                style={{
                  background: tokens.colors.surface, border: `1px solid ${tokens.colors.border}`,
                  borderRadius: tokens.radius.md, padding: '8px 12px', color: tokens.colors.text,
                  fontSize: tokens.font.size.sm, outline: 'none', width: '100%', boxSizing: 'border-box',
                  colorScheme: 'dark',
                }} />
            </div>
            <div>
              <label style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textSecondary, marginBottom: 4, display: 'block', fontWeight: 500 }}>
                A data
              </label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                style={{
                  background: tokens.colors.surface, border: `1px solid ${tokens.colors.border}`,
                  borderRadius: tokens.radius.md, padding: '8px 12px', color: tokens.colors.text,
                  fontSize: tokens.font.size.sm, outline: 'none', width: '100%', boxSizing: 'border-box',
                  colorScheme: 'dark',
                }} />
            </div>
            <div>
              <label style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textSecondary, marginBottom: 4, display: 'block', fontWeight: 500 }}>
                Costo min (€)
              </label>
              <input type="number" step="0.01" placeholder="0" value={minTotal}
                onChange={e => setMinTotal(e.target.value)}
                style={{
                  background: tokens.colors.surface, border: `1px solid ${tokens.colors.border}`,
                  borderRadius: tokens.radius.md, padding: '8px 12px', color: tokens.colors.text,
                  fontSize: tokens.font.size.sm, outline: 'none', width: '100%', boxSizing: 'border-box',
                }} />
            </div>
            <div>
              <label style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textSecondary, marginBottom: 4, display: 'block', fontWeight: 500 }}>
                Costo max (€)
              </label>
              <input type="number" step="0.01" placeholder="9999" value={maxTotal}
                onChange={e => setMaxTotal(e.target.value)}
                style={{
                  background: tokens.colors.surface, border: `1px solid ${tokens.colors.border}`,
                  borderRadius: tokens.radius.md, padding: '8px 12px', color: tokens.colors.text,
                  fontSize: tokens.font.size.sm, outline: 'none', width: '100%', boxSizing: 'border-box',
                }} />
            </div>
          </div>
          {hasActiveFilters && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: tokens.spacing.md }}>
              <GlassButton variant="ghost" size="sm" onClick={clearFilters}>
                ✕ Cancella filtri
              </GlassButton>
            </div>
          )}
        </GlassCard>
      )}

      {orders.length === 0 ? (
        <GlassCard style={{ textAlign: 'center', padding: tokens.spacing.xxxl }}>
          <div style={{
            width: 48, height: 48, borderRadius: tokens.radius.lg,
            background: tokens.colors.surface, display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
            color: tokens.colors.textMuted,
          }}>
            <Funnel size={24} />
          </div>
          <div style={{ color: tokens.colors.textSecondary, fontSize: tokens.font.size.md }}>
            Nessun ordine trovato
          </div>
        </GlassCard>
      ) : (
        orders.map(order => (
          <div key={order.id} style={{ marginBottom: tokens.spacing.sm }}>
            <OrderCard
              order={order}
              expanded={expandedOrder === order.id}
              onToggle={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
              onApprove={() => handleStatus(order.id, 'approved')}
              onReject={() => handleStatus(order.id, 'rejected')}
            />
          </div>
        ))
      )}
    </div>
  )
}
