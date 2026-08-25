import type { Env } from '../types'
import { generatePayments } from './payments'
import { getEffectiveCommission } from './listini'

async function getItemTierCommission(
  env: Env, productId: number, category: string, sellingPrice: number, subtotal: number, basePrice: number
): Promise<{ commission_percent: number; commission: number }> {
  const listini = await env.DB.prepare('SELECT * FROM listini ORDER BY sort_order ASC').all<any>()
  const prices = await env.DB.prepare(
    'SELECT listino_id, price FROM listino_prices WHERE product_id = ?'
  ).bind(productId).all<any>()

  const priceMap: Record<number, number> = {}
  for (const p of prices.results) {
    priceMap[p.listino_id] = p.price
  }

  let tierListinoId: number | null = null
  const sp = Number(sellingPrice)
  for (const l of listini.results) {
    const tierPrice = priceMap[l.id] ?? (l.sort_order === 1 ? basePrice : null)
    if (tierPrice !== null && sp >= Number(tierPrice)) {
      tierListinoId = l.id
      break
    }
  }

  if (!tierListinoId) {
    return { commission_percent: 0, commission: 0 }
  }

  const commPercent = await getEffectiveCommission(env, tierListinoId, productId, category)
  return {
    commission_percent: commPercent,
    commission: Math.round(subtotal * commPercent / 100 * 100) / 100,
  }
}

async function computeOrderCommission(env: Env, orderId: number, listinoId: number, items: any[]): Promise<{ itemsWithCommission: any[]; commissionTotal: number }> {
  let commissionTotal = 0
  const itemsWithCommission = []
  for (const oi of items) {
    const product = await env.DB.prepare('SELECT category, price FROM products WHERE id = ?').bind(oi.product_id).first<{ category: string; price: number }>()
    const { commission_percent, commission } = await getItemTierCommission(env, oi.product_id, product?.category || '', oi.price, oi.subtotal, product?.price || 0)
    commissionTotal += commission
    itemsWithCommission.push({ ...oi, commission_percent, commission })
  }
  return { itemsWithCommission, commissionTotal: Math.round(commissionTotal * 100) / 100 }
}

async function getSharedReps(env: Env, orderId: number): Promise<any[]> {
  const reps = await env.DB.prepare(`
    SELECT osr.*, u.name as user_name
    FROM order_shared_reps osr
    JOIN users u ON osr.user_id = u.id
    WHERE osr.order_id = ?
  `).bind(orderId).all<any>()
  return reps.results
}

export async function handleListOrders(env: Env, url: URL): Promise<Response> {
  const status = url.searchParams.get('status')
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const search = url.searchParams.get('search')
  const minTotal = url.searchParams.get('min_total')
  const maxTotal = url.searchParams.get('max_total')
  const userId = url.searchParams.get('user_id')

  let query = `
    SELECT o.*, u.name as user_name
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE 1=1
  `
  const binds: any[] = []

  if (status && status !== 'all') {
    query += ' AND o.status = ?'
    binds.push(status)
  }
  if (from) {
    query += ' AND o.created_at >= ?'
    binds.push(from)
  }
  if (to) {
    query += ' AND o.created_at <= ?'
    binds.push(to + 'T23:59:59')
  }
  if (search) {
    query += ' AND LOWER(o.business_name) LIKE ?'
    binds.push('%' + search.toLowerCase() + '%')
  }
  if (minTotal) {
    query += ' AND o.total >= ?'
    binds.push(parseFloat(minTotal))
  }
  if (maxTotal) {
    query += ' AND o.total <= ?'
    binds.push(parseFloat(maxTotal))
  }
  if (userId) {
    query += ' AND (o.user_id = ? OR o.id IN (SELECT order_id FROM order_shared_reps WHERE user_id = ?))'
    binds.push(parseInt(userId), parseInt(userId))
  }

  query += ' ORDER BY o.created_at DESC'

  const stmt = env.DB.prepare(query)
  const orders = await stmt.bind(...binds).all<any>()

  const result = []
  for (const order of orders.results) {
    const items = await env.DB.prepare('SELECT * FROM order_items WHERE order_id = ?').bind(order.id).all<any>()
    const { itemsWithCommission, commissionTotal } = await computeOrderCommission(env, order.id, order.listino_id || 1, items.results)
    const sharedReps = await getSharedReps(env, order.id)
    const repCount = 1 + sharedReps.length
    result.push({
      ...order,
      items: itemsWithCommission,
      commission_total: commissionTotal,
      commission_per_rep: Math.round(commissionTotal / repCount * 100) / 100,
      shared_reps: sharedReps,
    })
  }

  return Response.json({ success: true, data: result })
}

