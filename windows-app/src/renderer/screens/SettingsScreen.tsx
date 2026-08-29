import React, { useEffect, useState } from 'react'
import { tokens } from '../theme/tokens'
import { GlassCard } from '../components/GlassCard'
import { GlassButton } from '../components/GlassButton'
import { Badge } from '../components/Badge'
import { getApiUrl, setApiUrl, resetApiUrl, isUsingCustomUrl, api } from '../api'
import { toast } from '../components/Toast'
import { Cloud, PencilSimple, ArrowClockwise, SignOut, CheckCircle, XCircle, TrashSimple, FileX, Clock, Warning, Tag, Plus } from '@phosphor-icons/react'
import { useCategories, Category } from '../services/useCategories'

interface SettingsScreenProps {
  onLogout: () => void
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onLogout }) => {
  const [workerUrl, setWorkerUrlState] = useState(getApiUrl())
  const [editingUrl, setEditingUrl] = useState(false)
  const [newUrl, setNewUrl] = useState(workerUrl)
  const [connected, setConnected] = useState(false)

  // Purge state
  const [autoPurge, setAutoPurge] = useState(false)
  const [purgeDays, setPurgeDays] = useState('90')
  const [purgeHistory, setPurgeHistory] = useState<any[]>([])
  const [eligibleOrders, setEligibleOrders] = useState<any[]>([])
  const [showEligible, setShowEligible] = useState(false)
  const [purging, setPurging] = useState(false)
  const [purgeMessage, setPurgeMessage] = useState('')
  const [purgeError, setPurgeError] = useState('')

  // Categories state (admin)
  const [catList, setCatList] = useState<Category[]>([])
  const [catNew, setCatNew] = useState('')
  const [catEditingId, setCatEditingId] = useState<number | null>(null)
  const [catEditingName, setCatEditingName] = useState('')
  const [catMessage, setCatMessage] = useState('')
  const [catError, setCatError] = useState('')
  const { refresh } = useCategories()

  const showCatMessage = (msg: string) => {
    setCatMessage(msg)
    setTimeout(() => setCatMessage(''), 3000)
  }
  const showCatError = (msg: string) => {
    setCatError(msg)
    setTimeout(() => setCatError(''), 5000)
  }

  const loadCategories = async () => {
    const res = await api.categories.list()
    if (res.success && Array.isArray(res.data)) {
      setCatList(res.data as Category[])
    }
  }

  const handleAddCategory = async () => {
    const name = catNew.trim()
    if (!name) return
    const res = await api.categories.create(name)
    if (res.success) {
      setCatNew('')
      showCatMessage('Categoria aggiunta')
    } else {
      showCatError(res.error || 'Errore')
    }
    await loadCategories()
    await refresh()
  }

  const handleRenameCategory = async (id: number) => {
    const name = catEditingName.trim()
    if (!name) { setCatEditingId(null); return }
    const res = await api.categories.rename(id, name)
    if (res.success) {
      showCatMessage('Categoria rinominata')
    } else {
      showCatError(res.error || 'Errore')
    }
    setCatEditingId(null)
    await loadCategories()
    await refresh()
  }

  const handleDeleteCategory = async (cat: Category) => {
    const confirmed = window.confirm(`Eliminare la categoria "${cat.name}"?`)
    if (!confirmed) return
    const res = await api.categories.remove(cat.id)
    if (res.success) {
      showCatMessage('Categoria eliminata')
    } else {
      showCatError(res.error || 'Errore')
    }
    await loadCategories()
    await refresh()
  }

  useEffect(() => {
    checkConnection()
    loadPurgeConfig()
    loadPurgeHistory()
    loadCategories()
  }, [workerUrl])

  const checkConnection = async () => {
    const ok = await api.health()
    setConnected(ok)
  }

  const handleResetUrl = () => {
    resetApiUrl()
    setWorkerUrlState(getApiUrl())
    toast.success('URL ripristinato al valore predefinito')
    setTimeout(checkConnection, 100)
  }

  const handleSaveUrl = () => {
    const url = newUrl.replace(/\/+$/, '')
    setApiUrl(url)
    setWorkerUrlState(url)
    setEditingUrl(false)
    checkConnection()
  }

  const loadPurgeConfig = async () => {
    const res = await api.purge.config()
    if (res.success && res.data) {
      setAutoPurge(res.data.auto_purge_enabled === 'true')
      setPurgeDays(res.data.purge_days_threshold || '90')
    }
  }

  const loadPurgeHistory = async () => {
    const res = await api.purge.history()
    if (res.success && res.data) {
      setPurgeHistory(res.data)
    }
  }

  const handleSavePurgeConfig = async () => {
    const res = await api.purge.updateConfig({
      auto_purge_enabled: autoPurge ? 'true' : 'false',
      purge_days_threshold: purgeDays,
    })
    if (res.success) {
      setPurgeMessage('Configurazione salvata')
      setTimeout(() => setPurgeMessage(''), 3000)
    } else {
      setPurgeError(res.error || 'Errore')
      setTimeout(() => setPurgeError(''), 3000)
    }
  }

  const handleCheckEligible = async () => {
    const days = parseInt(purgeDays, 10)
    const res = await api.purge.eligible(days || 90)
    if (res.success && res.data) {
      setEligibleOrders(res.data)
      setShowEligible(true)
    }
  }

  const handleManualPurge = async () => {
    if (eligibleOrders.length === 0) {
      setPurgeError('Nessun ordine da eliminare')
      setTimeout(() => setPurgeError(''), 3000)
      return
    }

    const confirmed = window.confirm(
      `Eliminare definitivamente ${eligibleOrders.length} ordini?\n\n` +
      'Prima verrà generato un file Excel di resoconto nella cartella Documenti.\n' +
      'Questa operazione non può essere annullata.'
    )
    if (!confirmed) return

    setPurging(true)
    setPurgeMessage('')
    setPurgeError('')

    const ids = eligibleOrders.map(o => o.id)
    const res = await api.purge.run(ids)
    setPurging(false)

    if (res.success) {
      setPurgeMessage(`Eliminati ${res.data?.purged_count} ordini. Resoconto salvato.`)
      setEligibleOrders([])
      setShowEligible(false)
      loadPurgeHistory()
      setTimeout(() => setPurgeMessage(''), 5000)
    } else {
      setPurgeError(res.error || 'Errore durante la cancellazione')
      setTimeout(() => setPurgeError(''), 5000)
    }
  }

  const inputS = {
    width: '100%' as const,
    boxSizing: 'border-box' as const,
    background: tokens.colors.surface,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: tokens.radius.md,
    padding: '10px 14px',
    color: tokens.colors.text,
    fontSize: tokens.font.size.md,
    outline: 'none',
  }

  const toggleS = {
    width: 44,
    height: 24,
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer' as const,
    position: 'relative' as const,
    transition: 'background 0.2s',
    background: autoPurge ? tokens.colors.primary : tokens.colors.border,
  }

  const toggleDotS = {
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#fff',
    position: 'absolute' as const,
    top: 3,
    transition: 'left 0.2s',
    left: autoPurge ? 23 : 3,
  }

  const sectionTitle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.semibold,
    marginBottom: tokens.spacing.xs, color: tokens.colors.text,
  }

  const sectionDesc: React.CSSProperties = {
    fontSize: tokens.font.size.sm, color: tokens.colors.textSecondary,
    marginBottom: tokens.spacing.lg,
  }

  return (
    <div style={{ maxWidth: 700, display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>
      <GlassCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: tokens.spacing.lg }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.semibold, color: tokens.colors.text }}>
              <Cloud size={20} color={tokens.colors.primary} />
              Cloudflare Worker
            </div>
            <div style={{ fontSize: tokens.font.size.sm, color: tokens.colors.textSecondary, marginTop: 2 }}>
              API endpoint per la sincronizzazione dei dati
            </div>
          </div>
          <Badge variant={connected ? 'success' : 'danger'}
            label={connected ? 'Connesso' : 'Offline'} />
        </div>

        {!editingUrl ? (
          <div>
            <div style={{
              fontSize: tokens.font.size.sm, color: tokens.colors.textSecondary,
              marginBottom: tokens.spacing.md, wordBreak: 'break-all',
            }}>
              {workerUrl}
            </div>
            {!connected && (
              <div style={{
                fontSize: tokens.font.size.sm, color: tokens.colors.warning,
                background: 'rgba(217,119,6,0.08)', border: `1px solid ${tokens.colors.warning}`,
                borderRadius: tokens.radius.md, padding: tokens.spacing.sm,
                marginBottom: tokens.spacing.md, lineHeight: 1.5,
              }}>
                Il server non risponde. Se hai modificato l&apos;URL in passato (es. un tunnel
                temporaneo), ripristina quello predefinito con il pulsante qui sotto.
              </div>
            )}
            <div style={{ display: 'flex', gap: tokens.spacing.sm }}>
              <GlassButton variant="outline" size="sm"
                onClick={() => { setNewUrl(workerUrl); setEditingUrl(true) }}>
                <PencilSimple size={14} />
                Modifica URL
              </GlassButton>
              <GlassButton variant="outline" size="sm" onClick={checkConnection}>
                <ArrowClockwise size={14} />
                Test
              </GlassButton>
              {isUsingCustomUrl() && (
                <GlassButton variant="danger" size="sm" onClick={handleResetUrl}>
                  Ripristina URL predefinito
                </GlassButton>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
            <input placeholder="https://ordini-elly-worker.workers.dev" value={newUrl}
              onChange={e => setNewUrl(e.target.value)} style={inputS} />
            <div style={{ display: 'flex', gap: tokens.spacing.sm }}>
              <GlassButton size="sm" onClick={handleSaveUrl}>
                <CheckCircle size={14} weight="bold" />
                Salva
              </GlassButton>
              <GlassButton variant="outline" size="sm" onClick={() => setEditingUrl(false)}>
                <XCircle size={14} />
                Annulla
              </GlassButton>
            </div>
          </div>
        )}
      </GlassCard>

      <GlassCard>
        <div style={sectionTitle}>
          <TrashSimple size={20} color={tokens.colors.danger} />
          Cancellazione Ordini
        </div>
        <div style={sectionDesc}>
          Elimina ordini vecchi con resoconto automatico in Excel. Il file viene salvato in Documenti &rarr; Ordini Elly Edition &rarr; Resoconti.
        </div>

        {/* Auto-purge toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: tokens.spacing.md, paddingBottom: tokens.spacing.md,
          borderBottom: `1px solid ${tokens.colors.border}`,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: tokens.colors.text, fontSize: tokens.font.size.md }}>
              <Clock size={16} />
              Cancellazione automatica
            </div>
            <div style={{ fontSize: tokens.font.size.sm, color: tokens.colors.textSecondary, marginTop: 2 }}>
              Elimina automaticamente gli ordini dopo un certo periodo
            </div>
          </div>
          <button style={toggleS} onClick={() => setAutoPurge(!autoPurge)}>
            <div style={toggleDotS} />
          </button>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: tokens.spacing.md,
          marginBottom: tokens.spacing.md,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: tokens.font.size.sm, color: tokens.colors.textSecondary, marginBottom: 4 }}>
              Elimina ordini più vecchi di (giorni)
            </div>
            <input
              type="number" min="1" max="3650"
              value={purgeDays}
              onChange={e => setPurgeDays(e.target.value)}
              style={{ ...inputS, width: 140 }}
            />
          </div>
          <div style={{ paddingTop: 20 }}>
            <GlassButton size="sm" onClick={handleSavePurgeConfig}>
              <CheckCircle size={14} weight="bold" />
              Salva
            </GlassButton>
          </div>
        </div>

        {purgeMessage && (
          <div style={{
            fontSize: tokens.font.size.sm, color: tokens.colors.accent,
            marginBottom: tokens.spacing.sm,
          }}>
            <CheckCircle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            {purgeMessage}
          </div>
        )}
        {purgeError && (
          <div style={{
            fontSize: tokens.font.size.sm, color: tokens.colors.danger,
            marginBottom: tokens.spacing.sm,
          }}>
            <Warning size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            {purgeError}
          </div>
        )}

        {/* Manual purge */}
        <div style={{
          marginTop: tokens.spacing.md, paddingTop: tokens.spacing.md,
          borderTop: `1px solid ${tokens.colors.border}`,
        }}>
          <GlassButton variant="outline" size="sm" onClick={handleCheckEligible}
            style={{ marginRight: tokens.spacing.sm }}>
            <FileX size={14} />
            Verifica ordini eliminabili
          </GlassButton>
          <GlassButton variant="danger" size="sm" onClick={handleManualPurge}
            disabled={purging || eligibleOrders.length === 0}>
            {purging ? 'Eliminazione...' : (
              <><TrashSimple size={14} /> Elimina {eligibleOrders.length > 0 ? `(${eligibleOrders.length})` : ''}</>
            )}
          </GlassButton>
        </div>

        {/* Eligible orders list */}
        {showEligible && eligibleOrders.length > 0 && (
          <div style={{ marginTop: tokens.spacing.md }}>
            <div style={{ fontSize: tokens.font.size.sm, color: tokens.colors.textSecondary, marginBottom: tokens.spacing.sm }}>
              Ordini eliminabili ({eligibleOrders.length}):
            </div>
            <div style={{ maxHeight: 200, overflow: 'auto' }}>
              {eligibleOrders.map(o => (
                <div key={o.id} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '6px 10px', fontSize: tokens.font.size.sm,
                  color: tokens.colors.textSecondary,
                  borderBottom: `1px solid ${tokens.colors.border}`,
                }}>
                  <span>#{o.id} - {o.business_name}</span>
                  <span>{new Date(o.created_at).toLocaleDateString('it-IT')} - &euro;{Number(o.total).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {showEligible && eligibleOrders.length === 0 && (
          <div style={{ marginTop: tokens.spacing.sm, fontSize: tokens.font.size.sm, color: tokens.colors.textSecondary }}>
            Nessun ordine da eliminare nel periodo selezionato.
          </div>
        )}

        {/* Purge history */}
        {purgeHistory.length > 0 && (
          <div style={{ marginTop: tokens.spacing.lg }}>
            <div style={{ fontSize: tokens.font.size.sm, color: tokens.colors.textSecondary, marginBottom: tokens.spacing.sm, fontWeight: tokens.font.weight.semibold }}>
              Cronologia cancellazioni:
            </div>
            {purgeHistory.map(h => (
              <div key={h.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 10px', fontSize: tokens.font.size.sm,
                color: tokens.colors.textSecondary,
                borderBottom: `1px solid ${tokens.colors.border}`,
              }}>
                <div>
                  <Badge variant={h.status === 'completed' ? 'success' : h.status === 'failed' ? 'danger' : 'warning'}
                    label={h.status === 'completed' ? 'OK' : h.status === 'failed' ? 'ERR' : '...'} />
                  <span style={{ marginLeft: 8 }}>
                    {h.purged_orders || h.total_orders} ordini
                  </span>
                  {h.exported_file && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: tokens.colors.textMuted }}>
                      {h.exported_file.split('/').pop()}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 11 }}>
                  {new Date(h.created_at + 'Z').toLocaleString('it-IT')}
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <GlassCard>
        <div style={sectionTitle}>
          <Tag size={20} color={tokens.colors.primary} />
          Categorie Prodotti
        </div>
        <div style={sectionDesc}>
          Rinomina, aggiungi o elimina le categorie del catalogo. La modifica si applica anche ai prodotti e alle provvigioni già associate.
        </div>

        <div style={{ display: 'flex', gap: tokens.spacing.sm, marginBottom: tokens.spacing.md }}>
          <input placeholder="Nuova categoria (es. Amari)" value={catNew}
            onChange={e => setCatNew(e.target.value)} style={inputS}
            onKeyDown={e => { if (e.key === 'Enter') handleAddCategory() }} />
          <GlassButton size="sm" onClick={handleAddCategory} disabled={!catNew.trim()}>
            <Plus size={14} weight="bold" />
            Aggiungi
          </GlassButton>
        </div>

        {catList.length === 0 ? (
          <div style={{ fontSize: tokens.font.size.sm, color: tokens.colors.textSecondary }}>
            Nessuna categoria.
          </div>
        ) : (
          <div>
            {catList.map(cat => (
              <div key={cat.id} style={{
                display: 'flex', alignItems: 'center', gap: tokens.spacing.sm,
                padding: '8px 10px', borderBottom: `1px solid ${tokens.colors.border}`,
              }}>
                {catEditingId === cat.id ? (
                  <>
                    <input value={catEditingName}
                      onChange={e => setCatEditingName(e.target.value)} style={inputS}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRenameCategory(cat.id)
                        if (e.key === 'Escape') setCatEditingId(null)
                      }} />
                    <GlassButton size="sm" onClick={() => handleRenameCategory(cat.id)}>
                      <CheckCircle size={14} weight="bold" />
                    </GlassButton>
                    <GlassButton variant="outline" size="sm" onClick={() => setCatEditingId(null)}>
                      <XCircle size={14} />
                    </GlassButton>
                  </>
                ) : (
                  <>
                    <div style={{ flex: 1, color: tokens.colors.text, fontSize: tokens.font.size.md }}>
                      {cat.name}
                    </div>
                    <GlassButton variant="outline" size="sm"
                      onClick={() => { setCatEditingId(cat.id); setCatEditingName(cat.name) }}>
                      <PencilSimple size={14} />
                    </GlassButton>
                    <GlassButton variant="danger" size="sm" onClick={() => handleDeleteCategory(cat)}>
                      <TrashSimple size={14} />
                    </GlassButton>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {catMessage && (
          <div style={{ fontSize: tokens.font.size.sm, color: tokens.colors.accent, marginTop: tokens.spacing.sm }}>
            <CheckCircle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            {catMessage}
          </div>
        )}
        {catError && (
          <div style={{ fontSize: tokens.font.size.sm, color: tokens.colors.danger, marginTop: tokens.spacing.sm }}>
            <Warning size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            {catError}
          </div>
        )}
      </GlassCard>

      <GlassCard>
        <div style={sectionTitle}>
          Account
        </div>
        <div style={sectionDesc}>
          Gestisci la tua sessione
        </div>
        <GlassButton variant="danger" size="sm" onClick={onLogout}>
          <SignOut size={16} weight="bold" />
          Esci
        </GlassButton>
      </GlassCard>
    </div>
  )
}
