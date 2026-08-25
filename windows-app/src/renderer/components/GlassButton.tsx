import React from 'react'
import { tokens } from '../theme/tokens'

interface GlassButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  style?: React.CSSProperties
  disabled?: boolean
  type?: 'button' | 'submit'
}

const variantStyles: Record<string, React.CSSProperties> = {
  primary: {
    background: `linear-gradient(135deg, ${tokens.colors.primary}, ${tokens.colors.primaryHover})`,
    color: 'white',
    border: 'none',
  },
  secondary: {
    background: `linear-gradient(135deg, ${tokens.colors.accent}, ${tokens.colors.accentHover})`,
    color: 'white',
    border: 'none',
  },
  danger: {
    background: `linear-gradient(135deg, ${tokens.colors.danger}, ${tokens.colors.dangerHover})`,
    color: 'white',
    border: 'none',
  },
  outline: {
    background: 'transparent',
    color: tokens.colors.textSecondary,
    border: `1px solid ${tokens.colors.border}`,
  },
  ghost: {
    background: 'transparent',
    color: tokens.colors.textSecondary,
    border: 'none',
  },
}

const sizeStyles: Record<string, React.CSSProperties> = {
  sm: { padding: '6px 14px', fontSize: tokens.font.size.sm, borderRadius: tokens.radius.sm },
  md: { padding: '8px 18px', fontSize: tokens.font.size.md, borderRadius: tokens.radius.md },
  lg: { padding: '10px 24px', fontSize: tokens.font.size.lg, borderRadius: tokens.radius.md },
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  children, onClick, variant = 'primary', size = 'md', style, disabled, type = 'button',
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...variantStyles[variant],
        ...sizeStyles[size],
        fontWeight: tokens.font.weight.semibold,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: `all ${tokens.transition.fast}`,
        outline: 'none',
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        ...(variant === 'primary' ? {
          boxShadow: `0 2px 12px ${tokens.colors.primaryGlow}`,
        } : {}),
        ...(variant === 'secondary' ? {
          boxShadow: `0 2px 12px ${tokens.colors.accentGlow}`,
        } : {}),
        ...style,
      }}
      onMouseEnter={e => {
        if (disabled) return
        const target = e.currentTarget
        if (variant === 'outline' || variant === 'ghost') {
          target.style.background = tokens.colors.surfaceHover
          target.style.color = tokens.colors.text
        }
        target.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        const target = e.currentTarget
        if (variant === 'outline' || variant === 'ghost') {
          target.style.background = 'transparent'
          target.style.color = tokens.colors.textSecondary
        }
        target.style.transform = 'translateY(0)'
      }}
    >
      {children}
    </button>
  )
}
