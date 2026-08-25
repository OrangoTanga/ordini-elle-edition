import React from 'react'
import { tokens } from '../theme/tokens'

interface GlassCardProps {
  children: React.ReactNode
  style?: React.CSSProperties
  onClick?: (e: React.MouseEvent) => void
  className?: string
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, style, onClick, className }) => {
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        background: tokens.glass.background,
        backdropFilter: tokens.glass.blur,
        WebkitBackdropFilter: tokens.glass.blur,
        border: `1px solid ${tokens.glass.border}`,
        borderRadius: tokens.radius.lg,
        padding: tokens.spacing.xl,
        transition: `all ${tokens.transition.normal}`,
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
      onMouseEnter={e => {
        if (onClick) {
          e.currentTarget.style.background = tokens.glass.hoverBackground
          e.currentTarget.style.borderColor = tokens.glass.hoverBorder
        }
      }}
      onMouseLeave={e => {
        if (onClick) {
          e.currentTarget.style.background = tokens.glass.background
          e.currentTarget.style.borderColor = tokens.glass.border
        }
      }}
    >
      {children}
    </div>
  )
}
