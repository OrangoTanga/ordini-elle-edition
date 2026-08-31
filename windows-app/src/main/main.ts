import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron'
import path from 'path'
import fs from 'fs'
import https from 'https'
import { spawn } from 'child_process'
import { startServer, stopServer } from './server'
import { startScheduler, stopScheduler } from './scheduler'
import { stopTunnel } from './tunnelManager'
import { persist } from './database'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0f0c29',
    titleBarStyle: 'hiddenInset',
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'))
  }

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })
}

function createTray(): void {
  let icon = nativeImage.createEmpty()
  try {
    const iconPath = app.isPackaged
      ? path.join(process.resourcesPath, 'assets', 'icon.png')
      : path.join(__dirname, '../../assets/icon.png')
    if (fs.existsSync(iconPath)) {
      icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    }
  } catch { /* fallback: icona vuota */ }
  tray = new Tray(icon)
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Apri Ordini Elly Edition', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Esci', click: () => app.quit() },
  ])

  tray.setToolTip('Ordini Elly Edition')
  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => mainWindow?.show())
}

// Scarica `url` su `dest` con ripresa automatica: usa richieste Range sui byte
// gia' scaricati (file parziale conservato come `<dest>.part`) e ritenta piu'
// volte in caso di interruzioni di rete, senza ricominciare da capo.
function downloadFile(url: string, dest: string, onProgress?: (received: number, total: number) => void): Promise<void> {
  const MAX_ATTEMPTS = 15
  const RETRY_DELAY_MS = 2000
  return new Promise((resolve, reject) => {
    let attempt = 0
    const partPath = `${dest}.part`
    const tryOnce = () => {
      attempt++
      let settled = false
      const fail = (err: Error) => {
        if (settled) return
        settled = true
        if (attempt < MAX_ATTEMPTS) {
          console.warn(`[Updater] Download interrotto (${err.message}), ripresa tra ${RETRY_DELAY_MS}ms (tentativo ${attempt}/${MAX_ATTEMPTS})`)
          setTimeout(tryOnce, RETRY_DELAY_MS)
        } else {
          try { fs.rmSync(partPath, { force: true }) } catch { /* ignora */ }
          reject(err)
        }
      }
      const succeed = () => {
        if (settled) return
        settled = true
        try {
          fs.renameSync(partPath, dest)
          resolve()
        } catch (err) {
          reject(err as Error)
        }
      }
      const baseOffset = fs.existsSync(partPath) ? fs.statSync(partPath).size : 0
      const headers: Record<string, string> = {}
      if (baseOffset > 0) headers.Range = `bytes=${baseOffset}-`
      const request = (u: string) => {
        const req = https.get(u, { headers }, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.resume()
            request(res.headers.location)
            return
          }
          const resumed = !!baseOffset && res.statusCode === 206
          // Il server ha ignorato il Range (200): si riparte da zero.
          if (baseOffset > 0 && !resumed) {
            try { fs.rmSync(partPath, { force: true }) } catch { /* ignora */ }
          }
          let total = parseInt(res.headers['content-length'] || '0', 10)
          const contentRange = res.headers['content-range']
          if (resumed && contentRange) {
            const m = /\/(\d+)$/.exec(contentRange)
            if (m) total = parseInt(m[1], 10)
          }
          if (!res.statusCode || (res.statusCode !== 200 && res.statusCode !== 206)) {
            res.resume()
            fail(new Error(`HTTP ${res.statusCode || 'errore'}`))
            return
          }
          let received = resumed ? baseOffset : 0
          if (total > 0) onProgress?.(received, total)
          const ws = fs.createWriteStream(partPath, { flags: resumed ? 'a' : 'w' })
          res.on('data', (chunk: Buffer) => {
            received += chunk.length
            if (total > 0) onProgress?.(Math.min(received, total), total)
          })
          res.on('error', (err) => { req.destroy(); ws.destroy(); fail(err) })
          res.pipe(ws)
          ws.on('finish', () => succeed())
          ws.on('error', (err) => fail(err))
        })
        req.setTimeout(30000, () => {
          req.destroy(new Error('timeout di rete'))
        })
        req.on('error', (err) => fail(err))
      }
      request(url)
    }
    tryOnce()
  })
}

