import React from 'react'
import { GlassCard } from './GlassCard'
import { GlassButton } from './GlassButton'

interface OrderCardProps {
  order: any
  expanded?: boolean
  onToggle?: () => void
  onApprove?: () => void
  onReject?: () => void
  onPrint?: () => void
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'In attesa', color: '#fa709a', bg: 'rgba(250, 112, 154, 0.15)' },
  approved: { label: 'Approvato', color: '#43e97b', bg: 'rgba(67, 233, 123, 0.15)' },
  rejected: { label: 'Rifiutato', color: '#f5576c', bg: 'rgba(245, 87, 108, 0.15)' },
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, expanded, onToggle, onApprove, onReject, onPrint }) => {
  const status = statusConfig[order.status] || statusConfig.pending
  const timeAgo = getTimeAgo(order.created_at)

  return (
    <div>
      <GlassCard onClick={onToggle} style={{ marginBottom: expanded ? 0 : 8, borderLeft: `3px solid ${status.color}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 20 }}>🏪</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{order.business_name}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
              #{order.id} · {order.user_name} · {timeAgo}
            </div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
            €{order.total?.toFixed(2)}
          </div>
          <div style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: status.bg, color: status.color,
          }}>
            {status.label}
          </div>
          <span style={{ color: 'rgba(255,255,255,0.25)', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : '' }}>
            ▼
          </span>
        </div>
      </GlassCard>

      {expanded && (
        <GlassCard style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: -1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>CLIENTE</div>
              <div style={{ fontWeight: 500 }}>{order.business_name}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>P.IVA: {order.vat}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>IBAN: {order.iban}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>DETTAGLI</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Data: {order.invoice_date}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                Pagamento: {order.payment_type === 'immediato' ? 'Immediato' :
                           order.payment_type === 'anticipato' ? 'Anticipato' :
                           order.payment_type === 'acconto_saldo' ? `Acconto ${order.deposit_percent}% + Saldo ${order.balance_days}gg` :
                           `${order.payment_days || order.payment_terms} giorni`}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Rappresentante: {order.user_name}</div>
            </div>
          </div>

          {(order.payment_status || order.payments) && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>PAGAMENTI</div>
              {order.payments?.map((p: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: p.status === 'paid' ? 16 : 14 }}>
                    {p.status === 'paid' ? '✅' : p.status === 'overdue' ? '🔴' : '⏳'}
                  </span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                    {p.type === 'acconto' ? 'Acconto' : p.type === 'saldo' ? 'Saldo' : 'Pagamento'}: €{p.amount?.toFixed(2)}
                  </span>
                  <span style={{ fontSize: 12, color: p.status === 'overdue' ? '#f5576c' : 'rgba(255,255,255,0.35)' }}>
                    {p.due_date ? `Scad. ${p.due_date}` : ''}
                  </span>
                </div>
              ))}
              {!order.payments && (
                <div>
                  <span style={{
                    display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                    background: order.payment_status === 'paid' ? 'rgba(67, 233, 123, 0.15)' : 
                               order.payment_status === 'overdue' ? 'rgba(245, 87, 108, 0.15)' : 'rgba(255, 193, 7, 0.15)',
                    color: order.payment_status === 'paid' ? '#43e97b' : 
                           order.payment_status === 'overdue' ? '#f5576c' : '#ffc107',
                  }}>
                    {order.payment_status === 'paid' ? '✅ Pagato' : 
                     order.payment_status === 'overdue' ? '🔴 Scaduto' : 
                     order.payment_status === 'partial' ? '🟡 Parziale' : '⏳ In sospeso'}
                  </span>
                </div>
              )}
            </div>
          )}

          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>PRODOTTI</div>
          {(order.items || []).map((item: any, i: number) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16,
              }}>🛒</div>
              <div style={{ flex: 1, fontSize: 14 }}>{item.product_name}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>x{item.quantity}</div>
              <div style={{ fontSize: 14, fontWeight: 600, minWidth: 70, textAlign: 'right' }}>
                €{item.subtotal?.toFixed(2)}
              </div>
            </div>
          ))}

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 0 4px', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 8,
          }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {order.status === 'pending' && (
                <>
                  <GlassButton variant="danger" size="sm" onClick={onReject}>❌ Rifiuta</GlassButton>
                  <GlassButton variant="primary" size="sm" onClick={onApprove}>✅ Approva</GlassButton>
                </>
              )}
              <GlassButton variant="outline" size="sm" onClick={onPrint}>📄 Stampa</GlassButton>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                Totale: €{order.total?.toFixed(2)}
              </div>
              {(order.commission_total > 0) && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <div style={{ fontSize: 12, color: '#43e97b', fontWeight: 600 }}>
                    Provvigione: €{order.commission_total?.toFixed(2)}
                  </div>
                  {order.shared_reps?.length > 0 && (
                    <div style={{ fontSize: 11, color: '#667eea', marginTop: 2 }}>
                      Divisa con: {order.shared_reps.map((r: any) => r.user_name).join(', ')}
                      (€{order.commission_per_rep?.toFixed(2)}/cad)
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {order.notes && (
            <div style={{
              marginTop: 12, padding: 10, borderRadius: 8,
              background: 'rgba(255,255,255,0.04)', fontSize: 13,
              color: 'rgba(255,255,255,0.55)',
            }}>
              📝 Nota: {order.notes}
            </div>
          )}
        </GlassCard>
      )}
    </div>
  )
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m fa`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h fa`
  const days = Math.floor(hours / 24)
  return `${days}g fa`
}
