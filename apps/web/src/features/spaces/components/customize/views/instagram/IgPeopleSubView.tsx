'use client'

import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, X } from 'lucide-react'
import type { SocialPlatform, ViewDef } from '../../../../types/space-schema'
import { AccountTracker } from '../../../instagram-research/AccountTracker'
import { getSocialConfig, patchSocialConfig } from './instagram-customize.helpers'

export function IgPeopleSubView({
  activeView,
  platform = 'instagram',
  onViewPatch,
  onBack,
  onClose,
  onAddAccount,
  onSyncAccount,
  onRemoveAccount,
}: {
  activeView: ViewDef
  platform?: SocialPlatform
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>
  onBack: () => void
  onClose: () => void
  onAddAccount?: (handle: string) => Promise<void>
  onSyncAccount?: (handle: string) => Promise<void>
  onRemoveAccount?: (handle: string) => Promise<void>
}) {
  const ic = getSocialConfig(activeView, platform)

  const handleAdd = useCallback(
    async (handle: string) => {
      if (onAddAccount) await onAddAccount(handle)
    },
    [onAddAccount],
  )

  const handleSync = useCallback(
    async (handle: string) => {
      if (onSyncAccount) await onSyncAccount(handle)
    },
    [onSyncAccount],
  )

  const handleRemove = useCallback(
    async (handle: string) => {
      if (onRemoveAccount) await onRemoveAccount(handle)
    },
    [onRemoveAccount],
  )

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
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <AccountTracker
          config={ic}
          platform={platform}
          onAddAccount={handleAdd}
          onSyncAccount={handleSync}
          onRemoveAccount={handleRemove}
          onPatchConfig={(patch) => patchSocialConfig(onViewPatch, ic, patch, platform, activeView)}
        />
      </div>
    </motion.div>
  )
}
