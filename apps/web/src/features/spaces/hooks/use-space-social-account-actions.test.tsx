import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Space } from '../types'
import type { SpaceSchema, ViewDef } from '../types/space-schema'
import { useSpaceSocialAccountActions } from './use-space-social-account-actions'

const mocks = vi.hoisted(() => ({
  addTrackedSocialAccount: vi.fn(),
  removeTrackedSocialAccountItems: vi.fn(),
  syncTrackedSocialAccount: vi.fn(),
  updateSpace: vi.fn(),
  reportSocialResearchError: vi.fn(),
}))

vi.mock('../services/social-research.service', () => ({
  addTrackedSocialAccount: mocks.addTrackedSocialAccount,
  removeTrackedSocialAccountItems: mocks.removeTrackedSocialAccountItems,
  syncTrackedSocialAccount: mocks.syncTrackedSocialAccount,
}))

vi.mock('../services/spaces.service', () => ({
  updateSpace: mocks.updateSpace,
}))

vi.mock('../lib/report-social-research-error', () => ({
  reportSocialResearchError: mocks.reportSocialResearchError,
  socialResearchContext: (
    spaceId: string,
    platform: string,
    extras?: Record<string, unknown>,
  ) => ({
    space_id: spaceId,
    platform,
    ...extras,
  }),
}))

function view(overrides: Partial<ViewDef> = {}): ViewDef {
  return {
    id: 'view-1',
    name: 'IG Research',
    type: 'ig_research',
    ig_research_config: {
      tracked_accounts: [],
    },
    ...overrides,
  } as ViewDef
}

function schema(activeView: ViewDef = view()): SpaceSchema {
  return {
    version: 1,
    fields: [],
    views: [activeView],
  }
}

function space(activeSchema: SpaceSchema): Space {
  return {
    id: 'space-1',
    org_id: 'org-1',
    user_id: 'user-1',
    title: 'Research Space',
    description: null,
    campaign_id: null,
    is_template: false,
    visibility: 'team',
    schema: activeSchema,
    created_at: '2026-06-23T00:00:00.000Z',
    updated_at: '2026-06-23T00:00:00.000Z',
  }
}

describe('useSpaceSocialAccountActions', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('keeps a successful account add when the follow-up refresh fails', async () => {
    const activeView = view()
    const activeSchema = schema(activeView)
    const patchActiveSpaceSchema = vi.fn()
    const applySessionDraft = vi.fn()
    const refreshError = new Error('refresh failed')
    const refresh = vi.fn(async () => {
      throw refreshError
    })

    mocks.addTrackedSocialAccount.mockResolvedValue({
      account: {
        handle: 'neelhome',
        user_id_ig: '123',
      },
      itemCount: 0,
    })
    mocks.updateSpace.mockResolvedValue({})

    const { result } = renderHook(() =>
      useSpaceSocialAccountActions({
        platform: 'instagram',
        activeView,
        activeSchema,
        activeSpace: space(activeSchema),
        patchActiveSpaceSchema,
        applySessionDraft,
        refresh,
      }),
    )

    await act(async () => {
      await expect(result.current.handleAddAccount('neelhome')).resolves.toBeUndefined()
    })

    expect(mocks.addTrackedSocialAccount).toHaveBeenCalledWith('instagram', 'space-1', 'neelhome', {
      orgId: 'org-1',
    })
    expect(mocks.updateSpace).toHaveBeenCalledWith(
      'space-1',
      expect.objectContaining({ schema: expect.any(Object) }),
      { orgId: 'org-1', resilient: true },
    )
    expect(patchActiveSpaceSchema).toHaveBeenCalledWith(
      expect.objectContaining({
        views: [
          expect.objectContaining({
            ig_research_config: expect.objectContaining({
              tracked_accounts: [
                expect.objectContaining({
                  handle: 'neelhome',
                }),
              ],
            }),
          }),
        ],
      }),
    )
    expect(applySessionDraft).toHaveBeenCalledWith('view-1', {
      ig_research_config: {
        tracked_accounts: [
          expect.objectContaining({
            handle: 'neelhome',
          }),
        ],
      },
    })
    expect(mocks.reportSocialResearchError).toHaveBeenCalledWith(
      'account_add_refresh_failed',
      refreshError,
      {
        space_id: 'space-1',
        platform: 'instagram',
        handle: 'neelhome',
      },
      'warn',
    )
  })
})
