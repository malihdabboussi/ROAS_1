import { useCallback } from 'react'
import { getAllSocialResearchConfig } from '../lib/all-social-research'
import {
  addTrackedSocialAccount,
  removeTrackedSocialAccountItems,
  syncTrackedSocialAccount,
} from '../services/social-research.service'
import { updateSpace } from '../services/spaces.service'
import {
  reportSocialResearchError,
  socialResearchContext,
} from '../lib/report-social-research-error'
import type { Space } from '../types'
import {
  DEFAULT_ALL_SOCIAL_RESEARCH_CONFIG,
  type AllSocialResearchConfig,
  type SocialPlatform,
  type SpaceSchema,
  type ViewDef,
} from '../types/space-schema'

function orgAllSocialResearchConfig(schema: SpaceSchema, viewId: string): AllSocialResearchConfig {
  const v = schema.views.find((x) => x.id === viewId)
  return getAllSocialResearchConfig(v ?? { id: viewId, type: 'all_social_research', name: '' })
}

type TrackedAccountsByPlatform = AllSocialResearchConfig['tracked_accounts_by_platform']
type TrackedAccountList = NonNullable<NonNullable<TrackedAccountsByPlatform>[SocialPlatform]>

function upsertTrackedAccount(
  accounts: TrackedAccountList = [],
  account: TrackedAccountList[number],
): TrackedAccountList {
  const handle = account.handle.toLowerCase()
  const next = accounts.filter((existing) => existing.handle.toLowerCase() !== handle)
  return [...next, account]
}

export function useAllSocialResearchAccountActions(opts: {
  activeView: ViewDef | null
  activeSchema: SpaceSchema | undefined
  activeSpace: Space | null
  patchActiveSpaceSchema: (s: SpaceSchema) => void
  applySessionDraft: (viewId: string, patch: Partial<ViewDef>) => void
  refresh: () => Promise<void>
}) {
  const {
    activeView,
    activeSchema,
    activeSpace,
    patchActiveSpaceSchema,
    applySessionDraft,
    refresh,
  } = opts

  const patchAccounts = useCallback(
    async (
      nextByPlatform: TrackedAccountsByPlatform,
      context: { platform: SocialPlatform; handle: string; action: 'add' | 'sync' | 'remove' },
    ) => {
      if (!activeView || !activeSchema || !activeSpace) {
        throw new Error('Space or view not ready')
      }
      const backend = { orgId: activeSpace.org_id ?? null }
      const orgConfig = orgAllSocialResearchConfig(activeSchema, activeView.id)
      const nextConfig: AllSocialResearchConfig = {
        ...orgConfig,
        tracked_accounts_by_platform: nextByPlatform,
      }
      const nextViews = activeSchema.views.map((v) =>
        v.id === activeView.id ? { ...v, all_social_research_config: nextConfig } : v,
      )
      const nextSchema = { ...activeSchema, views: nextViews }
      patchActiveSpaceSchema(nextSchema)
      applySessionDraft(activeView.id, {
        all_social_research_config: nextConfig,
      })
      await updateSpace(activeSpace.id, { schema: nextSchema }, { ...backend, resilient: true })
      try {
        await refresh()
      } catch (err) {
        reportSocialResearchError(
          `all_social_account_${context.action}_refresh_failed`,
          err,
          socialResearchContext(activeSpace.id, context.platform, { handle: context.handle }),
          'warn',
        )
      }
    },
    [activeView, activeSchema, activeSpace, applySessionDraft, patchActiveSpaceSchema, refresh],
  )

  const handleAddAccount = useCallback(
    async (platform: SocialPlatform, handle: string) => {
      if (!activeView || !activeSchema || !activeSpace) {
        throw new Error('Space or view not ready')
      }
      const orgConfig = orgAllSocialResearchConfig(activeSchema, activeView.id)
      const { account } = await addTrackedSocialAccount(platform, activeSpace.id, handle, {
        orgId: activeSpace.org_id ?? null,
      })
      const byPlatform = { ...(orgConfig.tracked_accounts_by_platform ?? {}) }
      byPlatform[platform] = upsertTrackedAccount(byPlatform[platform], account)
      await patchAccounts(byPlatform, { platform, handle, action: 'add' })
    },
    [activeView, activeSchema, activeSpace, patchAccounts],
  )

  const handleSyncAccount = useCallback(
    async (platform: SocialPlatform, handle: string) => {
      if (!activeView || !activeSchema || !activeSpace) {
        throw new Error('Space or view not ready')
      }
      const orgConfig = orgAllSocialResearchConfig(activeSchema, activeView.id)
      const { lastSyncedAt, accountPatch } = await syncTrackedSocialAccount(
        platform,
        activeSpace.id,
        handle,
        { orgId: activeSpace.org_id ?? null },
      )
      const byPlatform = { ...(orgConfig.tracked_accounts_by_platform ?? {}) }
      byPlatform[platform] = (byPlatform[platform] ?? []).map((a) =>
        a.handle.toLowerCase() === handle.toLowerCase()
          ? { ...a, ...(accountPatch ?? {}), last_synced_at: lastSyncedAt }
          : a,
      )
      await patchAccounts(byPlatform, { platform, handle, action: 'sync' })
    },
    [activeView, activeSchema, activeSpace, patchAccounts],
  )

  const handleRemoveAccount = useCallback(
    async (platform: SocialPlatform, handle: string) => {
      if (!activeView || !activeSchema || !activeSpace) {
        throw new Error('Space or view not ready')
      }
      const orgConfig = orgAllSocialResearchConfig(activeSchema, activeView.id)
      await removeTrackedSocialAccountItems(platform, activeSpace.id, handle, {
        orgId: activeSpace.org_id ?? null,
      })
      const byPlatform = { ...(orgConfig.tracked_accounts_by_platform ?? {}) }
      byPlatform[platform] = (byPlatform[platform] ?? []).filter(
        (a) => a.handle.toLowerCase() !== handle.toLowerCase(),
      )
      await patchAccounts(byPlatform, { platform, handle, action: 'remove' })
    },
    [activeView, activeSchema, activeSpace, patchAccounts],
  )

  return { handleAddAccount, handleSyncAccount, handleRemoveAccount }
}

export { DEFAULT_ALL_SOCIAL_RESEARCH_CONFIG }
