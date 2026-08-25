import type { Env } from '../types'

function normalizeName(name: unknown): string {
  return typeof name === 'string' ? name.trim() : ''
}

export async function handleListCategories(env: Env): Promise<Response> {
  const categories = await env.DB.prepare('SELECT * FROM categories ORDER BY sort_order, name').all<any>()
  return Response.json({ success: true, data: categories.results })
}

export async function handleCreateCategory(env: Env, body: any): Promise<Response> {
  const name = normalizeName(body?.name)
  if (!name) {
    return Response.json({ success: false, error: 'Nome categoria richiesto' }, { status: 400 })
  }

  const existing = await env.DB.prepare('SELECT id FROM categories WHERE name = ?').bind(name).first<any>()
  if (existing) {
    return Response.json({ success: false, error: 'Categoria già esistente' }, { status: 409 })
  }

  const max = await env.DB.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM categories').first<{ m: number }>()
  const result = await env.DB.prepare(
    'INSERT INTO categories (name, sort_order) VALUES (?, ?)'
  ).bind(name, (max?.m || 0) + 1).run()

  const category = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(result.meta.last_row_id).first<any>()
  return Response.json({ success: true, data: category }, { status: 201 })
}

export async function handleRenameCategory(env: Env, id: string, body: any): Promise<Response> {
  const existing = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first<any>()
  if (!existing) {
    return Response.json({ success: false, error: 'Categoria non trovata' }, { status: 404 })
  }

  const newName = normalizeName(body?.name)
  if (!newName) {
    return Response.json({ success: false, error: 'Nome categoria richiesto' }, { status: 400 })
  }

  const dup = await env.DB.prepare('SELECT id FROM categories WHERE name = ? AND id <> ?').bind(newName, id).first<any>()
  if (dup) {
    return Response.json({ success: false, error: 'Categoria già esistente' }, { status: 409 })
  }

  const oldName = existing.name
  if (oldName === newName) {
    return Response.json({ success: true, data: existing })
  }

  await env.DB.batch([
    env.DB.prepare('UPDATE categories SET name = ? WHERE id = ?').bind(newName, id),
    env.DB.prepare('UPDATE products SET category = ? WHERE category = ?').bind(newName, oldName),
    env.DB.prepare('UPDATE commission_exceptions SET category = ? WHERE category = ?').bind(newName, oldName),
  ])

  const category = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first<any>()
  return Response.json({ success: true, data: category })
}

export async function handleDeleteCategory(env: Env, id: string): Promise<Response> {
  const existing = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first<any>()
  if (!existing) {
    return Response.json({ success: false, error: 'Categoria non trovata' }, { status: 404 })
  }

  const prodCount = await env.DB.prepare(
    'SELECT COUNT(*) as c FROM products WHERE category = ?'
  ).bind(existing.name).first<{ c: number }>()
  const count = prodCount?.c || 0
  if (count > 0) {
    return Response.json({
      success: false,
      error: `Categoria in uso da ${count} prodotto/i. Riassegna o elimina i prodotti prima.`,
      data: { product_count: count },
    }, { status: 409 })
  }

  await env.DB.batch([
    env.DB.prepare('DELETE FROM commission_exceptions WHERE category = ?').bind(existing.name),
    env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id),
  ])

  return Response.json({ success: true, data: { id: parseInt(id), name: existing.name } })
}