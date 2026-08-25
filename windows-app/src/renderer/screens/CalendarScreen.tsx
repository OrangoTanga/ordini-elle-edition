import React, { useState, useEffect, useMemo } from 'react'
import { tokens } from '../theme/tokens'
import { GlassCard } from '../components/GlassCard'
import { api } from '../api'
import {
  CalendarBlank, CaretLeft, CaretRight, Note, CreditCard, CurrencyDollar,
} from '@phosphor-icons/react'

interface CalendarEvent {
  type: 'order' | 'payment'
  id: number
  title: string
  amount: number
  status: string
  date: string
}

const MONTHS = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
const DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

export const CalendarScreen: React.FC = () => {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  useEffect(() => {
    loadMonth()
  }, [year, month])

  const loadMonth = async () => {
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const endDate = new Date(year, month + 1, 0)
    const end = endDate.toISOString().split('T')[0]

    const orderQs = `from=${start}&to=${end}&status=pending,approved`
    const paymentQs = `from_due=${start}&to_due=${end}`
    const [ordersRes, paymentsRes] = await Promise.all([
      api.orders.list(orderQs),
      api.payments.list(paymentQs),
    ])

    const evts: CalendarEvent[] = []

    if (ordersRes.success && ordersRes.data) {
      for (const o of ordersRes.data) {
        const d = o.invoice_date || o.created_at
        evts.push({ type: 'order', id: o.id, title: o.business_name, amount: o.total, status: o.status, date: d })
      }
    }
    if (paymentsRes.success && paymentsRes.data) {
      for (const p of paymentsRes.data) {
        evts.push({ type: 'payment', id: p.id, title: p.order_business_name, amount: p.amount, status: p.status, date: p.due_date })
      }
    }

    setEvents(evts)
  }

  const eventsByDay = useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {}
    for (const evt of events) {
      const day = new Date(evt.date).getDate()
      if (!map[day]) map[day] = []
      map[day].push(evt)
    }
    return map
  }, [events])

  const selectedEvents = selectedDay ? eventsByDay[selectedDay] || [] : []

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const offset = firstDay === 0 ? 6 : firstDay - 1

  const weeks: (number | null)[][] = []
  let week: (number | null)[] = []
  for (let i = 0; i < offset; i++) week.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d)
    if (week.length === 7) { weeks.push(week); week = [] }
  }
  if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week) }

  const prevMonth = () => { setMonth(m => m === 0 ? 11 : m - 1); setYear(y => month === 0 ? y - 1 : y); setSelectedDay(null) }
  const nextMonth = () => { setMonth(m => m === 11 ? 0 : m + 1); setYear(y => month === 11 ? y + 1 : y); setSelectedDay(null) }

  const today = new Date()

  const navBtn: React.CSSProperties = {
    background: tokens.colors.surface,
    border: `1px solid ${tokens.colors.border}`,
    color: tokens.colors.textSecondary,
    borderRadius: tokens.radius.md,
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: 16,
    transition: tokens.transition.normal,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  }

  return (
    <div style={{ display: 'flex', gap: 24, height: '100%' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 24, background: tokens.colors.surface,
          borderRadius: tokens.radius.md, padding: '12px 16px',
          border: `1px solid ${tokens.colors.border}`,
        }}>
          <button onClick={prevMonth} style={navBtn}>
            <CaretLeft size={16} weight="bold" />
          </button>
          <span style={{ fontSize: tokens.font.size.xl, fontWeight: tokens.font.weight.semibold, color: tokens.colors.text }}>
            {MONTHS[month]} {year}
          </span>
          <button onClick={nextMonth} style={navBtn}>
            <CaretRight size={16} weight="bold" />
          </button>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4,
          background: `${tokens.colors.surface}60`,
          borderRadius: tokens.radius.md,
          border: `1px solid ${tokens.colors.border}`,
          padding: 8,
        }}>
          {DAYS.map(d => (
            <div key={d} style={{
              textAlign: 'center', padding: '8px 0', fontSize: tokens.font.size.xs,
              fontWeight: tokens.font.weight.semibold, color: tokens.colors.textMuted,
              textTransform: 'uppercase', letterSpacing: 1,
            }}>{d}</div>
          ))}
          {weeks.flat().map((d, i) => {
            if (!d) return <div key={`e-${i}`} />
            const dayEvents = eventsByDay[d] || []
            const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear()
            const isSelected = d === selectedDay
            const hasPaymentDue = dayEvents.some(e => e.type === 'payment' && e.status !== 'paid')
            const hasOrder = dayEvents.some(e => e.type === 'order')

            return (
              <div key={d} onClick={() => setSelectedDay(d)}
                style={{
                  position: 'relative', padding: 8, borderRadius: tokens.radius.md,
                  cursor: 'pointer', minHeight: 60,
                  background: isSelected
                    ? `${tokens.colors.primary}30`
                    : isToday ? tokens.colors.surface : 'transparent',
                  border: isSelected
                    ? `1px solid ${tokens.colors.primary}50`
                    : isToday ? `1px solid ${tokens.colors.border}` : '1px solid transparent',
transition: tokens.transition.normal,
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = `${tokens.colors.surface}80` }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isToday ? tokens.colors.surface : 'transparent' }}
              >
                <div style={{
                  fontSize: tokens.font.size.sm, fontWeight: isToday ? 700 : 500,
                  color: isToday ? tokens.colors.primary : tokens.colors.textSecondary,
                  marginBottom: 4,
                }}>{d}</div>
                {hasOrder && (
                  <div style={{
                    fontSize: tokens.font.size.xs, color: tokens.colors.primary,
                    padding: '1px 4px', borderRadius: 4,
                    background: `${tokens.colors.primary}15`,
                    marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    <Note size={10} weight="fill" /> {dayEvents.filter(e => e.type === 'order').length} ordini
                  </div>
                )}
                {hasPaymentDue && (
                  <div style={{
                    fontSize: tokens.font.size.xs, color: tokens.colors.danger,
                    padding: '1px 4px', borderRadius: 4,
                    background: `${tokens.colors.danger}15`,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    <CreditCard size={10} weight="fill" /> {dayEvents.filter(e => e.type === 'payment' && e.status !== 'paid').length} da pagare
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {selectedDay && (
        <div style={{
          width: 340, flexShrink: 0,
          background: tokens.colors.surface,
          borderRadius: tokens.radius.md,
          border: `1px solid ${tokens.colors.border}`,
          padding: tokens.spacing.lg,
          display: 'flex', flexDirection: 'column', gap: tokens.spacing.sm,
        }}>
          <div style={{
            fontSize: tokens.font.size.md, fontWeight: tokens.font.weight.semibold,
            color: tokens.colors.text, marginBottom: tokens.spacing.sm,
          }}>
            {selectedDay} {MONTHS[month]} {year}
          </div>
          {selectedEvents.length === 0 ? (
            <div style={{
              fontSize: tokens.font.size.sm, color: tokens.colors.textMuted,
              textAlign: 'center', padding: 24,
            }}>
              Nessun evento
            </div>
          ) : selectedEvents.map((evt, i) => (
            <div key={`${evt.type}-${evt.id}-${i}`} style={{
              padding: '10px 12px', borderRadius: tokens.radius.md,
              background: evt.type === 'order'
                ? `${tokens.colors.primary}10`
                : evt.status === 'paid'
                  ? `${tokens.colors.accent}15`
                  : `${tokens.colors.danger}15`,
              border: `1px solid ${
                evt.type === 'order'
                  ? `${tokens.colors.primary}30`
                  : evt.status === 'paid'
                    ? `${tokens.colors.accent}30`
                    : `${tokens.colors.danger}30`
              }`,
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 4,
              }}>
                <span style={{
                  fontSize: tokens.font.size.xs, fontWeight: tokens.font.weight.semibold,
                  color: tokens.colors.textSecondary,
                }}>
                  {evt.type === 'order' ? (
                    <><Note size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Ordine</>
                  ) : (
                    <><CreditCard size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Pagamento</>
                  )} #{evt.id}
                </span>
                <span style={{
                  fontSize: tokens.font.size.xs, padding: '2px 6px', borderRadius: 4,
                  background: evt.type === 'order'
                    ? evt.status === 'approved' ? `${tokens.colors.accent}20` : `${tokens.colors.warning}20`
                    : evt.status === 'paid' ? `${tokens.colors.accent}20` : `${tokens.colors.danger}20`,
                  color: evt.type === 'order'
                    ? evt.status === 'approved' ? tokens.colors.accent : tokens.colors.warning
                    : evt.status === 'paid' ? tokens.colors.accent : tokens.colors.danger,
                }}>
                  {evt.status}
                </span>
              </div>
              <div style={{ fontSize: tokens.font.size.sm, fontWeight: 500, color: tokens.colors.text }}>
                {evt.title}
              </div>
              <div style={{
                fontSize: tokens.font.size.md, fontWeight: tokens.font.weight.bold,
                color: tokens.colors.primary, marginTop: 4,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <CurrencyDollar size={16} weight="bold" />
                {evt.amount.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
