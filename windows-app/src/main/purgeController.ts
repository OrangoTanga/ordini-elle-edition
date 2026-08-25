import { Router } from 'express'
import { getDb } from './database'
import { authenticateToken, AuthRequest } from './middleware/auth'
import { exportOrdersToExcel, ExportOrder } from './excelExport'
import path from 'path'
import { mkdirSync, existsSync } from 'fs'

export const purgeRouter = Router()

purgeRouter.use(authenticateToken)

// Get purge config
purgeRouter.get('/config', (_req: AuthRequest, res) => {
  const db = getDb()
  const rows = db.prepare('SELECT key, value FROM purge_config').all() as { key: string; value: string }[]
  const config: Record<string, string> = {}
  for (const r of rows) {
    config[r.key] = r.value
  }
  res.json({ success: true, data: config })
})

// Update purge config
purgeRouter.put('/config', (req: AuthRequest, res) => {
  const db = getDb()
  const { auto_purge_enabled, purge_days_threshold } = req.body

  if (auto_purge_enabled !== undefined) {
    if (auto_purge_enabled !== 'true' && auto_purge_enabled !== 'false') {
      res.status(400).json({ success: false, error: 'auto_purge_enabled deve essere true o false' })
      return
    }
    db.prepare("UPDATE purge_config SET value = ? WHERE key = 'auto_purge_enabled'").run(auto_purge_enabled)
    db.prepare("INSERT OR IGNORE INTO purge_config (key, value) VALUES ('auto_purge_enabled', ?)").run(auto_purge_enabled)
  }

  if (purge_days_threshold !== undefined) {
    const days = parseInt(purge_days_threshold, 10)
    if (isNaN(days) || days < 1 || days > 3650) {
      res.status(400).json({ success: false, error: 'purge_days_threshold deve essere tra 1 e 3650' })
      return
    }
    db.prepare("UPDATE purge_config SET value = ? WHERE key = 'purge_days_threshold'").run(String(days))
    db.prepare("INSERT OR IGNORE INTO purge_config (key, value) VALUES ('purge_days_threshold', ?)").run(String(days))
  }

  res.json({ success: true })
})

// Get purge history
purgeRouter.get('/history', (_req: AuthRequest, res) => {
  const db = getDb()
  const tasks = db.prepare('SELECT * FROM purge_tasks ORDER BY created_at DESC LIMIT 50').all()
  res.json({ success: true, data: tasks })
})

// Get orders eligible for purge (older than threshold)
purgeRouter.get('/eligible', (req: AuthRequest, res) => {
  const db = getDb()
  const days = parseInt((req.query.days as string) || '90', 10)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().substring(0, 19).replace('T', ' ')

  const orders = db.prepare(`
    SELECT o.*, u.name as user_name
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.created_at < ?
    ORDER BY o.created_at ASC
  `).all(cutoffStr)

  const result = (orders as any[]).map(order => ({
    ...order,
    items: db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id),
    payments: db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY due_date ASC').all(order.id),
  }))

  res.json({ success: true, data: result })
})

// Manual purge: export + delete orders
purgeRouter.post('/run', async (req: AuthRequest, res) => {
  const db = getDb()
  const { order_ids } = req.body

  if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
    res.status(400).json({ success: false, error: 'Specificare almeno un ID ordine' })
    return
  }

  if (order_ids.length > 1000) {
    res.status(400).json({ success: false, error: 'Massimo 1000 ordini per volta' })
    return
  }

  try {
    const result = await executePurge(order_ids)
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Errore durante la cancellazione' })
  }
})

export async function executePurge(order_ids: number[]): Promise<{ exported_file: string; purged_count: number }> {
  const db = getDb()
  const idsStr = order_ids.join(',')

  // Step 1: Create task in purge_tasks
  const taskResult = db.prepare(`
    INSERT INTO purge_tasks (status, order_ids, total_orders)
    VALUES ('pending', ?, ?)
  `).run(idsStr, order_ids.length)
  const taskId = taskResult.lastInsertRowid

  try {
    // Step 2: Fetch full order data
    const placeholders = order_ids.map(() => '?').join(',')
    const orders = db.prepare(`
      SELECT o.*, u.name as user_name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id IN (${placeholders})
    `).all(...order_ids) as any[]

    const fullOrders: ExportOrder[] = orders.map(order => ({
      ...order,
      items: db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id) as any,
      payments: db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY due_date ASC').all(order.id) as any,
    }))

    // Step 3: Export to Excel
    const filePath = await exportOrdersToExcel(fullOrders)

    // Step 4: Mark task as exported
    db.prepare('UPDATE purge_tasks SET status = ?, exported_file = ? WHERE id = ?')
      .run('exported', filePath, taskId)

    // Step 5: Delete orders (cascade will delete order_items, payments, shared_reps)
    db.prepare(`DELETE FROM orders WHERE id IN (${placeholders})`)
      .run(...order_ids)

    // Step 6: Mark task as completed
    db.prepare('UPDATE purge_tasks SET status = ?, completed_at = datetime("now") WHERE id = ?')
      .run('completed', taskId)

    // Step 7: Add to purge_log
    db.prepare('INSERT INTO purge_log (task_id, purged_orders, exported_file) VALUES (?, ?, ?)')
      .run(taskId, order_ids.length, filePath)

    return { exported_file: filePath, purged_count: order_ids.length }
  } catch (err: any) {
    // Step 2b: Mark task as failed with error
    db.prepare('UPDATE purge_tasks SET status = ?, error = ? WHERE id = ?')
      .run('failed', err.message || String(err), taskId)
    throw err
  }
}

// Retry failed purge tasks (failover recovery)
export async function retryFailedTasks(): Promise<void> {
  const db = getDb()

  // Find tasks stuck in 'pending' or 'exported' status
  const stuckTasks = db.prepare(`
    SELECT * FROM purge_tasks
    WHERE status IN ('pending', 'exported')
    AND datetime(created_at) < datetime('now', '-1 hour')
    ORDER BY created_at ASC
  `).all() as any[]

  for (const task of stuckTasks) {
    try {
      const ids = task.order_ids.split(',').map((s: string) => parseInt(s, 10)).filter((n: number) => !isNaN(n))
      if (ids.length === 0) {
        db.prepare("UPDATE purge_tasks SET status = 'failed', error = 'Nessun ID valido' WHERE id = ?").run(task.id)
        continue
      }

      if (task.status === 'pending') {
        // Full retry
        await executePurge(ids)
      } else if (task.status === 'exported') {
        // Already exported, just delete orders
        const placeholders = ids.map(() => '?').join(',')
        const existingOrders = db.prepare(`SELECT id FROM orders WHERE id IN (${placeholders})`).all(...ids) as any[]
        if (existingOrders.length > 0) {
          const existingIds = existingOrders.map((o: any) => o.id)
          const ph = existingIds.map(() => '?').join(',')
          db.prepare(`DELETE FROM orders WHERE id IN (${ph})`).run(...existingIds)
        }
        db.prepare('UPDATE purge_tasks SET status = ?, completed_at = datetime("now") WHERE id = ?')
          .run('completed', task.id)
        db.prepare('INSERT INTO purge_log (task_id, purged_orders, exported_file) VALUES (?, ?, ?)')
          .run(task.id, ids.length, task.exported_file)
      }
    } catch {
      // Leave as failed, will retry next cycle
    }
  }
}
