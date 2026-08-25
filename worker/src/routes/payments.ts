import type { Env } from '../types'

export async function handleListPayments(env: Env, url: URL, auth: { userId: number; userName: string; isAdmin: boolean }): Promise<Response> {
  const orderId = url.searchParams.get('order_id')
  const status = url.searchParams.get('status')
  const fromDue = url.searchParams.get('from_due')
  const toDue = url.searchParams.get('to_due')
  const customer = url.searchParams.get('customer_business_name')
  const userId = url.searchParams.get('user_id')

  let query = `
    SELECT p.*, o.business_name as order_business_name, o.user_id as order_user_id,
           o.total as order_total, o.invoice_date
    FROM payments p
    JOIN orders o ON p.order_id = o.id
    WHERE 1=1
  `
  const binds: any[] = []

  if (orderId) { query += ' AND p.order_id = ?'; binds.push(parseInt(orderId)) }
  if (status) {
    const statuses = status.split(',')
    query += ` AND p.status IN (${statuses.map(() => '?').join(',')})`
    binds.push(...statuses)
  }
  if (fromDue) { query += ' AND p.due_date >= ?'; binds.push(fromDue) }
  if (toDue) { query += ' AND p.due_date <= ?'; binds.push(toDue) }
  if (customer) { query += ' AND LOWER(o.business_name) LIKE ?'; binds.push('%' + customer.toLowerCase() + '%') }
  if (userId) { query += ' AND o.user_id = ?'; binds.push(parseInt(userId)) }

  query += ' ORDER BY p.due_date ASC'

  const stmt = env.DB.prepare(query)
  const payments = await stmt.bind(...binds).all<any>()

  return Response.json({ success: true, data: payments.results })
}

export async function handlePaymentSummary(env: Env, url: URL, auth: { userId: number; userName: string; isAdmin: boolean }): Promise<Response> {
  const userId = url.searchParams.get('user_id') || (auth.isAdmin ? undefined : String(auth.userId))
  const fromDue = url.searchParams.get('from_due')
  const toDue = url.searchParams.get('to_due')

  let pendingQuery = `SELECT COALESCE(SUM(p.amount - p.paid_amount), 0) as total FROM payments p JOIN orders o ON p.order_id = o.id WHERE p.status = 'pending'`
  let overdueQuery = `SELECT COALESCE(SUM(p.amount - p.paid_amount), 0) as total FROM payments p JOIN orders o ON p.order_id = o.id WHERE p.status = 'overdue'`
  let paidQuery = `SELECT COALESCE(SUM(p.paid_amount), 0) as total FROM payments p JOIN orders o ON p.order_id = o.id WHERE p.status = 'paid'`
  let upcomingQuery = `SELECT COUNT(*) as count FROM payments p JOIN orders o ON p.order_id = o.id WHERE p.status = 'pending' AND p.due_date <= date('now', '+7 days')`
  const pendingBinds: any[] = []; const overdueBinds: any[] = []; const paidBinds: any[] = []; const upcomingBinds: any[] = []

  if (userId) {
    const u = ` AND o.user_id = ?`
    pendingQuery += u; overdueQuery += u; paidQuery += u; upcomingQuery += u
    pendingBinds.push(parseInt(userId)); overdueBinds.push(parseInt(userId)); paidBinds.push(parseInt(userId)); upcomingBinds.push(parseInt(userId))
  }

  const [pending, overdue, paid, upcoming] = await Promise.all([
    env.DB.prepare(pendingQuery).bind(...pendingBinds).first<{ total: number }>(),
    env.DB.prepare(overdueQuery).bind(...overdueBinds).first<{ total: number }>(),
    env.DB.prepare(paidQuery).bind(...paidBinds).first<{ total: number }>(),
    env.DB.prepare(upcomingQuery).bind(...upcomingBinds).first<{ count: number }>(),
  ])

  return Response.json({
    success: true,
    data: {
      pending_total: Math.round((pending?.total || 0) * 100) / 100,
      overdue_total: Math.round((overdue?.total || 0) * 100) / 100,
      paid_total: Math.round((paid?.total || 0) * 100) / 100,
      upcoming_count: upcoming?.count || 0,
    }
  })
}

