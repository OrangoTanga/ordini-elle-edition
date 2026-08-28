import { verifyToken, initAuth } from './auth'
import { handleLogin, handleVerify } from './routes/auth'
import { handleGetAppVersion } from './routes/appVersions'
import type { Env } from './types'
import { handleListProducts, handleGetProduct, handleCreateProduct, handleUpdateProduct, handleDeleteProduct } from './routes/products'
import { handleListCustomers, handleGetCustomer, handleCreateCustomer, handleUpdateCustomer, handleDeleteCustomer } from './routes/customers'
import { handleListOrders, handleGetOrder, handleCreateOrder, handleUpdateOrderStatus, handleDashboard } from './routes/orders'
import { handleListUsers, handleCreateUser, handleUpdateUser, handleDeleteUser, handleSeedAdmin } from './routes/users'
import {
  handleListListini, handleGetListino, handleCreateListino, handleUpdateListino, handleDeleteListino,
  handleGetListinoPrices, handleUpdateListinoPrices,
  handleGetSettings, handleUpdateSettings,
  handleListCommissionExceptions, handleCreateCommissionException, handleUpdateCommissionException, handleDeleteCommissionException,
  handleListProductCommissionOverrides, handleUpdateProductCommissionOverrides,
  handleDeleteProductCommissionOverrides, handleAutoCalculateCommission,
} from './routes/listini'
import { handleListPayments, handlePaymentSummary, handleUpdatePayment } from './routes/payments'
import { handleListCategories, handleCreateCategory, handleRenameCategory, handleDeleteCategory } from './routes/categories'

const ALLOWED_ORIGINS = ['*']
const MAX_BODY_SIZE = 1024 * 1024 * 2
const RATE_LIMIT_MAX = 200
const RATE_LIMIT_WINDOW_MS = 60000

const rateLimitMap = new Map<string, { count: number; windowStart: number }>()

function secHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '0',
    'Referrer-Policy': 'no-referrer',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
  }
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }
}

function json(data: any, status = 200, origin = '*'): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
      ...secHeaders(),
    },
  })
}

function checkRate(key: string, max: number, windowMs: number): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(key)
  if (!entry || now - entry.windowStart > windowMs) {
    rateLimitMap.set(key, { count: 1, windowStart: now })
    return { allowed: true, remaining: max - 1 }
  }
  if (entry.count >= max) return { allowed: false, remaining: 0 }
  entry.count++
  return { allowed: true, remaining: max - entry.count }
}

function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown'
}

function audit(event: string, d: Record<string, unknown>): void {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), event, ...d }))
}

async function authenticate(request: Request, env: Env): Promise<{ userId: number; userName: string; isAdmin: boolean } | Response> {
  const ah = request.headers.get('Authorization')
  if (!ah?.startsWith('Bearer ')) {
    return json({ success: false, error: 'Autenticazione richiesta' }, 401, request.headers.get('Origin') || '*')
  }
  const t = ah.slice(7)
  if (t.length > 2000) {
    return json({ success: false, error: 'Token non valido' }, 401, request.headers.get('Origin') || '*')
  }
  const decoded = await verifyToken(t)
  if (!decoded) {
    return json({ success: false, error: 'Sessione scaduta' }, 401, request.headers.get('Origin') || '*')
  }
  return { userId: decoded.id, userName: decoded.name, isAdmin: decoded.isAdmin }
}

