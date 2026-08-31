import { Router } from 'express'
import { getDb } from '../database'
import { authenticateToken, AuthRequest } from '../middleware/auth'

export const productsRouter = Router()

productsRouter.use(authenticateToken)

productsRouter.get('/', (_req: AuthRequest, res) => {
  const db = getDb()
  const products = db.prepare('SELECT * FROM products ORDER BY category, name').all()
  const priceStmt = db.prepare(
    'SELECT lp.listino_id, lp.price, l.name as listino_name FROM listino_prices lp JOIN listini l ON lp.listino_id = l.id WHERE lp.product_id = ? ORDER BY l.sort_order'
  )
  const data = products.map((p: any) => ({
    ...p,
    listino_prices: priceStmt.all(p.id),
  }))
  res.json({ success: true, data })
})

productsRouter.get('/:id', (req: AuthRequest, res) => {
  const db = getDb()
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!product) {
    res.status(404).json({ success: false, error: 'Prodotto non trovato' })
    return
  }
  res.json({ success: true, data: product })
})

productsRouter.post('/', (req: AuthRequest, res) => {
  const db = getDb()
  const { name, description, price, category, image_path } = req.body

  if (!name || !price) {
    res.status(400).json({ success: false, error: 'Nome e prezzo richiesti' })
    return
  }

  const result = db.prepare(
    'INSERT INTO products (name, description, price, category, image_path) VALUES (?, ?, ?, ?, ?)'
  ).run(name, description || '', parseFloat(price), category || '', image_path || '')

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json({ success: true, data: product })
})

productsRouter.put('/:id', (req: AuthRequest, res) => {
  const db = getDb()
  const { name, description, price, category, image_path, active } = req.body

  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as any
  if (!existing) {
    res.status(404).json({ success: false, error: 'Prodotto non trovato' })
    return
  }

  db.prepare(
    'UPDATE products SET name=?, description=?, price=?, category=?, image_path=?, active=? WHERE id=?'
  ).run(
    name || existing.name,
    description !== undefined ? description : existing.description,
    price !== undefined ? parseFloat(price) : existing.price,
    category !== undefined ? category : existing.category,
    image_path !== undefined ? image_path : existing.image_path,
    active !== undefined ? (active ? 1 : 0) : existing.active,
    req.params.id
  )

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: product })
})

productsRouter.delete('/:id', (req: AuthRequest, res) => {
  const db = getDb()
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)

  if (!product) {
    res.status(404).json({ success: false, error: 'Prodotto non trovato' })
    return
  }

  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id)
  res.json({ success: true, data: { id: parseInt(req.params.id) } })
})
