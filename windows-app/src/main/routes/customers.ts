import { Router } from 'express'
import { getDb } from '../database'
import { authenticateToken, AuthRequest } from '../middleware/auth'

export const customersRouter = Router()

customersRouter.use(authenticateToken)

customersRouter.get('/', (_req: AuthRequest, res) => {
  const db = getDb()
  const customers = db.prepare('SELECT * FROM customers ORDER BY business_name').all()

  const result = customers.map((c: any) => {
    const orderCount = db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM orders WHERE customer_id = ?').get(c.id) as any
    return { ...c, order_count: orderCount.count, order_total: orderCount.total }
  })

  res.json({ success: true, data: result })
})

customersRouter.get('/:id', (req: AuthRequest, res) => {
  const db = getDb()
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id)
  if (!customer) {
    res.status(404).json({ success: false, error: 'Cliente non trovato' })
    return
  }
  res.json({ success: true, data: customer })
})

customersRouter.post('/', (req: AuthRequest, res) => {
  const db = getDb()
  const { business_name, vat, iban, address, phone, email } = req.body

  if (!business_name) {
    res.status(400).json({ success: false, error: 'Nome attività richiesto' })
    return
  }

  const result = db.prepare(
    'INSERT INTO customers (business_name, vat, iban, address, phone, email) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(business_name, vat || '', iban || '', address || '', phone || '', email || '')

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json({ success: true, data: customer })
})

customersRouter.put('/:id', (req: AuthRequest, res) => {
  const db = getDb()
  const { business_name, vat, iban, address, phone, email } = req.body

  const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ success: false, error: 'Cliente non trovato' })
    return
  }

  db.prepare(
    'UPDATE customers SET business_name=?, vat=?, iban=?, address=?, phone=?, email=? WHERE id=?'
  ).run(
    business_name, vat, iban, address, phone, email,
    req.params.id
  )

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: customer })
})

customersRouter.delete('/:id', (req: AuthRequest, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ success: false, error: 'Cliente non trovato' })
    return
  }
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id)
  res.json({ success: true, data: { id: parseInt(req.params.id) } })
})
