import { Router } from 'express'
import { getDb } from '../database'
import { authenticateToken, AuthRequest } from '../middleware/auth'
import { getIO } from '../wss'
import { sendNewOrderNotification } from '../notifications'

export const ordersRouter = Router()

ordersRouter.use(authenticateToken)

ordersRouter.get('/', (req: AuthRequest, res) => {
  const db = getDb()
  const { status, from, to } = req.query

  let query = `
    SELECT o.*, u.name as user_name 
    FROM orders o 
    JOIN users u ON o.user_id = u.id 
    WHERE 1=1
  `
  const params: any[] = []

  if (status && status !== 'all') {
    query += ' AND o.status = ?'
    params.push(status)
  }
  if (from) {
    query += ' AND o.created_at >= ?'
    params.push(from)
  }
  if (to) {
    query += ' AND o.created_at <= ?'
    params.push(to)
  }

  query += ' ORDER BY o.created_at DESC'

  const orders = db.prepare(query).all(...params) as any[]

  const result = orders.map(order => {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id)
    const sharedReps = db.prepare(`
      SELECT osr.*, u.name as user_name
      FROM order_shared_reps osr JOIN users u ON osr.user_id = u.id
      WHERE osr.order_id = ?
    `).all(order.id)
    const payments = db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY due_date ASC').all(order.id)
    return { ...order, items, shared_reps: sharedReps, payments }
  })

  res.json({ success: true, data: result })
})

ordersRouter.get('/:id', (req: AuthRequest, res) => {
  const db = getDb()
  const order = db.prepare(`
    SELECT o.*, u.name as user_name 
    FROM orders o 
    JOIN users u ON o.user_id = u.id 
    WHERE o.id = ?
  `).get(req.params.id) as any

  if (!order) {
    res.status(404).json({ success: false, error: 'Ordine non trovato' })
    return
  }

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id)
  const sharedReps = db.prepare(`
    SELECT osr.*, u.name as user_name
    FROM order_shared_reps osr JOIN users u ON osr.user_id = u.id
    WHERE osr.order_id = ?
  `).all(order.id)
  const payments = db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY due_date ASC').all(order.id)
  res.json({ success: true, data: { ...order, items, shared_reps: sharedReps, payments } })
})

ordersRouter.post('/', (req: AuthRequest, res) => {
  const db = getDb()
  const {
    business_name, vat, iban, invoice_date, payment_terms, payment_type,
    payment_days, deposit_percent, balance_days, total, items, notes,
    shared_user_ids,
  } = req.body

  if (!business_name || !items || !items.length) {
    res.status(400).json({ success: false, error: 'Dati ordine incompleti' })
    return
  }

  const actualPaymentType = payment_type || 'dilazionato'
  const actualPaymentDays = payment_days || 30
  const actualDepositPercent = deposit_percent || 30
  const actualBalanceDays = balance_days || 30

  const insertOrder = db.prepare(`
    INSERT INTO orders (user_id, business_name, vat, iban, invoice_date,
      payment_terms, payment_type, payment_days, deposit_percent, balance_days,
      total, notes, status, payment_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')
  `)

  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, product_name, price, quantity, subtotal)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const transaction = db.transaction(() => {
    const result = insertOrder.run(
      req.userId, business_name, vat || '', iban || '',
      invoice_date, payment_terms || String(actualPaymentDays),
      actualPaymentType, actualPaymentDays, actualDepositPercent, actualBalanceDays,
      total, notes || ''
    )
    const orderId = result.lastInsertRowid

    for (const item of items) {
      insertItem.run(orderId, item.product_id, item.product_name, item.price, item.quantity, item.subtotal)
    }

    // Insert shared reps
    if (shared_user_ids && Array.isArray(shared_user_ids)) {
      for (const uid of shared_user_ids) {
        db.prepare('INSERT OR IGNORE INTO order_shared_reps (order_id, user_id) VALUES (?, ?)').run(orderId, uid)
      }
    }

    return orderId
  })

  const orderId = transaction()

  const order = db.prepare(`
    SELECT o.*, u.name as user_name 
    FROM orders o JOIN users u ON o.user_id = u.id 
    WHERE o.id = ?
  `).get(orderId) as any

  const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId)
  const sharedReps = db.prepare(`
    SELECT osr.*, u.name as user_name
    FROM order_shared_reps osr JOIN users u ON osr.user_id = u.id
    WHERE osr.order_id = ?
  `).all(orderId)
  const fullOrder = { ...order, items: orderItems, shared_reps: sharedReps }

  try {
    sendNewOrderNotification(req.userName || 'Rappresentante', business_name, total)
    getIO().to('orders').emit('new_order', fullOrder)
  } catch {}

  res.status(201).json({ success: true, data: fullOrder })
})

ordersRouter.patch('/:id/status', (req: AuthRequest, res) => {
  const db = getDb()
  const { status, notes } = req.body

  if (!['pending', 'approved', 'rejected'].includes(status)) {
    res.status(400).json({ success: false, error: 'Stato non valido' })
    return
  }

  db.prepare('UPDATE orders SET status = ?, notes = ?, updated_at = datetime("now") WHERE id = ?')
    .run(status, notes || '', req.params.id)

  const order = db.prepare(`
    SELECT o.*, u.name as user_name 
    FROM orders o JOIN users u ON o.user_id = u.id 
    WHERE o.id = ?
  `).get(req.params.id) as any

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id)
  const sharedReps = db.prepare(`
    SELECT osr.*, u.name as user_name
    FROM order_shared_reps osr JOIN users u ON osr.user_id = u.id
    WHERE osr.order_id = ?
  `).all(order.id)
  const payments = db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY due_date ASC').all(order.id)

  try {
    getIO().to('orders').emit('order_status', { ...order, items, shared_reps: sharedReps, payments })
  } catch {}

  res.json({ success: true, data: { ...order, items, shared_reps: sharedReps, payments } })
})

ordersRouter.get('/stats/dashboard', (req: AuthRequest, res) => {
  const db = getDb()

  const today = db.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM orders WHERE date(created_at) = date('now')`).get()
  const pending = db.prepare(`SELECT COUNT(*) as count FROM orders WHERE status = 'pending'`).get()
  const approved = db.prepare(`SELECT COUNT(*) as count FROM orders WHERE status = 'approved'`).get()
  const rejected = db.prepare(`SELECT COUNT(*) as count FROM orders WHERE status = 'rejected'`).get()

  const pendingOrders = db.prepare(`
    SELECT o.*, u.name as user_name 
    FROM orders o JOIN users u ON o.user_id = u.id 
    WHERE o.status = 'pending' 
    ORDER BY o.created_at DESC LIMIT 10
  `).all() as any[]

  const pendingWithItems = pendingOrders.map(o => ({
    ...o,
    items: db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id),
    payments: db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY due_date ASC').all(o.id),
  }))

  res.json({
    success: true,
    data: {
      today,
      pending,
      approved,
      rejected,
      pendingOrders: pendingWithItems,
    },
  })
})
