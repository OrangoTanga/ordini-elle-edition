import { SignJWT, jwtVerify } from 'jose'

let _secret: Uint8Array | null = null

export function initAuth(jwtSecret: string): void {
  _secret = new TextEncoder().encode(jwtSecret)
}

function getSecret(): Uint8Array {
  if (!_secret) throw new Error('Auth not initialized - call initAuth()')
  return _secret
}

function hex(buf: Uint8Array): string {
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
}

function unhex(s: string): Uint8Array {
  return new Uint8Array(s.match(/.{2}/g)!.map(b => parseInt(b, 16)))
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password) as BufferSource,
    'PBKDF2', false, ['deriveBits']
  )
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 100000, hash: 'SHA-256' },
    key, 256
  )
  return `pbkdf2:100000:${hex(salt)}:${hex(new Uint8Array(hash))}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored.startsWith('pbkdf2:')) return false
  const parts = stored.split(':')
  if (parts.length < 4) return false
  const iterations = parseInt(parts[1])
  const salt = unhex(parts[2])
  const expectedHash = parts[3]
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password) as BufferSource,
    'PBKDF2', false, ['deriveBits']
  )
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    key, 256
  )
  return hex(new Uint8Array(hash)) === expectedHash
}

export async function createToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<{ id: number; name: string; isAdmin: boolean; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return {
      id: payload.id as number,
      name: payload.name as string,
      isAdmin: payload.isAdmin as boolean,
      role: (payload.role as string) || 'rep',
    }
  } catch {
    return null
  }
}
