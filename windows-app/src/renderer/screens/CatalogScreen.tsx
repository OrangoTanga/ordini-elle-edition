import React, { useEffect, useState, useRef, useMemo } from 'react'
import { removeBackground } from '@imgly/background-removal'
import { tokens } from '../theme/tokens'
import { GlassCard } from '../components/GlassCard'
import { GlassButton } from '../components/GlassButton'
import { Modal } from '../components/Modal'
import { Badge } from '../components/Badge'
import { EmptyState } from '../components/EmptyState'
import { api } from '../api'
import { validateProduct, showValidationError } from '../validation'
import { toast } from '../components/Toast'
import { categoryIcon } from '../categories'
import { useCategories } from '../services/useCategories'
import { useCart } from '../context/CartContext'
import {
  MagnifyingGlass, Plus, PencilSimple, TrashSimple,
  Camera, Image, Spinner, ShoppingCartSimple,
} from '@phosphor-icons/react'

const MAX_IMG_DIM = 400

function compressDataUri(dataUri: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => {
      let w = img.width, h = img.height
      if (w > h && w > MAX_IMG_DIM) { h = Math.round(h * MAX_IMG_DIM / w); w = MAX_IMG_DIM }
      else if (h > MAX_IMG_DIM) { w = Math.round(w * MAX_IMG_DIM / h); h = MAX_IMG_DIM }
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      c.getContext('2d')!.drawImage(img, 0, 0, w, h)
      resolve(c.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = dataUri
  })
}

