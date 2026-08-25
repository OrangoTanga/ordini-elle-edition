import React, { useEffect, useState } from 'react'
import { tokens } from '../theme/tokens'
import { GlassCard } from '../components/GlassCard'
import { GlassButton } from '../components/GlassButton'
import { Modal } from '../components/Modal'
import { StatCard } from '../components/StatCard'
import { Badge } from '../components/Badge'
import { EmptyState } from '../components/EmptyState'
import { api } from '../api'
import {
  Funnel, ArrowClockwise, MagnifyingGlass, CreditCard, CurrencyDollar,
  ClockClockwise, SealCheck, SealWarning, Note, PiggyBank,
} from '@phosphor-icons/react'

export const PaymentsScreen: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([])
  const [summary, setSummary] = useState<any>({})
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [showFilters, setShowFilters] = useState(false)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const [modalPayment, setModalPayment] = useState<any>(null)
  const [paidAmount, setPaidAmount] = useState('')
  const [paidDate, setPaidDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
    api.users.list().then(r => { if (r.success) setUsers(r.data || []) })
  }, [])

  useEffect(() => {
    fetchData()
  }, [fromDate, toDate, selectedUserId, statusFilter, search])

  const fetchData = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (fromDate) params.set('from', fromDate)
    if (toDate) params.set('to', toDate)
    if (selectedUserId) params.set('user_id', selectedUserId)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (search) params.set('search', search)
    const qs = params.toString()

    const [payRes, sumRes] = await Promise.all([
      api.payments.list(qs),
      api.payments.summary(qs),
    ])
    if (payRes.success) setPayments(payRes.data || [])
    if (sumRes.success) setSummary(sumRes.data || {})
    setLoading(false)
  }

  const clearFilters = () => {
    setFromDate(''); setToDate(''); setSelectedUserId(''); setStatusFilter('all'); setSearch('')
  }

  const hasActiveFilters = fromDate || toDate || selectedUserId || statusFilter !== 'all' || search

  const openModal = (p: any) => {
    const remaining = p.amount_due != null ? p.amount_due : (p.amount - (p.paid_amount || 0))
    setModalPayment(p)
    setPaidAmount(remaining > 0 ? remaining.toFixed(2) : '0')
    setPaidDate(new Date().toISOString().split('T')[0])
    setNotes('')
  }

  const handleRegisterPayment = async () => {
    if (!modalPayment || !paidAmount) return
    setSaving(true)
    const result = await api.payments.update(modalPayment.id, {
      paid_amount: parseFloat(paidAmount),
      paid_date: paidDate,
      status: 'paid',
      notes,
    })
    setSaving(false)
    if (result.success) {
      setModalPayment(null)
      fetchData()
    }
  }

  const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' => {
    switch (status) {
      case 'paid': return 'success'
      case 'overdue': return 'danger'
      case 'partial': return 'warning'
      default: return 'warning'
    }
  }

  const statusLabel = (status: string): string => {
    const map: Record<string, string> = {
      paid: 'Pagato', pending: 'In sospeso', overdue: 'Scaduto', partial: 'Parziale',
    }
    return map[status] || status
  }

  const inputS = {
    background: tokens.colors.surface,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: tokens.radius.md,
    padding: '10px 14px',
    color: tokens.colors.text,
    fontSize: tokens.font.size.md,
    outline: 'none',
    width: '100%' as const,
    boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: tokens.spacing.lg,
      }}>
        <StatCard
          icon={<CurrencyDollar size={22} weight="fill" />}
          label="Da pagare"
          value={`€${(summary.pending_total || 0).toFixed(2)}`}
          color={tokens.colors.warning}
        />
        <StatCard
          icon={<SealWarning size={22} weight="fill" />}
          label="Scaduti"
          value={`€${(summary.overdue_total || 0).toFixed(2)}`}
          color={tokens.colors.danger}
        />
        <StatCard
          icon={<SealCheck size={22} weight="fill" />}
          label="Pagati (mese)"
          value={`€${(summary.paid_this_month || 0).toFixed(2)}`}
          color={tokens.colors.accent}
        />
        <StatCard
          icon={<ClockClockwise size={22} weight="fill" />}
          label="In scadenza (7gg)"
          value={`${summary.upcoming_count || 0}`}
          color={tokens.colors.primary}
        />
      </div>

      <div style={{ display: 'flex', gap: tokens.spacing.md, alignItems: 'center', flexWrap: 'wrap' }}>
        <GlassButton variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}
          style={showFilters || hasActiveFilters ? {
            border: `1px solid ${tokens.colors.primary}40`,
            background: `${tokens.colors.primary}15`,
          } : undefined}>
          <Funnel size={14} />
          {showFilters ? 'Nascondi filtri' : 'Filtri'}
        </GlassButton>
        <GlassButton variant="outline" size="sm" onClick={fetchData}>
          <ArrowClockwise size={14} />
        </GlassButton>
      </div>

      {showFilters && (
        <GlassCard>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: tokens.spacing.md,
          }}>
            <div>
              <label style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textMuted, marginBottom: 4, display: 'block' }}>
                Da data
              </label>
              <input type="date" value={fromDate}
                onChange={e => setFromDate(e.target.value)} style={inputS} />
            </div>
            <div>
              <label style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textMuted, marginBottom: 4, display: 'block' }}>
                A data
              </label>
              <input type="date" value={toDate}
                onChange={e => setToDate(e.target.value)} style={inputS} />
            </div>
            <div>
              <label style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textMuted, marginBottom: 4, display: 'block' }}>
                Rappresentante
              </label>
              <select value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)} style={inputS}>
                <option value="" style={{ background: tokens.colors.bg }}>Tutti</option>
                {users.map(u => (
                  <option key={u.id} value={u.id} style={{ background: tokens.colors.bg }}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textMuted, marginBottom: 4, display: 'block' }}>
                Stato
              </label>
              <select value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)} style={inputS}>
                <option value="all" style={{ background: tokens.colors.bg }}>Tutti</option>
                <option value="pending" style={{ background: tokens.colors.bg }}>In sospeso</option>
                <option value="paid" style={{ background: tokens.colors.bg }}>Pagato</option>
                <option value="overdue" style={{ background: tokens.colors.bg }}>Scaduto</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textMuted, marginBottom: 4, display: 'block' }}>
                Ricerca attività
              </label>
              <input placeholder="Cerca nome attività..." value={search}
                onChange={e => setSearch(e.target.value)} style={inputS} />
            </div>
          </div>
          {hasActiveFilters && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: tokens.spacing.md }}>
              <GlassButton variant="outline" size="sm" onClick={clearFilters}>
                Cancella filtri
              </GlassButton>
            </div>
          )}
        </GlassCard>
      )}

      {loading ? (
        <GlassCard style={{ textAlign: 'center', padding: tokens.spacing.xxxl }}>
          <div style={{ color: tokens.colors.textMuted }}>Caricamento...</div>
        </GlassCard>
      ) : payments.length === 0 ? (
        <EmptyState
          icon={<CreditCard size={32} />}
          title="Nessun pagamento"
          description="Nessun pagamento trovato con i filtri selezionati"
        />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: tokens.font.size.sm }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${tokens.colors.border}` }}>
                {['Ordine#', 'Attività', 'Rappresentante', 'Totale', 'Tipo', 'Scadenza', 'Da pagare', 'Pagato', 'Stato', 'Commissioni'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '10px 12px', color: tokens.colors.textMuted,
                    fontWeight: 500, fontSize: tokens.font.size.xs, whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} onClick={() => openModal(p)}
                  style={{
                    borderBottom: `1px solid ${tokens.colors.border}40`,
                    cursor: 'pointer', transition: tokens.transition.normal,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = `${tokens.colors.surface}80`}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '10px 12px', fontWeight: tokens.font.weight.semibold, whiteSpace: 'nowrap', color: tokens.colors.text }}>
                    #{p.order_id}
                  </td>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: tokens.colors.textSecondary }}>{p.business_name}</td>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: tokens.colors.textSecondary }}>{p.user_name}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 500, whiteSpace: 'nowrap', color: tokens.colors.text }}>
                    €{p.total?.toFixed(2)}
                  </td>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: tokens.colors.textSecondary }}>
                    {p.type === 'acconto' ? 'Acconto' : p.type === 'saldo' ? 'Saldo' : 'Pagamento'}
                  </td>
                  <td style={{
                    padding: '10px 12px', whiteSpace: 'nowrap',
                    color: p.status === 'overdue' ? tokens.colors.danger : tokens.colors.textSecondary,
                  }}>
                    {p.due_date || '-'}
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: tokens.font.weight.semibold, whiteSpace: 'nowrap', color: tokens.colors.text }}>
                    €{(p.amount_due != null ? p.amount_due : (p.amount - (p.paid_amount || 0))).toFixed(2)}
                  </td>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: tokens.colors.textSecondary }}>
                    €{(p.paid_amount || 0).toFixed(2)}
                  </td>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                    <Badge variant={statusVariant(p.status)} label={statusLabel(p.status)} />
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: tokens.font.size.xs, color: tokens.colors.primary, whiteSpace: 'nowrap' }}>
                    {p.shared_reps?.length > 0
                      ? p.shared_reps.map((r: any) => `${r.user_name} (€${r.commission?.toFixed(2) || '0'})`).join(', ')
                      : p.commission_total ? `€${p.commission_total.toFixed(2)}` : '-'
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!modalPayment} onClose={() => setModalPayment(null)}
        title="Registra Pagamento">
        {modalPayment && (
          <>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing.md,
              marginBottom: tokens.spacing.xl, fontSize: tokens.font.size.sm,
            }}>
              <div>
                <div style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textMuted, marginBottom: 2 }}>
                  Ordine
                </div>
                <div style={{ color: tokens.colors.text }}>#{modalPayment.order_id} — {modalPayment.business_name}</div>
              </div>
              <div>
                <div style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textMuted, marginBottom: 2 }}>
                  Tipo
                </div>
                <div style={{ color: tokens.colors.text }}>
                  {modalPayment.type === 'acconto' ? 'Acconto' : modalPayment.type === 'saldo' ? 'Saldo' : 'Pagamento'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textMuted, marginBottom: 2 }}>
                  Importo
                </div>
                <div style={{ color: tokens.colors.text, fontWeight: tokens.font.weight.semibold }}>
                  €{modalPayment.amount?.toFixed(2)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textMuted, marginBottom: 2 }}>
                  Scadenza
                </div>
                <div style={{
                  color: modalPayment.status === 'overdue' ? tokens.colors.danger : tokens.colors.text,
                }}>
                  {modalPayment.due_date || '-'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md, marginBottom: tokens.spacing.xl }}>
              <div>
                <label style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textMuted, marginBottom: 4, display: 'block' }}>
                  Importo pagato (€)
                </label>
                <input type="number" step="0.01" min="0" value={paidAmount}
                  onChange={e => setPaidAmount(e.target.value)} style={inputS} />
              </div>
              <div>
                <label style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textMuted, marginBottom: 4, display: 'block' }}>
                  Data pagamento
                </label>
                <input type="date" value={paidDate}
                  onChange={e => setPaidDate(e.target.value)} style={inputS} />
              </div>
              <div>
                <label style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textMuted, marginBottom: 4, display: 'block' }}>
                  Note
                </label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Note opzionali..." rows={3}
                  style={{ ...inputS, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <GlassButton variant="outline" size="sm" onClick={() => setModalPayment(null)}>
                Annulla
              </GlassButton>
              <GlassButton size="sm" onClick={handleRegisterPayment} disabled={saving || !paidAmount}>
                <CreditCard size={16} weight="bold" />
                {saving ? 'Salvataggio...' : 'Registra'}
              </GlassButton>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
