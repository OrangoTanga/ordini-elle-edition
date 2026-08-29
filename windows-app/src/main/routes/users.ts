import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { getDb } from '../database'
import { authenticateToken, AuthRequest } from '../middleware/auth'

export const usersRouter = Router()

usersRouter.use(authenticateToken)

usersRouter.get('/', (_req: AuthRequest, res) => {
  const db = getDb()
  const users = db.prepare('SELECT id, username, name, phone, active, role, created_at FROM users ORDER BY name').all()
  res.json({ success: true, data: users })
})

usersRouter.post('/', (req: AuthRequest, res) => {
  const db = getDb()
  const { username, password, name, phone, role } = req.body

  if (!username || !password || !name) {
    res.status(400).json({ success: false, error: 'Username, password e nome richiesti' })
    return
  }

  const newRole = role === 'admin' ? 'admin' : 'rep'

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (existing) {
    res.status(409).json({ success: false, error: 'Username già in uso' })
    return
  }

  const hash = bcrypt.hashSync(password, 10)
  const result = db.prepare(
    'INSERT INTO users (username, password, name, phone, role) VALUES (?, ?, ?, ?, ?)'
  ).run(username, hash, name, phone || '', newRole)

  const user = db.prepare('SELECT id, username, name, phone, active, role, created_at FROM users WHERE id = ?')
    .get(result.lastInsertRowid)

  res.status(201).json({ success: true, data: user })
})

usersRouter.put('/:id', (req: AuthRequest, res) => {
  const db = getDb()
  const { name, phone, active, password, role } = req.body

  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ success: false, error: 'Utente non trovato' })
    return
  }

  const newRole = role === 'admin' ? 'admin' : (role === 'rep' ? 'rep' : undefined)
  const hash = password ? bcrypt.hashSync(password, 10) : undefined
  if (password && newRole) {
    db.prepare('UPDATE users SET name=?, phone=?, active=?, password=?, role=? WHERE id=?')
      .run(name, phone, active ? 1 : 0, hash, newRole, req.params.id)
  } else if (password) {
    db.prepare('UPDATE users SET name=?, phone=?, active=?, password=? WHERE id=?')
      .run(name, phone, active ? 1 : 0, hash, req.params.id)
  } else if (newRole) {
    db.prepare('UPDATE users SET name=?, phone=?, active=?, role=? WHERE id=?')
      .run(name, phone, active ? 1 : 0, newRole, req.params.id)
  } else {
    db.prepare('UPDATE users SET name=?, phone=?, active=? WHERE id=?')
      .run(name, phone, active ? 1 : 0, req.params.id)
  }

  const user = db.prepare('SELECT id, username, name, phone, active, role, created_at FROM users WHERE id = ?')
    .get(req.params.id)

  res.json({ success: true, data: user })
})

usersRouter.delete('/:id', (req: AuthRequest, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ success: false, error: 'Utente non trovato' })
    return
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id)
  res.json({ success: true, data: { id: parseInt(req.params.id) } })
})