export async function handleUpdatePayment(env: Env, id: string, body: any): Promise<Response> {
  const { paid_amount, paid_date, status, notes } = body || {}

  if (!paid_amount && !status) {
    return Response.json({ success: false, error: 'paid_amount o status richiesto' }, { status: 400 })
  }

  const payment = await env.DB.prepare('SELECT * FROM payments WHERE id = ?').bind(id).first<any>()
  if (!payment) {
    return Response.json({ success: false, error: 'Pagamento non trovato' }, { status: 404 })
  }

  const updates: string[] = []
  const binds: any[] = []

  if (paid_amount != null) { updates.push('paid_amount = ?'); binds.push(parseFloat(paid_amount)) }
  if (paid_date) { updates.push('paid_date = ?'); binds.push(paid_date) }
  if (status) { updates.push('status = ?'); binds.push(status) }
  if (notes !== undefined) { updates.push('notes = ?'); binds.push(notes) }

  if (updates.length > 0) {
    binds.push(id)
    await env.DB.prepare(`UPDATE payments SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run()
  }

  // Update order payment_status based on all payments
  const allPayments = await env.DB.prepare('SELECT * FROM payments WHERE order_id = ?').bind(payment.order_id).all<any>()
  const allPaid = allPayments.results.every(p => p.status === 'paid')
  const hasOverdue = allPayments.results.some(p => p.status === 'overdue')
  const hasPartial = allPayments.results.some(p => p.status === 'pending' && p.paid_amount > 0)

  let orderStatus = 'pending'
  if (allPaid) orderStatus = 'paid'
  else if (hasOverdue) orderStatus = 'overdue'
  else if (hasPartial) orderStatus = 'partial'

  await env.DB.prepare('UPDATE orders SET payment_status = ? WHERE id = ?').bind(orderStatus, payment.order_id).run()

  const updated = await env.DB.prepare('SELECT * FROM payments WHERE id = ?').bind(id).first<any>()

  return Response.json({ success: true, data: updated })
}

export function generatePayments(
  paymentType: string, total: number, invoiceDate: string,
  depositPercent?: number, balanceDays?: number
): { amount: number; due_date: string; type: string; status: string; paid_date?: string; paid_amount?: number }[] {
  const today = new Date().toISOString().split('T')[0]

  switch (paymentType) {
    case 'immediato':
      return [{ amount: total, due_date: today, type: 'pagamento', status: 'paid', paid_date: today, paid_amount: total }]

    case 'anticipato':
      return [{ amount: total, due_date: invoiceDate || today, type: 'anticipato', status: 'pending' }]

    case 'dilazionato': {
      const dueDate = addDays(invoiceDate || today, balanceDays || 30)
      return [{ amount: total, due_date: dueDate, type: 'pagamento', status: 'pending' }]
    }

    case 'acconto_saldo': {
      const dp = (depositPercent || 30) / 100
      const deposit = Math.round(total * dp * 100) / 100
      const balance = Math.round((total - deposit) * 100) / 100
      const balanceDate = addDays(invoiceDate || today, balanceDays || 30)
      return [
        { amount: deposit, due_date: today, type: 'acconto', status: 'pending' },
        { amount: balance, due_date: balanceDate, type: 'saldo', status: 'pending' },
      ]
    }

    default:
      return [{ amount: total, due_date: addDays(invoiceDate || today, 30), type: 'pagamento', status: 'pending' }]
  }
}

export async function getPaymentStatus(env: Env, orderId: number): Promise<string> {
  const payments = await env.DB.prepare('SELECT status FROM payments WHERE order_id = ?').bind(orderId).all<any>()
  if (payments.results.length === 0) return 'pending'
  const allPaid = payments.results.every(p => p.status === 'paid')
  if (allPaid) return 'paid'
  const hasOverdue = payments.results.some(p => p.status === 'overdue')
  if (hasOverdue) return 'overdue'
  return payments.results.some(p => p.status === 'paid') ? 'partial' : 'pending'
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}
