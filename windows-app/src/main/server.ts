import express from 'express'
import cors from 'cors'
import http from 'http'
import { initDatabase, closeDatabase } from './database'
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

const PORT = 3899

let app: express.Express
let server: http.Server

export async function startServer(): Promise<http.Server> {
  await initDatabase()

  app = express()
  app.use(cors())
  app.use(express.json({ limit: '1mb' }))

  app.use('/api/auth', authRouter)
  app.use('/api/orders', ordersRouter)
  app.use('/api/products', productsRouter)
  app.use('/api/customers', customersRouter)
  app.use('/api/users', usersRouter)
  app.use('/api/payments', paymentsRouter)
  app.use('/api/product-commission-overrides', productCommissionOverridesRouter)
  app.use('/api/purge', purgeRouter)
  app.use('/api/settings', settingsRouter)

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
  if (server) server.close()
  closeDatabase()
}

export { app, server }
