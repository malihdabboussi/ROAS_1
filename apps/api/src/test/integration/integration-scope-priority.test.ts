import { describe, expect, it } from 'vitest'
import { IntegrationsStatusService } from '../../modules/integrations/services/integrations-status.service'

describe('integration scope priority', () => {
  it('prefers personal connected row in org context', () => {
    const pick = (IntegrationsStatusService as any).prototype.pickBestStatusRow as (
      rows: Array<Record<string, unknown>>,
      userId: string,
      orgId: string | null,
    ) => Record<string, unknown> | null

    const rows = [
      { id: 'shared-new', scope_mode: 'org_shared', status: 'connected', is_default: false },
      { id: 'shared-default', scope_mode: 'org_shared', status: 'connected', is_default: true },
      {
        id: 'personal-me',
        scope_mode: 'personal',
        status: 'connected',
        user_id: 'user-1',
        is_default: false,
      },
    ]

    const picked = pick(rows, 'user-1', 'org-1')
    expect(picked?.id).toBe('personal-me')
  })

  it('falls back to shared default when personal missing', () => {
    const pick = (IntegrationsStatusService as any).prototype.pickBestStatusRow as (
      rows: Array<Record<string, unknown>>,
      userId: string,
      orgId: string | null,
    ) => Record<string, unknown> | null

    const rows = [
      { id: 'shared-new', scope_mode: 'org_shared', status: 'connected', is_default: false },
      { id: 'shared-default', scope_mode: 'org_shared', status: 'connected', is_default: true },
    ]

    const picked = pick(rows, 'user-1', 'org-1')
    expect(picked?.id).toBe('shared-default')
  })
})
