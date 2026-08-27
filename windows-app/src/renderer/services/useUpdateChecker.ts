import { useEffect, useRef, useState } from 'react'

// CONFIG: imposta qui il tuo repo GitHub (owner/repo)
const GITHUB_REPO = 'OrangoTanga/ordini-elle-edition'

export interface AppVersionInfo {
  version: string | null
  url: string | null
  mandatory: boolean
  notes: string
}

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const pa = parseVersion(a)
  const pb = parseVersion(b)
  if (!pa || !pb) return 0
  if (pa.major !== pb.major) return pa.major > pb.major ? 1 : -1
  if (pa.minor !== pb.minor) return pa.minor > pb.minor ? 1 : -1
  if (pa.patch !== pb.patch) return pa.patch > pb.patch ? 1 : -1
  return comparePre(pa.pre, pb.pre)
}

function parseVersion(value: string): { major: number; minor: number; patch: number; pre: string[] } | null {
  if (!value) return null
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-.]+))?$/.exec(value.trim())
  if (!m) return null
  return { major: parseInt(m[1], 10), minor: parseInt(m[2], 10), patch: parseInt(m[3], 10), pre: m[4] ? m[4].split('.') : [] }
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

// Fetch versione da GitHub Releases API
async function fetchLatestRelease(): Promise<{ version: string; url: string; notes: string } | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
      cache: 'no-cache'
    })
    if (!res.ok) return null
    const data = await res.json()
    const version = data.tag_name?.replace(/^v/, '')
    const url = data.html_url
    const notes = data.body || ''
    if (!version) return null
    return { version, url, notes }
  } catch {
    return null
  }
}

export function useUpdateChecker(platform: 'windows' | 'android') {
  const [info, setInfo] = useState<{ version: string; url: string; notes: string } | null>(null)
  const [currentVersion, setCurrentVersion] = useState('')
  const [dismissed, setDismissed] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let cancelled = false

    const runCheck = async () => {
      try {
        const version = await window.electron?.getAppVersion()
        if (!version) return
        setCurrentVersion(version)

        const latest = await fetchLatestRelease()
        if (cancelled || !latest) return

        if (compareVersions(version, latest.version) < 0) {
          setInfo(latest)
        }
      } catch { /* silenzioso: un errore di rete non blocca l'app */ }
    }

    runCheck()
    timerRef.current = setInterval(runCheck, CHECK_INTERVAL_MS)
    return () => {
      cancelled = true
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [platform])

  const dismiss = () => setDismissed(true)

  const openReleasePage = () => {
    if (info?.url) {
      window.electron?.shell?.openExternal?.(info.url)
    }
  }

  return { info, currentVersion, dismissed, dismiss, openReleasePage }
}