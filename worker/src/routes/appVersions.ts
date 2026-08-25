import type { Env } from '../types'
import { versionKey, downloadUrlKey, mandatoryKey, notesKey, isUpdateAvailable, compareVersions } from '../../../shared/app-versions'
import type { AppPlatform } from '../../../shared/app-versions'

export interface AppVersionInfo {
  version: string | null
  url: string | null
  mandatory: boolean
  notes: string
}

export async function handleGetAppVersion(env: Env, platform: string): Promise<Response> {
  if (platform !== 'windows' && platform !== 'android') {
    return Response.json({ success: false, error: 'Piattaforma non valida. Usa windows o android' }, { status: 400 })
  }
  const p = platform as AppPlatform

  const keys = [versionKey(p), downloadUrlKey(p), mandatoryKey(p), notesKey(p)]
  const placeholders = keys.map(() => '?').join(', ')
  const rows = await env.DB.prepare(`SELECT key, value FROM settings WHERE key IN (${placeholders})`).bind(...keys).all<any>()

  const map: Record<string, string> = {}
  for (const r of rows.results) {
    map[r.key] = r.value
  }

  const info: AppVersionInfo = {
    version: map[versionKey(p)] || null,
    url: map[downloadUrlKey(p)] || null,
    mandatory: map[mandatoryKey(p)] === 'true',
    notes: map[notesKey(p)] || '',
  }

  return Response.json({ success: true, data: info })
}

// Helper riusabile dai client: verifica se la versione corrente è obsoleta rispetto alla release configurata.
export { isUpdateAvailable, compareVersions }