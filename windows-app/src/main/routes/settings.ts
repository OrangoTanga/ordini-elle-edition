import { Router } from 'express'
import { getDb } from '../database'

export const settingsRouter = Router()

// GET /api/settings - restituisce tutte le impostazioni come key-value
settingsRouter.get('/', (_req, res) => {
  try {
    const db = getDb()
    const rows = db.prepare('SELECT key, value FROM purge_config').all() as { key: string; value: string }[]
    const settings: Record<string, string> = {}
    for (const row of rows) {
      settings[row.key] = row.value
    }
    res.json({ success: true, data: settings })
  } catch (err) {
    console.error('[Settings] Errore GET:', err)
    res.status(500).json({ success: false, error: 'Errore interno' })
  }
})

// PUT /api/settings - aggiorna impostazioni (solo chiavi permesse)
settingsRouter.put('/', (req, res) => {
  try {
    const allowedKeys = [
      'app_version_windows',
      'app_download_url_windows',
      'app_mandatory_windows',
      'app_notes_windows',
      'app_version_android',
      'app_download_url_android',
      'app_mandatory_android',
      'app_notes_android',
      'auto_purge_enabled',
      'purge_days_threshold',
    ]

    const updates = req.body as Record<string, string>
    if (!updates || typeof updates !== 'object') {
      res.status(400).json({ success: false, error: 'Body non valido' })
      return
    }

    const db = getDb()
    const stmt = db.prepare('INSERT OR REPLACE INTO purge_config (key, value) VALUES (?, ?)')

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedKeys.includes(key)) continue
      if (typeof value !== 'string') continue
      stmt.run(key, value)
    }

    res.json({ success: true, data: { updated: Object.keys(updates).filter(k => allowedKeys.includes(k)).length } })
  } catch (err) {
    console.error('[Settings] Errore PUT:', err)
    res.status(500).json({ success: false, error: 'Errore interno' })
  }
})

// GET /api/app-versions?platform=windows|android - per OTA update checker
settingsRouter.get('/app-versions', (req, res) => {
  try {
    const platform = req.query.platform as 'windows' | 'android'
    if (!platform || !['windows', 'android'].includes(platform)) {
      res.status(400).json({ success: false, error: 'Platform richiesta (windows|android)' })
      return
    }

    const db = getDb()
    const versionKey = `app_version_${platform}`
    const urlKey = `app_download_url_${platform}`
    const mandatoryKey = `app_mandatory_${platform}`
    const notesKey = `app_notes_${platform}`

    const version = db.prepare('SELECT value FROM purge_config WHERE key = ?').get(versionKey) as { value: string } | undefined
    const url = db.prepare('SELECT value FROM purge_config WHERE key = ?').get(urlKey) as { value: string } | undefined
    const mandatory = db.prepare('SELECT value FROM purge_config WHERE key = ?').get(mandatoryKey) as { value: string } | undefined
    const notes = db.prepare('SELECT value FROM purge_config WHERE key = ?').get(notesKey) as { value: string } | undefined

    res.json({
      success: true,
      data: {
        version: version?.value || null,
        url: url?.value || null,
        mandatory: mandatory?.value === 'true',
        notes: notes?.value || '',
      }
    })
  } catch (err) {
    console.error('[AppVersions] Errore GET:', err)
    res.status(500).json({ success: false, error: 'Errore interno' })
  }
})