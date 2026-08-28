import React, { useState } from 'react'
import { tokens } from '../theme/tokens'
import { GlassButton } from './GlassButton'
import { WarningCircle, ArrowSquareOut, X, DownloadSimple } from '@phosphor-icons/react'

interface UpdateBannerProps {
  info: { version: string; url: string; notes: string } | null
  currentVersion: string
  onOpenRelease: () => void
  onDownload: () => void
  onDismiss: () => void
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({
  info, currentVersion, onOpenRelease, onDownload, onDismiss,
}) => {
  if (!info) return null
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
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 900,
      background: `linear-gradient(90deg, ${tokens.colors.warning}, ${tokens.colors.warningHover})`,
      padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: tokens.spacing.md,
      boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
    }}>
      <WarningCircle size={20} color="#fff" weight="fill" />
      <div style={{ flex: 1, color: '#fff', fontSize: tokens.font.size.md, fontWeight: tokens.font.weight.semibold }}>
        Nuova versione <strong>v{info.version}</strong> disponibile
        {currentVersion && (
          <span style={{ fontWeight: tokens.font.weight.normal, opacity: 0.85 }}>
            &nbsp;(attuale v{currentVersion})
          </span>
        )}
      </div>
      {info.notes && (
        <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: tokens.font.size.sm, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {info.notes}
        </div>
      )}
      <GlassButton size="sm" onClick={onOpenRelease}
        style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', boxShadow: 'none' }}>
        <ArrowSquareOut size={16} weight="fill" />
        Apri pagina release
      </GlassButton>
      <GlassButton size="sm" onClick={handleDownload} disabled={downloading}
        style={{ background: '#10B981', color: '#fff', border: 'none', boxShadow: 'none' }}>
        {downloading ? (
          <>
            <DownloadSimple size={16} weight="fill" style={{ animation: 'spin 1s linear infinite' }} />
            Scaricamento...
          </>
        ) : (
          <>
            <DownloadSimple size={16} weight="fill" />
            Scarica ora
          </>
        )}
      </GlassButton>
      <button
        onClick={onDismiss}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.9)', padding: 4,
          display: 'flex', borderRadius: tokens.radius.sm,
        }}
      >
        <X size={20} />
      </button>
      <style jsx>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}