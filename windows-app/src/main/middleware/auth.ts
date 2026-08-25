import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = 'elly-edition-ordini-secret-key-2026'

export interface AuthRequest extends Request {
  userId?: number
  userName?: string
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    res.status(401).json({ success: false, error: 'Token mancante' })
    return
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; name: string }
    req.userId = decoded.id
    req.userName = decoded.name
    next()
  } catch {
    res.status(403).json({ success: false, error: 'Token non valido' })
  }
}

export { JWT_SECRET }
