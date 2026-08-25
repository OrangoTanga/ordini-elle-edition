import type { Env } from '../types'

export async function handleListCustomers(env: Env, auth: { userId: number; isAdmin: boolean }): Promise<Response> {
  let rows
  if (auth.isAdmin) {
    rows = await env.DB.prepare(
      'SELECT c.*, u.name as user_name FROM customers c LEFT JOIN users u ON c.user_id = u.id ORDER BY c.business_name'
    ).all<any>()
  } else {
    rows = await env.DB.prepare(
      'SELECT c.*, u.name as user_name FROM customers c LEFT JOIN users u ON c.user_id = u.id WHERE c.user_id = ? ORDER BY c.business_name'
    ).bind(auth.userId).all<any>()
  }

  const result = []
  for (const c of rows.results) {
    const stats = await env.DB.prepare(
      'SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM orders WHERE customer_id = ?'
    ).bind(c.id).first<any>()
    result.push({ ...c, order_count: stats.count, order_total: stats.total })
  }

  return Response.json({ success: true, data: result })
}

export async function handleGetCustomer(env: Env, id: string): Promise<Response> {
  const customer = await env.DB.prepare('SELECT * FROM customers WHERE id = ?').bind(id).first<any>()
  if (!customer) {
    return Response.json({ success: false, error: 'Cliente non trovato' }, { status: 404 })
  }
  return Response.json({ success: true, data: customer })
}

export async function handleCreateCustomer(env: Env, body: any, auth: { userId: number }): Promise<Response> {
  const { business_name, vat, iban, address, phone, email } = body || {}

  if (!business_name) {
    return Response.json({ success: false, error: 'Nome attività richiesto' }, { status: 400 })
  }

  const result = await env.DB.prepare(
    'INSERT INTO customers (business_name, vat, iban, address, phone, email, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(business_name, vat || '', iban || '', address || '', phone || '', email || '', auth.userId).run()

  const customer = await env.DB.prepare('SELECT * FROM customers WHERE id = ?').bind(result.meta.last_row_id).first<any>()
  return Response.json({ success: true, data: customer }, { status: 201 })
}

export async function handleUpdateCustomer(env: Env, id: string, body: any, auth: { userId: number; isAdmin: boolean }): Promise<Response> {
  const existing = await env.DB.prepare('SELECT * FROM customers WHERE id = ?').bind(id).first<any>()
  if (!existing) {
    return Response.json({ success: false, error: 'Cliente non trovato' }, { status: 404 })
  }

  if (!auth.isAdmin && existing.user_id !== auth.userId) {
    return Response.json({ success: false, error: 'Non autorizzato' }, { status: 403 })
  }

  const { business_name, vat, iban, address, phone, email } = body || {}

  await env.DB.prepare(
    'UPDATE customers SET business_name=?, vat=?, iban=?, address=?, phone=?, email=? WHERE id=?'
  ).bind(
    business_name ?? existing.business_name,
    vat ?? existing.vat,
    iban ?? existing.iban,
    address ?? existing.address,
    phone ?? existing.phone,
    email ?? existing.email,
    id
  ).run()

  const customer = await env.DB.prepare('SELECT * FROM customers WHERE id = ?').bind(id).first<any>()
  return Response.json({ success: true, data: customer })
}

export async function handleDeleteCustomer(env: Env, id: string, auth: { userId: number; isAdmin: boolean }): Promise<Response> {
  const existing = await env.DB.prepare('SELECT * FROM customers WHERE id = ?').bind(id).first<any>()
  if (!existing) {
    return Response.json({ success: false, error: 'Cliente non trovato' }, { status: 404 })
  }

  if (!auth.isAdmin && existing.user_id !== auth.userId) {
    return Response.json({ success: false, error: 'Non autorizzato' }, { status: 403 })
  }

  await env.DB.prepare('DELETE FROM customers WHERE id = ?').bind(id).run()
  return Response.json({ success: true, data: { id: parseInt(id) } })
}