// Termina l'app in modo IMMEDIATO e DETERMINISTICO per consentire all'installer
// NSIS (--updated) di procedere senza il messaggio "chiudi prima l'applicazione".
// app.quit() e' cooperativo: attende il drenaggio dell'event loop e puo' restare
// appeso su socket HTTP keep-alive / WebSocket / tunnel non chiusi, tenendo
// bloccati i file dell'app. Qui invece si fa un teardown esplicito e poi
// app.exit(0), che termina il processo subito liberando i file (il DB viene
// comunque persistito prima: e' gia' scritto a ogni richiesta, e lo riesportiamo
// qui per sicurezza).
function forceShutdownForUpdate(): void {
  isQuitting = true
  try { persist() } catch { /* se non riesce, il DB e' comunque su disco */ }
  try { stopScheduler() } catch { /* ignora */ }
  try { stopServer() } catch (err) { console.error('[Updater] stopServer fallito:', err) }
  try { stopTunnel() } catch { /* ignora */ }
  try {
    if (!mainWindow?.isDestroyed()) mainWindow?.destroy()
  } catch { /* ignora */ }
  mainWindow = null
  try { tray?.destroy() } catch { /* ignora */ }
  tray = null
  // Uscita forzata e sincrona: non passa da before-quit/will-quit, che qui
  // sono gia' stati eseguiti in forma esplicita. Garantisce che il processo
  // termini subito e che NSIS possa sovrascrivere i file.
  app.exit(0)
}

function setupIPC(): void {
  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.handle('window:close', () => mainWindow?.close())
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized())

  ipcMain.handle('app:getVersion', () => app.getVersion())

  ipcMain.handle('update:downloadAndInstall', async (_event, url: string) => {
    if (typeof url !== 'string' || !/^https:\/\//.test(url)) {
      return { ok: false, error: 'URL di download non valido' }
    }
    const basename = url.split('/').pop() || 'update.exe'
    if (!/^[A-Za-z0-9._\-]+$/.test(basename)) {
      return { ok: false, error: 'Nome file di aggiornamento non valido' }
    }
    const dest = path.join(app.getPath('temp'), basename)
    const sendProgress = (received: number, total: number) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update:progress', {
          received,
          total,
          percent: Math.min(100, Math.round((received / total) * 100)),
        })
      }
    }
    try {
      await downloadFile(url, dest, sendProgress)
      sendProgress(1, 1)
      // Avvia l'installer NSIS in modalita' auto-update. L'argomento --updated
      // dice all'installer che l'app e' in esecuzione: NSIS attende la chiusura
      // dell'app prima di sovrascrivere i file e, al termine, la rilancia.
      // Senza --updated l'installer prova a sovrascrivere subito e fallisce con
      // "l'app non puo' essere chiusa".
      const child = spawn(dest, ['--updated'], { detached: true, stdio: 'ignore' })
      child.on('error', (err) => {
        console.error('[Updater] Avvio installer fallito:', err)
      })
      child.unref()
      // Uscita immediata e deterministica: app.exit(0) chiude il processo subito
      // (non attende l'event loop), cosi' NSIS --updated vede l'app chiusa e
      // installa senza "chiudi prima l'applicazione Ordini Elly Edition".
      forceShutdownForUpdate()
      return { ok: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Download fallito'
      return { ok: false, error: msg }
    }
  })

  // Solo download + avvio installer (per bottone "Scarica ora" in banner)
  ipcMain.handle('update:download', async (_event, url: string) => {
    if (typeof url !== 'string' || !/^https:\/\//.test(url)) {
      return { ok: false, error: 'URL di download non valido' }
    }
    const basename = url.split('/').pop() || 'update.exe'
    if (!/^[A-Za-z0-9._\-]+$/.test(basename)) {
      return { ok: false, error: 'Nome file di aggiornamento non valido' }
    }
    const dest = path.join(app.getPath('temp'), basename)
    const sendProgress = (received: number, total: number) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update:progress', {
          received,
          total,
          percent: Math.min(100, Math.round((received / total) * 100)),
        })
      }
    }
    try {
      await downloadFile(url, dest, sendProgress)
      sendProgress(1, 1)
      // Vedi commento in update:downloadAndInstall: serve --updated.
      const child = spawn(dest, ['--updated'], { detached: true, stdio: 'ignore' })
      child.on('error', (err) => {
        console.error('[Updater] Avvio installer fallito:', err)
      })
      child.unref()
      forceShutdownForUpdate()
      return { ok: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Download fallito'
      return { ok: false, error: msg }
    }
  })
}

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      createWindow()
      return
    }
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  })

  app.whenReady().then(async () => {
    setupIPC()
    // La finestra viene creata PRIMA del server: se il server fallisce (es. porta
    // occupata da un processo zombie) l'app resta comunque utilizzabile.
    createWindow()
    createTray()
    try {
      await startServer()
    } catch (err) {
      console.error('[Main] Avvio server locale fallito:', err)
    }
    startScheduler()
    console.log('[Main] Applicazione avviata')
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  isQuitting = true
  stopScheduler()
  stopServer()
  stopTunnel()
})
