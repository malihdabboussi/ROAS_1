'use client'

import { useCallback, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, X } from 'lucide-react'
import {
  countAllSocialResearchAccounts,
  getAllSocialResearchConfig,
  PLATFORM_LABELS,
  resolveAllSocialResearchAccounts,
} from '../../../../lib/all-social-research'
import {
  SOCIAL_PLATFORMS,
  type SocialPlatform,
  type SpaceSchema,
  type ViewDef,
} from '../../../../types/space-schema'
import { AccountTracker } from '../../../instagram-research/AccountTracker'
import { patchAllSocialConfig } from './all-social-research-customize.helpers'

export function AllSocialResearchPeopleSubView({
  activeView,
  activeSchema,
  onViewPatch,
  onBack,
  onClose,
  onAddAccount,
  onSyncAccount,
  onRemoveAccount,
}: {
  activeView: ViewDef
  activeSchema: SpaceSchema
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>
  onBack: () => void
  onClose: () => void
  onAddAccount?: (platform: SocialPlatform, handle: string) => Promise<void>
  onSyncAccount?: (platform: SocialPlatform, handle: string) => Promise<void>
  onRemoveAccount?: (platform: SocialPlatform, handle: string) => Promise<void>
}) {
  const [activePlatform, setActivePlatform] = useState<SocialPlatform>('instagram')
  const config = getAllSocialResearchConfig(activeView)
  const mergedAccounts = useMemo(
    () => resolveAllSocialResearchAccounts(activeSchema, activeView),
    [activeSchema, activeView],
  )
  const platformAccounts = mergedAccounts[activePlatform] ?? []
  const hiddenHandles = config.people_hidden_by_platform?.[activePlatform] ?? []

  const trackerConfig = useMemo(
    () => ({
      ...config,
      tracked_accounts: platformAccounts,
      people_hidden_handles: hiddenHandles,
    }),
    [config, platformAccounts, hiddenHandles],
  )

  const handleAdd = useCallback(
    async (handle: string) => {
      if (onAddAccount) await onAddAccount(activePlatform, handle)
    },
    [activePlatform, onAddAccount],
  )

  const handleSync = useCallback(
    async (handle: string) => {
      if (onSyncAccount) await onSyncAccount(activePlatform, handle)
    },
    [activePlatform, onSyncAccount],
  )

  const handleRemove = useCallback(
    async (handle: string) => {
      if (onRemoveAccount) await onRemoveAccount(activePlatform, handle)
    },
    [activePlatform, onRemoveAccount],
  )

  const handlePatchConfig = useCallback(
    (patch: { people_hidden_handles?: string[] }) => {
      const nextHidden = patch.people_hidden_handles ?? hiddenHandles
      void patchAllSocialConfig(onViewPatch, config, {
        people_hidden_by_platform: {
          ...(config.people_hidden_by_platform ?? {}),
          [activePlatform]: nextHidden,
        },
      })
    },
    [activePlatform, config, hiddenHandles, onViewPatch],
  )

  const totalTracked = countAllSocialResearchAccounts(mergedAccounts)

  return (
    <motion.div
      className="flex flex-1 flex-col overflow-hidden"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="body-3 font-semibold text-[var(--foreground)]">People</span>
          <span className="body-4 text-[var(--color-muted-foreground)]">
            {totalTracked} tracked
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-[var(--border)] px-4 py-2">
        {SOCIAL_PLATFORMS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setActivePlatform(p)}
            className={
              activePlatform === p
                ? 'badge-glass badge-glass-blue body-4 rounded-spacing-2 px-2 py-1 font-semibold'
                : 'body-4 rounded-spacing-2 px-2 py-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
            }
          >
            {PLATFORM_LABELS[p]}
            {(mergedAccounts[p]?.length ?? 0) > 0 ? ` · ${mergedAccounts[p]!.length}` : ''}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <AccountTracker
          config={trackerConfig}
          platform={activePlatform}
          onAddAccount={handleAdd}
          onSyncAccount={handleSync}
          onRemoveAccount={handleRemove}
          onPatchConfig={handlePatchConfig}
        />
      </div>
    </motion.div>
  )
}
