import { describe, expect, it } from 'vitest'
import { ArtifactsService } from '../artifacts.service'

describe('ArtifactsService integration priority', () => {
  it('uses explicit row id before fallback order', () => {
    const pick = (ArtifactsService as any).prototype.pickPreferredIntegrationRow as (
      rows: Array<Record<string, unknown>>,
      requestedRowId: string,
      userId: string,
    ) => Record<string, unknown> | null

    const rows = [
      { id: 'row-1', scope_mode: 'org_shared', status: 'connected', is_default: true },
      { id: 'row-2', scope_mode: 'personal', status: 'connected', user_id: 'user-1' },
    ]

    const picked = pick(rows, 'row-1', 'user-1')
    expect(picked?.id).toBe('row-1')
  })
})