export const CatalogScreen: React.FC = () => {
  const [products, setProducts] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>({
    name: '', description: '', category: '', image_path: '', active: true,
    prices: {} as Record<number, string>,
    pieces_per_case: 1,
  })
  const [listini, setListini] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState('Tutti')
  const [removingBg, setRemovingBg] = useState(false)
  const [bgProgress, setBgProgress] = useState('')
  const [saving, setSaving] = useState(false)
  const { categories, refresh: refreshCategories } = useCategories()
  const { addItem } = useCart()
  const fileRef = useRef<HTMLInputElement>(null)
  const originalFileRef = useRef<File | null>(null)
  const isAdmin = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).role === 'admin' : false

  useEffect(() => { fetchProducts(); fetchListini() }, [])

  const fetchProducts = async () => {
    const result = await api.products.list()
    if (result.success) setProducts(result.data || [])
    else toast.error('Impossibile caricare i prodotti: ' + (result.error || 'errore di rete'))
  }

  const fetchListini = async () => {
    const result = await api.listini.list()
    if (result.success) setListini(result.data || [])
    else toast.error('Impossibile caricare i listini: ' + (result.error || 'errore di rete'))
  }

  const openNew = () => {
    setEditing(null)
    const prices: Record<number, string> = {}
    listini.forEach(l => { prices[l.id] = '' })
    setForm({ name: '', description: '', category: '', image_path: '', active: true, prices, pieces_per_case: 1 })
    setShowForm(true)
  }

  const openEdit = (p: any) => {
    const prices: Record<number, string> = {}
    const lp = p.listino_prices || []
    listini.forEach(l => {
      const found = lp.find((x: any) => x.listino_id === l.id)
      prices[l.id] = found ? String(found.price) : ''
    })
    setEditing(p)
    setForm({
      name: p.name, description: p.description, category: p.category,
      image_path: p.image_path || '', active: Boolean(p.active),
      prices,
      pieces_per_case: p.pieces_per_case || 1,
    })
    setShowForm(true)
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    originalFileRef.current = file
    try {
      const dataUri = await compressDataUri(URL.createObjectURL(file))
      setForm((prev: any) => ({ ...prev, image_path: dataUri }))
    } catch { }
    e.target.value = ''
  }

  const handleRemoveBg = async () => {
    if (!originalFileRef.current) return
    setRemovingBg(true)
    setBgProgress('Caricamento modello IA...')
    try {
      const blob = await removeBackground(originalFileRef.current, {
        progress: (_key: string, current: number, total: number) => {
          if (total > 0) setBgProgress(`Elaborazione... ${Math.round(current / total * 100)}%`)
        },
      })
      setBgProgress('Compressione...')
      const dataUri = URL.createObjectURL(blob)
      const compressed = await compressDataUri(dataUri)
      setForm((prev: any) => ({ ...prev, image_path: compressed }))
      URL.revokeObjectURL(dataUri)
    } catch (err: any) {
      setBgProgress(`Errore: ${err.message || 'sconosciuto'}`)
    }
    setRemovingBg(false)
  }

  const handleSave = async () => {
    if (showValidationError(validateProduct({ name: form.name, price: listini.length > 0 ? form.prices[listini[0].id] : '0' }))) return

    // Il worker richiede il prezzo del prodotto alla creazione: usa quello del primo listino
    const firstPrice = listini.length > 0 ? form.prices[listini[0].id] : ''
    const body = {
      name: form.name.trim(),
      description: form.description,
      category: form.category,
      image_path: form.image_path,
      active: form.active ? 1 : 0,
      price: firstPrice !== '' ? parseFloat(firstPrice) : (editing?.price ?? 0),
      pieces_per_case: form.pieces_per_case || 1,
    }

    setSaving(true)
    try {
      let productId: number | null = null

      if (editing) {
        const res = await api.products.update(editing.id, body)
        if (!res.success) {
          toast.error('Salvataggio non riuscito: ' + (res.error || 'errore sconosciuto'))
          return
        }
        productId = editing.id
      } else {
        const res = await api.products.create(body)
        if (!res.success || !res.data) {
          toast.error('Creazione non riuscita: ' + (res.error || 'errore sconosciuto'))
          return
        }
        productId = res.data.id
      }

      const priceArr = listini
        .filter(l => form.prices[l.id])
        .map(l => ({ listino_id: l.id, price: parseFloat(form.prices[l.id]) }))
      if (priceArr.length > 0 && productId != null) {
        const pr = await api.listinoPrices.update(productId, priceArr)
        if (!pr.success) {
          toast.error((editing ? 'Prodotto aggiornato ma salvataggio prezzi fallito' : 'Prodotto creato ma salvataggio prezzi fallito') + ': ' + (pr.error || 'errore sconosciuto'))
          setShowForm(false)
          fetchProducts()
          return
        }
      }

      if (!editing && form.category && !categories.includes(form.category)) refreshCategories()
      toast.success(editing ? `Prodotto «${body.name}» aggiornato` : `Prodotto «${body.name}» aggiunto al catalogo`)
      setShowForm(false)
      fetchProducts()
    } catch (err: any) {
      toast.error('Errore di rete: ' + (err?.message || 'sconosciuto'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    const p = products.find(x => x.id === id)
    if (!window.confirm(`Eliminare definitivamente il prodotto «${p?.name || id}»?`)) return
    try {
      const res = await api.products.delete(id)
      if (res.success) toast.success(`Prodotto «${p?.name || id}» eliminato`)
      else toast.error('Eliminazione non riuscita: ' + (res.error || 'errore sconosciuto'))
    } catch (err: any) {
      toast.error('Errore di rete: ' + (err?.message || 'sconosciuto'))
    }
    fetchProducts()
  }

  const handlePriceChange = (listinoId: number, value: string) => {
    setForm((prev: any) => ({ ...prev, prices: { ...prev.prices, [listinoId]: value } }))
  }

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.category?.toLowerCase().includes(search.toLowerCase())
      return matchSearch
    })
  }, [products, search])

  const sections = useMemo(() => {
    const filteredByCat = selectedCat === 'Tutti'
      ? filtered
      : filtered.filter(p => p.category === selectedCat)
    return categories
      .map(cat => ({
        category: cat,
        products: filteredByCat.filter(p => p.category === cat),
      }))
      .filter(s => s.products.length > 0)
  }, [filtered, selectedCat, categories])

  const getProductPrice = (p: any, listinoId: number): string => {
    const lp = p.listino_prices || []
    const found = lp.find((x: any) => x.listino_id === listinoId)
    return found ? `€${found.price?.toFixed(2)}` : '—'
  }

  const allCats = useMemo(() => ['Tutti', ...categories], [categories])

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: tokens.spacing.lg }}>
        <div style={{ display: 'flex', gap: tokens.spacing.md, alignItems: 'center', marginBottom: tokens.spacing.md }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
            background: tokens.colors.surface, borderRadius: tokens.radius.md,
            border: `1px solid ${tokens.colors.border}`, padding: '0 12px',
          }}>
            <MagnifyingGlass size={16} color={tokens.colors.textMuted} />
            <input placeholder="Cerca prodotto..." value={search} onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, background: 'none', border: 'none', color: tokens.colors.text,
                fontSize: tokens.font.size.md, padding: '10px 0', outline: 'none',
              }} />
          </div>
          <GlassButton onClick={openNew}>
            <Plus size={16} weight="bold" />
            Nuovo Prodotto
          </GlassButton>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {allCats.map(cat => {
            const selected = selectedCat === cat
            return (
              <button key={cat} onClick={() => setSelectedCat(cat)}
                style={{
                  padding: '6px 16px', borderRadius: 20, cursor: 'pointer',
                  fontSize: tokens.font.size.sm, fontWeight: selected ? 600 : 500,
                  background: selected ? tokens.colors.primary : tokens.colors.surface,
                  color: selected ? '#fff' : tokens.colors.textMuted,
                  border: selected ? 'none' : `1px solid ${tokens.colors.border}`,
                  outline: 'none', transition: tokens.transition.normal,
                }}>
                {cat === 'Tutti' ? 'Tutti' : cat}
              </button>
            )
          })}
        </div>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)}
        title={editing ? 'Modifica Prodotto' : 'Nuovo Prodotto'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing.md }}>
          <input placeholder="Nome prodotto" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} style={inputS} />
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
            style={{ ...inputS, color: form.category ? tokens.colors.text : tokens.colors.textMuted }}>
            <option value="" style={{ background: tokens.colors.bg }}>Seleziona categoria</option>
            {categories.map(c => <option key={c} value={c} style={{ background: tokens.colors.bg }}>{c}</option>)}
          </select>

          {isAdmin && (
            <div>
              <label style={{
                fontSize: tokens.font.size.xs, color: tokens.colors.textMuted,
                marginBottom: 4, display: 'block',
              }}>
                Pezzi per cartone
              </label>
              <input type="number" min="1" placeholder="Es. 6"
                value={form.pieces_per_case || 1}
                onChange={e => setForm({ ...form, pieces_per_case: parseInt(e.target.value) || 1 })}
                style={inputS} />
            </div>
          )}

          {listini.map(l => (
            <div key={l.id}>
              <label style={{
                fontSize: tokens.font.size.xs, color: tokens.colors.textMuted,
                marginBottom: 4, display: 'block',
              }}>
                Prezzo {l.name} ({l.commission_percent}%)
              </label>
              <input placeholder="Es. 10.00" type="number" step="0.01"
                value={form.prices[l.id] || ''}
                onChange={e => handlePriceChange(l.id, e.target.value)}
                style={inputS} />
            </div>
          ))}

          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.sm }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
              <GlassButton variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Camera size={14} />
                Scegli foto
              </GlassButton>
              {form.image_path && !removingBg && (
                <GlassButton variant="outline" size="sm" onClick={handleRemoveBg}>
                  <Image size={14} />
                  Scontorna
                </GlassButton>
              )}
              {form.image_path && !removingBg && (
                <GlassButton variant="outline" size="sm"
                  onClick={() => { setForm((prev: any) => ({ ...prev, image_path: '' })); originalFileRef.current = null }}>
                  Rimuovi
                </GlassButton>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
            {removingBg && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: tokens.font.size.sm, color: tokens.colors.primary }}>
                <Spinner size={14} className="animate-spin" />
                {bgProgress}
              </div>
            )}
            {form.image_path && !removingBg && (
              <div style={{
                width: 120, height: 120, borderRadius: tokens.radius.md, marginTop: 4,
                backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                overflow: 'hidden',
              }}>
                <img src={form.image_path} alt="anteprima"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
              </div>
            )}
            {!form.image_path && !removingBg && (
              <div style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textMuted }}>
                Nessuna foto selezionata
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: tokens.font.size.sm, color: tokens.colors.textSecondary }}>Attivo:</label>
            <input type="checkbox" checked={form.active}
              onChange={e => setForm({ ...form, active: e.target.checked })}
              style={{ transform: 'scale(1.2)' }} />
          </div>
          <textarea placeholder="Descrizione" value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            style={{ ...inputS, gridColumn: '1 / -1', resize: 'vertical', minHeight: 60, fontFamily: 'inherit' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: tokens.spacing.xl }}>
          <GlassButton variant="outline" onClick={() => setShowForm(false)} disabled={saving}>Annulla</GlassButton>
          <GlassButton onClick={handleSave} disabled={saving}>
            {saving ? <><Spinner size={14} className="animate-spin" /> Salvataggio...</> : 'Salva'}
          </GlassButton>
        </div>
      </Modal>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {sections.length === 0 ? (
          <EmptyState
            icon={<Image size={32} />}
            title="Nessun prodotto"
            description={search ? 'Nessun prodotto trovato per la ricerca' : 'Aggiungi il primo prodotto'}
            action={!search ? { label: 'Nuovo Prodotto', onClick: openNew } : undefined}
          />
        ) : (
          sections.map(section => {
            const CatIcon = categoryIcon(section.category)
            return (
              <div key={section.category} style={{ marginBottom: 28 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', marginBottom: tokens.spacing.md,
                  paddingRight: tokens.spacing.sm,
                }}>
                  <CatIcon size={18} color={tokens.colors.primary} weight="fill"
                    style={{ marginRight: 8 }} />
                  <span style={{
                    color: tokens.colors.text, fontSize: tokens.font.size.lg,
                    fontWeight: tokens.font.weight.bold, textTransform: 'capitalize',
                  }}>
                    {section.category}
                  </span>
                  <span style={{
                    marginLeft: 8, fontSize: tokens.font.size.sm,
                    color: tokens.colors.textMuted, fontWeight: 500,
                  }}>
                    ({section.products.length})
                  </span>
                  <div style={{
                    flex: 1, height: 1, background: tokens.colors.border,
                    marginLeft: tokens.spacing.md,
                  }} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {section.products.map(product => {
                    const availablePrices = listini
                      .map(l => {
                        const lp = product.listino_prices || []
                        const found = lp.find((x: any) => x.listino_id === l.id)
                        return found ? { listinoId: l.id, listinoName: l.name, price: found.price } : null
                      })
                      .filter(Boolean) as { listinoId: number; listinoName: string; price: number }[]

                    const [showAddMenu, setShowAddMenu] = useState(false)
                    const addToCart = (listino: { listinoId: number; listinoName: string; price: number }) => {
                      addItem({
                        productId: product.id,
                        productName: product.name,
                        price: listino.price,
                        quantity: 1,
                        imagePath: product.image_path,
                        listinoId: listino.listinoId,
                        listinoName: listino.listinoName,
                      })
                      setShowAddMenu(false)
                    }

                    return (
                    <GlassCard key={product.id} style={{
                      display: 'flex', gap: tokens.spacing.md, alignItems: 'center',
                      width: 'calc(33.333% - 7px)', minWidth: 320, flex: '1 0 auto',
                      padding: tokens.spacing.md, position: 'relative',
                    }}>
                      {product.image_path ? (
                        <div style={{
                          width: 52, height: 52, borderRadius: tokens.radius.md,
                          background: '#fff', overflow: 'hidden', flexShrink: 0,
                        }}>
                          <img src={product.image_path} alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                            onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }} />
                        </div>
                      ) : (
                        <div style={{
                          width: 52, height: 52, borderRadius: tokens.radius.md,
                          background: tokens.colors.surface,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: tokens.colors.textMuted, flexShrink: 0,
                        }}>
                          <CatIcon size={24} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: tokens.font.weight.semibold,
                          fontSize: tokens.font.size.sm, color: tokens.colors.text,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {product.name}
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                          {availablePrices.map(p => (
                            <div key={p.listinoId} style={{ fontSize: tokens.font.size.xs }}>
                              <span style={{ color: tokens.colors.textMuted }}>{p.listinoName.split(' ')[1]}: </span>
                              <span style={{ color: tokens.colors.primary, fontWeight: tokens.font.weight.semibold }}>
                                €{p.price.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Badge variant={product.active ? 'success' : 'danger'} label="" dot />
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        {availablePrices.length > 0 && (
                          <div style={{ position: 'relative' }}>
                            <GlassButton variant="primary" size="sm" onClick={() => setShowAddMenu(!showAddMenu)}>
                              <ShoppingCartSimple size={14} weight="bold" />
                            </GlassButton>
                            {showAddMenu && (
                              <div style={{
                                position: 'absolute', bottom: '100%', right: 0, marginBottom: 4,
                                background: tokens.colors.bgAlt, border: `1px solid ${tokens.colors.border}`,
                                borderRadius: tokens.radius.md, padding: tokens.spacing.sm,
                                boxShadow: tokens.shadow.modal, zIndex: 10, minWidth: 180,
                              }}>
                                {availablePrices.map(p => (
                                  <button
                                    key={p.listinoId}
                                    onClick={() => addToCart(p)}
                                    style={{
                                      width: '100%', display: 'flex', justifyContent: 'space-between',
                                      padding: '8px 12px', background: 'none', border: 'none',
                                      color: tokens.colors.text, cursor: 'pointer', textAlign: 'left',
                                      fontSize: tokens.font.size.sm, borderRadius: tokens.radius.sm,
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = tokens.colors.surfaceHover}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                  >
                                    <span>{p.listinoName}</span>
                                    <span style={{ color: tokens.colors.primary, fontWeight: 600 }}>€{p.price.toFixed(2)}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        <GlassButton variant="outline" size="sm" onClick={() => openEdit(product)}>
                          <PencilSimple size={14} />
                        </GlassButton>
                        <GlassButton variant="danger" size="sm" onClick={() => handleDelete(product.id)}>
                          <TrashSimple size={14} />
                        </GlassButton>
                      </div>
                    </GlassCard>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
