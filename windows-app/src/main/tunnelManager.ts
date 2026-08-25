import { ChildProcess, spawn } from 'child_process'
import path from 'path'
import http from 'http'
import https from 'https'

let tunnelProcess: ChildProcess | null = null
let currentTunnelUrl: string = ''
let healthCheckInterval: NodeJS.Timeout | null = null
let processWatchInterval: NodeJS.Timeout | null = null

type TunnelCallback = (url: string | null, error?: string) => void

const callbacks: TunnelCallback[] = []

const HEALTH_CHECK_PORT = 3899

export function onTunnelUrlChange(cb: TunnelCallback): void {
  callbacks.push(cb)
}

function notifyCallbacks(url: string | null, error?: string): void {
  currentTunnelUrl = url || ''
  for (const cb of callbacks) {
    cb(url, error)
  }
}

export function getTunnelUrl(): string {
  return currentTunnelUrl
}

export async function findCloudflaredPath(): Promise<string> {
  const { execSync } = require('child_process')
  try {
    const result = execSync('where cloudflared 2>nul || which cloudflared 2>/dev/null', { encoding: 'utf8' })
    return result.trim().split('\n')[0]
  } catch {
    const bundledPath = path.join(__dirname, '../../bin/cloudflared.exe')
    return bundledPath
  }
}

export function startTunnel(localPort: number = HEALTH_CHECK_PORT): void {
  if (tunnelProcess) {
    return
  }

  findCloudflaredPath().then(cloudflaredPath => {
    const args = ['tunnel', '--url', `http://localhost:${localPort}`]

    tunnelProcess = spawn(cloudflaredPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    tunnelProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString()
      const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/)
      if (match && !currentTunnelUrl) {
        const url = match[0]
        notifyCallbacks(url)
        console.log(`[Tunnel] URL: ${url}`)
        startHealthCheck(url)
      }
      console.log(`[cloudflared] ${output.trim()}`)
    })

    const parseUrl = (data: Buffer) => {
      const output = data.toString()
      console.error(`[cloudflared:err] ${output.trim()}`)
      const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/)
      if (match && !currentTunnelUrl) {
        const url = match[0]
        notifyCallbacks(url)
        console.log(`[Tunnel] URL: ${url}`)
        startHealthCheck(url)
      }
    }

    tunnelProcess.stderr?.on('data', parseUrl)

    tunnelProcess.on('close', (code) => {
      console.log(`[Tunnel] Process chiuso con codice ${code}`)
      tunnelProcess = null
      stopHealthCheck()
      notifyCallbacks(null, `Tunnel chiuso (codice: ${code})`)

      if (code !== 0) {
        setTimeout(() => startTunnel(localPort), 5000)
      }
    })

    tunnelProcess.on('error', (err) => {
      console.error(`[Tunnel] Errore avvio: ${err.message}`)
      tunnelProcess = null
      notifyCallbacks(null, err.message)
    })

    startProcessWatch()
  })
}

function startProcessWatch(): void {
  if (processWatchInterval) {
    clearInterval(processWatchInterval)
  }

  processWatchInterval = setInterval(() => {
    if (tunnelProcess) {
      const isDead = tunnelProcess.exitCode !== null
      if (isDead) {
        console.log('[Tunnel] Processo morto, riavvio...')
        tunnelProcess = null
        stopHealthCheck()
        startTunnel()
      }
    }
  }, 30000)
}

function startHealthCheck(url: string): void {
  stopHealthCheck()
  let failCount = 0

  healthCheckInterval = setInterval(() => {
    const parsedUrl = new URL(url)
    const httpModule = parsedUrl.protocol === 'https:' ? https : http
    const req = httpModule.get(`${parsedUrl.origin}/health`, (res) => {
      if (res.statusCode === 200) {
        failCount = 0
      } else {
        failCount++
      }
    })

    req.on('error', () => {
      failCount++
    })

    req.setTimeout(5000, () => {
      req.destroy()
      failCount++
    })

    if (failCount >= 3) {
      console.log('[Tunnel] Health check fallito 3 volte, riavvio...')
      restartTunnel()
    }
  }, 60000)
}

function stopHealthCheck(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval)
    healthCheckInterval = null
  }
}

export function restartTunnel(): void {
  stopTunnel()
  setTimeout(() => startTunnel(), 2000)
}

export function stopTunnel(): void {
  stopHealthCheck()
  if (processWatchInterval) {
    clearInterval(processWatchInterval)
    processWatchInterval = null
  }

  if (tunnelProcess) {
    tunnelProcess.kill('SIGTERM')
    setTimeout(() => {
      if (tunnelProcess) {
        tunnelProcess.kill('SIGKILL')
        tunnelProcess = null
      }
    }, 3000)
  }

  currentTunnelUrl = ''
  notifyCallbacks(null, 'Tunnel fermato')
}
