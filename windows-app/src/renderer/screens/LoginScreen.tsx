import React, { useState } from 'react'
import { tokens } from '../theme/tokens'
import { Wine, Eye, EyeSlash } from '@phosphor-icons/react'
import { api, setCryptoKey } from '../api'

interface LoginScreenProps {
  onLogin: (token: string) => void
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) { setError('Inserisci username e password'); return }
    setSubmitting(true); setError('')
    const result = await api.auth.login(username, password)
    if (result.success && result.data?.token) {
      const user = result.data.user
      if (user && user.role !== 'admin') {
        setError('Accesso negato — solo gli amministratori possono accedere al pannello Windows. Utilizza l\'app Android.')
        setSubmitting(false)
        return
      }
      localStorage.setItem('token', result.data.token)
      localStorage.setItem('user', JSON.stringify(result.data.user))
      if (result.data.crypto_salt) {
        localStorage.setItem('crypto_salt', result.data.crypto_salt)
        setCryptoKey(username, result.data.crypto_salt)
      }
      onLogin(result.data.token)
    } else {
      setError(result.error || 'Credenziali non valide')
    }
    setSubmitting(false)
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: tokens.colors.bg, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: '-30%', left: '-10%', width: '60%', height: '60%',
        borderRadius: '50%', background: `radial-gradient(circle, ${tokens.colors.primary}15, transparent 70%)`,
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', right: '-5%', width: '50%', height: '50%',
        borderRadius: '50%', background: `radial-gradient(circle, ${tokens.colors.accent}10, transparent 70%)`,
      }} />

      <form onSubmit={handleSubmit} style={{
        width: 380, position: 'relative',
        background: tokens.colors.bgAlt,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: tokens.radius.xl,
        padding: tokens.spacing.xxxl,
        boxShadow: tokens.shadow.card,
      }}>
        <div style={{ textAlign: 'center', marginBottom: tokens.spacing.xxl }}>
          <div style={{
            width: 56, height: 56, borderRadius: tokens.radius.lg,
            background: `linear-gradient(135deg, ${tokens.colors.primary}, ${tokens.colors.accent})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', color: 'white',
          }}>
            <Wine size={28} weight="fill" />
          </div>
          <div style={{ fontSize: tokens.font.size.xxl, fontWeight: tokens.font.weight.extrabold, color: tokens.colors.text }}>
            Ordini
          </div>
          <div style={{ fontSize: tokens.font.size.sm, color: tokens.colors.textMuted, marginTop: 2 }}>
            Elly Edition
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>
          <div>
            <label style={{ fontSize: tokens.font.size.sm, color: tokens.colors.textSecondary, marginBottom: 6, display: 'block', fontWeight: 500 }}>
              Username
            </label>
            <input
              value={username} onChange={e => setUsername(e.target.value)}
              placeholder="Il tuo username"
              autoFocus
              style={{
                background: tokens.colors.surface, border: `1px solid ${tokens.colors.border}`,
                borderRadius: tokens.radius.md, padding: '12px 14px', color: tokens.colors.text,
                fontSize: tokens.font.size.md, outline: 'none', width: '100%', boxSizing: 'border-box',
                transition: `all ${tokens.transition.fast}`,
              }}
              onFocus={e => e.currentTarget.style.borderColor = tokens.colors.primary}
              onBlur={e => e.currentTarget.style.borderColor = tokens.colors.border}
            />
          </div>

          <div>
            <label style={{ fontSize: tokens.font.size.sm, color: tokens.colors.textSecondary, marginBottom: 6, display: 'block', fontWeight: 500 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="La tua password"
                style={{
                  background: tokens.colors.surface, border: `1px solid ${tokens.colors.border}`,
                  borderRadius: tokens.radius.md, padding: '12px 14px', color: tokens.colors.text,
                  fontSize: tokens.font.size.md, outline: 'none', width: '100%', boxSizing: 'border-box',
                  paddingRight: 40, transition: `all ${tokens.transition.fast}`,
                }}
                onFocus={e => e.currentTarget.style.borderColor = tokens.colors.primary}
                onBlur={e => e.currentTarget.style.borderColor = tokens.colors.border}
              />
              <div
                onClick={() => setShowPwd(!showPwd)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  cursor: 'pointer', color: tokens.colors.textMuted, display: 'flex',
                }}
              >
                {showPwd ? <EyeSlash size={18} /> : <Eye size={18} />}
              </div>
            </div>
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: tokens.radius.md,
              background: `${tokens.colors.danger}15`,
              border: `1px solid ${tokens.colors.danger}33`,
              color: tokens.colors.danger, fontSize: tokens.font.size.sm,
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={submitting}
            style={{
              padding: '12px', borderRadius: tokens.radius.md,
              border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
              background: `linear-gradient(135deg, ${tokens.colors.primary}, ${tokens.colors.primaryHover})`,
              color: 'white', fontSize: tokens.font.size.lg,
              fontWeight: tokens.font.weight.bold,
              opacity: submitting ? 0.5 : 1,
              transition: `all ${tokens.transition.fast}`,
              boxShadow: `0 2px 12px ${tokens.colors.primaryGlow}`,
            }}
            onMouseEnter={e => { if (!submitting) e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {submitting ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </div>
      </form>
    </div>
  )
}
