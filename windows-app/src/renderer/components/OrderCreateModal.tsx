import React, { useEffect, useState, useCallback } from 'react'
import { tokens } from '../theme/tokens'
import { GlassCard } from './GlassCard'
import { GlassButton } from './GlassButton'
import { Modal } from './Modal'
import { api } from '../api'
import { useCart } from '../context/CartContext'
import { toast } from '../components/Toast'
import { Plus, Minus, MagnifyingGlass, UserPlus, CheckCircle, ArrowRight } from '@phosphor-icons/react'

type PaymentType = 'anticipato' | 'consegna' | 'bonifico_finemese'

const PAYMENT_OPTIONS: { value: PaymentType; label: string; description: string }[] = [
  { value: 'anticipato', label: 'Anticipato con sconto 3%', description: 'Pagamento immediato con bonifico - sconto 3% sul totale' },
  { value: 'consegna', label: 'Alla consegna', description: 'Pagamento in contanti o assegno al momento della consegna' },
  { value: 'bonifico_finemese', label: 'Bonifico a fine mese', description: 'Pagamento con bonifico bancario entro fine mese' },
]

interface OrderCreateModalProps {
  open: boolean
  onClose: () => void
}

export const OrderCreateModal: React.FC<OrderCreateModalProps> = ({ open, onClose }) => {
  const { items, totalAmount, clearCart } = useCart()
  const [customers, setCustomers] = useState<any[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null)
  const [searchCustomer, setSearchCustomer] = useState('')
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerForm, setNewCustomerForm] = useState({
    business_name: '', vat: '', iban: '', address: '', phone: '', email: ''
  })
  const [paymentType, setPaymentType] = useState<PaymentType>('anticipato')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [customerError, setCustomerError] = useState('')

  useEffect(() => {
    if (open) {
      fetchCustomers()
    }
  }, [open])

  const fetchCustomers = async () => {
    const res = await api.customers.list()
    if (res.success) setCustomers(res.data || [])
  }

  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer)
    setSearchCustomer(customer.business_name)
    setCustomerError('')
    setShowNewCustomer(false)
  }

  const handleCreateCustomer = async () => {
    if (!newCustomerForm.business_name.trim()) {
      toast.error('Inserisci la ragione sociale')
      return
    }
    setSaving(true)
    try {
      const res = await api.customers.create(newCustomerForm)
      if (res.success && res.data) {
        handleCustomerSelect(res.data)
        setNewCustomerForm({ business_name: '', vat: '', iban: '', address: '', phone: '', email: '' })
        toast.success('Cliente creato')
      } else {
        toast.error(res.error || 'Errore creazione cliente')
      }
    } catch (err: any) {
      toast.error('Errore di rete: ' + (err?.message || 'sconosciuto'))
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error('Il carrello è vuoto')
      return
    }
    if (!selectedCustomer && !searchCustomer.trim()) {
      setCustomerError('Seleziona un cliente o inserisci una nuova ragione sociale')
      return
    }

    setSaving(true)
    try {
      const businessName = selectedCustomer?.business_name || searchCustomer.trim()
      const vat = selectedCustomer?.vat || ''
      const iban = selectedCustomer?.iban || ''

      const orderData = {
        business_name: businessName,
        vat,
        iban,
        invoice_date: invoiceDate,
        payment_type: paymentType,
        payment_terms: paymentType === 'bonifico_finemese' ? 'Fine mese' : 'Immediato',
        payment_days: paymentType === 'bonifico_finemese' ? 30 : 0,
        total: totalAmount,
        notes,
        items: items.map(item => ({
          product_id: item.productId,
          product_name: item.productName,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.price * item.quantity,
        })),
      }

      const res = await api.orders.create(orderData)
      if (res.success) {
        toast.success(`Ordine #${res.data?.id} creato per ${businessName}`)
        clearCart()
        onClose()
      } else {
        toast.error(res.error || 'Errore creazione ordine')
      }
    } catch (err: any) {
      toast.error('Errore di rete: ' + (err?.message || 'sconosciuto'))
    } finally {
      setSaving(false)
    }
  }

  const filteredCustomers = customers.filter(c =>
    c.business_name?.toLowerCase().includes(searchCustomer.toLowerCase()) ||
    c.vat?.includes(searchCustomer)
  )

  if (!open) return null

  return (
    <Modal open={open} onClose={onClose} title="Nuovo Ordine" width={720}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>

        {/* CARRELLO RIEPILOGO */}
        <GlassCard>
          <div style={{ fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.bold, color: tokens.colors.text, marginBottom: tokens.spacing.md }}>
            Carrello ({items.length} prodotti)
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {items.map((item, i) => (
              <div key={`${item.productId}-${item.listinoId}`} style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.md, padding: '8px 0', borderBottom: i < items.length - 1 ? `1px solid ${tokens.colors.border}` : 'none' }}>
                <div style={{ width: 40, height: 40, borderRadius: tokens.radius.md, background: tokens.colors.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.colors.textMuted, fontSize: 16 }}>🛒</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, color: tokens.colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.productName}</div>
                  <div style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textMuted }}>{item.listinoName} · €{item.price.toFixed(2)} × {item.quantity}</div>
                </div>
                <div style={{ fontWeight: 600, color: tokens.colors.primary, minWidth: 80, textAlign: 'right' }}>€{(item.price * item.quantity).toFixed(2)}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: tokens.spacing.md, paddingTop: tokens.spacing.md, borderTop: `1px solid ${tokens.colors.border}`, fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.bold }}>
            <span>Totale</span>
            <span style={{ color: tokens.colors.primary }}>€{totalAmount.toFixed(2)}</span>
          </div>
        </GlassCard>

        {/* CLIENTE */}
        <GlassCard>
          <div style={{ fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.bold, color: tokens.colors.text, marginBottom: tokens.spacing.md }}>
            Cliente <span style={{ fontWeight: 400, fontSize: tokens.font.size.sm, color: tokens.colors.textMuted }}>(obbligatorio)</span>
          </div>

          <div style={{ position: 'relative', marginBottom: tokens.spacing.md }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MagnifyingGlass size={18} color={tokens.colors.textMuted} />
              <input
                type="text"
                placeholder={selectedCustomer ? `Selezionato: ${selectedCustomer.business_name}` : 'Cerca cliente per ragione sociale o P.IVA...'}
                value={searchCustomer}
                onChange={e => {
                  setSearchCustomer(e.target.value)
                  if (!filteredCustomers.find(c => c.business_name === e.target.value)) {
                    setSelectedCustomer(null)
                  }
                }}
                style={{
                  flex: 1, background: tokens.colors.surface, border: `1px solid ${customerError ? tokens.colors.danger : tokens.colors.border}`,
                  borderRadius: tokens.radius.md, padding: '12px 14px', color: tokens.colors.text,
                  fontSize: tokens.font.size.md, outline: 'none',
                }}
              />
            </div>
            {customerError && (
              <div style={{ fontSize: tokens.font.size.xs, color: tokens.colors.danger, marginTop: 4 }}>{customerError}</div>
            )}
          </div>

          {filteredCustomers.length > 0 && (
            <div style={{ maxHeight: 180, overflowY: 'auto', border: `1px solid ${tokens.colors.border}`, borderRadius: tokens.radius.md, background: tokens.colors.surface }}>
              {filteredCustomers.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleCustomerSelect(c)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: tokens.spacing.md,
                    padding: tokens.spacing.md, background: 'none', border: 'none',
                    textAlign: 'left', cursor: 'pointer',
                    color: tokens.colors.text, fontSize: tokens.font.size.sm,
                    borderBottom: c.id !== filteredCustomers[filteredCustomers.length - 1].id ? `1px solid ${tokens.colors.border}` : 'none',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = tokens.colors.surfaceHover}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: 36, height: 36, borderRadius: tokens.radius.md, background: `${tokens.colors.primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.colors.primary, flexShrink: 0 }}>
                    <UserPlus size={18} weight="fill" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, color: tokens.colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.business_name}</div>
                    <div style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textMuted }}>
                      {c.vat && `P.IVA: ${c.vat}`}
                      {c.vat && c.iban && ' · '}
                      {c.iban && `IBAN: ${c.iban}`}
                    </div>
                  </div>
                  <CheckCircle size={18} color={tokens.colors.primary} weight="fill" />
                </button>
              ))}
            </div>
          )}

          {!selectedCustomer && searchCustomer.trim() && (
            <GlassButton variant="outline" size="sm" onClick={() => setShowNewCustomer(true)} style={{ marginTop: tokens.spacing.sm }}>
              <UserPlus size={14} />
              Crea nuovo cliente "{searchCustomer}"
            </GlassButton>
          )}
        </GlassCard>

        {/* NUOVO CLIENTE QUICK FORM */}
        {showNewCustomer && (
          <GlassCard style={{ border: `1px solid ${tokens.colors.primary}40`, background: `${tokens.colors.primary}08` }}>
            <div style={{ fontSize: tokens.font.size.md, fontWeight: 600, color: tokens.colors.primary, marginBottom: tokens.spacing.md }}>
              Nuovo cliente rapido
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing.md }}>
              <input placeholder="Ragione sociale *" value={newCustomerForm.business_name} onChange={e => setNewCustomerForm({ ...newCustomerForm, business_name: e.target.value })} style={inputS} />
              <input placeholder="Partita IVA" value={newCustomerForm.vat} onChange={e => setNewCustomerForm({ ...newCustomerForm, vat: e.target.value })} style={inputS} />
              <input placeholder="IBAN" value={newCustomerForm.iban} onChange={e => setNewCustomerForm({ ...newCustomerForm, iban: e.target.value })} style={inputS} />
              <input placeholder="Telefono" value={newCustomerForm.phone} onChange={e => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })} style={inputS} />
              <input placeholder="Email" type="email" value={newCustomerForm.email} onChange={e => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })} style={inputS} />
              <input placeholder="Indirizzo" value={newCustomerForm.address} onChange={e => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })} style={{ ...inputS, gridColumn: '1 / -1' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: tokens.spacing.md }}>
              <GlassButton variant="outline" size="sm" onClick={() => setShowNewCustomer(false)}>Annulla</GlassButton>
              <GlassButton size="sm" onClick={handleCreateCustomer} disabled={saving}>{saving ? 'Creazione...' : 'Crea e usa'}</GlassButton>
            </div>
          </GlassCard>
        )}

        {/* TIPO PAGAMENTO */}
        <GlassCard>
          <div style={{ fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.bold, color: tokens.colors.text, marginBottom: tokens.spacing.md }}>
            Modalità di pagamento
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.sm }}>
            {PAYMENT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPaymentType(opt.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: tokens.spacing.md,
                  padding: tokens.spacing.md, borderRadius: tokens.radius.md,
                  border: `2px solid ${paymentType === opt.value ? tokens.colors.primary : tokens.colors.border}`,
                  background: paymentType === opt.value ? `${tokens.colors.primary}15` : tokens.colors.surface,
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  transition: tokens.transition.fast,
                }}
                onMouseEnter={e => { if (paymentType !== opt.value) e.currentTarget.style.borderColor = tokens.colors.primary }}
                onMouseLeave={e => { if (paymentType !== opt.value) e.currentTarget.style.borderColor = tokens.colors.border }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', border: `2px solid ${paymentType === opt.value ? tokens.colors.primary : tokens.colors.border}`,
                  background: paymentType === opt.value ? tokens.colors.primary : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {paymentType === opt.value && <CheckCircle size={12} color="white" weight="fill" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: tokens.colors.text }}>{opt.label}</div>
                  <div style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textMuted }}>{opt.description}</div>
                </div>
                <ArrowRight size={18} color={paymentType === opt.value ? tokens.colors.primary : tokens.colors.textMuted} />
              </button>
            ))}
          </div>
        </GlassCard>

        {/* DETTAGLI */}
        <GlassCard>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing.md }}>
            <div>
              <label style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textMuted, marginBottom: 4, display: 'block' }}>Data fattura</label>
              <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} style={inputS} />
            </div>
          </div>
          <div style={{ marginTop: tokens.spacing.md }}>
            <label style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textMuted, marginBottom: 4, display: 'block' }}>Note (opzionale)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Note per l'ordine..." rows={3} style={{ ...inputS, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
        </GlassCard>

        {/* AZIONI */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <GlassButton variant="outline" onClick={onClose} disabled={saving}>Annulla</GlassButton>
          <GlassButton onClick={handleSubmit} disabled={saving || items.length === 0 || (!selectedCustomer && !searchCustomer.trim())}>
            {saving ? <><div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid white', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', marginRight: 8 }} />Creazione...</> : 'Crea Ordine'}
          </GlassButton>
        </div>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </Modal>
  )
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