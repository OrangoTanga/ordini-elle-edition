import React from 'react'
import { tokens } from '../theme/tokens'
import { GlassButton } from './GlassButton'
import { WarningCircle, DownloadSimple, X } from '@phosphor-icons/react'
import type { AppVersionInfo } from '../services/useUpdateChecker'

interface UpdateBannerProps {
  info: AppVersionInfo
  currentVersion: string
  downloading: boolean
  error: string
  onUpdateNow: () => void
  onDismiss: () => void
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({
  info, currentVersion, downloading, error, onUpdateNow, onDismiss,
}) => {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 900,
      background: `linear-gradient(90deg, ${tokens.colors.warning}, ${tokens.colors.warningHover})`,
      padding: '10px 16px',
      display: 'flex', alignItems: 'center', gap: tokens.spacing.md,
      boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
    }}>
      <WarningCircle size={20} color="#fff" weight="fill" />
      <div style={{ flex: 1, color: '#fff', fontSize: tokens.font.size.md, fontWeight: tokens.font.weight.semibold }}>
        Nuova versione {info.version} disponibile
        {currentVersion && (
          <span style={{ fontWeight: tokens.font.weight.normal, opacity: 0.85 }}>
            &nbsp;(hai la v{currentVersion})
          </span>
        )}
      </div>
      {info.notes && (
        <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: tokens.font.size.sm, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {info.notes}
        </div>
      )}
      {error && (
        <div style={{ color: '#fff', fontSize: tokens.font.size.sm, fontWeight: tokens.font.weight.bold }}>
          {error}
        </div>
      )}
      <GlassButton size="sm" onClick={onUpdateNow} disabled={downloading}
        style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', boxShadow: 'none' }}>
        {downloading ? 'Avvio download...' : (<><DownloadSimple size={16} weight="fill" /> Aggiorna ora</>)}
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
    </div>
  )
}