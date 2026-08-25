import React from 'react'
import { tokens } from '../theme/tokens'
import { GlassButton } from './GlassButton'
import { DownloadSimple, WarningOctagon } from '@phosphor-icons/react'
import type { AppVersionInfo } from '../services/useUpdateChecker'

interface UpdateBlockerProps {
  info: AppVersionInfo
  currentVersion: string
  downloading: boolean
  progress: number | null
  error: string
  onUpdateNow: () => void
}

export const UpdateBlocker: React.FC<UpdateBlockerProps> = ({
  info, currentVersion, downloading, progress, error, onUpdateNow,
}) => {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 12000,
      background: 'rgba(10,15,30,0.97)',
      backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        maxWidth: 460, width: '90%',
        background: tokens.colors.bgAlt,
        border: `1px solid ${tokens.colors.warning}`,
        borderRadius: tokens.radius.xl,
        padding: tokens.spacing.xxxl,
        boxShadow: tokens.shadow.modal,
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: tokens.spacing.lg }}>
          <WarningOctagon size={44} color={tokens.colors.warning} weight="fill" />
        </div>
        <div style={{
          fontSize: tokens.font.size.xxl, fontWeight: tokens.font.weight.bold,
          color: tokens.colors.text, marginBottom: tokens.spacing.sm,
        }}>
          Aggiornamento richiesto
        </div>
        <div style={{ fontSize: tokens.font.size.md, color: tokens.colors.textSecondary, lineHeight: 1.6, marginBottom: tokens.spacing.lg }}>
          È disponibile la versione <b style={{ color: tokens.colors.text }}>{info.version}</b>
          {currentVersion && <> (stai usando la v{currentVersion})</>}.
          Questo aggiornamento è obbligatorio per continuare a usare l&apos;app.
        </div>
        {info.notes && (
          <div style={{
            fontSize: tokens.font.size.sm, color: tokens.colors.textSecondary,
            background: 'rgba(255,255,255,0.04)', border: `1px solid ${tokens.colors.border}`,
            borderRadius: tokens.radius.md, padding: tokens.spacing.md,
            marginBottom: tokens.spacing.lg,
          }}>
            {info.notes}
          </div>
        )}
        {downloading && (
          <div style={{ marginBottom: tokens.spacing.lg }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: tokens.font.size.sm, color: tokens.colors.textSecondary,
              marginBottom: 6,
            }}>
              <span>{progress != null && progress >= 100 ? 'Download completato, avvio installazione...' : 'Download in corso...'}</span>
              <span style={{ fontWeight: tokens.font.weight.semibold, color: tokens.colors.text }}>
                {progress != null ? `${progress}%` : ''}
              </span>
            </div>
            <div style={{
              height: 8, background: tokens.colors.surface,
              borderRadius: tokens.radius.full, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: `${progress ?? 0}%`,
                background: `linear-gradient(90deg, ${tokens.colors.primary}, ${tokens.colors.primaryHover})`,
                borderRadius: tokens.radius.full,
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        )}
        {error && (
          <div style={{
            fontSize: tokens.font.size.sm, color: tokens.colors.danger,
            fontWeight: tokens.font.weight.semibold, marginBottom: tokens.spacing.md,
          }}>
            {error}
          </div>
        )}
        <GlassButton size="lg" onClick={onUpdateNow} disabled={downloading}
          style={{ width: '100%', justifyContent: 'center' }}>
          {downloading
            ? (progress != null ? `Scaricamento... ${progress}%` : 'Avvio download...')
            : (<><DownloadSimple size={20} weight="fill" /> Aggiorna ora</>)}
        </GlassButton>
        <div style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textMuted, marginTop: tokens.spacing.md }}>
          Al termine del download l&apos;app si chiuderà da sola e l&apos;installer si avvierà automaticamente.
        </div>
      </div>
    </div>
  )
}