async function readBody(request: Request): Promise<any> {
  const ct = request.headers.get('Content-Type') || ''
  if (!ct.includes('application/json')) return null
  const cl = parseInt(request.headers.get('Content-Length') || '0')
  if (cl > MAX_BODY_SIZE) return { _err: 'Body troppo grande' }
  try {
    const txt = await request.text()
    if (txt.length > MAX_BODY_SIZE || !txt.trim()) return null
    return JSON.parse(txt)
  } catch { return null }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      initAuth(env.JWT_SECRET)

      const url = new URL(request.url)
      const path = url.pathname
      const method = request.method
      const origin = request.headers.get('Origin') || '*'
      const ip = clientIp(request)

      if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].includes(method)) {
        return json({ success: false, error: 'Metodo non consentito' }, 405, origin)
      }

      if (method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: { ...corsHeaders(origin), ...secHeaders() } })
      }

      const rl = checkRate(`rl:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)
      if (!rl.allowed) {
        audit('rate_limit', { ip, path })
        return json({ success: false, error: 'Troppe richieste' }, 429, origin)
      }

      if (path === '/health' && method === 'GET') {
        return json({ success: true, data: { status: 'ok' } }, 200, origin)
      }

      if (path === '/api/auth/login' && method === 'POST') {
        const body = await readBody(request)
        return handleLogin(env, body, ip)
      }

      if (path === '/api/auth/verify' && method === 'POST') {
        const body = await readBody(request)
        return handleVerify(env, body)
      }

      if (path === '/api/seed-admin' && method === 'POST') {
        return handleSeedAdmin(env)
      }

      // Release pubblici: info versione app (senza token) e download file da R2
      if (path === '/api/app-versions' && method === 'GET') {
        return handleGetAppVersion(env, url.searchParams.get('platform') || '')
      }

      if (path.startsWith('/releases/') && (method === 'GET' || method === 'HEAD')) {
        const key = decodeURIComponent(path.slice('/releases/'.length))
        // Supporto Range (single range) per consentire il resume dei download.
        const rangeHeader = request.headers.get('range')
        const rangeMatch = method === 'GET' && rangeHeader
          ? /^bytes=(\d+)-(\d*)$/.exec(rangeHeader.trim())
          : null
        let obj: R2ObjectBody | null = null
        let status = 200
        let totalSize = 0
        let rangeOffset = 0
        let rangeLength: number | undefined
        if (rangeMatch) {
          const head = await env.RELEASES.head(key)
          if (!head) {
            return json({ success: false, error: 'File non trovato' }, 404, origin)
          }
          totalSize = head.size
          rangeOffset = parseInt(rangeMatch[1], 10)
          if (rangeOffset >= totalSize) {
            return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${totalSize}` } })
          }
          const endStr = rangeMatch[2]
          rangeLength = endStr
            ? parseInt(endStr, 10) - rangeOffset + 1
            : totalSize - rangeOffset
          obj = await env.RELEASES.get(key, { range: { offset: rangeOffset, length: rangeLength } })
          if (!obj) {
            return json({ success: false, error: 'File non trovato' }, 404, origin)
          }
          status = 206
        } else {
          obj = await env.RELEASES.get(key)
          if (!obj) {
            return json({ success: false, error: 'File non trovato' }, 404, origin)
          }
          totalSize = obj.size
        }
        const ext = key.split('.').pop()?.toLowerCase()
        const contentType =
          ext === 'apk' ? 'application/vnd.android.package-archive' :
          ext === 'exe' ? 'application/octet-stream' :
          obj.httpMetadata?.contentType || 'application/octet-stream'
        const headers = new Headers()
        headers.set('Content-Type', contentType)
        headers.set('Accept-Ranges', 'bytes')
        headers.set('Cache-Control', 'public, max-age=3600')
        headers.set('X-Content-Type-Options', 'nosniff')
        headers.set('Access-Control-Allow-Origin', '*')
        headers.set('Content-Length', String(method === 'HEAD' ? totalSize : (status === 206 ? rangeLength! : totalSize)))
        if (status === 206) {
          headers.set('Content-Range', `bytes ${rangeOffset}-${rangeOffset + rangeLength! - 1}/${totalSize}`)
        }
        return new Response(method === 'HEAD' ? null : obj.body, { status, headers })
      }

      const auth = await authenticate(request, env)
      if (auth instanceof Response) return auth

      // Categories (lettura per tutti gli utenti autenticati)
      if (path === '/api/categories' && method === 'GET') return handleListCategories(env)

      // Products
      if (path === '/api/products' && method === 'GET') return handleListProducts(env)
      if (path === '/api/products' && method === 'POST') {
        const body = await readBody(request)
        if (body?._err) return json({ success: false, error: 'Dati non validi' }, 400, origin)
        return handleCreateProduct(env, body)
      }
      if (path.match(/^\/api\/products\/\d+$/) && method === 'GET') {
        return handleGetProduct(env, path.split('/')[3])
      }
      if (path.match(/^\/api\/products\/\d+$/) && method === 'PUT') {
        const body = await readBody(request)
        if (body?._err) return json({ success: false, error: 'Dati non validi' }, 400, origin)
        return handleUpdateProduct(env, path.split('/')[3], body)
      }
      if (path.match(/^\/api\/products\/\d+$/) && method === 'DELETE') {
        return handleDeleteProduct(env, path.split('/')[3])
      }

      // Customers
      if (path === '/api/customers' && method === 'GET') return handleListCustomers(env, auth)
      if (path === '/api/customers' && method === 'POST') {
        const body = await readBody(request)
        if (body?._err) return json({ success: false, error: 'Dati non validi' }, 400, origin)
        return handleCreateCustomer(env, body, auth)
      }
      if (path.match(/^\/api\/customers\/\d+$/) && method === 'GET') {
        return handleGetCustomer(env, path.split('/')[3])
      }
      if (path.match(/^\/api\/customers\/\d+$/) && method === 'PUT') {
        const body = await readBody(request)
        if (body?._err) return json({ success: false, error: 'Dati non validi' }, 400, origin)
        return handleUpdateCustomer(env, path.split('/')[3], body, auth)
      }
      if (path.match(/^\/api\/customers\/\d+$/) && method === 'DELETE') {
        return handleDeleteCustomer(env, path.split('/')[3], auth)
      }

      // Orders
      if (path === '/api/orders' && method === 'GET') return handleListOrders(env, url)
      if (path === '/api/orders' && method === 'POST') {
        const body = await readBody(request)
        if (body?._err) return json({ success: false, error: 'Dati non validi' }, 400, origin)
        return handleCreateOrder(env, body, auth.userId, auth.userName)
      }
      if (path === '/api/orders/stats/dashboard' && method === 'GET') return handleDashboard(env)
      if (path.match(/^\/api\/orders\/\d+$/) && method === 'GET') {
        return handleGetOrder(env, path.split('/')[3])
      }
      if (path.match(/^\/api\/orders\/\d+\/status$/) && method === 'PATCH') {
        const body = await readBody(request)
        if (body?._err) return json({ success: false, error: 'Dati non validi' }, 400, origin)
        return handleUpdateOrderStatus(env, path.split('/')[3], body)
      }

      // Users (admin-only)
      if (!auth.isAdmin) {
        audit('admin_blocked', { userId: auth.userId, path })
        return json({ success: false, error: 'Accesso negato' }, 403, origin)
      }

      // Upload release su R2 tramite binding (bypass API gestione R2)
      if (path.match(/^\/api\/admin\/releases\/[A-Za-z0-9._\-/]+$/) && method === 'PUT') {
        const key = decodeURIComponent(path.slice('/api/admin/releases/'.length))
        if (!key.startsWith('apps/') || key.includes('..') || !/\.(exe|apk)$/.test(key)) {
          return json({ success: false, error: 'Chiave non valida (attesi apps/*.exe o apps/*.apk)' }, 400, origin)
        }
        const cl = parseInt(request.headers.get('Content-Length') || '0')
        if (!cl || cl > 100 * 1024 * 1024) {
          return json({ success: false, error: 'File troppo grande (max 100MB)' }, 400, origin)
        }
        await env.RELEASES.put(key, request.body, {
          httpMetadata: {
            contentType: key.endsWith('.apk')
              ? 'application/vnd.android.package-archive'
              : 'application/octet-stream',
          },
        })
        audit('release_uploaded', { userId: auth.userId, key, size: cl })
        return json({ success: true, data: { key, size: cl } }, 200, origin)
      }

      if (path === '/api/categories' && method === 'POST') {
        const body = await readBody(request)
        if (body?._err) return json({ success: false, error: 'Dati non validi' }, 400, origin)
        return handleCreateCategory(env, body)
      }
      if (path.match(/^\/api\/categories\/\d+$/) && method === 'PUT') {
        const body = await readBody(request)
        if (body?._err) return json({ success: false, error: 'Dati non validi' }, 400, origin)
        return handleRenameCategory(env, path.split('/')[3], body)
      }
      if (path.match(/^\/api\/categories\/\d+$/) && method === 'DELETE') {
        return handleDeleteCategory(env, path.split('/')[3])
      }
      if (path === '/api/users' && method === 'GET') return handleListUsers(env)
      if (path === '/api/users' && method === 'POST') {
        const body = await readBody(request)
        if (body?._err) return json({ success: false, error: 'Dati non validi' }, 400, origin)
        return handleCreateUser(env, body)
      }
      if (path.match(/^\/api\/users\/\d+$/) && method === 'PUT') {
        const body = await readBody(request)
        if (body?._err) return json({ success: false, error: 'Dati non validi' }, 400, origin)
        return handleUpdateUser(env, path.split('/')[3], body)
      }
      if (path.match(/^\/api\/users\/\d+$/) && method === 'DELETE') {
        return handleDeleteUser(env, path.split('/')[3])
      }

      if (path === '/api/listini' && method === 'GET') return handleListListini(env)
      if (path === '/api/listini' && method === 'POST') {
        const body = await readBody(request)
        if (body?._err) return json({ success: false, error: 'Dati non validi' }, 400, origin)
        return handleCreateListino(env, body)
      }
      if (path.match(/^\/api\/listini\/\d+$/) && method === 'GET') {
        return handleGetListino(env, path.split('/')[3])
      }
      if (path.match(/^\/api\/listini\/\d+$/) && method === 'PUT') {
        const body = await readBody(request)
        if (body?._err) return json({ success: false, error: 'Dati non validi' }, 400, origin)
        return handleUpdateListino(env, path.split('/')[3], body)
      }
      if (path.match(/^\/api\/listini\/\d+$/) && method === 'DELETE') {
        return handleDeleteListino(env, path.split('/')[3])
      }

      if (path.match(/^\/api\/listino-prices\/\d+$/) && method === 'GET') {
        return handleGetListinoPrices(env, path.split('/')[3])
      }
      if (path.match(/^\/api\/listino-prices\/\d+$/) && method === 'PUT') {
        const body = await readBody(request)
        if (body?._err) return json({ success: false, error: 'Dati non validi' }, 400, origin)
        return handleUpdateListinoPrices(env, path.split('/')[3], body)
      }

      if (path === '/api/settings' && method === 'GET') return handleGetSettings(env)
      if (path === '/api/settings' && method === 'PUT') {
        const body = await readBody(request)
        if (body?._err) return json({ success: false, error: 'Dati non validi' }, 400, origin)
        return handleUpdateSettings(env, body)
      }

      if (path === '/api/commission-exceptions' && method === 'GET') return handleListCommissionExceptions(env)
      if (path === '/api/commission-exceptions' && method === 'POST') {
        const body = await readBody(request)
        if (body?._err) return json({ success: false, error: 'Dati non validi' }, 400, origin)
        return handleCreateCommissionException(env, body)
      }
      if (path.match(/^\/api\/commission-exceptions\/\d+$/) && method === 'PUT') {
        const body = await readBody(request)
        if (body?._err) return json({ success: false, error: 'Dati non validi' }, 400, origin)
        return handleUpdateCommissionException(env, path.split('/')[3], body)
      }
      if (path.match(/^\/api\/commission-exceptions\/\d+$/) && method === 'DELETE') {
        return handleDeleteCommissionException(env, path.split('/')[3])
      }

      if (path.match(/^\/api\/product-commission-overrides\/auto-calculate$/) && method === 'POST') {
        const body = await readBody(request)
        if (body?._err) return json({ success: false, error: 'Dati non validi' }, 400, origin)
        return handleAutoCalculateCommission(env, body)
      }
      if (path.match(/^\/api\/product-commission-overrides\/\d+$/) && method === 'GET') {
        return handleListProductCommissionOverrides(env, path.split('/')[3])
      }
      if (path.match(/^\/api\/product-commission-overrides\/\d+$/) && method === 'PUT') {
        const body = await readBody(request)
        if (body?._err) return json({ success: false, error: 'Dati non validi' }, 400, origin)
        return handleUpdateProductCommissionOverrides(env, path.split('/')[3], body)
      }
      if (path.match(/^\/api\/product-commission-overrides\/\d+$/) && method === 'DELETE') {
        return handleDeleteProductCommissionOverrides(env, path.split('/')[3])
      }

      if (path === '/api/payments' && method === 'GET') return handleListPayments(env, url, auth)
      if (path === '/api/payments/summary' && method === 'GET') return handlePaymentSummary(env, url, auth)
      if (path.match(/^\/api\/payments\/\d+$/) && method === 'PATCH') {
        const body = await readBody(request)
        if (body?._err) return json({ success: false, error: 'Dati non validi' }, 400, origin)
        return handleUpdatePayment(env, path.split('/')[3], body)
      }

      return json({ success: false, error: 'Not found' }, 404, origin)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore interno'
      audit('internal_error', { path: request.url, error: msg })
      return json({ success: false, error: 'Errore interno del server' }, 500, request.headers.get('Origin') || '*')
    }
  },
}
