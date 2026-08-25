export interface ParsedVersion {
  major: number
  minor: number
  patch: number
  pre: string[]
}

export const VERSION_KEY_PREFIX = 'app_version_'
export const DOWNLOAD_URL_KEY_PREFIX = 'app_download_url_'
export const MANDATORY_KEY_PREFIX = 'app_mandatory_'
export const NOTES_KEY_PREFIX = 'app_notes_'

export type AppPlatform = 'windows' | 'android'

export function versionKey(platform: AppPlatform): string {
  return `${VERSION_KEY_PREFIX}${platform}`
}

export function downloadUrlKey(platform: AppPlatform): string {
  return `${DOWNLOAD_URL_KEY_PREFIX}${platform}`
}

export function mandatoryKey(platform: AppPlatform): string {
  return `${MANDATORY_KEY_PREFIX}${platform}`
}

export function notesKey(platform: AppPlatform): string {
  return `${NOTES_KEY_PREFIX}${platform}`
}

export function parseVersion(value: string): ParsedVersion | null {
  if (!value) return null
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-.]+))?$/.exec(value.trim())
  if (!m) return null
  return {
    major: parseInt(m[1], 10),
    minor: parseInt(m[2], 10),
    patch: parseInt(m[3], 10),
    pre: m[4] ? m[4].split('.') : [],
  }
}

function comparePre(a: string[], b: string[]): -1 | 0 | 1 {
  if (a.length === 0 && b.length === 0) return 0
  if (a.length === 0) return 1
  if (b.length === 0) return -1
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const x = a[i]
    const y = b[i]
    const xn = /^\d+$/.test(x)
    const yn = /^\d+$/.test(y)
    if (xn && yn) {
      const dx = parseInt(x, 10)
      const dy = parseInt(y, 10)
      if (dx !== dy) return dx > dy ? 1 : -1
    } else if (xn !== yn) {
      return xn ? -1 : 1
    } else if (x !== y) {
      return x > y ? 1 : -1
    }
  }
  if (a.length !== b.length) return a.length > b.length ? 1 : -1
  return 0
}

export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const pa = parseVersion(a)
  const pb = parseVersion(b)
  if (!pa || !pb) return 0
  if (pa.major !== pb.major) return pa.major > pb.major ? 1 : -1
  if (pa.minor !== pb.minor) return pa.minor > pb.minor ? 1 : -1
  if (pa.patch !== pb.patch) return pa.patch > pb.patch ? 1 : -1
  return comparePre(pa.pre, pb.pre)
}

export function isUpdateAvailable(current: string | null | undefined, latest: string | null | undefined): boolean {
  if (!latest) return false
  if (!current) return true
  return compareVersions(current, latest) < 0
}