export async function handleGetOrder(env: Env, id: string): Promise<Response> {
  const order = await env.DB.prepare(`
    SELECT o.*, u.name as user_name
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.id = ?
  `).bind(id).first<any>()

  if (!order) {
    return Response.json({ success: false, error: 'Ordine non trovato' }, { status: 404 })
  }

  const items = await env.DB.prepare('SELECT * FROM order_items WHERE order_id = ?').bind(order.id).all<any>()
  const { itemsWithCommission, commissionTotal } = await computeOrderCommission(env, order.id, order.listino_id || 1, items.results)
  const payments = await env.DB.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY due_date ASC').bind(order.id).all<any>()
  const sharedReps = await getSharedReps(env, order.id)
  const repCount = 1 + sharedReps.length

  return Response.json({
    success: true,
    data: {
      ...order,
      items: itemsWithCommission,
      commission_total: commissionTotal,
      commission_per_rep: Math.round(commissionTotal / repCount * 100) / 100,
      payments: payments.results,
      shared_reps: sharedReps,
    }
  })
}

export async function handleCreateOrder(env: Env, body: any, userId: number, userName: string): Promise<Response> {
  const {
    business_name, customer_id, vat, iban, invoice_date, payment_type, payment_days,
    deposit_percent, balance_days, total, items, notes, listino_id, listino_name,
    shared_user_ids, document_type,
  } = body || {}

  if (!business_name || !items || !items.length) {
    return Response.json({ success: false, error: 'Dati ordine incompleti' }, { status: 400 })
  }

  if (!listino_id) {
    return Response.json({ success: false, error: 'listino_id richiesto' }, { status: 400 })
  }

  const actualDocumentType = document_type === 'fattura' ? 'fattura' : 'scontrino'

  const actualPaymentType = payment_type || 'dilazionato'
  const actualPaymentDays = payment_days || 30
  const actualDepositPercent = deposit_percent || 30
  const actualBalanceDays = balance_days || 30

  for (const item of items) {
    const minPrice = await env.DB.prepare(
      `SELECT price FROM listino_prices WHERE product_id = ? AND listino_id = (
        SELECT id FROM listini ORDER BY sort_order DESC LIMIT 1
      )`
    ).bind(item.product_id).first<{ price: number }>()

    if (minPrice && item.price < minPrice.price) {
      return Response.json({
        success: false,
        error: `Prezzo per "${item.product_name}" (€${item.price.toFixed(2)}) inferiore al minimo (€${minPrice.price.toFixed(2)})`
      }, { status: 400 })
    }
  }

  const insertOrder = env.DB.prepare(`
    INSERT INTO orders (user_id, customer_id, business_name, vat, iban, invoice_date,
      payment_terms, payment_type, payment_days, deposit_percent, balance_days,
      total, notes, status, listino_id, payment_status, document_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, 'pending', ?)
  `)

  const insertItem = env.DB.prepare(`
    INSERT INTO order_items (order_id, product_id, product_name, price, quantity, subtotal)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const paymentTerms = actualPaymentType === 'immediato' ? 'immediato'
    : actualPaymentType === 'anticipato' ? 'anticipato'
    : actualPaymentType === 'acconto_saldo' ? 'acconto_saldo'
    : String(actualPaymentDays)

  const result = await env.DB.batch([
    insertOrder.bind(userId, customer_id || null, business_name, vat || '', iban || '',
      invoice_date, paymentTerms, actualPaymentType, actualPaymentDays,
      actualDepositPercent, actualBalanceDays, total, notes || '', listino_id,
      actualDocumentType),
  ])

  const orderId = result[0].meta.last_row_id

  const itemBinds = (items as any[]).map((item: any) =>
    insertItem.bind(orderId, item.product_id, item.product_name, item.price, item.quantity, item.subtotal)
  )

  await env.DB.batch(itemBinds)

  // Generate payments
  const payments = generatePayments(actualPaymentType, total, invoice_date, actualDepositPercent, actualBalanceDays)
  const nowIso = new Date().toISOString()
  const insertPayment = env.DB.prepare(`
    INSERT INTO payments (order_id, amount, due_date, paid_date, paid_amount, type, status, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const paymentBinds = payments.map(p =>
    insertPayment.bind(orderId, p.amount, p.due_date, p.paid_date || null, p.paid_amount || 0, p.type, p.status, '', nowIso)
  )
  await env.DB.batch(paymentBinds)

  // Handle shared reps
  if (shared_user_ids && Array.isArray(shared_user_ids) && shared_user_ids.length > 0) {
    const insertShared = env.DB.prepare('INSERT OR IGNORE INTO order_shared_reps (order_id, user_id) VALUES (?, ?)')
    const sharedBinds = shared_user_ids.map((uid: number) => insertShared.bind(orderId, uid))
    await env.DB.batch(sharedBinds)
  }

  const order = await env.DB.prepare(`
    SELECT o.*, u.name as user_name
    FROM orders o JOIN users u ON o.user_id = u.id
    WHERE o.id = ?
  `).bind(orderId).first<any>()

  const orderItems = await env.DB.prepare('SELECT * FROM order_items WHERE order_id = ?').bind(orderId).all<any>()
  const { itemsWithCommission, commissionTotal } = await computeOrderCommission(env, orderId, listino_id, orderItems.results)
  const orderPayments = await env.DB.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY due_date ASC').bind(orderId).all<any>()
  const sharedReps = await getSharedReps(env, orderId)
  const repCount = 1 + sharedReps.length

  return Response.json({
    success: true,
    data: {
      ...order,
      items: itemsWithCommission,
      commission_total: commissionTotal,
      commission_per_rep: Math.round(commissionTotal / repCount * 100) / 100,
      payments: orderPayments.results,
      shared_reps: sharedReps,
    }
  }, { status: 201 })
}

export async function handleUpdateOrderStatus(env: Env, id: string, body: any): Promise<Response> {
  const { status, notes } = body || {}

  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return Response.json({ success: false, error: 'Stato non valido' }, { status: 400 })
  }

  await env.DB.prepare(
    'UPDATE orders SET status = ?, notes = ?, updated_at = datetime("now") WHERE id = ?'
  ).bind(status, notes || '', id).run()

  const order = await env.DB.prepare(`
    SELECT o.*, u.name as user_name
    FROM orders o JOIN users u ON o.user_id = u.id
    WHERE o.id = ?
  `).bind(id).first<any>()

  const items = await env.DB.prepare('SELECT * FROM order_items WHERE order_id = ?').bind(order.id).all<any>()
  const { itemsWithCommission, commissionTotal } = await computeOrderCommission(env, order.id, order.listino_id || 1, items.results)
  const sharedReps = await getSharedReps(env, order.id)
  const repCount = 1 + sharedReps.length

  return Response.json({
    success: true, data: {
      ...order,
      items: itemsWithCommission,
      commission_total: commissionTotal,
      commission_per_rep: Math.round(commissionTotal / repCount * 100) / 100,
      shared_reps: sharedReps,
    }
  })
}

export async function handleDashboard(env: Env): Promise<Response> {
  const today = await env.DB.prepare(
    `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM orders WHERE date(created_at) = date('now')`
  ).first()

  const pending = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM orders WHERE status = 'pending'`
  ).first()

  const approved = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM orders WHERE status = 'approved'`
  ).first()

  const rejected = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM orders WHERE status = 'rejected'`
  ).first()

  const pendingOrders = await env.DB.prepare(`
    SELECT o.*, u.name as user_name
    FROM orders o JOIN users u ON o.user_id = u.id
    WHERE o.status = 'pending'
    ORDER BY o.created_at DESC LIMIT 10
  `).all<any>()

  const pendingWithItems = []
  for (const o of pendingOrders.results) {
    const items = await env.DB.prepare('SELECT * FROM order_items WHERE order_id = ?').bind(o.id).all<any>()
    const { itemsWithCommission, commissionTotal } = await computeOrderCommission(env, o.id, o.listino_id || 1, items.results)
    pendingWithItems.push({ ...o, items: itemsWithCommission, commission_total: commissionTotal })
  }

  return Response.json({
    success: true,
    data: { today, pending, approved, rejected, pendingOrders: pendingWithItems },
  })
}
