import { getDb } from './database'
import { executePurge, retryFailedTasks } from './purgeController'

let intervalHandle: ReturnType<typeof setInterval> | null = null
let running = false

async function tick(): Promise<void> {
  if (running) return
  running = true

  try {
    // Step 1: Retry any failed/stuck tasks (failover)
    await retryFailedTasks()

    // Step 2: Check if auto-purge is enabled
    const db = getDb()
    const enabledRow = db.prepare("SELECT value FROM purge_config WHERE key = 'auto_purge_enabled'").get() as { value: string } | undefined
    if (!enabledRow || enabledRow.value !== 'true') return

    const daysRow = db.prepare("SELECT value FROM purge_config WHERE key = 'purge_days_threshold'").get() as { value: string } | undefined
    const days = parseInt(daysRow?.value || '90', 10)

    // Check if there's already a purge task in progress
    const activeTask = db.prepare("SELECT COUNT(*) as cnt FROM purge_tasks WHERE status IN ('pending', 'exported')").get() as { cnt: number } | undefined
    if (activeTask && activeTask.cnt > 0) return

    // Find orders older than threshold
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffStr = cutoff.toISOString().substring(0, 19).replace('T', ' ')

    const oldOrders = db.prepare('SELECT id FROM orders WHERE created_at < ? ORDER BY created_at ASC LIMIT 500').all(cutoffStr) as { id: number }[]

    if (oldOrders.length === 0) return

    // Execute purge in batches of 100 to avoid blocking
    const batchSize = 100
    for (let i = 0; i < oldOrders.length; i += batchSize) {
      const batch = oldOrders.slice(i, i + batchSize).map(o => o.id)
      try {
        await executePurge(batch)
      } catch {
        // Log error and continue with next batch
        console.error(`[Scheduler] Errore nel purge batch ${i / batchSize + 1}`)
      }
    }
  } catch (err) {
    console.error('[Scheduler] Errore:', err)
  } finally {
    running = false
  }
}

export function startScheduler(): void {
  console.log('[Scheduler] Avviato (intervallo: 30s)')
  // Run immediately on start (failover recovery)
  tick()
  intervalHandle = setInterval(tick, 30000)
}

export function stopScheduler(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle)
    intervalHandle = null
  }
  console.log('[Scheduler] Arrestato')
}
