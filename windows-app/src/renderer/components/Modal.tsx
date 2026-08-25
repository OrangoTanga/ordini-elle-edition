import React, { useEffect, useRef } from 'react'
import { tokens } from '../theme/tokens'
import { X } from '@phosphor-icons/react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  width?: number
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, width = 480 }) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
      }
      window.addEventListener('keydown', handleKey)
      return () => window.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, animation: 'fadeIn 150ms ease',
      }}
      onClick={onClose}
    >
      <div
        ref={ref}
        onClick={e => e.stopPropagation()}
        style={{
          width, maxWidth: '90vw', maxHeight: '85vh', overflow: 'auto',
          background: tokens.colors.bgAlt,
          border: `1px solid ${tokens.colors.border}`,
          borderRadius: tokens.radius.xl,
          padding: tokens.spacing.xxl,
          boxShadow: tokens.shadow.modal,
          animation: 'slideUp 200ms ease-out',
        }}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: tokens.spacing.xl,
        }}>
          <div style={{
            fontSize: tokens.font.size.xl, fontWeight: tokens.font.weight.bold,
            color: tokens.colors.text,
          }}>
            {title}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: tokens.colors.textMuted, padding: 4,
              display: 'flex', borderRadius: tokens.radius.sm,
              transition: `color ${tokens.transition.fast}`,
            }}
            onMouseEnter={e => e.currentTarget.style.color = tokens.colors.text}
            onMouseLeave={e => e.currentTarget.style.color = tokens.colors.textMuted}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  )
}
