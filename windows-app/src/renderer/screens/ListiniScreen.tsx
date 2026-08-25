import React, { useEffect, useState } from 'react'
import { tokens } from '../theme/tokens'
import { GlassCard } from '../components/GlassCard'
import { GlassButton } from '../components/GlassButton'
import { Badge } from '../components/Badge'
import { api } from '../api'
import { validateListino, showValidationError } from '../validation'
import {
  CurrencyDollar, PencilSimple, TrashSimple, WarningCircle,
  GearSix, Plus, FloppyDisk,
} from '@phosphor-icons/react'

export const ListiniScreen: React.FC = () => {
  const [listini, setListini] = useState<any[]>([])
  const [selectedListino, setSelectedListino] = useState<any>(null)
  const [exceptions, setExceptions] = useState<any[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [editForm, setEditForm] = useState({ name: '', commission_percent: '', sort_order: '' })
  const [exceptionForm, setExceptionForm] = useState({ category: '', commission_percent: '', listino_id: '' })
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({})

  useEffect(() => {
    api.listini.list().then(r => { if (r.success) setListini(r.data || []) })
    api.commissionExceptions.list().then(r => { if (r.success) setExceptions(r.data || []) })
    api.settings.get().then(r => { if (r.success && r.data) { setSettings(r.data); setSettingsForm(r.data) } })
  }, [])

  const openEdit = (l: any) => {
    setSelectedListino(l)
    setEditForm({
      name: l.name,
      commission_percent: String(l.commission_percent),
      sort_order: String(l.sort_order || 0),
    })
  }

  const handleSaveListino = async () => {
    if (!selectedListino) return
    if (showValidationError(validateListino({ name: editForm.name, commission_percent: editForm.commission_percent }))) return
    await api.listini.update(selectedListino.id, {
      name: editForm.name,
      commission_percent: parseFloat(editForm.commission_percent),
      sort_order: parseInt(editForm.sort_order) || 0,
    })
    const r = await api.listini.list()
    if (r.success) setListini(r.data || [])
    setSelectedListino(null)
  }

  const handleSaveException = async (exc: any) => {
    if (exc.id) {
      await api.commissionExceptions.update(exc.id, {
        commission_percent: parseFloat(exc.commission_percent),
      })
    } else {
      await api.commissionExceptions.create({
        listino_id: parseInt(exceptionForm.listino_id),
        category: exceptionForm.category,
        commission_percent: parseFloat(exceptionForm.commission_percent),
      })
      setExceptionForm({ category: '', commission_percent: '', listino_id: '' })
    }
    const r = await api.commissionExceptions.list()
    if (r.success) setExceptions(r.data || [])
  }

  const handleDeleteException = async (id: number) => {
    await api.commissionExceptions.delete(id)
    const r = await api.commissionExceptions.list()
    if (r.success) setExceptions(r.data || [])
  }

  const handleSaveSettings = async () => {
    await api.settings.update(settingsForm)
    const r = await api.settings.get()
    if (r.success && r.data) { setSettings(r.data); setSettingsForm(r.data) }
  }

  const inputS = {
    background: tokens.colors.surface,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: tokens.radius.md,
    padding: '10px 14px',
    color: tokens.colors.text,
    fontSize: tokens.font.size.md,
    outline: 'none',
    width: '100%' as const,
    boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>
        <GlassCard>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.semibold,
            marginBottom: tokens.spacing.lg, color: tokens.colors.text,
          }}>
            <CurrencyDollar size={20} color={tokens.colors.accent} weight="fill" />
            Listini e Commissioni
          </div>
          {listini.length === 0 ? (
            <div style={{ color: tokens.colors.textMuted, fontSize: tokens.font.size.sm, textAlign: 'center', padding: tokens.spacing.xl }}>
              Nessun listino configurato
            </div>
          ) : (
            listini.map(l => (
              <div key={l.id} style={{
                padding: `${tokens.spacing.md} 0`,
                borderBottom: `1px solid ${tokens.colors.border}`,
                cursor: 'pointer', transition: tokens.transition.normal,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }} onClick={() => openEdit(l)}>
                <div>
                  <div style={{ fontWeight: tokens.font.weight.semibold, fontSize: tokens.font.size.md, color: tokens.colors.text }}>
                    {l.name}
                  </div>
                  <div style={{ fontSize: tokens.font.size.sm, color: tokens.colors.textMuted, marginTop: 2 }}>
                    Commissione: {l.commission_percent}%
                  </div>
                </div>
                <PencilSimple size={16} color={tokens.colors.textMuted} />
              </div>
            ))
          )}
        </GlassCard>

        {selectedListino && (
          <GlassCard>
            <div style={{
              fontSize: tokens.font.size.md, fontWeight: tokens.font.weight.semibold,
              marginBottom: tokens.spacing.md, color: tokens.colors.text,
            }}>
              Modifica {selectedListino.name}
            </div>
            <div style={{ display: 'grid', gap: tokens.spacing.md }}>
              <div>
                <label style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textMuted, marginBottom: 4, display: 'block' }}>
                  Nome
                </label>
                <input value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={inputS} />
              </div>
              <div>
                <label style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textMuted, marginBottom: 4, display: 'block' }}>
                  Commissione %
                </label>
                <input type="number" step="0.1" value={editForm.commission_percent}
                  onChange={e => setEditForm({ ...editForm, commission_percent: e.target.value })} style={inputS} />
              </div>
              <div>
                <label style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textMuted, marginBottom: 4, display: 'block' }}>
                  Ordine
                </label>
                <input type="number" value={editForm.sort_order}
                  onChange={e => setEditForm({ ...editForm, sort_order: e.target.value })} style={inputS} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: tokens.spacing.lg }}>
              <GlassButton variant="outline" onClick={() => setSelectedListino(null)}>Annulla</GlassButton>
              <GlassButton onClick={handleSaveListino}>
                <FloppyDisk size={16} />
                Salva
              </GlassButton>
            </div>
          </GlassCard>
        )}
      </div>

      <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>
        <GlassCard>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.semibold,
            marginBottom: tokens.spacing.lg, color: tokens.colors.text,
          }}>
            <WarningCircle size={20} color={tokens.colors.warning} weight="fill" />
            Eccezioni Commissioni
          </div>
          {exceptions.length === 0 ? (
            <div style={{ color: tokens.colors.textMuted, fontSize: tokens.font.size.sm, textAlign: 'center', padding: tokens.spacing.xl }}>
              Nessuna eccezione configurata
            </div>
          ) : (
            exceptions.map(exc => (
              <div key={exc.id} style={{
                display: 'flex', alignItems: 'center', gap: tokens.spacing.md,
                padding: `${tokens.spacing.sm} 0`,
                borderBottom: `1px solid ${tokens.colors.border}`,
              }}>
                <div style={{ flex: 1, fontSize: tokens.font.size.sm, color: tokens.colors.text }}>
                  <span style={{ fontWeight: 500 }}>{exc.listino_name}</span>
                  <span style={{ color: tokens.colors.textMuted, margin: '0 8px' }}>→</span>
                  <span>{exc.category}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="number" step="0.1"
                    value={exc.commission_percent}
                    onChange={e => handleSaveException({ ...exc, commission_percent: e.target.value })}
                    style={{ ...inputS, width: 70, padding: '4px 8px' }} />
                  <span style={{ fontSize: tokens.font.size.sm, color: tokens.colors.textMuted }}>%</span>
                  <GlassButton variant="danger" size="sm" onClick={() => handleDeleteException(exc.id)}>
                    <TrashSimple size={14} />
                  </GlassButton>
                </div>
              </div>
            ))
          )}

          <div style={{
            borderTop: `1px solid ${tokens.colors.border}`,
            marginTop: tokens.spacing.md, paddingTop: tokens.spacing.md,
          }}>
            <div style={{ fontSize: tokens.font.size.sm, fontWeight: tokens.font.weight.semibold, marginBottom: 8, color: tokens.colors.text }}>
              Nuova eccezione
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select value={exceptionForm.listino_id}
                onChange={e => setExceptionForm({ ...exceptionForm, listino_id: e.target.value })}
                style={{ ...inputS, flex: 1, minWidth: 120 }}>
                <option value="" style={{ background: tokens.colors.bg }}>Listino</option>
                {listini.map(l => <option key={l.id} value={l.id} style={{ background: tokens.colors.bg }}>{l.name}</option>)}
              </select>
              <select value={exceptionForm.category}
                onChange={e => setExceptionForm({ ...exceptionForm, category: e.target.value })}
                style={{ ...inputS, flex: 1, minWidth: 120 }}>
                <option value="" style={{ background: tokens.colors.bg }}>Categoria</option>
                {['vino bianco', 'vino rosso', 'prosecco', 'birre', 'distillati', 'extra'].map(c =>
                  <option key={c} value={c} style={{ background: tokens.colors.bg }}>{c}</option>
                )}
              </select>
              <input type="number" step="0.1" placeholder="%" value={exceptionForm.commission_percent}
                onChange={e => setExceptionForm({ ...exceptionForm, commission_percent: e.target.value })}
                style={{ ...inputS, width: 80 }} />
              <GlassButton size="sm" onClick={() => handleSaveException({})}>
                <Plus size={14} weight="bold" />
              </GlassButton>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.semibold,
            marginBottom: tokens.spacing.lg, color: tokens.colors.text,
          }}>
            <GearSix size={20} color={tokens.colors.primary} />
            Impostazioni Globali
          </div>
          <div style={{ display: 'grid', gap: tokens.spacing.md }}>
            <div>
              <label style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textMuted, marginBottom: 4, display: 'block' }}>
                Strategia omaggi
              </label>
              <textarea value={settingsForm.gift_strategy || ''}
                onChange={e => setSettingsForm({ ...settingsForm, gift_strategy: e.target.value })}
                rows={3} style={{ ...inputS, resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: tokens.spacing.lg }}>
            <GlassButton onClick={handleSaveSettings}>
              <FloppyDisk size={16} />
              Salva impostazioni
            </GlassButton>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
