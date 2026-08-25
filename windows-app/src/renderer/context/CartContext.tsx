import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { tokens } from '../theme/tokens'
import { OrderCreateModal } from '../components/OrderCreateModal'

interface CartItem {
  productId: number
  productName: string
  price: number
  quantity: number
  imagePath?: string
  listinoId: number
  listinoName: string
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (productId: number, listinoId: number) => void
  updateQuantity: (productId: number, listinoId: number, quantity: number) => void
  clearCart: () => void
  totalItems: number
  totalAmount: number
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  showOrderModal: boolean
  openOrderModal: () => void
  closeOrderModal: () => void
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [showOrderModal, setShowOrderModal] = useState(false)

  const addItem = useCallback((item: CartItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === item.productId && i.listinoId === item.listinoId)
      if (existing) {
        return prev.map(i =>
          i.productId === item.productId && i.listinoId === item.listinoId
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        )
      }
      return [...prev, item]
    })
    setIsOpen(true)
  }, [])

  const removeItem = useCallback((productId: number, listinoId: number) => {
    setItems(prev => prev.filter(i => !(i.productId === productId && i.listinoId === listinoId)))
  }, [])

  const updateQuantity = useCallback((productId: number, listinoId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId, listinoId)
      return
    }
    setItems(prev => prev.map(i =>
      i.productId === productId && i.listinoId === listinoId ? { ...i, quantity } : i
    ))
  }, [removeItem])

  const clearCart = useCallback(() => {
    setItems([])
    setIsOpen(false)
  }, [])

  const openOrderModal = useCallback(() => {
    setShowOrderModal(true)
    setIsOpen(false)
  }, [])

  const closeOrderModal = useCallback(() => {
    setShowOrderModal(false)
  }, [])

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQuantity, clearCart,
      totalItems, totalAmount, isOpen, openCart: () => setIsOpen(true), closeCart: () => setIsOpen(false),
      showOrderModal, openOrderModal, closeOrderModal
    }}>
      {children}
      <OrderCreateModal open={showOrderModal} onClose={closeOrderModal} />
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

export function CartButton() {
  const { totalItems, totalAmount, openCart } = useCart()
  if (totalItems === 0) return null
  return (
    <button
      onClick={openCart}
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 20px', borderRadius: tokens.radius.full,
        background: `linear-gradient(135deg, ${tokens.colors.primary}, ${tokens.colors.accent})`,
        color: 'white', border: 'none', cursor: 'pointer',
        boxShadow: tokens.shadow.modal, fontSize: tokens.font.size.sm, fontWeight: 600,
        animation: 'pulse 2s infinite',
      }}
    >
      <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 10 }}>
        {totalItems}
      </span>
      <span>€{totalAmount.toFixed(2)}</span>
    </button>
  )
}

export function CartDrawer() {
  const { items, totalAmount, removeItem, updateQuantity, closeCart, clearCart, openOrderModal, isOpen } = useCart()
  if (!isOpen && items.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 380, maxWidth: '100vw',
        background: tokens.colors.bgAlt, borderLeft: `1px solid ${tokens.colors.border}`,
        boxShadow: tokens.shadow.modal, zIndex: 9998,
        display: 'flex', flexDirection: 'column',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease',
      }}
    >
      <div style={{
        padding: tokens.spacing.lg, borderBottom: `1px solid ${tokens.colors.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ fontSize: tokens.font.size.xl, fontWeight: tokens.font.weight.bold, color: tokens.colors.text }}>
          Carrello ({items.length})
        </div>
        <button onClick={closeCart} style={{ background: 'none', border: 'none', color: tokens.colors.textMuted, cursor: 'pointer', fontSize: 24 }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: tokens.spacing.lg }}>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', color: tokens.colors.textMuted, padding: tokens.spacing.xxxl }}>
            Carrello vuoto
          </div>
        ) : (
          items.map((item, i) => (
            <div key={`${item.productId}-${item.listinoId}`} style={{ marginBottom: tokens.spacing.lg, paddingBottom: tokens.spacing.lg, borderBottom: `1px solid ${tokens.colors.border}` }}>
              <div style={{ display: 'flex', gap: tokens.spacing.md, marginBottom: tokens.spacing.sm }}>
                {item.imagePath && (
                  <div style={{ width: 48, height: 48, borderRadius: tokens.radius.md, background: '#fff', overflow: 'hidden', flexShrink: 0 }}>
                    <img src={item.imagePath} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: tokens.font.weight.semibold, color: tokens.colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.productName}
                  </div>
                  <div style={{ fontSize: tokens.font.size.xs, color: tokens.colors.textMuted }}>
                    {item.listinoName} · €{item.price.toFixed(2)} cad.
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.md }}>
                <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${tokens.colors.border}`, borderRadius: tokens.radius.md, overflow: 'hidden' }}>
                  <button
                    onClick={() => updateQuantity(item.productId, item.listinoId, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    style={{ width: 36, height: 36, background: 'none', border: 'none', color: tokens.colors.text, cursor: item.quantity <= 1 ? 'not-allowed' : 'pointer', opacity: item.quantity <= 1 ? 0.4 : 1 }}
                  >
                    −
                  </button>
                  <span style={{ width: 40, textAlign: 'center', fontWeight: tokens.font.weight.semibold }}>{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.listinoId, item.quantity + 1)}
                    style={{ width: 36, height: 36, background: 'none', border: 'none', color: tokens.colors.text, cursor: 'pointer' }}
                  >
                    +
                  </button>
                </div>
                <div style={{ flex: 1, textAlign: 'right', fontWeight: tokens.font.weight.bold, color: tokens.colors.primary }}>
                  €{(item.price * item.quantity).toFixed(2)}
                </div>
                <button
                  onClick={() => removeItem(item.productId, item.listinoId)}
                  style={{ color: tokens.colors.danger, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}

        {items.length > 0 && (
          <div style={{ marginTop: tokens.spacing.lg, paddingTop: tokens.spacing.lg, borderTop: `1px solid ${tokens.colors.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: tokens.font.size.lg, fontWeight: tokens.font.weight.bold, color: tokens.colors.text }}>
              <span>Totale</span>
              <span>€{totalAmount.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div style={{
          padding: tokens.spacing.lg, borderTop: `1px solid ${tokens.colors.border}`,
          background: tokens.colors.bg,
        }}>
          <button
            onClick={() => { openOrderModal(); closeCart(); }}
            style={{
              width: '100%', padding: '14px', borderRadius: tokens.radius.md,
              background: `linear-gradient(135deg, ${tokens.colors.primary}, ${tokens.colors.accent})`,
              color: 'white', border: 'none', cursor: 'pointer',
              fontSize: tokens.font.size.md, fontWeight: 600,
            }}
          >
            Crea Ordine
          </button>
          <button
            onClick={clearCart}
            style={{
              width: '100%', marginTop: tokens.spacing.sm, padding: '10px', borderRadius: tokens.radius.md,
              background: 'transparent', color: tokens.colors.textMuted, border: `1px solid ${tokens.colors.border}`, cursor: 'pointer',
            }}
          >
            Svuota carrello
          </button>
        </div>
      )}
    </div>
  )
}