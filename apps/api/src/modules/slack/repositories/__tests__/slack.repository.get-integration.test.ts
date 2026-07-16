import { describe, expect, it, vi } from 'vitest'
import { SlackRepository } from '../slack.repository'

describe('SlackRepository.getIntegration', () => {
  it('returns org-scoped row when present', async () => {
    const orgRow = { access_token: 'xoxb-org', metadata: { team_id: 'T-org' } }
    const maybeSingle = vi.fn().mockResolvedValue({ data: orgRow, error: null })
    const is = vi.fn(() => ({ maybeSingle }))
    const eq = vi.fn(() => ({ eq, is, maybeSingle }))
    const select = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ select }))
    const supabase = { from } as never
    const repo = new SlackRepository()

    const result = await repo.getIntegration(supabase, 'user-1', 'org-1')

    expect(result).toEqual(orgRow)
    expect(eq).toHaveBeenCalledWith('org_id', 'org-1')
    expect(is).not.toHaveBeenCalled()
    expect(from).toHaveBeenCalledTimes(1)
  })

  it('falls back to personal Slack when org-scoped row is missing', async () => {
    const personalRow = { access_token: 'xoxb-personal', metadata: { team_id: 'T-personal' } }
    const orgMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const personalMaybeSingle = vi.fn().mockResolvedValue({ data: personalRow, error: null })
    const orgIs = vi.fn(() => ({ maybeSingle: orgMaybeSingle }))
    const personalIs = vi.fn(() => ({ maybeSingle: personalMaybeSingle }))

    const from = vi
      .fn()
      .mockImplementationOnce(() => {
        const eq = vi.fn(() => ({ eq, is: orgIs, maybeSingle: orgMaybeSingle }))
        return { select: vi.fn(() => ({ eq })) }
      })
      .mockImplementationOnce(() => {
        const eq = vi.fn(() => ({ eq, is: personalIs, maybeSingle: personalMaybeSingle }))
        return { select: vi.fn(() => ({ eq })) }
      })

    const supabase = { from } as never
    const repo = new SlackRepository()

    const result = await repo.getIntegration(supabase, 'user-1', 'org-1')

    expect(result).toEqual(personalRow)
    expect(from).toHaveBeenCalledTimes(2)
    expect(personalIs).toHaveBeenCalledWith('org_id', null)
  })

  it('does not fall back when personal scope is requested', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const is = vi.fn(() => ({ maybeSingle }))
    const eq = vi.fn(() => ({ eq, is, maybeSingle }))
    const select = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ select }))
    const supabase = { from } as never
    const repo = new SlackRepository()

    const result = await repo.getIntegration(supabase, 'user-1', null)

    expect(result).toBeNull()
    expect(from).toHaveBeenCalledTimes(1)
    expect(is).toHaveBeenCalledWith('org_id', null)
  })
})
