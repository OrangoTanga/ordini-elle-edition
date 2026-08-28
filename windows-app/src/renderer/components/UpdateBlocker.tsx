import React, { useState } from 'react'
import { tokens } from '../theme/tokens'
import { GlassButton } from './GlassButton'
import { WarningOctagon, ArrowSquareOut, DownloadSimple } from '@phosphor-icons/react'

interface UpdateBlockerProps {
  info: { version: string; url: string; notes: string }
  currentVersion: string
  onOpenRelease: () => void
  onDownload: () => void
}

export const UpdateBlocker: React.FC<UpdateBlockerProps> = ({
  info, currentVersion, onOpenRelease, onDownload,
}) => {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    const result = await onDownload()
    if (!result?.ok) {
      console.error('Download fallito:', result?.error)
    }
    setDownloading(false)
  }

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
          Aggiornamento obbligatorio
        </div>
        <div style={{ fontSize: tokens.font.size.md, color: tokens.colors.textSecondary, lineHeight: 1.6, marginBottom: tokens.spacing.lg }}>
          È disponibile la versione <b style={{ color: tokens.colors.text }}>{info.version}</b>
          {currentVersion && <> (stai usando la v{currentVersion})</>}.
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
        <GlassButton size="lg" onClick={onOpenRelease}
          style={{ width: '100%', justifyContent: 'center', marginBottom: tokens.spacing.md }}>
          <ArrowSquareOut size={20} weight="fill" />
          <span>Apri pagina release su GitHub</span>
        </GlassButton>
        <GlassButton size="lg" onClick={handleDownload} disabled={downloading}
          style={{ width: '100%', justifyContent: 'center', background: '#10B981' }}>
          {downloading ? (
            <>
              <DownloadSimple size={20} weight="fill" style={{ animation: 'spin 1s linear infinite' }} />
              Scaricamento...
            </>
          ) : (
            <>
              <DownloadSimple size={20} weight="fill" />
              Scarica e installa ora
            </>
          )}
        </GlassButton>
        <div style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textMuted, marginTop: tokens.spacing.md }}>
          Il download partirà direttamente, poi l'installer si avvierà automaticamente.
        </div>
        <style jsx>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </div>
  )
}