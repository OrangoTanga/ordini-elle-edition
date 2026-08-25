import { Router } from 'express'
import { getDb } from '../database'
import { authenticateToken, AuthRequest } from '../middleware/auth'

export const paymentsRouter = Router()

paymentsRouter.use(authenticateToken)

paymentsRouter.get('/', (req: AuthRequest, res) => {
  const db = getDb()
  const { order_id, status, from_due, to_due, customer_business_name, user_id } = req.query

  let query = `
    SELECT p.*, o.business_name as order_business_name, o.user_id as order_user_id,
           o.total as order_total, o.invoice_date
    FROM payments p
    JOIN orders o ON p.order_id = o.id
    WHERE 1=1
  `
  const params: any[] = []

  if (order_id) { query += ' AND p.order_id = ?'; params.push(parseInt(order_id as string)) }
  if (status) {
    const statuses = (status as string).split(',')
    query += ` AND p.status IN (${statuses.map(() => '?').join(',')})`
    params.push(...statuses)
  }
  if (from_due) { query += ' AND p.due_date >= ?'; params.push(from_due) }
  if (to_due) { query += ' AND p.due_date <= ?'; params.push(to_due) }
  if (customer_business_name) {
    query += ' AND LOWER(o.business_name) LIKE ?'
    params.push('%' + (customer_business_name as string).toLowerCase() + '%')
  }
  if (user_id) { query += ' AND o.user_id = ?'; params.push(parseInt(user_id as string)) }

  query += ' ORDER BY p.due_date ASC'

  const payments = db.prepare(query).all(...params)
  res.json({ success: true, data: payments })
})

paymentsRouter.get('/summary', (req: AuthRequest, res) => {
  const db = getDb()
  const { user_id, from_due, to_due } = req.query

  const pendingTotal = db.prepare(`
    SELECT COALESCE(SUM(p.amount - p.paid_amount), 0) as total FROM payments p
    JOIN orders o ON p.order_id = o.id
    WHERE p.status = 'pending'
    ${user_id ? ' AND o.user_id = ?' : ''}
  `).get(user_id ? [parseInt(user_id as string)] : [])

  const overdueTotal = db.prepare(`
    SELECT COALESCE(SUM(p.amount - p.paid_amount), 0) as total FROM payments p
    JOIN orders o ON p.order_id = o.id
    WHERE p.status = 'overdue'
    ${user_id ? ' AND o.user_id = ?' : ''}
  `).get(user_id ? [parseInt(user_id as string)] : [])

  const paidTotal = db.prepare(`
    SELECT COALESCE(SUM(p.paid_amount), 0) as total FROM payments p
    JOIN orders o ON p.order_id = o.id
    WHERE p.status = 'paid'
    ${user_id ? ' AND o.user_id = ?' : ''}
  `).get(user_id ? [parseInt(user_id as string)] : [])

  const upcomingCount = db.prepare(`
    SELECT COUNT(*) as count FROM payments p
    JOIN orders o ON p.order_id = o.id
    WHERE p.status = 'pending' AND p.due_date <= date('now', '+7 days')
    ${user_id ? ' AND o.user_id = ?' : ''}
  `).get(user_id ? [parseInt(user_id as string)] : [])

  res.json({
    success: true,
    data: {
      pending_total: Math.round((pendingTotal as any)?.total || 0 * 100) / 100,
      overdue_total: Math.round((overdueTotal as any)?.total || 0 * 100) / 100,
      paid_total: Math.round((paidTotal as any)?.total || 0 * 100) / 100,
      upcoming_count: (upcomingCount as any)?.count || 0,
    }
  })
})

paymentsRouter.patch('/:id', (req: AuthRequest, res) => {
  const db = getDb()
  const { paid_amount, paid_date, status, notes } = req.body

  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id) as any
  if (!payment) {
    res.status(404).json({ success: false, error: 'Pagamento non trovato' })
    return
  }

  const updates: string[] = []
  const params: any[] = []

  if (paid_amount != null) { updates.push('paid_amount = ?'); params.push(parseFloat(paid_amount)) }
  if (paid_date) { updates.push('paid_date = ?'); params.push(paid_date) }
  if (status) { updates.push('status = ?'); params.push(status) }
  if (notes !== undefined) { updates.push('notes = ?'); params.push(notes) }

  if (updates.length > 0) {
    params.push(req.params.id)
    db.prepare(`UPDATE payments SET ${updates.join(', ')} WHERE id = ?`).run(...params)
  }

  // Update order payment_status
  const allPayments = db.prepare('SELECT * FROM payments WHERE order_id = ?').all(payment.order_id) as any[]
  const allPaid = allPayments.every(p => p.status === 'paid')
  const hasOverdue = allPayments.some(p => p.status === 'overdue')
  const hasPartial = allPayments.some(p => p.status === 'pending' && p.paid_amount > 0)

  let orderStatus = 'pending'
  if (allPaid) orderStatus = 'paid'
  else if (hasOverdue) orderStatus = 'overdue'
  else if (hasPartial) orderStatus = 'partial'

  db.prepare('UPDATE orders SET payment_status = ? WHERE id = ?').run(orderStatus, payment.order_id)

  const updated = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: updated })
})
