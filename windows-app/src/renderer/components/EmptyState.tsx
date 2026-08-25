import React from 'react'
import { tokens } from '../theme/tokens'
import { GlassButton } from './GlassButton'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: tokens.spacing.xxxl,
      gap: tokens.spacing.lg, textAlign: 'center',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: tokens.radius.lg,
        background: tokens.colors.surface,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: tokens.colors.textMuted,
      }}>
        {icon}
      </div>
      <div style={{ fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.semibold, color: tokens.colors.text }}>
        {title}
      </div>
      {description && (
        <div style={{ fontSize: tokens.font.size.md, color: tokens.colors.textSecondary, maxWidth: 320 }}>
          {description}
        </div>
      )}
      {action && (
        <GlassButton variant="primary" size="sm" onClick={action.onClick}>
          {action.label}
        </GlassButton>
      )}
    </div>
  )
}
