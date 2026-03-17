/**
 * Client-side device fingerprinting utility.
 * Collects non-PII signals to detect multi-account abuse.
 */

async function getCanvasHash(): Promise<string> {
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    canvas.width = 200
    canvas.height = 50
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillStyle = '#f60'
    ctx.fillRect(125, 1, 62, 20)
    ctx.fillStyle = '#069'
    ctx.fillText('Fortuna fp', 2, 15)
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
    ctx.fillText('Fortuna fp', 4, 17)
    const dataUrl = canvas.toDataURL()
    // Simple hash
    let hash = 0
    for (let i = 0; i < dataUrl.length; i++) {
      const char = dataUrl.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash |= 0
    }
    return hash.toString(36)
  } catch {
    return ''
  }
}

async function hashFingerprint(raw: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(raw)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export interface DeviceFingerprint {
  fingerprint_hash: string
  user_agent: string
  screen_resolution: string
  timezone: string
  language: string
  platform: string
  canvas_hash: string
}

export async function collectFingerprint(): Promise<DeviceFingerprint> {
  const userAgent = navigator.userAgent
  const screenResolution = `${screen.width}x${screen.height}x${screen.colorDepth}`
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const language = navigator.language
  const platform = navigator.platform || 'unknown'
  const canvasHash = await getCanvasHash()

  // Combine signals into a single hash
  const raw = [userAgent, screenResolution, timezone, language, platform, canvasHash].join('|')
  const fingerprintHash = await hashFingerprint(raw)

  return {
    fingerprint_hash: fingerprintHash,
    user_agent: userAgent,
    screen_resolution: screenResolution,
    timezone,
    language,
    platform,
    canvas_hash: canvasHash,
  }
}

const FP_STORAGE_KEY = 'fortuna_fp_registered'

export function shouldRegisterFingerprint(): boolean {
  try {
    const last = localStorage.getItem(FP_STORAGE_KEY)
    if (!last) return true
    // Re-register every 24 hours
    return Date.now() - Number(last) > 24 * 60 * 60 * 1000
  } catch {
    return true
  }
}

export function markFingerprintRegistered(): void {
  try {
    localStorage.setItem(FP_STORAGE_KEY, String(Date.now()))
  } catch {
    // ignore
  }
}

export async function registerDevice(): Promise<{ flagged: boolean; shared_accounts: number } | null> {
  if (!shouldRegisterFingerprint()) return null

  try {
    const fp = await collectFingerprint()
    const res = await fetch('/api/fraud/register-device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fp),
    })
    if (res.ok) {
      markFingerprintRegistered()
      return await res.json()
    }
    return null
  } catch {
    return null
  }
}
