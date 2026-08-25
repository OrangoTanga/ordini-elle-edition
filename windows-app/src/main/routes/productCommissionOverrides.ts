import { Router } from 'express'
import { getDb } from '../database'
import { authenticateToken, AuthRequest } from '../middleware/auth'

export const productCommissionOverridesRouter = Router()

productCommissionOverridesRouter.use(authenticateToken)

productCommissionOverridesRouter.get('/:productId', (req: AuthRequest, res) => {
  const db = getDb()
  const overrides = db.prepare(
    'SELECT * FROM product_commission_overrides WHERE product_id = ?'
  ).all(req.params.productId)
  res.json({ success: true, data: overrides })
})

productCommissionOverridesRouter.put('/:productId', (req: AuthRequest, res) => {
  const db = getDb()
  const { overrides } = req.body

  db.transaction(() => {
    db.prepare('DELETE FROM product_commission_overrides WHERE product_id = ?').run(req.params.productId)
    if (overrides && Array.isArray(overrides)) {
      const stmt = db.prepare(
        'INSERT INTO product_commission_overrides (listino_id, product_id, commission_percent) VALUES (?, ?, ?)'
      )
      for (const o of overrides) {
        stmt.run(o.listino_id, parseInt(req.params.productId), o.commission_percent)
      }
    }
  })()

  const updated = db.prepare(
    'SELECT * FROM product_commission_overrides WHERE product_id = ?'
  ).all(req.params.productId)

  res.json({ success: true, data: updated })
})

productCommissionOverridesRouter.delete('/:productId', (req: AuthRequest, res) => {
  const db = getDb()
  db.prepare('DELETE FROM product_commission_overrides WHERE product_id = ?').run(req.params.productId)
  res.json({ success: true })
})
