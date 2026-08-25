import React, { useEffect, useState } from 'react'
import { tokens } from '../theme/tokens'
import { GlassCard } from '../components/GlassCard'
import { GlassButton } from '../components/GlassButton'
import { StatCard } from '../components/StatCard'
import { OrderCard } from '../components/OrderCard'
import { Badge } from '../components/Badge'
import { api } from '../api'
import { ChartBar, Clock, CheckCircle, XCircle, ArrowClockwise, Database, WifiHigh } from '@phosphor-icons/react'

interface DashboardProps {
  onPendingCountChange: (count: number) => void
}

export const DashboardScreen: React.FC<DashboardProps> = ({ onPendingCountChange }) => {
  const [stats, setStats] = useState<any>(null)
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [cloudOnline, setCloudOnline] = useState<boolean | null>(null)

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 15000)
    return () => clearInterval(interval)
  }, [])

  const fetchStats = async () => {
    const [result, health] = await Promise.all([api.orders.dashboard(), api.health()])
    setCloudOnline(health)
    if (result.success) {
      setStats(result.data)
      setError('')
      onPendingCountChange(result.data.pending?.count || 0)
    } else {
      setError(result.error || 'Errore di connessione')
    }
  }

  const handleStatus = async (orderId: number, status: string) => {
    await api.orders.updateStatus(orderId, status)
    fetchStats()
  }

  if (!stats && !error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <div style={{ color: tokens.colors.textMuted, fontSize: tokens.font.size.md }}>Caricamento...</div>
    </div>
  )

  if (!stats && error) return (
    <GlassCard style={{ textAlign: 'center', padding: tokens.spacing.xxxl, maxWidth: 480, margin: '0 auto' }}>
      <div style={{
        width: 48, height: 48, borderRadius: tokens.radius.lg,
        background: `${tokens.colors.danger}15`, display: 'flex',
        alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
      }}>
        <XCircle size={24} color={tokens.colors.danger} weight="fill" />
      </div>
      <div style={{ color: tokens.colors.text, fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.semibold, marginBottom: 6 }}>
        Dashboard non disponibile
      </div>
      <div style={{ color: tokens.colors.textSecondary, fontSize: tokens.font.size.sm, lineHeight: 1.5, marginBottom: tokens.spacing.lg }}>
        Impossibile contattare il server: {error}. Controlla la connessione o verifica l&apos;URL del Worker nelle Impostazioni.
      </div>
      <GlassButton variant="outline" size="sm" onClick={fetchStats} style={{ justifyContent: 'center' }}>
        <ArrowClockwise size={14} />
        Riprova
      </GlassButton>
    </GlassCard>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.xl }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: tokens.spacing.lg }}>
        <StatCard
          icon={<ChartBar size={18} weight="fill" />}
          label="Ordini oggi"
          value={stats.today?.count || 0}
          color={tokens.colors.primary}
        />
        <StatCard
          icon={<Clock size={18} weight="fill" />}
          label="In attesa"
          value={stats.pending?.count || 0}
          color={tokens.colors.warning}
        />
        <StatCard
          icon={<CheckCircle size={18} weight="fill" />}
          label="Approvati"
          value={stats.approved?.count || 0}
          color={tokens.colors.accent}
        />
        <StatCard
          icon={<XCircle size={18} weight="fill" />}
          label="Rifiutati"
          value={stats.rejected?.count || 0}
          color={tokens.colors.danger}
        />
      </div>

      <div style={{ display: 'flex', gap: tokens.spacing.xl }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: tokens.spacing.lg,
          }}>
            <Clock size={18} color={tokens.colors.warning} weight="fill" />
            <span style={{
              fontSize: tokens.font.size.xl, fontWeight: tokens.font.weight.bold,
              color: tokens.colors.text,
            }}>
              Ordini in attesa
            </span>
            <Badge variant="warning" label={`${stats.pendingOrders?.length || 0}`} dot={false} />
          </div>

          {stats.pendingOrders?.length > 0 ? (
            stats.pendingOrders.map((order: any) => (
              <OrderCard
                key={order.id}
                order={order}
                expanded={expandedOrder === order.id}
                onToggle={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                onApprove={() => handleStatus(order.id, 'approved')}
                onReject={() => handleStatus(order.id, 'rejected')}
              />
            ))
          ) : (
            <GlassCard style={{ textAlign: 'center', padding: tokens.spacing.xxxl }}>
              <div style={{
                width: 48, height: 48, borderRadius: tokens.radius.lg,
                background: `${tokens.colors.accent}15`, display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
              }}>
                <CheckCircle size={24} color={tokens.colors.accent} weight="fill" />
              </div>
              <div style={{ color: tokens.colors.textSecondary, fontSize: tokens.font.size.md }}>
                Tutti gli ordini sono stati processati
              </div>
            </GlassCard>
          )}
        </div>

        <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>
          <GlassCard>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: tokens.spacing.lg,
            }}>
              <ChartBar size={16} color={tokens.colors.primary} weight="fill" />
              <span style={{ fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.bold, color: tokens.colors.text }}>
                Riepilogo
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
              {[
                { label: 'Totale oggi', value: `€${(stats.today?.total || 0).toFixed(2)}`, color: tokens.colors.text },
                { label: 'Da approvare', value: `${stats.pending?.count || 0}`, color: tokens.colors.warning },
                { label: 'Commissioni', value: `€${(stats.pending?.commission || 0).toFixed(2)}`, color: tokens.colors.accent },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: tokens.font.size.md, paddingBottom: tokens.spacing.sm,
                  borderBottom: i < 2 ? `1px solid ${tokens.colors.border}` : 'none',
                }}>
                  <span style={{ color: tokens.colors.textSecondary }}>{item.label}</span>
                  <span style={{ fontWeight: tokens.font.weight.semibold, color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: tokens.spacing.lg,
            }}>
              <WifiHigh size={16} color={cloudOnline ? tokens.colors.accent : tokens.colors.danger} weight="fill" />
              <span style={{ fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.bold, color: tokens.colors.text }}>
                Sistema
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
              {[
                { label: 'Cloudflare Worker', value: cloudOnline == null ? 'Verifica...' : cloudOnline ? 'Online' : 'Offline', color: cloudOnline ? tokens.colors.accent : tokens.colors.danger },
                { label: 'Sincronizzazione', value: cloudOnline ? 'In tempo reale' : 'Non disponibile', color: cloudOnline ? tokens.colors.accent : tokens.colors.danger },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: tokens.font.size.md, paddingBottom: tokens.spacing.sm,
                  borderBottom: i < 1 ? `1px solid ${tokens.colors.border}` : 'none',
                }}>
                  <span style={{ color: tokens.colors.textSecondary }}>{item.label}</span>
                  <span style={{ fontWeight: tokens.font.weight.semibold, color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: tokens.spacing.lg,
            }}>
              <Database size={16} color={tokens.colors.primary} weight="fill" />
              <span style={{ fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.bold, color: tokens.colors.text }}>
                Database
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.sm }}>
              <div style={{ fontSize: tokens.font.size.md, color: tokens.colors.textSecondary }}>
                Cloud &middot; Cloudflare D1
              </div>
              <GlassButton variant="outline" size="sm" onClick={fetchStats}>
                <ArrowClockwise size={14} />
                Aggiorna
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
