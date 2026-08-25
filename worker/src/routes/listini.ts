import type { Env } from '../types'

export async function getEffectiveCommission(env: Env, listinoId: number, productId: number, category: string): Promise<number> {
  // 1. Product-specific override
  const override = await env.DB.prepare(
    'SELECT commission_percent FROM product_commission_overrides WHERE listino_id = ? AND product_id = ?'
  ).bind(listinoId, productId).first<{ commission_percent: number }>()
  if (override) return override.commission_percent

  // 2. Category exception
  const exception = await env.DB.prepare(
    'SELECT commission_percent FROM commission_exceptions WHERE listino_id = ? AND category = ?'
  ).bind(listinoId, category).first<{ commission_percent: number }>()
  if (exception) return exception.commission_percent

  // 3. Listino default
  const listino = await env.DB.prepare('SELECT commission_percent FROM listini WHERE id = ?').bind(listinoId).first<{ commission_percent: number }>()
  if (listino) return listino.commission_percent

  return 0
}

export async function handleAutoCalculateCommission(env: Env, body: any): Promise<Response> {
  const { product_id } = body || {}
  if (!product_id) {
    return Response.json({ success: false, error: 'product_id richiesto' }, { status: 400 })
  }

  const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(product_id).first<any>()
  if (!product) {
    return Response.json({ success: false, error: 'Prodotto non trovato' }, { status: 404 })
  }

  const listini = await env.DB.prepare('SELECT * FROM listini ORDER BY sort_order').all<any>()
  const prices = await env.DB.prepare(
    'SELECT * FROM listino_prices WHERE product_id = ? ORDER BY listino_id'
  ).bind(product_id).all<any>()

  const priceMap: Record<number, number> = {}
  for (const p of prices.results) {
    priceMap[p.listino_id] = p.price
  }

  const l1 = listini.results[0]
  const category = product.category

  const suggestions: any[] = []
  for (const listino of listini.results) {
    const lnPrice = priceMap[listino.id]
    let suggested = listino.commission_percent
    let method = 'listino_default'

    const existing = await env.DB.prepare(
      'SELECT commission_percent FROM product_commission_overrides WHERE listino_id = ? AND product_id = ?'
    ).bind(listino.id, product_id).first<{ commission_percent: number }>()

    suggestions.push({
      listino_id: listino.id,
      listino_name: listino.name,
      price: lnPrice || (listino.id === l1.id ? product.price : null),
      listino_default_commission: listino.commission_percent,
      current_commission: existing?.commission_percent ?? await getEffectiveCommission(env, listino.id, product_id, category),
      suggested_commission: suggested,
      method,
      has_override: !!existing,
    })
  }

  return Response.json({ success: true, data: { product_id, product_name: product.name, suggestions } })
}

export async function handleListProductCommissionOverrides(env: Env, productId: string): Promise<Response> {
  const overrides = await env.DB.prepare(`
    SELECT pco.*, l.name as listino_name
    FROM product_commission_overrides pco
    JOIN listini l ON pco.listino_id = l.id
    WHERE pco.product_id = ?
    ORDER BY l.sort_order
  `).bind(productId).all<any>()
  return Response.json({ success: true, data: overrides.results })
}

export async function handleUpdateProductCommissionOverrides(env: Env, productId: string, body: any): Promise<Response> {
  const { overrides } = body || {}
  if (!Array.isArray(overrides)) {
    return Response.json({ success: false, error: 'Array overrides richiesto' }, { status: 400 })
  }

  // Remove existing overrides for this product
  await env.DB.prepare('DELETE FROM product_commission_overrides WHERE product_id = ?').bind(productId).run()

  // Insert new ones
  if (overrides.length > 0) {
    const upsert = env.DB.prepare(
      'INSERT INTO product_commission_overrides (listino_id, product_id, commission_percent) VALUES (?, ?, ?)'
    )
    const binds = overrides.map((o: any) =>
      upsert.bind(o.listino_id, parseInt(productId), parseFloat(o.commission_percent))
    )
    await env.DB.batch(binds)
  }

  const result = await env.DB.prepare(`
    SELECT pco.*, l.name as listino_name
    FROM product_commission_overrides pco
    JOIN listini l ON pco.listino_id = l.id
    WHERE pco.product_id = ?
    ORDER BY l.sort_order
  `).bind(productId).all<any>()

  return Response.json({ success: true, data: result.results })
}

