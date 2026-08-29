import { Router } from 'express'
import { getDb } from '../database'
import { authenticateToken, AuthRequest } from '../middleware/auth'

export const listinoPricesRouter = Router()

listinoPricesRouter.use(authenticateToken)

listinoPricesRouter.get('/:productId', (req: AuthRequest, res) => {
  const db = getDb()
  const prices = db.prepare(
    'SELECT lp.*, l.name as listino_name, l.sort_order FROM listino_prices lp JOIN listini l ON lp.listino_id = l.id WHERE lp.product_id = ? ORDER BY l.sort_order'
  ).all(req.params.productId)
  res.json({ success: true, data: prices })
})

listinoPricesRouter.put('/:productId', (req: AuthRequest, res) => {
  const { prices } = req.body
  if (!Array.isArray(prices)) {
    res.status(400).json({ success: false, error: 'Array prices richiesto' })
    return
  }

  const db = getDb()
  const upsert = db.prepare(
    'INSERT INTO listino_prices (product_id, listino_id, price) VALUES (?, ?, ?) ON CONFLICT(product_id, listino_id) DO UPDATE SET price = excluded.price'
  )

  try {
    for (const p of prices) {
      upsert.run(parseInt(req.params.productId), p.listino_id, parseFloat(p.price))
    }
  } catch (err) {
    console.error('[ListinoPrices] Errore aggiornamento prezzi:', err)
    res.status(500).json({ success: false, error: 'Errore aggiornamento prezzi' })
    return
  }

  const result = db.prepare(
    'SELECT lp.*, l.name as listino_name, l.sort_order FROM listino_prices lp JOIN listini l ON lp.listino_id = l.id WHERE lp.product_id = ? ORDER BY l.sort_order'
  ).all(req.params.productId)

  res.json({ success: true, data: result })
})