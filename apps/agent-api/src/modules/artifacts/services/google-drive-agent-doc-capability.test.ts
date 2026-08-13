import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildLegacyIntegrationHttpRoute } from '@vibey/api-shared'
import { VIBEY_API_ACTION_DOCS } from '../../agent-sync/data/vibey-api-action-docs'
import { canonicalizeIntegrationId } from '../../shared/utils/integration-id.util'

const repoRoot = resolve(__dirname, '../../../../../..')
const migration = readFileSync(
  resolve(repoRoot, 'supabase/migrations/20260813152000_google_drive_agent_doc_capability.sql'),
  'utf8',
)

describe('Google Drive agent document capability', () => {
  it('registers Google Doc creation against the existing Drive connection', () => {
    expect(migration).toContain("'google_drive'")
    expect(migration).toContain("'create_google_doc'")
    expect(migration).toContain('/api/integrations/google-drive/files/google-doc')
    expect(migration).toContain("array['shared']::text[]")
    expect(migration).toContain('ON CONFLICT (integration_id, action_slug) DO UPDATE')
  })

  it('passes the discovered title and HTML to the canonical export endpoint', () => {
    expect(
      buildLegacyIntegrationHttpRoute(
        { method: 'POST', path: '/api/integrations/google-drive/files/google-doc' },
        { title: 'VIP script', html: '<h1>VIP script</h1>' },
      ),
    ).toEqual({
      method: 'POST',
      path: '/api/integrations/google-drive/files/google-doc',
      body: { title: 'VIP script', html: '<h1>VIP script</h1>' },
    })
  })

  it('tells agents that Google Drive is the Google Docs connection', () => {
    expect(VIBEY_API_ACTION_DOCS.use_integration.description).toContain(
      'Google Drive connection also authorizes Google Docs creation',
    )
    expect(canonicalizeIntegrationId('google_docs')).toBe('google_drive')
    expect(canonicalizeIntegrationId('google-docs')).toBe('google_drive')
  })
})
