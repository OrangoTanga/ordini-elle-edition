import type { Env } from '../types'

async function validateCategory(env: Env, cat: string): Promise<string> {
  const trimmed = (cat || '').trim()
  if (!trimmed) return ''
  const found = await env.DB.prepare('SELECT id FROM categories WHERE name = ?').bind(trimmed).first<any>()
  if (found) return trimmed
  const maxOrder = await env.DB.prepare('SELECT MAX(sort_order) AS max_order FROM categories').first<any>()
  await env.DB.prepare(
    'INSERT INTO categories (name, sort_order) VALUES (?, ?)'
  ).bind(trimmed, (maxOrder?.max_order ?? 0) + 1).run()
  return trimmed
}

function validateImagePath(path: string): string {
  return path && (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) ? path : ''
}

export async function handleListProducts(env: Env): Promise<Response> {
  const products = await env.DB.prepare('SELECT * FROM products ORDER BY category, name').all<any>()

  const result = []
  for (const p of products.results) {
    const prices = await env.DB.prepare(
      'SELECT lp.*, l.name as listino_name, l.sort_order FROM listino_prices lp JOIN listini l ON lp.listino_id = l.id WHERE lp.product_id = ? ORDER BY l.sort_order'
    ).bind(p.id).all<any>()
    result.push({ ...p, listino_prices: prices.results })
  }

  return Response.json({ success: true, data: result })
}

export async function handleGetProduct(env: Env, id: string): Promise<Response> {
  const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first<any>()
  if (!product) {
    return Response.json({ success: false, error: 'Prodotto non trovato' }, { status: 404 })
  }
  return Response.json({ success: true, data: product })
}

export async function handleCreateProduct(env: Env, body: any): Promise<Response> {
  const { name, description, price, category, image_path, active } = body || {}

  if (!name || price == null || isNaN(parseFloat(price))) {
    return Response.json({ success: false, error: 'Nome e prezzo richiesti' }, { status: 400 })
  }

  const result = await env.DB.prepare(
    'INSERT INTO products (name, description, price, category, image_path, active) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(
    name, description || '',
    parseFloat(price),
    await validateCategory(env, category || ''),
    validateImagePath(image_path || ''),
    (active === 0 || active === false) ? 0 : 1
  ).run()

  const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(result.meta.last_row_id).first<any>()
  return Response.json({ success: true, data: product }, { status: 201 })
}

export async function handleUpdateProduct(env: Env, id: string, body: any): Promise<Response> {
  const existing = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first<any>()
  if (!existing) {
    return Response.json({ success: false, error: 'Prodotto non trovato' }, { status: 404 })
  }

  const { name, description, price, category, image_path, active } = body || {}

  await env.DB.prepare(
    'UPDATE products SET name=?, description=?, price=?, category=?, image_path=?, active=? WHERE id=?'
  ).bind(
    name ?? existing.name,
    description !== undefined ? description : existing.description,
    price !== undefined ? parseFloat(price) : existing.price,
    category !== undefined ? await validateCategory(env, category) : existing.category,
    image_path !== undefined ? validateImagePath(image_path) : existing.image_path,
    active !== undefined ? (active ? 1 : 0) : existing.active,
    id
  ).run()

  const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first<any>()
  return Response.json({ success: true, data: product })
}

export async function handleDeleteProduct(env: Env, id: string): Promise<Response> {
  const existing = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first<any>()
  if (!existing) {
    return Response.json({ success: false, error: 'Prodotto non trovato' }, { status: 404 })
  }

  await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run()
  return Response.json({ success: true, data: { id: parseInt(id) } })
}
