import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getDb } from '../database'
import { JWT_SECRET } from '../middleware/auth'

export const authRouter = Router()

authRouter.post('/login', (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    res.status(400).json({ success: false, error: 'Username e password richiesti' })
    return
  }

  const db = getDb()
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username) as any

  if (!user || !bcrypt.compareSync(password, user.password)) {
    res.status(401).json({ success: false, error: 'Credenziali non valide' })
    return
  }

  const isAdmin = user.role === 'admin'
  const token = jwt.sign({ id: user.id, name: user.name, isAdmin, role: user.role }, JWT_SECRET, { expiresIn: '30d' })

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isAdmin,
        active: Boolean(user.active),
        created_at: user.created_at,
      },
    },
  })
})

authRouter.post('/verify', (req, res) => {
  const { token } = req.body

  if (!token) {
    res.status(400).json({ success: false, error: 'Token richiesto' })
    return
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    res.json({ success: true, data: { valid: true, id: decoded.id, name: decoded.name, isAdmin: decoded.isAdmin, role: decoded.role } })
  } catch {
    res.json({ success: true, data: { valid: false } })
  }
})