export async function handleDeleteProductCommissionOverrides(env: Env, productId: string): Promise<Response> {
  await env.DB.prepare('DELETE FROM product_commission_overrides WHERE product_id = ?').bind(productId).run()
  return Response.json({ success: true, data: { product_id: parseInt(productId) } })
}

export async function handleListListini(env: Env): Promise<Response> {
  const listini = await env.DB.prepare('SELECT * FROM listini ORDER BY sort_order').all<any>()
  return Response.json({ success: true, data: listini.results })
}

export async function handleGetListino(env: Env, id: string): Promise<Response> {
  const listino = await env.DB.prepare('SELECT * FROM listini WHERE id = ?').bind(id).first<any>()
  if (!listino) {
    return Response.json({ success: false, error: 'Listino non trovato' }, { status: 404 })
  }
  return Response.json({ success: true, data: listino })
}

export async function handleCreateListino(env: Env, body: any): Promise<Response> {
  const { name, commission_percent, payment_terms, sort_order } = body || {}
  if (!name) {
    return Response.json({ success: false, error: 'Nome listino richiesto' }, { status: 400 })
  }
  const result = await env.DB.prepare(
    'INSERT INTO listini (name, commission_percent, payment_terms, sort_order) VALUES (?, ?, ?, ?)'
  ).bind(name, commission_percent ?? 0, payment_terms || '', sort_order ?? 0).run()

  const listino = await env.DB.prepare('SELECT * FROM listini WHERE id = ?').bind(result.meta.last_row_id).first<any>()
  return Response.json({ success: true, data: listino }, { status: 201 })
}

export async function handleUpdateListino(env: Env, id: string, body: any): Promise<Response> {
  const existing = await env.DB.prepare('SELECT * FROM listini WHERE id = ?').bind(id).first<any>()
  if (!existing) {
    return Response.json({ success: false, error: 'Listino non trovato' }, { status: 404 })
  }
  const { name, commission_percent, payment_terms, sort_order } = body || {}
  await env.DB.prepare(
    'UPDATE listini SET name=?, commission_percent=?, payment_terms=?, sort_order=? WHERE id=?'
  ).bind(
    name ?? existing.name,
    commission_percent !== undefined ? commission_percent : existing.commission_percent,
    payment_terms !== undefined ? payment_terms : existing.payment_terms,
    sort_order !== undefined ? sort_order : existing.sort_order,
    id
  ).run()

  const listino = await env.DB.prepare('SELECT * FROM listini WHERE id = ?').bind(id).first<any>()
  return Response.json({ success: true, data: listino })
}

export async function handleDeleteListino(env: Env, id: string): Promise<Response> {
  const existing = await env.DB.prepare('SELECT * FROM listini WHERE id = ?').bind(id).first<any>()
  if (!existing) {
    return Response.json({ success: false, error: 'Listino non trovato' }, { status: 404 })
  }
  await env.DB.prepare('DELETE FROM listini WHERE id = ?').bind(id).run()
  return Response.json({ success: true, data: { id: parseInt(id) } })
}

export async function handleGetListinoPrices(env: Env, productId: string): Promise<Response> {
  const prices = await env.DB.prepare(
    'SELECT lp.*, l.name as listino_name, l.sort_order FROM listino_prices lp JOIN listini l ON lp.listino_id = l.id WHERE lp.product_id = ? ORDER BY l.sort_order'
  ).bind(productId).all<any>()
  return Response.json({ success: true, data: prices.results })
}

