import express from 'express'
import cors from 'cors'
import http from 'http'
import { initDatabase, closeDatabase, persist } from './database'
import { initIO, closeIO } from './wss'
import { authRouter } from './routes/auth'
import { ordersRouter } from './routes/orders'
import { productsRouter } from './routes/products'
import { customersRouter } from './routes/customers'
import { usersRouter } from './routes/users'
import { paymentsRouter } from './routes/payments'
import { productCommissionOverridesRouter } from './routes/productCommissionOverrides'
import { purgeRouter } from './purgeController'
import { settingsRouter } from './routes/settings'
import { listiniRouter } from './routes/listini'
import { categoriesRouter } from './routes/categories'
import { listinoPricesRouter } from './routes/listinoPrices'
import { commissionExceptionsRouter } from './routes/commissionExceptions'

const PORT = 3899

let app: express.Express
let server: http.Server

export async function startServer(): Promise<http.Server> {
  await initDatabase()

  app = express()
  app.use(cors())
  app.use(express.json({ limit: '1mb' }))

  // Persist the in-memory sql.js database to disk after each request completes.
  // The database lives fully in memory (writes are cheap); exporting after the
  // request guarantees durability without finalizing in-flight prepared
  // statements (sql.js export() closes all statements, which would break
  // multi-statement loops and transactions if called mid-request).
  app.use((_req, res, next) => {
    res.on('finish', () => {
      try {
        persist()
      } catch (err) {
        console.error('[Server] Errore persistenza DB:', err)
      }
    })
    next()
  })

  app.use('/api/auth', authRouter)
  app.use('/api/orders', ordersRouter)
  app.use('/api/products', productsRouter)
  app.use('/api/customers', customersRouter)
  app.use('/api/users', usersRouter)
  app.use('/api/payments', paymentsRouter)
  app.use('/api/product-commission-overrides', productCommissionOverridesRouter)
  app.use('/api/purge', purgeRouter)
  app.use('/api/settings', settingsRouter)
  app.use('/api/listini', listiniRouter)
  app.use('/api/categories', categoriesRouter)
  app.use('/api/listino-prices', listinoPricesRouter)
  app.use('/api/commission-exceptions', commissionExceptionsRouter)

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  server = http.createServer(app)
  initIO(server)

  server.on('error', (err: NodeJS.ErrnoException) => {
    console.error(`[Server] Errore server locale: ${err.message}`)
  })

  server.listen(PORT, () => {
    console.log(`[Server] In ascolto su http://localhost:${PORT}`)
  })

  return server
}

export function stopServer(): void {
  closeIO()
  if (server) {
    // Chiude forzatamente tutte le connessioni pendenti (HTTP keep-alive e
    // socket WebSocket) cosi' server.close() non resta appeso e il processo
    // puo' terminare subito (essenziale durante l'aggiornamento OTA).
    ;(server as any).closeAllConnections?.()
    ;(server as any).closeIdleConnections?.()
    server.close()
  }
  closeDatabase()
}

export { app, server }
