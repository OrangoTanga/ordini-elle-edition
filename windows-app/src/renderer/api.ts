import { encryptData, decryptData } from './crypto'

const WORKER_URL = 'https://ordini-elly-worker.elly-order.workers.dev'
const DEV_PROXY = ''

let cryptoPassword = ''
let cryptoSalt = ''

export function setCryptoKey(password: string, salt: string): void {
  cryptoPassword = password
  cryptoSalt = salt
}

export function getApiUrl(): string {
  const stored = localStorage.getItem('worker_url')
  if (stored) return stored

  const isDev = typeof location !== 'undefined' && location.hostname === 'localhost'
  // Prefer local server when available (installed app on Windows)
  if (!isDev && typeof window !== 'undefined' && window.electron) {
    return 'http://localhost:3899'
  }
  return isDev ? DEV_PROXY : WORKER_URL
}

export function setApiUrl(url: string): void {
  localStorage.setItem('worker_url', url.replace(/\/+$/, ''))
}

export function resetApiUrl(): void {
  localStorage.removeItem('worker_url')
}

export function isUsingCustomUrl(): boolean {
  return !!localStorage.getItem('worker_url')
}

const SENSITIVE_FIELDS = ['business_name', 'vat', 'iban', 'notes']

async function encryptOrderFields(body: any): Promise<any> {
  const cloned = { ...body }
  for (const field of SENSITIVE_FIELDS) {
    if (cloned[field] && cryptoPassword && cryptoSalt) {
      cloned[field] = await encryptData(cloned[field], cryptoPassword, cryptoSalt)
    }
  }
  return cloned
}

async function decryptOrderFields(data: any): Promise<any> {
  if (Array.isArray(data)) {
    return Promise.all(data.map(d => decryptOrderFields(d)))
  }
  if (data && typeof data === 'object') {
    const cloned = { ...data }
    for (const field of SENSITIVE_FIELDS) {
      if (cloned[field] && cryptoPassword && cryptoSalt) {
        try {
          cloned[field] = await decryptData(cloned[field], cryptoPassword, cryptoSalt)
        } catch { }
      }
    }
    return cloned
  }
  return data
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}, timeoutMs = 15000): Promise<{ success: boolean; data?: T; error?: string }> {
  const token = localStorage.getItem('token')
  const base = getApiUrl()

  // Timeout: evita che un server irraggiungibile/pendente blocchi a lungo
  // l'interfaccia (es. login "Accesso in corso..." per sempre). Dopo il limite
  // la richiesta viene abortita e restituito un errore di connessione.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${base}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    })
    const json = await res.json()

    if (json.data && cryptoPassword && cryptoSalt) {
      json.data = await decryptOrderFields(json.data)
    }

    return json
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { success: false, error: 'Timeout: server non raggiungibile. Riprova.' }
    }
    return { success: false, error: err.message || 'Errore di connessione' }
  } finally {
    clearTimeout(timer)
  }
}

