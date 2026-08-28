import { Router } from 'express'
import { getDb } from '../database'
import { authenticateToken, AuthRequest } from '../middleware/auth'

export const listiniRouter = Router()

listiniRouter.use(authenticateToken)

listiniRouter.get('/', (_req: AuthRequest, res) => {
  const db = getDb()
  const listini = db.prepare('SELECT * FROM listini ORDER BY sort_order').all()
  res.json({ success: true, data: listini })
})

listiniRouter.get('/:id', (req: AuthRequest, res) => {
  const db = getDb()
  const listino = db.prepare('SELECT * FROM listini WHERE id = ?').get(req.params.id)
  if (!listino) {
    res.status(404).json({ success: false, error: 'Listino non trovato' })
    return
  }
  res.json({ success: true, data: listino })
})

listiniRouter.post('/', (req: AuthRequest, res) => {
  const { name, commission_percent, payment_terms, sort_order } = req.body
  if (!name) {
    res.status(400).json({ success: false, error: 'Nome listino richiesto' })
    return
  }
  const db = getDb()
  const result = db.prepare(
    'INSERT INTO listini (name, commission_percent, payment_terms, sort_order) VALUES (?, ?, ?, ?)'
  ).run(name, commission_percent ?? 0, payment_terms || '', sort_order ?? 0)

  const listino = db.prepare('SELECT * FROM listini WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json({ success: true, data: listino })
})

listiniRouter.put('/:id', (req: AuthRequest, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM listini WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ success: false, error: 'Listino non trovato' })
    return
  }
  const { name, commission_percent, payment_terms, sort_order } = req.body
  db.prepare(
    'UPDATE listini SET name=?, commission_percent=?, payment_terms=?, sort_order=? WHERE id=?'
  ).run(
    name ?? existing.name,
    commission_percent !== undefined ? commission_percent : existing.commission_percent,
    payment_terms !== undefined ? payment_terms : existing.payment_terms,
    sort_order !== undefined ? sort_order : existing.sort_order,
    req.params.id
  )

  const listino = db.prepare('SELECT * FROM listini WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: listino })
})

listiniRouter.delete('/:id', (req: AuthRequest, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM listini WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ success: false, error: 'Listino non trovato' })
    return
  }
  db.prepare('DELETE FROM listini WHERE id = ?').run(req.params.id)
  res.json({ success: true, data: { id: parseInt(req.params.id) } })
})