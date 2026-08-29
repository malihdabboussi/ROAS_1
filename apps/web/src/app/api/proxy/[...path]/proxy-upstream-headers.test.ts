import { describe, expect, it } from 'vitest'
import { applyVercelProtectionBypass } from './proxy-upstream-headers'

describe('applyVercelProtectionBypass', () => {
  it('adds the configured bypass only for Vercel deployment targets', () => {
    const deploymentHeaders = new Headers()
    applyVercelProtectionBypass(
      deploymentHeaders,
      'https://roas-api-preview.vercel.app',
      'preview-secret',
    )
    expect(deploymentHeaders.get('x-vercel-protection-bypass')).toBe('preview-secret')

    const productionHeaders = new Headers()
    applyVercelProtectionBypass(productionHeaders, 'https://api.roas.io', 'preview-secret')
    expect(productionHeaders.has('x-vercel-protection-bypass')).toBe(false)
  })

  it('does not add a header when the bypass is not configured', () => {
    const headers = new Headers()
    applyVercelProtectionBypass(headers, 'https://roas-api-preview.vercel.app', undefined)
    expect(headers.has('x-vercel-protection-bypass')).toBe(false)
  })
})