export const api = {
  auth: {
    login: async (username: string, password: string) =>
      fetchApi<{ token: string; user: { id: number; username: string; name: string; phone: string; role: string; active: boolean; created_at: string }; crypto_salt?: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),

    verify: async (token: string) =>
      fetchApi<{ valid: boolean; isAdmin?: boolean; role?: string }>('/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),
  },

  products: {
    list: () => fetchApi<any[]>('/api/products'),
    get: (id: number) => fetchApi<any>(`/api/products/${id}`),
    create: (data: any) => fetchApi<any>('/api/products', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => fetchApi<any>(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => fetchApi<any>(`/api/products/${id}`, { method: 'DELETE' }),
  },

  customers: {
    list: () => fetchApi<any[]>('/api/customers'),
    get: (id: number) => fetchApi<any>(`/api/customers/${id}`),
    create: (data: any) => fetchApi<any>('/api/customers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => fetchApi<any>(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => fetchApi<any>(`/api/customers/${id}`, { method: 'DELETE' }),
  },

  orders: {
    list: async (queryString?: string) => {
      const result = await fetchApi<any[]>(`/api/orders${queryString ? `?${queryString}` : ''}`)
      return result
    },
    get: async (id: number) => {
      const result = await fetchApi<any>(`/api/orders/${id}`)
      return result
    },
    create: async (data: any) => {
      const body = await encryptOrderFields(data)
      return fetchApi<any>('/api/orders', { method: 'POST', body: JSON.stringify(body) })
    },
    updateStatus: (id: number, status: string) =>
      fetchApi<any>(`/api/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    delete: (id: number) =>
      fetchApi<any>(`/api/orders/${id}`, { method: 'DELETE' }),
    dashboard: () => fetchApi<any>('/api/orders/stats/dashboard'),
  },

  users: {
    list: () => fetchApi<any[]>('/api/users'),
    create: (data: any) => fetchApi<any>('/api/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => fetchApi<any>(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => fetchApi<any>(`/api/users/${id}`, { method: 'DELETE' }),
  },

  listini: {
    list: () => fetchApi<any[]>('/api/listini'),
    get: (id: number) => fetchApi<any>(`/api/listini/${id}`),
    create: (data: any) => fetchApi<any>('/api/listini', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => fetchApi<any>(`/api/listini/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => fetchApi<any>(`/api/listini/${id}`, { method: 'DELETE' }),
  },

  listinoPrices: {
    get: (productId: number) => fetchApi<any[]>(`/api/listino-prices/${productId}`),
    update: (productId: number, prices: { listino_id: number; price: number }[]) =>
      fetchApi<any[]>(`/api/listino-prices/${productId}`, { method: 'PUT', body: JSON.stringify({ prices }) }),
  },

  settings: {
    get: () => fetchApi<Record<string, string>>('/api/settings'),
    update: (settings: Record<string, string>) =>
      fetchApi<Record<string, string>>('/api/settings', { method: 'PUT', body: JSON.stringify(settings) }),
  },

  payments: {
    list: (filters?: string) => fetchApi<any[]>(`/api/payments${filters ? `?${filters}` : ''}`),
    update: (id: number, data: any) => fetchApi<any>(`/api/payments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    summary: (filters?: string) => fetchApi<any>(`/api/payments/summary${filters ? `?${filters}` : ''}`),
  },

  commissionExceptions: {
    list: () => fetchApi<any[]>('/api/commission-exceptions'),
    create: (data: any) => fetchApi<any>('/api/commission-exceptions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => fetchApi<any>(`/api/commission-exceptions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => fetchApi<any>(`/api/commission-exceptions/${id}`, { method: 'DELETE' }),
  },

  categories: {
    list: () => fetchApi<{ id: number; name: string; sort_order: number }[]>('/api/categories'),
    create: (name: string) =>
      fetchApi<{ id: number; name: string; sort_order: number }>('/api/categories', { method: 'POST', body: JSON.stringify({ name }) }),
    rename: (id: number, name: string) =>
      fetchApi<{ id: number; name: string; sort_order: number }>(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
    remove: (id: number) => fetchApi<any>(`/api/categories/${id}`, { method: 'DELETE' }),
  },

  productCommissionOverrides: {
    list: (productId: number) => fetchApi<any[]>(`/api/product-commission-overrides/${productId}`),
    update: (productId: number, overrides: { listino_id: number; commission_percent: number }[]) =>
      fetchApi<any[]>(`/api/product-commission-overrides/${productId}`, { method: 'PUT', body: JSON.stringify({ overrides }) }),
    delete: (productId: number) => fetchApi<any>(`/api/product-commission-overrides/${productId}`, { method: 'DELETE' }),
    autoCalculate: (productId: number) =>
      fetchApi<any>('/api/product-commission-overrides/auto-calculate', { method: 'POST', body: JSON.stringify({ product_id: productId }) }),
  },

  purge: {
    config: () => fetchApi<Record<string, string>>('/api/purge/config'),
    updateConfig: (settings: Record<string, string>) =>
      fetchApi<Record<string, string>>('/api/purge/config', { method: 'PUT', body: JSON.stringify(settings) }),
    eligible: (days: number) => fetchApi<any[]>(`/api/purge/eligible?days=${days}`),
    run: (order_ids: number[]) =>
      fetchApi<{ exported_file: string; purged_count: number }>('/api/purge/run', {
        method: 'POST', body: JSON.stringify({ order_ids }),
      }),
    history: () => fetchApi<any[]>('/api/purge/history'),
  },

  appVersions: {
    get: async (platform: string) => {
      try {
        const res = await fetch(`${getApiUrl()}/api/app-versions?platform=${encodeURIComponent(platform)}`)
        if (!res.ok) return { success: false, error: `HTTP ${res.status}` }
        return await res.json()
      } catch (e: any) {
        return { success: false, error: e?.message || 'Errore di rete' }
      }
    },
  },

  health: async () => {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(`${getApiUrl()}/health`, { method: 'GET', signal: controller.signal })
      clearTimeout(timeout)
      return res.ok
    } catch { return false }
  },
}
