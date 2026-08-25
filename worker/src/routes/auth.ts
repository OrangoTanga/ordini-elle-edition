import { hashPassword, verifyPassword, createToken, verifyToken } from '../auth'
import type { Env } from '../types'

function generateSalt(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Rate limiting state (in-memory per worker instance)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_LOGIN_ATTEMPTS = 5
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minuti
const RATE_LIMIT_BLOCK_MS = 30 * 60 * 1000 // 30 minuti dopo troppi tentativi

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; waitMs: number } {
  const now = Date.now()
  const entry = loginAttempts.get(ip)

  if (!entry) {
    return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS, waitMs: 0 }
  }

  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    if (now - entry.lastAttempt < RATE_LIMIT_BLOCK_MS) {
      const waitMs = RATE_LIMIT_BLOCK_MS - (now - entry.lastAttempt)
      return { allowed: false, remaining: 0, waitMs }
    }
    loginAttempts.delete(ip)
    return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS, waitMs: 0 }
  }

  if (now - entry.lastAttempt > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.delete(ip)
    return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS, waitMs: 0 }
  }

  return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS - entry.count, waitMs: 0 }
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now()
  const entry = loginAttempts.get(ip)
  if (!entry || now - entry.lastAttempt > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now })
  } else {
    entry.count++
    entry.lastAttempt = now
  }
}

function sanitizeInput(value: string): string {
  return value.replace(/[<>"'&]/g, '')
}

export async function handleLogin(env: Env, body: any, clientIp = 'unknown'): Promise<Response> {
  const { username, password } = body || {}

  if (!username || !password) {
    console.log(JSON.stringify({ event: 'login_missing_fields', ip: clientIp }))
    return Response.json({ success: false, error: 'Username e password richiesti' }, { status: 400 })
  }

  const safeUsername = sanitizeInput(username)

  if (typeof safeUsername !== 'string' || typeof password !== 'string') {
    return Response.json({ success: false, error: 'Dati non validi' }, { status: 400 })
  }

  if (safeUsername.length < 2 || safeUsername.length > 50) {
    return Response.json({ success: false, error: 'Username non valido' }, { status: 400 })
  }

  const rateCheck = checkRateLimit(clientIp)
  if (!rateCheck.allowed) {
    console.log(JSON.stringify({ event: 'login_rate_limited', ip: clientIp }))
    return Response.json({
      success: false,
      error: `Troppi tentativi. Riprova tra ${Math.ceil(rateCheck.waitMs / 60000)} minuti`,
    }, { status: 429 })
  }

  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ? AND active = 1').bind(safeUsername).first<any>()

  if (!user) {
    recordFailedAttempt(clientIp)
    console.log(JSON.stringify({ event: 'login_failed_user_not_found', username: safeUsername, ip: clientIp }))
    return Response.json({ success: false, error: 'Credenziali non valide' }, { status: 401 })
  }

  if (!await verifyPassword(password, user.password)) {
    recordFailedAttempt(clientIp)
    console.log(JSON.stringify({ event: 'login_failed_wrong_password', userId: user.id, ip: clientIp }))
    return Response.json({ success: false, error: 'Credenziali non valide' }, { status: 401 })
  }

  loginAttempts.delete(clientIp)

  let cryptoSalt = user.crypto_salt || ''
  if (!cryptoSalt) {
    cryptoSalt = generateSalt()
    await env.DB.prepare('UPDATE users SET crypto_salt = ? WHERE id = ?').bind(cryptoSalt, user.id).run()
  }

  const isAdmin = user.role === 'admin'
  const token = await createToken({ id: user.id, name: user.name, isAdmin, role: user.role })

  console.log(JSON.stringify({ event: 'login_success', userId: user.id, role: user.role, ip: clientIp }))

  return Response.json({
    success: true,
    data: {
      token,
      crypto_salt: cryptoSalt,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        phone: user.phone,
        role: user.role,
        active: Boolean(user.active),
        created_at: user.created_at,
      },
    },
  })
}

export async function handleVerify(env: Env, body: any): Promise<Response> {
  const { token } = body || {}
  if (!token) {
    return Response.json({ success: false, error: 'Token richiesto' }, { status: 400 })
  }

  const decoded = await verifyToken(token)
  if (!decoded) {
    return Response.json({ success: true, data: { valid: false } })
  }

  return Response.json({
    success: true,
    data: {
      valid: true,
      id: decoded.id,
      name: decoded.name,
      isAdmin: decoded.isAdmin,
      role: decoded.role,
    },
  })
}
