import { Router } from 'express'
import { getDb } from '../database'
import { authenticateToken, AuthRequest } from '../middleware/auth'

export const commissionExceptionsRouter = Router()

commissionExceptionsRouter.use(authenticateToken)

commissionExceptionsRouter.get('/', (_req: AuthRequest, res) => {
  const db = getDb()
  const exceptions = db.prepare(
    'SELECT ce.*, l.name as listino_name FROM commission_exceptions ce JOIN listini l ON ce.listino_id = l.id ORDER BY l.sort_order, ce.category'
  ).all()
  res.json({ success: true, data: exceptions })
})

commissionExceptionsRouter.post('/', (req: AuthRequest, res) => {
  const { listino_id, category, commission_percent } = req.body
  if (!listino_id || !category || commission_percent == null) {
    res.status(400).json({ success: false, error: 'listino_id, category e commission_percent richiesti' })
    return
  }

  const db = getDb()
  const result = db.prepare(
    'INSERT INTO commission_exceptions (listino_id, category, commission_percent) VALUES (?, ?, ?)'
  ).run(listino_id, category, commission_percent)

  const exc = db.prepare(
    'SELECT ce.*, l.name as listino_name FROM commission_exceptions ce JOIN listini l ON ce.listino_id = l.id WHERE ce.id = ?'
  ).get(result.lastInsertRowid)

  res.status(201).json({ success: true, data: exc })
})

commissionExceptionsRouter.put('/:id', (req: AuthRequest, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM commission_exceptions WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ success: false, error: 'Eccezione non trovata' })
    return
  }

  const { listino_id, category, commission_percent } = req.body
  db.prepare(
    'UPDATE commission_exceptions SET listino_id=?, category=?, commission_percent=? WHERE id=?'
  ).run(
    listino_id ?? existing.listino_id,
    category ?? existing.category,
    commission_percent !== undefined ? commission_percent : existing.commission_percent,
    req.params.id
  )

  const exc = db.prepare(
    'SELECT ce.*, l.name as listino_name FROM commission_exceptions ce JOIN listini l ON ce.listino_id = l.id WHERE ce.id = ?'
  ).get(req.params.id)

  res.json({ success: true, data: exc })
})

commissionExceptionsRouter.delete('/:id', (req: AuthRequest, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM commission_exceptions WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ success: false, error: 'Eccezione non trovata' })
    return
  }

  db.prepare('DELETE FROM commission_exceptions WHERE id = ?').run(req.params.id)
  res.json({ success: true, data: { id: parseInt(req.params.id) } })
})