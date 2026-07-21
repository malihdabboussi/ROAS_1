import { describe, expect, it } from 'vitest'
import { GoogleWorkspaceGoogleClient } from '../../integrations/google-workspace-google.client'

describe('GoogleWorkspaceGoogleClient', () => {
  const client = new GoogleWorkspaceGoogleClient()

  it('parses a valid service account JSON', () => {
    const parsed = client.parseServiceAccount(
      JSON.stringify({
        client_email: 'svc@project.iam.gserviceaccount.com',
        private_key: '-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n',
      }),
    )
    expect(parsed.client_email).toBe('svc@project.iam.gserviceaccount.com')
    expect(parsed.private_key).toContain('BEGIN PRIVATE KEY')
  })

  it('rejects invalid service account JSON', () => {
    expect(() => client.parseServiceAccount('{')).toThrow(/invalid/i)
    expect(() => client.parseServiceAccount(JSON.stringify({ client_email: 'a@b.com' }))).toThrow(
      /private_key/i,
    )
  })
})
