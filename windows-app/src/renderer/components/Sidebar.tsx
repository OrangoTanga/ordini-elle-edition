import React, { useEffect, useState } from 'react'
import { tokens } from '../theme/tokens'
import { api } from '../api'
import { compareVersions } from '../services/useUpdateChecker'
import { toast } from './Toast'
import {
  ChartBar, ClipboardText, Package, Storefront, User, CurrencyEur, Coins, CreditCard, Calendar, Gear, Wine, ArrowClockwise, DownloadSimple,
} from '@phosphor-icons/react'

export type Page = 'dashboard' | 'orders' | 'catalog' | 'customers' | 'users' | 'listini' | 'provvigioni' | 'payments' | 'calendar' | 'settings'

interface SidebarProps {
  currentPage: Page
  onPageChange: (page: Page) => void
  orderCount: number
}

const navItemDefs: { id: Page; icon: React.ReactNode; label: string }[] = [
  { id: 'dashboard', icon: <ChartBar size={20} />, label: 'Dashboard' },
  { id: 'orders', icon: <ClipboardText size={20} />, label: 'Ordini' },
  { id: 'catalog', icon: <Package size={20} />, label: 'Catalogo' },
  { id: 'customers', icon: <Storefront size={20} />, label: 'Clienti' },
  { id: 'users', icon: <User size={20} />, label: 'Utenti' },
  { id: 'listini', icon: <CurrencyEur size={20} />, label: 'Listini' },
  { id: 'provvigioni', icon: <Coins size={20} />, label: 'Provvigioni' },
  { id: 'payments', icon: <CreditCard size={20} />, label: 'Pagamenti' },
  { id: 'calendar', icon: <Calendar size={20} />, label: 'Calendario' },
  { id: 'settings', icon: <Gear size={20} />, label: 'Impostazioni' },
]

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange, orderCount }) => {
  const [appVersion, setAppVersion] = useState('')
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    window.electron?.getAppVersion().then(setAppVersion).catch(() => {})
  }, [])

  // Verifica aggiornamenti centrali (Worker) e, se trovati, scarica e installa
  // automaticamente. Questo risolve anche il caso "versione vecchia non riceve
  // update": l'OTA si legge SEMPRE dal Worker, non dalla purge_config locale.
  const handleCheckForUpdates = async () => {
    if (checking) return
    setChecking(true)
    try {
      const version = await window.electron?.getAppVersion()
      const latest = await api.appVersions.get('windows')
      if (!latest || !latest.success || !latest.data) {
        toast.error('Impossibile verificare gli aggiornamenti. Controlla la connessione.')
        return
      }
      const latestVersion = latest.data.version
      if (!latestVersion || !latest.data.url) {
        toast.info('Sei già all\'ultima versione disponibile.')
        return
      }
      if (version && compareVersions(version, latestVersion) >= 0) {
        toast.info('Sei già all\'ultima versione (' + version + ').')
        return
      }
      // Aggiornamento trovato: scarica e installa in automatico.
      const res = await window.electron?.downloadAndInstallUpdate(latest.data.url)
      if (!res?.ok) toast.error('Download aggiornamento fallito: ' + (res?.error || 'errore sconosciuto'))
    } catch (err: any) {
      toast.error('Errore durante la verifica degli aggiornamenti: ' + (err?.message || 'errore sconosciuto'))
    } finally {
      setChecking(false)
    }
  }

  const navItems = navItemDefs.map(item => ({
    ...item,
    icon: React.cloneElement(item.icon as React.ReactElement, {
      weight: currentPage === item.id ? 'fill' : 'regular',
    }),
  }))

  return (
  <div style={{
    width: 240, height: '100vh',
    background: tokens.colors.bgAlt,
    borderRight: `1px solid ${tokens.colors.border}`,
    display: 'flex', flexDirection: 'column',
    padding: `${tokens.spacing.xxl} ${tokens.spacing.lg}`,
  } as any}>
    <div style={{
      padding: `0 ${tokens.spacing.sm} ${tokens.spacing.xxl}`,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: tokens.radius.md,
        background: `linear-gradient(135deg, ${tokens.colors.primary}, ${tokens.colors.accent})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white',
      }}>
        <Wine size={22} weight="fill" />
      </div>
      <div>
        <div style={{
          fontSize: tokens.font.size.xl, fontWeight: tokens.font.weight.extrabold,
          color: tokens.colors.text, lineHeight: 1.2,
        }}>
          Ordini
        </div>
        <div style={{
          fontSize: tokens.font.size.xs, color: tokens.colors.textMuted,
          letterSpacing: 1.5, textTransform: 'uppercase',
        }}>
          Elly Edition
        </div>
      </div>
    </div>

    <nav style={{ flex: 1, WebkitAppRegion: 'no-drag', display: 'flex', flexDirection: 'column', gap: 2 } as any}>
      {navItems.map(item => {
        const isActive = currentPage === item.id
        return (
          <div
            key={item.id}
            onClick={() => onPageChange(item.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: tokens.spacing.md,
              padding: '10px 14px', borderRadius: tokens.radius.md,
              cursor: 'pointer',
              background: isActive ? tokens.colors.primaryGlow : 'transparent',
              border: isActive ? `1px solid ${tokens.colors.primary}33` : '1px solid transparent',
              color: isActive ? tokens.colors.primary : tokens.colors.textSecondary,
              transition: `all ${tokens.transition.fast}`,
            }}
            onMouseEnter={e => {
              if (!isActive) e.currentTarget.style.background = tokens.colors.surfaceHover
            }}
            onMouseLeave={e => {
              if (!isActive) e.currentTarget.style.background = 'transparent'
            }}
          >
            <span style={{
              display: 'flex',
              color: isActive ? tokens.colors.primary : tokens.colors.textMuted,
              transition: `color ${tokens.transition.fast}`,
            }}>
              {item.icon}
            </span>
            <span style={{
              flex: 1, fontSize: tokens.font.size.md, fontWeight: isActive ? 700 : 500,
              color: isActive ? tokens.colors.text : tokens.colors.textSecondary,
            }}>
              {item.label}
            </span>
            {item.id === 'orders' && orderCount > 0 && (
              <span style={{
                background: `linear-gradient(135deg, ${tokens.colors.danger}, ${tokens.colors.dangerHover})`,
                borderRadius: tokens.radius.full,
                padding: '2px 8px', fontSize: tokens.font.size.xs,
                fontWeight: tokens.font.weight.bold, color: 'white',
                minWidth: 20, textAlign: 'center',
              }}>
                {orderCount}
              </span>
            )}
          </div>
        )
      })}
    </nav>

    <div style={{
      padding: tokens.spacing.md,
      background: tokens.colors.surface,
      borderRadius: tokens.radius.md,
      border: `1px solid ${tokens.colors.border}`,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{
        fontSize: tokens.font.size.xs, color: tokens.colors.textMuted,
        textAlign: 'center',
      }}>
        {appVersion ? `v${appVersion}` : ''}
      </div>
      <button
        onClick={handleCheckForUpdates}
        disabled={checking}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          width: '100%', padding: '8px 10px', cursor: checking ? 'default' : 'pointer',
          background: tokens.colors.primaryGlow, color: tokens.colors.primary,
          border: `1px solid ${tokens.colors.primary}33`, borderRadius: tokens.radius.md,
          fontSize: tokens.font.size.xs, fontWeight: 600, fontFamily: 'inherit',
        }}
      >
        {checking ? <ArrowClockwise size={14} style={{ animation: 'sidebar-spin 1s linear infinite' }} /> : <DownloadSimple size={14} weight="bold" />}
        {checking ? 'Verifica...' : 'Verifica aggiornamenti'}
      </button>
      <style>{`@keyframes sidebar-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  </div>
  )
}
