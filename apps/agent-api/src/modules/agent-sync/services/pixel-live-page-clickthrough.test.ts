import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PLATFORM_TOOLS_BROWSER_QC_BLOCK } from '../../../../../../packages/agent-policy/src/platform-tools-template.js'

const repoRoot = resolve(__dirname, '../../../../../..')
const migration = readFileSync(
  resolve(repoRoot, 'supabase/migrations/20260814140000_pixel_live_page_clickthrough.sql'),
  'utf8',
)
const openclawConfig = JSON.parse(
  readFileSync(resolve(repoRoot, 'docker/openclaw.json'), 'utf8'),
) as { browser: { enabled: boolean } }
const supervisord = readFileSync(resolve(repoRoot, 'docker/supervisord.conf'), 'utf8')
const sidecar = readFileSync(resolve(repoRoot, 'docker/vibey-browser-sidecar.sh'), 'utf8')

describe('Pixel live-page click-through', () => {
  it('tells Pixel to click Register Now with a test lead instead of asking for a confirmation URL', () => {
    expect(PLATFORM_TOOLS_BROWSER_QC_BLOCK).toContain('registering a test lead')
    expect(PLATFORM_TOOLS_BROWSER_QC_BLOCK).toContain('Register Now')
    expect(PLATFORM_TOOLS_BROWSER_QC_BLOCK).toContain('qa+{unix}@roas.co')
    expect(PLATFORM_TOOLS_BROWSER_QC_BLOCK).toContain('Do not ask them to send a confirmation URL')
    expect(PLATFORM_TOOLS_BROWSER_QC_BLOCK).not.toContain(
      'State exactly which gated step remains untested',
    )
  })

  it('persists the click-through contract into Pixel global tools', () => {
    expect(migration).toContain("agent_key = 'vibey'")
    expect(migration).toContain("file_name = 'TOOLS.md'")
    expect(migration).toContain('registering a test lead')
    expect(migration).toContain('Register Now')
    expect(migration).toContain('qa+{unix}@roas.co')
    expect(migration).toContain('Do not ask them to send a confirmation URL')
    expect(migration).toContain(
      "RAISE EXCEPTION 'Pixel live-page click-through guidance was not persisted'",
    )
  })

  it('keeps the production browser control path able to open public funnel pages', () => {
    expect(openclawConfig.browser.enabled).toBe(true)
    expect(supervisord).toMatch(/\[program:browser-sidecar\][\s\S]*?autostart=true/)
    expect(supervisord).not.toContain('OPENCLAW_SKIP_BROWSER_CONTROL_SERVER')
    expect(sidecar).not.toContain('--proxy-server')
    expect(sidecar).not.toContain('squid')
    expect(sidecar).toContain('remote-debugging-port')
  })
})
