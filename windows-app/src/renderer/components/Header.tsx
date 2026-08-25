import React from 'react'
import { tokens } from '../theme/tokens'
import { Minus, Square, X } from '@phosphor-icons/react'

interface HeaderProps {
  title: string
  icon?: React.ReactNode
}

export const Header: React.FC<HeaderProps> = ({ title, icon }) => (
  <div style={{
    height: 56,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `0 ${tokens.spacing.xxl}`,
    background: `${tokens.colors.bgAlt}CC`,
    backdropFilter: tokens.glass.blur,
    WebkitBackdropFilter: tokens.glass.blur,
    borderBottom: `1px solid ${tokens.colors.border}`,
  } as any}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, WebkitAppRegion: 'drag', cursor: 'default' }}>
      {icon && <span style={{ color: tokens.colors.primary, display: 'flex' }}>{icon}</span>}
      <span style={{
        fontSize: tokens.font.size.xxl, fontWeight: tokens.font.weight.bold,
        color: tokens.colors.text, letterSpacing: -0.3,
      }}>
        {title}
      </span>
    </div>

    <div style={{
      display: 'flex', alignItems: 'center',
      gap: 4, WebkitAppRegion: 'no-drag',
    } as any}>
      {[
        { icon: <Minus size={14} weight="bold" />, action: 'window:minimize' },
        { icon: <Square size={12} weight="bold" />, action: 'window:maximize' },
        { icon: <X size={14} weight="bold" />, action: 'window:close' },
      ].map((btn, i) => (
        <button
          key={i}
          onClick={() => window.electron?.ipcRenderer?.invoke(btn.action)}
          style={{
            width: 36, height: 36, borderRadius: tokens.radius.sm,
            background: 'none', border: 'none', cursor: 'pointer',
            color: tokens.colors.textSecondary, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            transition: `all ${tokens.transition.fast}`,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = i === 2 ? tokens.colors.danger : tokens.colors.surfaceHover
            e.currentTarget.style.color = i === 2 ? 'white' : tokens.colors.text
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'none'
            e.currentTarget.style.color = tokens.colors.textSecondary
          }}
        >
          {btn.icon}
        </button>
      ))}
    </div>
  </div>
)
