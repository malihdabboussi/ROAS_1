import { describe, expect, it } from 'vitest'
import {
  getIntegrationConnectionDisplayLabel,
  getIntegrationGroupIdentitySummary,
  resolveIntegrationConnectionIdentity,
} from './integration-connection-label'
import type { Integration, UserIntegration } from './integrations.types'

function integration(id: string, name: string): Integration {
  return { id, provider: id, name, description: '', is_active: true }
}

function connection(
  integrationId: string,
  overrides: Partial<UserIntegration> = {},
): UserIntegration {
  return {
    id: `${integrationId}-1`,
    integration_id: integrationId,
    provider: integrationId,
    status: 'connected',
    ...overrides,
  }
}

describe('integration connection labels', () => {
  it('labels a note taker defined from Settings by the email on its row, else by its name', () => {
    expect(
      getIntegrationConnectionDisplayLabel({
        userIntegration: connection('nt_otter', { metadata: { email: 'ana@example.com' } }),
        integration: integration('nt_otter', 'Otter'),
        accountIndex: 1,
        accountCount: 1,
      }),
    ).toBe('ana@example.com')
    expect(
      getIntegrationConnectionDisplayLabel({
        userIntegration: connection('nt_otter'),
        integration: integration('nt_otter', 'Otter'),
        accountIndex: 1,
        accountCount: 1,
      }),
    ).toBe('Otter')
  })

  it('uses the same fallback before and during rename', () => {
    expect(
      getIntegrationConnectionDisplayLabel({
        userIntegration: connection('fathom'),
        integration: integration('fathom', 'Fathom'),
        accountIndex: 1,
        accountCount: 1,
      }),
    ).toBe('Fathom')
  })

  it('keeps unlabeled duplicate accounts distinguishable', () => {
    expect(
      getIntegrationConnectionDisplayLabel({
        userIntegration: connection('fathom'),
        integration: integration('fathom', 'Fathom'),
        accountIndex: 2,
        accountCount: 2,
      }),
    ).toBe('Fathom account 2')
  })

  it('masks opaque Codex and Higgsfield account ids', () => {
    const codexRow = connection('openai_codex', {
      connection_label: 'bf6bf9cd-7404-421f-aa49-601d6c6013f8',
      metadata: { account_id: 'bf6bf9cd-7404-421f-aa49-601d6c6013f8' },
    })
    const higgsfieldRow = connection('higgsfield', {
      metadata: { server_id: '1c536cc6-68d1-48d7-be89-6047bc45aa26' },
    })

    expect(
      resolveIntegrationConnectionIdentity(codexRow, integration('openai_codex', 'Codex')),
    ).toBe('Codex account ••••6013f8')
    expect(
      resolveIntegrationConnectionIdentity(higgsfieldRow, integration('higgsfield', 'Higgsfield')),
    ).toBe('Higgsfield account ••••45aa26')
  })

  it('identifies existing Meta connections by the Facebook account, not a client Page label', () => {
    const row = connection('meta', {
      connection_label: 'Client Page',
      metadata: { meta_user_id: '123456789', pages: [{ name: 'Client Page' }] },
    })

    expect(resolveIntegrationConnectionIdentity(row, integration('meta', 'Meta Ads'))).toBe(
      'Facebook account ••••456789',
    )
  })

  it('preserves a user-renamed Meta account label', () => {
    const row = connection('meta', {
      connection_label: 'Dylan business login',
      metadata: { meta_user_id: '123456789', pages: [{ name: 'Client Page' }] },
    })

    expect(resolveIntegrationConnectionIdentity(row, integration('meta', 'Meta Ads'))).toBe(
      'Dylan business login',
    )
  })

  it('summarizes distinct account identities in the group header', () => {
    const googleCalendar = integration('google_calendar', 'Google Calendar')
    const rows = [
      connection('google_calendar', { id: 'one', connection_label: 'work@example.com' }),
      connection('google_calendar', { id: 'two', connection_label: 'personal@example.com' }),
    ]

    expect(getIntegrationGroupIdentitySummary(rows, googleCalendar)).toBe(
      'work@example.com, personal@example.com',
    )
  })

  it('uses the Page Grader host when no user profile exists', () => {
    const row = connection('page_grader', {
      metadata: { base_url_host: 'portal.example.com' },
    })
    expect(
      resolveIntegrationConnectionIdentity(row, integration('page_grader', 'Page Grader')),
    ).toBe('portal.example.com')
  })
})
