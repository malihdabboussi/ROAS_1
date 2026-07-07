import { describe, expect, it } from 'vitest'
import { SocialPostService } from '../social-post.service'

describe('SocialPostService integration priority', () => {
  it('prefers personal connected over shared when available', () => {
    const pick = (SocialPostService as any).prototype.pickPreferredIntegrationRow as (
      rows: Array<Record<string, unknown>>,
      userId: string,
      orgId: string | null,
    ) => Record<string, unknown> | null

    const rows = [
      { id: 'shared-default', scope_mode: 'org_shared', status: 'connected', is_default: true },
      { id: 'personal', scope_mode: 'personal', status: 'connected', user_id: 'user-1' },
    ]

    const picked = pick(rows, 'user-1', 'org-1')
    expect(picked?.id).toBe('personal')
  })
})
