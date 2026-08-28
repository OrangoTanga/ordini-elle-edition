import { Router } from 'express'
import { getDb } from '../database'
import { authenticateToken, AuthRequest } from '../middleware/auth'

export const categoriesRouter = Router()

categoriesRouter.use(authenticateToken)

categoriesRouter.get('/', (_req: AuthRequest, res) => {
  const db = getDb()
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all()
  res.json({ success: true, data: categories })
})

categoriesRouter.post('/', (req: AuthRequest, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  if (!name) {
    res.status(400).json({ success: false, error: 'Nome categoria richiesto' })
    return
  }

  const db = getDb()
  const existing = db.prepare('SELECT id FROM categories WHERE name = ?').get(name)
  if (existing) {
    res.status(409).json({ success: false, error: 'Categoria già esistente' })
    return
  }

  const max = db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM categories').get() as any
  const result = db.prepare(
    'INSERT INTO categories (name, sort_order) VALUES (?, ?)'
  ).run(name, (max?.m || 0) + 1)

  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json({ success: true, data: category })
})

categoriesRouter.put('/:id', (req: AuthRequest, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ success: false, error: 'Categoria non trovata' })
    return
  }

  const newName = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  if (!newName) {
    res.status(400).json({ success: false, error: 'Nome categoria richiesto' })
    return
  }

  const dup = db.prepare('SELECT id FROM categories WHERE name = ? AND id <> ?').get(newName, req.params.id)
  if (dup) {
    res.status(409).json({ success: false, error: 'Categoria già esistente' })
    return
  }

  const oldName = existing.name
  if (oldName === newName) {
    res.json({ success: true, data: existing })
    return
  }

  db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(newName, req.params.id)
  db.prepare('UPDATE products SET category = ? WHERE category = ?').run(newName, oldName)
  db.prepare('UPDATE commission_exceptions SET category = ? WHERE category = ?').run(newName, oldName)

  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: category })
})

categoriesRouter.delete('/:id', (req: AuthRequest, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ success: false, error: 'Categoria non trovata' })
    return
  }

  const prodCount = db.prepare(
    'SELECT COUNT(*) as c FROM products WHERE category = ?'
  ).get(existing.name) as any
  const count = prodCount?.c || 0
  if (count > 0) {
    res.status(409).json({
      success: false,
      error: `Categoria in uso da ${count} prodotto/i. Riassegna o elimina i prodotti prima.`,
      data: { product_count: count },
    })
    return
  }

  db.prepare('DELETE FROM commission_exceptions WHERE category = ?').run(existing.name)
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id)
  res.json({ success: true, data: { id: parseInt(req.params.id), name: existing.name } })
})