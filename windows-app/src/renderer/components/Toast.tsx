import React, { useEffect, useState } from 'react'
import { tokens } from '../theme/tokens'
import { CheckCircle, WarningCircle, Info, X } from '@phosphor-icons/react'

export type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  type: ToastType
  message: string
}

let items: ToastItem[] = []
let listeners: Array<() => void> = []
let nextId = 1

function emit(): void {
  listeners.forEach(l => l())
}

function dismiss(id: number): void {
  items = items.filter(i => i.id !== id)
  emit()
}

function push(type: ToastType, message: string): void {
  const t: ToastItem = { id: nextId++, type, message }
  items = [...items.slice(-4), t]
  emit()
  window.setTimeout(() => dismiss(t.id), type === 'error' ? 7000 : 4000)
}

export const toast = {
  success: (message: string) => push('success', message),
  error: (message: string) => push('error', message),
  info: (message: string) => push('info', message),
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} color={tokens.colors.accentHover} weight="fill" />,
  error: <WarningCircle size={18} color={tokens.colors.dangerHover} weight="fill" />,
  info: <Info size={18} color={tokens.colors.primaryHover} weight="fill" />,
}

const BORDER_COLORS: Record<ToastType, string> = {
  success: tokens.colors.accent,
  error: tokens.colors.danger,
  info: tokens.colors.primary,
}

export const ToastHost: React.FC = () => {
  const [, setVersion] = useState(0)

  useEffect(() => {
    const listener = () => setVersion(v => v + 1)
    listeners.push(listener)
    return () => { listeners = listeners.filter(l => l !== listener) }
  }, [])

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 15000,
      display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 420,
    }}>
      {items.map(t => (
        <div key={t.id} role="status" aria-live="polite" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: tokens.colors.bgAlt,
          border: `1px solid ${BORDER_COLORS[t.type]}`,
          borderLeftWidth: 4,
          borderRadius: tokens.radius.md,
          padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
          boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
        }}>
          {ICONS[t.type]}
          <div style={{
            flex: 1, fontSize: tokens.font.size.sm,
            color: tokens.colors.text, lineHeight: 1.4,
          }}>
            {t.message}
          </div>
          <button onClick={() => dismiss(t.id)} aria-label="Chiudi notifica"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: tokens.colors.textMuted, padding: 2, display: 'flex',
            }}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

/** Alias per retrocompatibilità con i moduli che importano ToastContainer */
export const ToastContainer = ToastHost
