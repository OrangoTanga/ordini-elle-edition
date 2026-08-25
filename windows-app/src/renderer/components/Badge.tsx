import React from 'react'
import { tokens } from '../theme/tokens'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

interface BadgeProps {
  variant: BadgeVariant
  label: string
  dot?: boolean
}

const variantMap: Record<BadgeVariant, { bg: string; color: string; dot: string }> = {
  success: { bg: 'rgba(5,150,105,0.15)', color: '#10B981', dot: '#10B981' },
  warning: { bg: 'rgba(217,119,6,0.15)', color: '#F59E0B', dot: '#F59E0B' },
  danger: { bg: 'rgba(220,38,38,0.15)', color: '#EF4444', dot: '#EF4444' },
  info: { bg: 'rgba(37,99,235,0.15)', color: '#3B82F6', dot: '#3B82F6' },
  neutral: { bg: tokens.colors.surface, color: tokens.colors.textSecondary, dot: tokens.colors.textMuted },
}

export const Badge: React.FC<BadgeProps> = ({ variant, label, dot = true }) => {
  const v = variantMap[variant]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: tokens.radius.full,
      fontSize: tokens.font.size.xs, fontWeight: tokens.font.weight.semibold,
      background: v.bg, color: v.color,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: v.dot }} />}
      {label}
    </span>
  )
}