export async function handleUpdateListinoPrices(env: Env, productId: string, body: any): Promise<Response> {
  const { prices } = body || {}
  if (!Array.isArray(prices)) {
    return Response.json({ success: false, error: 'Array prices richiesto' }, { status: 400 })
  }

  const upsert = env.DB.prepare(
    'INSERT INTO listino_prices (product_id, listino_id, price) VALUES (?, ?, ?) ON CONFLICT(product_id, listino_id) DO UPDATE SET price = excluded.price'
  )

  const binds = prices.map((p: any) =>
    upsert.bind(parseInt(productId), p.listino_id, parseFloat(p.price))
  )

  await env.DB.batch(binds)

  const result = await env.DB.prepare(
    'SELECT lp.*, l.name as listino_name, l.sort_order FROM listino_prices lp JOIN listini l ON lp.listino_id = l.id WHERE lp.product_id = ? ORDER BY l.sort_order'
  ).bind(productId).all<any>()

  return Response.json({ success: true, data: result.results })
}

export async function handleGetSettings(env: Env): Promise<Response> {
  const settings = await env.DB.prepare('SELECT * FROM settings ORDER BY key').all<any>()
  const map: Record<string, string> = {}
  for (const s of settings.results) {
    map[s.key] = s.value
  }
  return Response.json({ success: true, data: map })
}

export async function handleUpdateSettings(env: Env, body: any): Promise<Response> {
  const updates = body || {}
  for (const [key, value] of Object.entries(updates)) {
    await env.DB.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    ).bind(key, String(value)).run()
  }

  const settings = await env.DB.prepare('SELECT * FROM settings ORDER BY key').all<any>()
  const map: Record<string, string> = {}
  for (const s of settings.results) {
    map[s.key] = s.value
  }
  return Response.json({ success: true, data: map })
}

export async function handleListCommissionExceptions(env: Env): Promise<Response> {
  const exceptions = await env.DB.prepare(
    'SELECT ce.*, l.name as listino_name FROM commission_exceptions ce JOIN listini l ON ce.listino_id = l.id ORDER BY l.sort_order, ce.category'
  ).all<any>()
  return Response.json({ success: true, data: exceptions.results })
}

export async function handleCreateCommissionException(env: Env, body: any): Promise<Response> {
  const { listino_id, category, commission_percent } = body || {}
  if (!listino_id || !category || commission_percent == null) {
    return Response.json({ success: false, error: 'listino_id, category e commission_percent richiesti' }, { status: 400 })
  }
  const result = await env.DB.prepare(
    'INSERT INTO commission_exceptions (listino_id, category, commission_percent) VALUES (?, ?, ?)'
  ).bind(listino_id, category, commission_percent).run()

  const exc = await env.DB.prepare(
    'SELECT ce.*, l.name as listino_name FROM commission_exceptions ce JOIN listini l ON ce.listino_id = l.id WHERE ce.id = ?'
  ).bind(result.meta.last_row_id).first<any>()

  return Response.json({ success: true, data: exc }, { status: 201 })
}

export async function handleUpdateCommissionException(env: Env, id: string, body: any): Promise<Response> {
  const existing = await env.DB.prepare('SELECT * FROM commission_exceptions WHERE id = ?').bind(id).first<any>()
  if (!existing) {
    return Response.json({ success: false, error: 'Eccezione non trovata' }, { status: 404 })
  }
  const { listino_id, category, commission_percent } = body || {}
  await env.DB.prepare(
    'UPDATE commission_exceptions SET listino_id=?, category=?, commission_percent=? WHERE id=?'
  ).bind(
    listino_id ?? existing.listino_id,
    category ?? existing.category,
    commission_percent !== undefined ? commission_percent : existing.commission_percent,
    id
  ).run()

  const exc = await env.DB.prepare(
    'SELECT ce.*, l.name as listino_name FROM commission_exceptions ce JOIN listini l ON ce.listino_id = l.id WHERE ce.id = ?'
  ).bind(id).first<any>()

  return Response.json({ success: true, data: exc })
}

export async function handleDeleteCommissionException(env: Env, id: string): Promise<Response> {
  const existing = await env.DB.prepare('SELECT * FROM commission_exceptions WHERE id = ?').bind(id).first<any>()
  if (!existing) {
    return Response.json({ success: false, error: 'Eccezione non trovata' }, { status: 404 })
  }
  await env.DB.prepare('DELETE FROM commission_exceptions WHERE id = ?').bind(id).run()
  return Response.json({ success: true, data: { id: parseInt(id) } })
}
