import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { getDb } from '../database'
import { authenticateToken, AuthRequest } from '../middleware/auth'

export const usersRouter = Router()

usersRouter.use(authenticateToken)

usersRouter.get('/', (_req: AuthRequest, res) => {
  const db = getDb()
  const users = db.prepare('SELECT id, username, name, phone, active, created_at FROM users ORDER BY name').all()
  res.json({ success: true, data: users })
})

usersRouter.post('/', (req: AuthRequest, res) => {
  const db = getDb()
  const { username, password, name, phone } = req.body

  if (!username || !password || !name) {
    res.status(400).json({ success: false, error: 'Username, password e nome richiesti' })
    return
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (existing) {
    res.status(409).json({ success: false, error: 'Username già in uso' })
    return
  }

  const hash = bcrypt.hashSync(password, 10)
  const result = db.prepare(
    'INSERT INTO users (username, password, name, phone) VALUES (?, ?, ?, ?)'
  ).run(username, hash, name, phone || '')

  const user = db.prepare('SELECT id, username, name, phone, active, created_at FROM users WHERE id = ?')
    .get(result.lastInsertRowid)

  res.status(201).json({ success: true, data: user })
})

usersRouter.put('/:id', (req: AuthRequest, res) => {
  const db = getDb()
  const { name, phone, active, password } = req.body

  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ success: false, error: 'Utente non trovato' })
    return
  }

  if (password) {
    const hash = bcrypt.hashSync(password, 10)
    db.prepare('UPDATE users SET name=?, phone=?, active=?, password=? WHERE id=?')
      .run(name, phone, active ? 1 : 0, hash, req.params.id)
  } else {
    db.prepare('UPDATE users SET name=?, phone=?, active=? WHERE id=?')
      .run(name, phone, active ? 1 : 0, req.params.id)
  }

  const user = db.prepare('SELECT id, username, name, phone, active, created_at FROM users WHERE id = ?')
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
