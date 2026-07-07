/**
 * Shared validation, fallback constants, and repair helpers for Ad / Social Post TSX creatives.
 * Mirrors the self-healing approach used by Funnels (SandpackPreview + useSelfHealingPreview).
 */

export function looksLikeInvalidCreativeTsx(code: string): boolean {
  const source = code.trim()
  if (!source) return true
  if (/^@import\s+url\(/i.test(source)) return true
  if (/^(?::root|html|body|\.[\w-]+|#[\w-]+)\s*\{/.test(source)) return true
  if (/<style[\s>]/i.test(source) && !/function\s+[A-Z]/.test(source)) return true
  if (/--[\w-]+\s*:\s*[^;]+;/.test(source) && !/function\s+[A-Z]/.test(source)) return true

  const hasComponent =
    /\bfunction\s+[A-Z][A-Za-z0-9_]*\s*\(/.test(source) ||
    /\bconst\s+[A-Z][A-Za-z0-9_]*\s*=/.test(source)
  return !hasComponent
}

export const SAFE_FALLBACK_AD_TSX = `function AdCreative({ width, height }) {
  return (
    <div style={{ width, height, display: 'grid', placeItems: 'center', background: '#18181b', color: '#a1a1aa', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', padding: 24 }}>
        <p style={{ fontSize: 14, margin: 0, opacity: 0.7 }}>Creative could not render</p>
        <p style={{ fontSize: 12, margin: '8px 0 0', opacity: 0.5 }}>Regenerate to fix</p>
      </div>
    </div>
  )
}`

export const SAFE_FALLBACK_SOCIAL_TSX = `function SocialCreative({ width, height }) {
  return (
    <div style={{ width, height, display: 'grid', placeItems: 'center', background: '#18181b', color: '#a1a1aa', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', padding: 24 }}>
        <p style={{ fontSize: 14, margin: 0, opacity: 0.7 }}>Creative could not render</p>
        <p style={{ fontSize: 12, margin: '8px 0 0', opacity: 0.5 }}>Regenerate to fix</p>
      </div>
    </div>
  )
}`

let repairServiceUnavailable = false
let repairServiceWarned = false

export function createCreativeRepairFn() {
  return async (brokenCode: string, error: string): Promise<string | null> => {
    if (repairServiceUnavailable) return null
    try {
      const res = await fetch('/api/tsx-repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: brokenCode, error }),
      })
      if (!res.ok) {
        if (res.status === 503) {
          repairServiceUnavailable = true
          if (!repairServiceWarned) {
            repairServiceWarned = true
            console.warn('[creative-tsx-repair] Service unavailable, disabling further repair calls')
          }
        }
        return null
      }
      const json = (await res.json()) as { code?: unknown; disabled?: unknown }
      if (json.disabled === true) {
        repairServiceUnavailable = true
        return null
      }
      return typeof json.code === 'string' ? json.code : null
    } catch {
      return null
    }
  }
}
