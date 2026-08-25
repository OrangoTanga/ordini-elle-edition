import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { tokens } from '../theme/tokens'
import { GlassCard } from '../components/GlassCard'
import { GlassButton } from '../components/GlassButton'
import { Modal } from '../components/Modal'
import { Badge } from '../components/Badge'
import { api } from '../api'
import { useCategories } from '../services/useCategories'
import {
  MagnifyingGlass, Funnel, Calculator, CheckCircle, ArrowCounterClockwise,
  PencilSimple, TrashSimple, SealCheck, SealWarning, FloppyDisk,
} from '@phosphor-icons/react'

interface ProvvigioniScreenProps {}

const thStyle: React.CSSProperties = {
  padding: '12px 10px', fontSize: tokens.font.size.xs, fontWeight: tokens.font.weight.semibold,
  textTransform: 'uppercase', letterSpacing: 0.5,
  color: tokens.colors.textMuted,
  borderBottom: `1px solid ${tokens.colors.border}`,
  textAlign: 'left', whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '10px', fontSize: tokens.font.size.sm, color: tokens.colors.textSecondary,
  borderBottom: `1px solid ${tokens.colors.border}40`, whiteSpace: 'nowrap',
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

const fmt = (v: number) => {
  const s = v.toFixed(2)
  return s.replace(/\.?0+$/, '') + '%'
}

export const ProvvigioniScreen: React.FC<ProvvigioniScreenProps> = () => {
  const [products, setProducts] = useState<any[]>([])
  const [listini, setListini] = useState<any[]>([])
  const [overridesMap, setOverridesMap] = useState<Record<number, any[]>>({})
  const [exceptions, setExceptions] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [listinoFilter, setListinoFilter] = useState('')
  const { categories } = useCategories()
  const [editingProductId, setEditingProductId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Record<number, string>>({})
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pendingSuggestions, setPendingSuggestions] = useState<{
    mode: 'edit' | 'selected' | 'bulk'
    items: Array<{ productId: number; productName: string; listinoId: number; suggested: number }>
  } | null>(null)

  const sortedListini = useMemo(
    () => [...listini].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [listini]
  )
  const baseListino = sortedListini[0]

  const getPriceForListino = useCallback((product: any, listinoId: number): number | null => {
    const lp = product.listino_prices || []
    const found = lp.find((x: any) => x.listino_id === listinoId)
    return found?.price ?? null
  }, [])

  const getEffectiveBaseCommission = useCallback((product: any): number => {
    if (!baseListino) return 0
    const ovs = overridesMap[product.id] || []
    const baseOverride = ovs.find((o: any) => o.listino_id === baseListino.id)
    if (baseOverride) return baseOverride.commission_percent
    const baseExc = exceptions.find(
      (e: any) => e.category === product.category && e.listino_id === baseListino.id
    )
    if (baseExc) return baseExc.commission_percent
    return baseListino.commission_percent
  }, [overridesMap, exceptions, baseListino])

  const getCommission = useCallback((product: any, listino: any) => {
    const ovs = overridesMap[product.id] || []
    const override = ovs.find((o: any) => o.listino_id === listino.id)
    if (override) return { value: override.commission_percent, badge: 'override' as const }

    const exc = exceptions.find(
      (e: any) => e.category === product.category && e.listino_id === listino.id
    )
    if (exc) return { value: exc.commission_percent, badge: 'exception' as const }

    const fallback = baseListino && listino.id === baseListino.id
      ? getEffectiveBaseCommission(product)
      : listino.commission_percent
    return { value: fallback, badge: null }
  }, [overridesMap, exceptions, baseListino, getEffectiveBaseCommission])

  const loadData = useCallback(async () => {
    setLoading(true)
    const [prodRes, listRes, excRes] = await Promise.all([
      api.products.list(),
      api.listini.list(),
      api.commissionExceptions.list(),
    ])

    const prods = prodRes.success ? prodRes.data || [] : []
    if (prodRes.success && prods.length > 0) {
      const map: Record<number, any[]> = {}
      await Promise.all(prods.map(async (p: any) => {
        const r = await api.productCommissionOverrides.list(p.id)
        if (r.success) map[p.id] = r.data || []
      }))
      setOverridesMap(map)
    }

    setProducts(prods)
    setListini(listRes.success ? listRes.data || [] : [])
    setExceptions(excRes.success ? excRes.data || [] : [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const refreshOverrides = useCallback(async () => {
    if (products.length === 0) return
    const map: Record<number, any[]> = {}
    await Promise.all(products.map(async (p: any) => {
      const r = await api.productCommissionOverrides.list(p.id)
      if (r.success) map[p.id] = r.data || []
    }))
    setOverridesMap(map)
  }, [products])

  const filteredProducts = useMemo(() =>
    products.filter(p => {
      if (search && !p.name?.toLowerCase().includes(search.toLowerCase())) return false
      if (catFilter && p.category !== catFilter) return false
      if (listinoFilter) {
        const listino = sortedListini.find(l => l.id === parseInt(listinoFilter))
        if (listino) {
          const { badge } = getCommission(p, listino)
          if (!badge) return false
        }
      }
      return true
    }),
    [products, search, catFilter, listinoFilter, sortedListini, getCommission]
  )

  const allSelected = filteredProducts.length > 0 && selectedIds.size === filteredProducts.length

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(filteredProducts.map(p => p.id)))
  }

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const openEdit = (product: any) => {
    setEditingProductId(product.id)
    const form: Record<number, string> = {}
    const ovs = overridesMap[product.id] || []
    ovs.forEach((o: any) => { form[o.listino_id] = String(o.commission_percent) })
    setEditForm(form)
  }

  const closeEdit = () => {
    setEditingProductId(null)
    setEditForm({})
  }

  const handleSaveEdit = async () => {
    if (!editingProductId) return
    setSaving(true)
    const overrides = Object.entries(editForm)
      .filter(([, v]) => v !== '')
      .map(([listinoId, value]) => ({
        listino_id: parseInt(listinoId),
        commission_percent: parseFloat(value),
      }))
    if (overrides.length > 0) {
      await api.productCommissionOverrides.update(editingProductId, overrides)
    } else {
      await api.productCommissionOverrides.delete(editingProductId)
    }
    setSaving(false)
    closeEdit()
    await refreshOverrides()
  }

  const handleDeleteOverride = async () => {
    if (!editingProductId) return
    setSaving(true)
    await api.productCommissionOverrides.delete(editingProductId)
    setEditForm({})
    setSaving(false)
    await refreshOverrides()
  }

  const handleAutoCalcInEdit = async () => {
    if (!editingProductId) return
    const r = await api.productCommissionOverrides.autoCalculate(editingProductId)
    if (r.success && r.data?.suggestions) {
      const form = { ...editForm }
      r.data.suggestions.forEach((s: any) => {
        if (!s.has_override) form[s.listino_id] = String(s.suggested_commission)
      })
      setEditForm(form)
    }
  }

  const handleAutoCalcSelected = async () => {
    if (selectedIds.size === 0) return
    const items: Array<{ productId: number; productName: string; listinoId: number; suggested: number }> = []
    for (const pid of selectedIds) {
      const r = await api.productCommissionOverrides.autoCalculate(pid)
      if (r.success && r.data?.suggestions) {
        const prod = products.find(p => p.id === pid)
        r.data.suggestions.forEach((s: any) => {
          if (!s.has_override) {
            items.push({
              productId: pid,
              productName: prod?.name || `#${pid}`,
              listinoId: s.listino_id,
              suggested: s.suggested_commission,
            })
          }
        })
      }
    }
    if (items.length > 0) setPendingSuggestions({ mode: 'selected', items })
  }

  const handleAutoCalcAll = async () => {
    const items: Array<{ productId: number; productName: string; listinoId: number; suggested: number }> = []
    const toCalc = products.filter(p => {
      const ovs = overridesMap[p.id] || []
      return ovs.length === 0
    })
    for (const p of toCalc) {
      const r = await api.productCommissionOverrides.autoCalculate(p.id)
      if (r.success && r.data?.suggestions) {
        r.data.suggestions.forEach((s: any) => {
          if (!s.has_override) {
            items.push({
              productId: p.id,
              productName: p.name,
              listinoId: s.listino_id,
              suggested: s.suggested_commission,
            })
          }
        })
      }
    }
    if (items.length > 0) setPendingSuggestions({ mode: 'bulk', items })
  }

  const confirmSuggestions = async () => {
    if (!pendingSuggestions) return
    setSaving(true)
    const grouped: Record<number, Array<{ listino_id: number; commission_percent: number }>> = {}
    pendingSuggestions.items.forEach(item => {
      if (!grouped[item.productId]) grouped[item.productId] = []
      grouped[item.productId].push({ listino_id: item.listinoId, commission_percent: item.suggested })
    })
    await Promise.all(
      Object.entries(grouped).map(([pid, ovs]) =>
        api.productCommissionOverrides.update(parseInt(pid), ovs)
      )
    )
    setPendingSuggestions(null)
    setSaving(false)
    await refreshOverrides()
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <div style={{ color: tokens.colors.textMuted, fontSize: tokens.font.size.md }}>Caricamento...</div>
      </div>
    )
  }

  const editingProduct = editingProductId ? products.find(p => p.id === editingProductId) : null

  return (
    <div>
      <div style={{
        fontSize: tokens.font.size.xxl, fontWeight: tokens.font.weight.bold,
        marginBottom: tokens.spacing.xl, letterSpacing: 0.5, color: tokens.colors.text,
      }}>
        PROVVIGIONI PER PRODOTTO
      </div>

      <div style={{ display: 'flex', gap: tokens.spacing.md, marginBottom: tokens.spacing.lg, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: tokens.spacing.sm, flexWrap: 'wrap', flex: 1, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: tokens.colors.surface, borderRadius: tokens.radius.md, border: `1px solid ${tokens.colors.border}`, padding: '0 12px', flex: '0 0 180px' }}>
            <Funnel size={14} color={tokens.colors.textMuted} />
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
              style={{ ...inputS, border: 'none', padding: '8px 0', background: 'none' }}>
              <option value="" style={{ background: tokens.colors.bg }}>Tutte categorie</option>
              {categories.map(c => <option key={c} value={c} style={{ background: tokens.colors.bg }}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: tokens.colors.surface, borderRadius: tokens.radius.md, border: `1px solid ${tokens.colors.border}`, padding: '0 12px', flex: '0 0 160px' }}>
            <Funnel size={14} color={tokens.colors.textMuted} />
            <select value={listinoFilter} onChange={e => setListinoFilter(e.target.value)}
              style={{ ...inputS, border: 'none', padding: '8px 0', background: 'none' }}>
              <option value="" style={{ background: tokens.colors.bg }}>Tutti listini</option>
              {sortedListini.map(l => (
                <option key={l.id} value={l.id} style={{ background: tokens.colors.bg }}>{l.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: tokens.colors.surface, borderRadius: tokens.radius.md, border: `1px solid ${tokens.colors.border}`, padding: '0 12px', flex: '0 0 200px' }}>
            <MagnifyingGlass size={14} color={tokens.colors.textMuted} />
            <input placeholder="Cerca prodotto..." value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...inputS, border: 'none', padding: '8px 0', background: 'none' }} />
          </div>
        </div>
        <GlassButton variant="outline" size="sm" disabled={selectedIds.size === 0}
          onClick={handleAutoCalcSelected}>
          <Calculator size={14} />
          Auto-calcola selezionati
        </GlassButton>
        <GlassButton variant="outline" size="sm" onClick={handleAutoCalcAll}>
          <Calculator size={14} />
          Calcola tutti i suggerimenti
        </GlassButton>
      </div>

      <GlassCard style={{ padding: 0, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 36 }}>
                <input type="checkbox" checked={allSelected}
                  onChange={toggleSelectAll} style={{ transform: 'scale(1.1)' }} />
              </th>
              <th style={thStyle}>Prodotto</th>
              <th style={thStyle}>Categoria</th>
              {sortedListini.map(l => (
                <th key={`c-${l.id}`} style={thStyle}>{l.name}%</th>
              ))}
              {sortedListini.map(l => (
                <th key={`p-${l.id}`} style={thStyle}>Prezzo {l.name}</th>
              ))}
              <th style={thStyle}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={3 + sortedListini.length * 2} style={{ textAlign: 'center', padding: 48, color: tokens.colors.textMuted, fontSize: tokens.font.size.md }}>
                  Nessun prodotto trovato
                </td>
              </tr>
            ) : (
              filteredProducts.map((product, i) => (
                <tr key={product.id}
                  style={{
                    background: i % 2 === 0 ? 'transparent' : `${tokens.colors.surface}80`,
                    transition: tokens.transition.normal,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${tokens.colors.primary}0a` }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background =
                      i % 2 === 0 ? 'transparent' : `${tokens.colors.surface}80`
                  }}
                >
                  <td style={tdStyle}>
                    <input type="checkbox" checked={selectedIds.has(product.id)}
                      onChange={() => toggleSelect(product.id)} style={{ transform: 'scale(1.1)' }} />
                  </td>
                  <td style={{ ...tdStyle, fontWeight: tokens.font.weight.semibold, color: tokens.colors.text }}>{product.name}</td>
                  <td style={tdStyle}>{product.category || '—'}</td>
                  {sortedListini.map(l => {
                    const { value, badge } = getCommission(product, l)
                    return (
                      <td key={`c-${l.id}-${product.id}`} style={tdStyle}>
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(value)}</span>
                        {badge && (
                          <span style={{ marginLeft: 4, verticalAlign: 'middle' }}>
                            {badge === 'override'
                              ? <PencilSimple size={12} color={tokens.colors.accent} weight="fill" />
                              : <SealWarning size={12} color={tokens.colors.warning} weight="fill" />
                            }
                          </span>
                        )}
                      </td>
                    )
                  })}
                  {sortedListini.map(l => {
                    const price = getPriceForListino(product, l.id)
                    return (
                      <td key={`p-${l.id}-${product.id}`} style={tdStyle}>
                        {price != null ? `€${price.toFixed(2)}` : '—'}
                      </td>
                    )
                  })}
                  <td style={tdStyle}>
                    <GlassButton variant="outline" size="sm" onClick={() => openEdit(product)}>
                      Modifica
                    </GlassButton>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </GlassCard>

      <Modal open={!!editingProduct} onClose={closeEdit}
        title={editingProduct ? `Override commissioni — ${editingProduct.name}` : ''}>
        {editingProduct && (
          <>
            <div style={{ display: 'grid', gap: tokens.spacing.md }}>
              {sortedListini.map(l => {
                const { value, badge } = getCommission(editingProduct, l)
                const isOverridden = editForm[l.id] !== undefined && editForm[l.id] !== ''
                return (
                  <div key={l.id}>
                    <label style={{
                      fontSize: tokens.font.size.xs, color: tokens.colors.textMuted,
                      marginBottom: 4, display: 'block',
                    }}>
                      {l.name}
                      {badge && (
                        <span style={{ marginLeft: 4, verticalAlign: 'middle' }}>
                          {badge === 'override'
                            ? <PencilSimple size={12} color={tokens.colors.accent} weight="fill" />
                            : <SealWarning size={12} color={tokens.colors.warning} weight="fill" />
                          }
                        </span>
                      )}
                      <span style={{ marginLeft: 8, color: tokens.colors.textMuted, fontSize: tokens.font.size.xs }}>
                        (corrente: {fmt(value)})
                      </span>
                    </label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="number" step="0.01" placeholder="Auto"
                        value={editForm[l.id] ?? ''}
                        onChange={e => setEditForm(prev => ({ ...prev, [l.id]: e.target.value }))}
                        style={{ ...inputS, width: 120 }} />
                      {isOverridden ? (
                        <span style={{ fontSize: tokens.font.size.xs, color: tokens.colors.accent }}>
                          <PencilSimple size={12} /> override
                        </span>
                      ) : (
                        <span style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textMuted }}>
                          {fmt(value)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: tokens.spacing.lg, flexWrap: 'wrap' }}>
              <GlassButton variant="outline" size="sm" onClick={handleAutoCalcInEdit} disabled={saving}>
                <Calculator size={14} />
                Auto-calcola
              </GlassButton>
              <GlassButton variant="danger" size="sm" onClick={handleDeleteOverride} disabled={saving}>
                <TrashSimple size={14} />
                Rimuovi override
              </GlassButton>
              <GlassButton variant="outline" size="sm" onClick={closeEdit} disabled={saving}>
                <ArrowCounterClockwise size={14} />
                Annulla
              </GlassButton>
              <GlassButton size="sm" onClick={handleSaveEdit} disabled={saving}>
                <FloppyDisk size={14} />
                {saving ? 'Salvataggio...' : 'Salva'}
              </GlassButton>
            </div>
          </>
        )}
      </Modal>

      <Modal open={!!pendingSuggestions} onClose={() => setPendingSuggestions(null)}
        title="Conferma suggerimenti">
        {pendingSuggestions && (
          <>
            <div style={{ fontSize: tokens.font.size.sm, color: tokens.colors.textSecondary, marginBottom: tokens.spacing.md }}>
              {pendingSuggestions.items.length} suggerimenti per{' '}
              {new Set(pendingSuggestions.items.map(i => i.productId)).size} prodotti
            </div>
            <div style={{ maxHeight: 400, overflow: 'auto' }}>
              {pendingSuggestions.items.map((item, idx) => (
                <div key={idx} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: `${tokens.spacing.sm} 0`,
                  borderBottom: `1px solid ${tokens.colors.border}40`,
                  fontSize: tokens.font.size.sm,
                }}>
                  <div>
                    <span style={{ fontWeight: 500, color: tokens.colors.text }}>{item.productName}</span>
                    <span style={{ color: tokens.colors.textMuted, margin: '0 8px' }}>→</span>
                    <span style={{ color: tokens.colors.textSecondary }}>
                      {sortedListini.find(l => l.id === item.listinoId)?.name || `Listino #${item.listinoId}`}
                    </span>
                  </div>
                  <span style={{ color: tokens.colors.primary, fontVariantNumeric: 'tabular-nums' }}>
                    {item.suggested.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: tokens.spacing.lg }}>
              <GlassButton variant="outline" size="sm"
                onClick={() => setPendingSuggestions(null)} disabled={saving}>
                Annulla
              </GlassButton>
              <GlassButton size="sm" onClick={confirmSuggestions} disabled={saving}>
                <CheckCircle size={14} weight="bold" />
                {saving
                  ? 'Applicazione...'
                  : `Applica a ${new Set(pendingSuggestions.items.map(i => i.productId)).size} prodotti`
                }
              </GlassButton>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
