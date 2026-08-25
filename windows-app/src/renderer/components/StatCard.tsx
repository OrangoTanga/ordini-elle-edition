import React from 'react'
import { tokens } from '../theme/tokens'

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  color?: string
  trend?: { value: string; positive: boolean }
}

export const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color = tokens.colors.primary, trend }) => {
  return (
    <div style={{
      background: tokens.glass.background,
      backdropFilter: tokens.glass.blur,
      WebkitBackdropFilter: tokens.glass.blur,
      border: `1px solid ${tokens.glass.border}`,
      borderRadius: tokens.radius.lg,
      padding: tokens.spacing.xl,
      display: 'flex', flexDirection: 'column', gap: 4,
      transition: `all ${tokens.transition.normal}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{
          width: 32, height: 32, borderRadius: tokens.radius.sm,
          background: `${color}1A`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: color,
        }}>
          {icon}
        </div>
        <span style={{ fontSize: tokens.font.size.sm, color: tokens.colors.textSecondary, fontWeight: tokens.font.weight.medium }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 28, fontWeight: tokens.font.weight.extrabold, color: tokens.colors.text, letterSpacing: -1 }}>
        {value}
      </div>
      {trend && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: tokens.font.size.xs,
          color: trend.positive ? tokens.colors.accent : tokens.colors.danger,
        }}>
          <span style={{ fontSize: 10 }}>{trend.positive ? '↑' : '↓'}</span>
          {trend.value}
        </div>
      )}
    </div>
  )
}
