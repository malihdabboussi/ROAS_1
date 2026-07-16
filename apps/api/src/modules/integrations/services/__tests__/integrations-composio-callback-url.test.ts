import { describe, expect, it } from 'vitest'
import { buildComposioCallbackRedirectUrl } from '../integrations-composio-callback-url'

describe('buildComposioCallbackRedirectUrl', () => {
  it('falls back to /home manage tab instead of missing /settings route', () => {
    const prev = process.env.APP_URL
    process.env.APP_URL = 'https://app.roas.io'
    try {
      const url = new URL(
        buildComposioCallbackRedirectUrl(undefined, 'google_calendar', undefined, undefined),
      )
      expect(url.pathname).toBe('/home')
      expect(url.searchParams.get('tab')).toBe('manage')
      expect(url.searchParams.get('integration')).toBe('google_calendar')
      expect(url.searchParams.get('composio_connected')).toBe('1')
    } finally {
      process.env.APP_URL = prev
    }
  })
})
