import React from 'react'
import { tokens } from '../theme/tokens'

interface FormFieldProps {
  label?: string
  error?: string
  hint?: string
  children: React.ReactNode
  style?: React.CSSProperties
}

export const FormField: React.FC<FormFieldProps> = ({ label, error, hint, children, style }) => {
  return (
    <div style={style}>
      {label && (
        <label style={{
          fontSize: tokens.font.size.sm, fontWeight: tokens.font.weight.medium,
          color: tokens.colors.textSecondary, marginBottom: 6, display: 'block',
        }}>
          {label}
        </label>
      )}
      {children}
      {hint && !error && (
        <div style={{
          fontSize: tokens.font.size.xs, color: tokens.colors.textMuted, marginTop: 4,
        }}>
          {hint}
        </div>
      )}
      {error && (
        <div style={{
          fontSize: tokens.font.size.xs, color: tokens.colors.danger, marginTop: 4,
        }}>
          {error}
        </div>
      )}
    </div>
  )
}

export const inputStyle: React.CSSProperties = {
  background: tokens.colors.surface,
  border: `1px solid ${tokens.colors.border}`,
  borderRadius: tokens.radius.md,
  padding: '10px 14px',
  color: tokens.colors.text,
  fontSize: tokens.font.size.md,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  transition: `all ${tokens.transition.fast}`,
}

export const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none',
  cursor: 'pointer',
}
