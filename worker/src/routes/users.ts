import { hashPassword } from '../auth'
import type { Env } from '../types'

function generateSalt(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

function sanitizeInput(value: string): string {
  return value.replace(/[<>"'&]/g, '')
}

export async function handleListUsers(env: Env): Promise<Response> {
  const users = await env.DB.prepare(
    'SELECT id, username, name, phone, role, active, created_at FROM users ORDER BY name'
  ).all<any>()
  return Response.json({ success: true, data: users.results })
}

export async function handleCreateUser(env: Env, body: any): Promise<Response> {
  const { username, password, name, phone, role } = body || {}

  if (!username || !password || !name) {
    return Response.json({ success: false, error: 'Username, password e nome richiesti' }, { status: 400 })
  }

  const safeUsername = sanitizeInput(username)
  const safeName = sanitizeInput(name)
  const safePhone = sanitizeInput(phone || '')
  const userRole = role === 'admin' ? 'admin' : 'rep'

  if (safeUsername.length < 2 || safeUsername.length > 50) {
    return Response.json({ success: false, error: 'Username non valido (2-50 caratteri)' }, { status: 400 })
  }
  if (safeName.length < 2 || safeName.length > 100) {
    return Response.json({ success: false, error: 'Nome non valido (2-100 caratteri)' }, { status: 400 })
  }
  if (password.length < 6) {
    return Response.json({ success: false, error: 'Password troppo corta (min 6 caratteri)' }, { status: 400 })
  }

  const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(safeUsername).first<any>()
  if (existing) {
    return Response.json({ success: false, error: 'Username già in uso' }, { status: 409 })
  }

  const hash = await hashPassword(password)
  const crypto_salt = generateSalt()

  const result = await env.DB.prepare(
    'INSERT INTO users (username, password, name, phone, role, crypto_salt) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(safeUsername, hash, safeName, safePhone, userRole, crypto_salt).run()

  const user = await env.DB.prepare(
    'SELECT id, username, name, phone, role, active, created_at FROM users WHERE id = ?'
  ).bind(result.meta.last_row_id).first<any>()

  return Response.json({ success: true, data: user }, { status: 201 })
}

export async function handleUpdateUser(env: Env, id: string, body: any): Promise<Response> {
  const existing = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(id).first<any>()
  if (!existing) {
    return Response.json({ success: false, error: 'Utente non trovato' }, { status: 404 })
  }

  const { name, phone, active, password, role } = body || {}
  const safeName = name ? sanitizeInput(name) : undefined
  const safePhone = phone !== undefined ? sanitizeInput(phone) : undefined
  const userRole = role === 'admin' ? 'admin' : role === 'rep' ? 'rep' : undefined

  if (password) {
    if (password.length < 6) {
      return Response.json({ success: false, error: 'Password troppo corta (min 6 caratteri)' }, { status: 400 })
    }
    const hash = await hashPassword(password)
    if (userRole) {
      await env.DB.prepare('UPDATE users SET name=?, phone=?, active=?, role=?, password=? WHERE id=?')
        .bind(safeName, safePhone, active ? 1 : 0, userRole, hash, id).run()
    } else {
      await env.DB.prepare('UPDATE users SET name=?, phone=?, active=?, password=? WHERE id=?')
        .bind(safeName, safePhone, active ? 1 : 0, hash, id).run()
    }
  } else {
    if (userRole) {
      await env.DB.prepare('UPDATE users SET name=?, phone=?, active=?, role=? WHERE id=?')
        .bind(safeName, safePhone, active ? 1 : 0, userRole, id).run()
    } else {
      await env.DB.prepare('UPDATE users SET name=?, phone=?, active=? WHERE id=?')
        .bind(safeName, safePhone, active ? 1 : 0, id).run()
    }
  }

  const user = await env.DB.prepare(
    'SELECT id, username, name, phone, role, active, created_at FROM users WHERE id = ?'
  ).bind(id).first<any>()

  return Response.json({ success: true, data: user })
}

export async function handleDeleteUser(env: Env, id: string): Promise<Response> {
  const existing = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(id).first<any>()
  if (!existing) {
    return Response.json({ success: false, error: 'Utente non trovato' }, { status: 404 })
  }

  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run()
  return Response.json({ success: true, data: { id: parseInt(id) } })
}

export async function handleSeedAdmin(env: Env): Promise<Response> {
  const existing = await env.DB.prepare('SELECT id, password FROM users WHERE username = ?').bind('admin').first<any>()
  if (existing) {
    if (existing.password.startsWith('pbkdf2:')) {
      return Response.json({ success: true, data: { message: 'Admin già esistente' } })
    }
    const hash = await hashPassword('admin123')
    await env.DB.prepare('UPDATE users SET password = ?, role = ? WHERE id = ?').bind(hash, 'admin', existing.id).run()
    return Response.json({ success: true, data: { message: 'Password admin aggiornata, ruolo impostato ad admin' } })
  }

  const hash = await hashPassword('admin123')
  await env.DB.prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)')
    .bind('admin', hash, 'Amministratore', 'admin').run()

  return Response.json({ success: true, data: { message: 'Admin creato con ruolo admin' } })
}
