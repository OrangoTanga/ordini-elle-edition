import { google } from 'googleapis'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'

const TOKEN_PATH = path.join(app.getPath('userData'), 'gdrive-token.json')
const CREDENTIALS_PATH = path.join(app.getPath('userData'), 'gdrive-credentials.json')
const FOLDER_NAME = 'OrdiniEllyEdition'

let auth: any = null

function loadCredentials(): { clientId: string; clientSecret: string } | null {
  try {
    if (!fs.existsSync(CREDENTIALS_PATH)) return null
    return JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'))
  } catch {
    return null
  }
}

export function saveCredentials(clientId: string, clientSecret: string): void {
  fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify({ clientId, clientSecret }))
}

export function isAuthenticated(): boolean {
  return auth !== null && fs.existsSync(TOKEN_PATH)
}

export function getAuthUrl(): string {
  const creds = loadCredentials()
  if (!creds || !creds.clientId || !creds.clientSecret) {
    return ''
  }

  const oauth2Client = new google.auth.OAuth2(
    creds.clientId,
    creds.clientSecret,
    'http://localhost:3899/auth/callback'
  )

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file'],
    prompt: 'consent',
  })
}

export async function authenticateWithCode(code: string): Promise<void> {
  const creds = loadCredentials()
  if (!creds) throw new Error('Credenziali Google Drive non configurate')

  const oauth2Client = new google.auth.OAuth2(
    creds.clientId,
    creds.clientSecret,
    'http://localhost:3899/auth/callback'
  )

  const { tokens } = await oauth2Client.getToken(code)
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens))
  auth = oauth2Client
  auth.setCredentials(tokens)
}

export async function loadAuth(): Promise<boolean> {
  try {
    const creds = loadCredentials()
    if (!creds) return false

    if (!fs.existsSync(TOKEN_PATH)) {
      return false
    }

    const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'))
    const oauth2Client = new google.auth.OAuth2(
      creds.clientId,
      creds.clientSecret,
      'http://localhost:3899/auth/callback'
    )

    oauth2Client.setCredentials(tokens)
    auth = oauth2Client

    if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
      const { credentials } = await oauth2Client.refreshAccessToken()
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(credentials))
      auth.setCredentials(credentials)
    }

    return true
  } catch {
    auth = null
    return false
  }
}

async function ensureFolder(): Promise<string> {
  const drive = google.drive({ version: 'v3', auth })

  const res = await drive.files.list({
    q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
  })

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!
  }

  const folder = await drive.files.create({
    requestBody: {
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  })

  return folder.data.id!
}

export async function syncTunnelUrl(url: string): Promise<void> {
  if (!auth) {
    throw new Error('Non autenticato su Google Drive')
  }

  try {
    const drive = google.drive({ version: 'v3', auth })
    const folderId = await ensureFolder()

    const res = await drive.files.list({
      q: `name='tunnel.json' and '${folderId}' in parents and trashed=false`,
      fields: 'files(id)',
    })

    const content = JSON.stringify({
      tunnel_url: url,
      updated_at: new Date().toISOString(),
    })

    if (res.data.files && res.data.files.length > 0) {
      const fileId = res.data.files[0].id!
      await drive.files.update({
        fileId,
        media: {
          mimeType: 'application/json',
          body: content,
        },
      })
    } else {
      await drive.files.create({
        requestBody: {
          name: 'tunnel.json',
          parents: [folderId],
        },
        media: {
          mimeType: 'application/json',
          body: content,
        },
      })
    }

    console.log('[GoogleDrive] Tunnel URL sincronizzato:', url)
  } catch (err: any) {
    console.error('[GoogleDrive] Errore sync:', err.message)
    throw err
  }
}

export async function readTunnelUrl(): Promise<string | null> {
  if (!auth) {
    return null
  }

  try {
    const drive = google.drive({ version: 'v3', auth })
    const folderId = await ensureFolder()

    const res = await drive.files.list({
      q: `name='tunnel.json' and '${folderId}' in parents and trashed=false`,
      fields: 'files(id)',
    })

    if (!res.data.files || res.data.files.length === 0) {
      return null
    }

    const fileId = res.data.files[0].id!
    const content = await drive.files.get({
      fileId,
      alt: 'media',
    })

    const data = content.data as any
    return data?.tunnel_url || null
  } catch {
    return null
  }
}
