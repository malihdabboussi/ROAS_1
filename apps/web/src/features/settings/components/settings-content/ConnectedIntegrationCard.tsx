'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Pencil, RefreshCw, Star, Trash2, User, Users, Zap } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { ConfirmDialog } from './ConfirmDialog'
import { FacebookPagePickerModal } from './FacebookPagePickerModal'
import { getIntegrationConnectionDisplayLabel } from './integration-connection-label'
import type { Integration, UserIntegration } from './integrations.types'
import { LinkedInCompanyPagePickerModal } from './LinkedInCompanyPagePickerModal'
import { PageGraderClientScopeMapModal } from './PageGraderClientScopeMapModal'
import { YoutubeChannelPickerModal } from './YoutubeChannelPickerModal'

interface ConnectedIntegrationCardProps {
  userIntegration: UserIntegration
  integration: Integration
  accountIndex?: number
  accountCount?: number
  onRefresh: (userIntegration: UserIntegration) => void
  onDisconnect: (userIntegration: UserIntegration) => Promise<void> | void
  onReconnect?: (integration: Integration) => void
  onRemove?: (userIntegration: UserIntegration) => void
  onSetDefault?: (userIntegration: UserIntegration) => void
  onChangeScope?: (userIntegration: UserIntegration, newScope: 'personal' | 'org_shared') => void
  onRename?: (userIntegration: UserIntegration, connectionLabel: string) => Promise<void> | void
  canManageOrgShared?: boolean
  autoOpenCompanyPagePicker?: boolean
  autoOpenFacebookPagePicker?: boolean
  autoOpenYoutubeChannelPicker?: boolean
}

function ScopeDropdown({
  userIntegration,
  canManageOrgShared,
  onChangeScope,
}: {
  userIntegration: UserIntegration
  canManageOrgShared: boolean
  onChangeScope?: (userIntegration: UserIntegration, newScope: 'personal' | 'org_shared') => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isOrg = userIntegration.scope_mode === 'org_shared'
  const isPersonalAccountCarryover = userIntegration.org_id === null

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-dropdown]') && !target.closest('button')) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const icon = isOrg ? <Users className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />
  const personalLabel = isPersonalAccountCarryover ? 'Personal (only you)' : 'Personal'

  if (isPersonalAccountCarryover || !canManageOrgShared || !onChangeScope) {
    return (
      <Tooltip label={isOrg ? 'Shared with org' : personalLabel}>
        <span className="text-muted-foreground">{icon}</span>
      </Tooltip>
    )
  }

  return (
    <div ref={ref} className="relative">
      <Tooltip label={isOrg ? 'Shared with org' : personalLabel}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setOpen((v) => !v)
          }}
          className="text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
        >
          {icon}
        </button>
      </Tooltip>
      {open ? (
        <div className="z-dropdown mt-spacing-1 absolute right-0 top-full" data-dropdown>
          <div className="dropdown-menu-solid p-spacing-1 min-w-36">
            <button
              type="button"
              onClick={() => {
                onChangeScope(userIntegration, 'personal')
                setOpen(false)
              }}
              className={`gap-spacing-2 px-spacing-2 py-spacing-1 rounded-spacing-1 body-3 flex w-full items-center text-left ${
                !isOrg
                  ? 'bg-primary/10 text-muted-foreground'
                  : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="icon-xs shrink-0" />
              <span>Personal</span>
              {!isOrg ? <Check className="icon-xs text-muted-foreground ml-auto" /> : null}
            </button>
            <button
              type="button"
              onClick={() => {
                onChangeScope(userIntegration, 'org_shared')
                setOpen(false)
              }}
              className={`gap-spacing-2 px-spacing-2 py-spacing-1 rounded-spacing-1 body-3 flex w-full items-center text-left ${
                isOrg
                  ? 'bg-primary/10 text-muted-foreground'
                  : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="icon-xs shrink-0" />
              <span>Organization</span>
              {isOrg ? <Check className="icon-xs text-muted-foreground ml-auto" /> : null}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function ConnectedIntegrationCard({
  userIntegration,
  integration,
  accountIndex,
  accountCount = 1,
  onRefresh,
  onDisconnect,
  onReconnect,
  onRemove,
  onSetDefault,
  onChangeScope,
  onRename,
  canManageOrgShared = false,
  autoOpenCompanyPagePicker = false,
  autoOpenFacebookPagePicker = false,
  autoOpenYoutubeChannelPicker = false,
}: ConnectedIntegrationCardProps) {
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [isEditingLabel, setIsEditingLabel] = useState(false)
  const [draftLabel, setDraftLabel] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const [linkedInPickerOpen, setLinkedInPickerOpen] = useState(false)
  const [facebookPickerOpen, setFacebookPickerOpen] = useState(false)
  const [youtubePickerOpen, setYoutubePickerOpen] = useState(false)
  const [pageGraderMapOpen, setPageGraderMapOpen] = useState(false)
  const labelInputRef = useRef<HTMLInputElement>(null)
  const ignoreNextBlurRef = useRef(false)

  const isLinkedInConnected =
    integration.provider.toLowerCase() === 'linkedin' && userIntegration.status === 'connected'
  const linkedInPageName =
    typeof userIntegration.metadata?.linkedin_organization_name === 'string'
      ? userIntegration.metadata.linkedin_organization_name.trim()
      : ''
  const hasLinkedInPage = Boolean(
    typeof userIntegration.metadata?.linkedin_organization_urn === 'string' &&
    userIntegration.metadata.linkedin_organization_urn.startsWith('urn:li:organization:'),
  )

  const isFacebookConnected =
    integration.provider.toLowerCase() === 'facebook' && userIntegration.status === 'connected'
  const facebookPageName =
    typeof userIntegration.metadata?.facebook_page_name === 'string'
      ? userIntegration.metadata.facebook_page_name.trim()
      : ''
  const hasFacebookPage = Boolean(
    typeof userIntegration.metadata?.facebook_page_id === 'string' &&
    userIntegration.metadata.facebook_page_id.trim(),
  )

  const isYoutubeConnected =
    integration.provider.toLowerCase() === 'youtube' && userIntegration.status === 'connected'
  const youtubeChannelName =
    typeof userIntegration.metadata?.youtube_channel_name === 'string'
      ? userIntegration.metadata.youtube_channel_name.trim()
      : ''
  const hasYoutubeChannel = Boolean(
    typeof userIntegration.metadata?.youtube_channel_id === 'string' &&
    userIntegration.metadata.youtube_channel_id.trim(),
  )

  const isPageGraderConnected =
    integration.provider.toLowerCase() === 'page_grader' && userIntegration.status === 'connected'
  const pageGraderScopeMap =
    userIntegration.metadata?.client_scope_map &&
    typeof userIntegration.metadata.client_scope_map === 'object' &&
    !Array.isArray(userIntegration.metadata.client_scope_map)
      ? (userIntegration.metadata.client_scope_map as Record<string, unknown>)
      : {}
  const pageGraderMappedCount = Object.keys(pageGraderScopeMap).length

  const handleDisconnectConfirm = async () => {
    setIsDisconnecting(true)
    try {
      await onDisconnect(userIntegration)
      setShowDisconnectDialog(false)
    } finally {
      setIsDisconnecting(false)
    }
  }

  const displayLabel = getIntegrationConnectionDisplayLabel({
    userIntegration,
    integration,
    accountIndex: accountIndex ?? 1,
    accountCount,
  })
  const editableLabel = displayLabel

  useEffect(() => {
    if (!isEditingLabel) return
    labelInputRef.current?.focus()
    labelInputRef.current?.select()
  }, [isEditingLabel])

  useEffect(() => {
    if (autoOpenCompanyPagePicker && isLinkedInConnected && !hasLinkedInPage) {
      setLinkedInPickerOpen(true)
    }
  }, [autoOpenCompanyPagePicker, isLinkedInConnected, hasLinkedInPage])

  useEffect(() => {
    if (autoOpenFacebookPagePicker && isFacebookConnected && !hasFacebookPage) {
      setFacebookPickerOpen(true)
    }
  }, [autoOpenFacebookPagePicker, isFacebookConnected, hasFacebookPage])

  useEffect(() => {
    if (autoOpenYoutubeChannelPicker && isYoutubeConnected && !hasYoutubeChannel) {
      setYoutubePickerOpen(true)
    }
  }, [autoOpenYoutubeChannelPicker, isYoutubeConnected, hasYoutubeChannel])

  const startEditingLabel = () => {
    if (!onRename) return
    setDraftLabel(editableLabel)
    setIsEditingLabel(true)
  }

  const cancelEditingLabel = () => {
    setIsEditingLabel(false)
    setDraftLabel('')
  }

  const submitLabelRename = async () => {
    if (!onRename) {
      cancelEditingLabel()
      return
    }
    const trimmed = draftLabel.trim()
    if (!trimmed || trimmed === editableLabel) {
      cancelEditingLabel()
      return
    }
    setIsRenaming(true)
    try {
      await onRename(userIntegration, trimmed)
      cancelEditingLabel()
    } finally {
      setIsRenaming(false)
    }
  }

  const isDefault = Boolean(userIntegration.is_default)
  const canSetDefault =
    !isDefault &&
    !!onSetDefault &&
    (userIntegration.scope_mode === 'personal' ||
      (userIntegration.scope_mode === 'org_shared' && canManageOrgShared))
  const needsReconnect = userIntegration.status === 'needs_reconnect'
  const canRefresh =
    userIntegration.status === 'connected' ||
    userIntegration.status === 'error' ||
    userIntegration.status === 'pending'
  const canReconnect =
    (userIntegration.status === 'disconnected' || needsReconnect) && Boolean(onReconnect)
  const canDisconnect = canRefresh
  const canRemove =
    (userIntegration.status === 'disconnected' || needsReconnect) && Boolean(onRemove)
  const statusMessage =
    userIntegration.error_message ??
    (needsReconnect ? 'Connection expired. Reconnect to keep agents using it.' : null)

  const statusDot =
    userIntegration.status === 'connected'
      ? 'bg-emerald-500'
      : userIntegration.status === 'error'
        ? 'bg-destructive'
        : userIntegration.status === 'pending' || needsReconnect
          ? 'bg-amber-400'
          : 'bg-muted-foreground/40'

  return (
    <>
      <div className="rounded-spacing-2 px-spacing-2 py-spacing-1 group transition-colors hover:bg-white/[0.04]">
        <div
          className="relative flex items-center justify-between py-0.5"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div className="gap-spacing-2 flex min-w-0 flex-1 items-center">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot}`} />
            {isEditingLabel ? (
              <input
                ref={labelInputRef}
                value={draftLabel}
                disabled={isRenaming}
                onChange={(e) => setDraftLabel(e.target.value)}
                onBlur={() => {
                  if (ignoreNextBlurRef.current) {
                    ignoreNextBlurRef.current = false
                    return
                  }
                  void submitLabelRename()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    ignoreNextBlurRef.current = true
                    void submitLabelRename()
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    cancelEditingLabel()
                  }
                }}
                className="body-3 text-foreground rounded-spacing-1 border-border bg-background px-spacing-2 py-spacing-1 min-w-0 flex-1 border"
              />
            ) : onRename ? (
              <button
                type="button"
                onClick={startEditingLabel}
                className="body-3 text-foreground hover:text-foreground min-w-0 flex-1 truncate text-left transition-colors"
              >
                {displayLabel}
              </button>
            ) : (
              <p className="body-3 text-foreground min-w-0 flex-1 truncate">{displayLabel}</p>
            )}
            {statusMessage ? (
              <p
                className={`typo-caption truncate ${
                  userIntegration.error_message ? 'text-destructive' : 'text-muted-foreground'
                }`}
              >
                {statusMessage}
              </p>
            ) : null}
          </div>

          <AnimatePresence>
            {hovered && !isEditingLabel ? (
              <motion.div
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="gap-spacing-3 flex shrink-0 items-center"
              >
                {onRename ? (
                  <Tooltip label="Rename">
                    <button
                      type="button"
                      onClick={startEditingLabel}
                      className="text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </Tooltip>
                ) : null}

                {userIntegration.scope_mode === 'personal' ||
                userIntegration.scope_mode === 'org_shared' ? (
                  <Tooltip
                    label={
                      isDefault
                        ? 'Default for sending / invites'
                        : canSetDefault
                          ? 'Set as default for sending / invites'
                          : 'Not default'
                    }
                  >
                    <button
                      type="button"
                      disabled={!canSetDefault}
                      onClick={() => canSetDefault && onSetDefault!(userIntegration)}
                      className={`flex items-center justify-center transition-colors disabled:cursor-default ${
                        isDefault
                          ? 'text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Star className="h-3.5 w-3.5" fill={isDefault ? 'currentColor' : 'none'} />
                    </button>
                  </Tooltip>
                ) : null}

                <ScopeDropdown
                  userIntegration={userIntegration}
                  canManageOrgShared={canManageOrgShared}
                  onChangeScope={onChangeScope}
                />

                {canRefresh ? (
                  <Tooltip label={userIntegration.status === 'error' ? 'Retry' : 'Refresh'}>
                    <button
                      type="button"
                      onClick={() => onRefresh(userIntegration)}
                      className="text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </Tooltip>
                ) : null}

                {canReconnect ? (
                  <Tooltip label="Reconnect">
                    <button
                      type="button"
                      onClick={() => onReconnect?.(integration)}
                      className="text-accent flex items-center justify-center transition-opacity hover:opacity-80"
                    >
                      <Zap className="h-3.5 w-3.5" />
                    </button>
                  </Tooltip>
                ) : null}

                {canDisconnect ? (
                  <Tooltip label="Disconnect">
                    <button
                      type="button"
                      onClick={() => setShowDisconnectDialog(true)}
                      disabled={isDisconnecting}
                      className="text-destructive flex items-center justify-center transition-opacity hover:opacity-80 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </Tooltip>
                ) : null}

                {canRemove ? (
                  <Tooltip label="Remove">
                    <button
                      type="button"
                      onClick={() => onRemove?.(userIntegration)}
                      className="text-destructive flex items-center justify-center transition-opacity hover:opacity-80"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </Tooltip>
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {isLinkedInConnected ? (
          <div className="pb-spacing-1.5 pl-spacing-4 flex flex-wrap items-center justify-between gap-2">
            <p className="typo-caption text-muted-foreground min-w-0 truncate">
              {hasLinkedInPage
                ? `Company page: ${linkedInPageName || 'Selected'}`
                : 'No company page selected'}
            </p>
            <button
              type="button"
              onClick={() => setLinkedInPickerOpen(true)}
              className="badge-glass badge-glass-blue body-3 rounded-spacing-2 shrink-0 px-2 py-0.5 font-medium transition-opacity hover:opacity-90"
            >
              {hasLinkedInPage ? 'Change page' : 'Select company page'}
            </button>
          </div>
        ) : null}

        {isFacebookConnected ? (
          <div className="pb-spacing-1.5 pl-spacing-4 flex flex-wrap items-center justify-between gap-2">
            <p className="typo-caption text-muted-foreground min-w-0 truncate">
              {hasFacebookPage
                ? `Page: ${facebookPageName || 'Selected'}`
                : 'No Facebook Page selected'}
            </p>
            <button
              type="button"
              onClick={() => setFacebookPickerOpen(true)}
              className="badge-glass badge-glass-blue body-3 rounded-spacing-2 shrink-0 px-2 py-0.5 font-medium transition-opacity hover:opacity-90"
            >
              {hasFacebookPage ? 'Change page' : 'Select page'}
            </button>
          </div>
        ) : null}

        {isYoutubeConnected ? (
          <div className="pb-spacing-1.5 pl-spacing-4 flex flex-wrap items-center justify-between gap-2">
            <p className="typo-caption text-muted-foreground min-w-0 truncate">
              {hasYoutubeChannel
                ? `Channel: ${youtubeChannelName || 'Selected'}`
                : 'No YouTube channel selected'}
            </p>
            <button
              type="button"
              onClick={() => setYoutubePickerOpen(true)}
              className="badge-glass badge-glass-blue body-3 rounded-spacing-2 shrink-0 px-2 py-0.5 font-medium transition-opacity hover:opacity-90"
            >
              {hasYoutubeChannel ? 'Change channel' : 'Select channel'}
            </button>
          </div>
        ) : null}

        {isPageGraderConnected ? (
          <div className="pb-spacing-1.5 pl-spacing-4 flex flex-wrap items-center justify-between gap-2">
            <p className="typo-caption text-muted-foreground min-w-0 truncate">
              {pageGraderMappedCount > 0
                ? `${pageGraderMappedCount} client${pageGraderMappedCount === 1 ? '' : 's'} mapped to campaigns`
                : 'No campaign/space mappings yet'}
            </p>
            <button
              type="button"
              onClick={() => setPageGraderMapOpen(true)}
              className="badge-glass badge-glass-blue body-3 rounded-spacing-2 shrink-0 px-2 py-0.5 font-medium transition-opacity hover:opacity-90"
            >
              {pageGraderMappedCount > 0 ? 'Edit mappings' : 'Map clients'}
            </button>
          </div>
        ) : null}
      </div>

      {isLinkedInConnected ? (
        <LinkedInCompanyPagePickerModal
          userIntegration={userIntegration}
          open={linkedInPickerOpen}
          onClose={() => setLinkedInPickerOpen(false)}
          onSaved={() => onRefresh(userIntegration)}
        />
      ) : null}

      {isFacebookConnected ? (
        <FacebookPagePickerModal
          userIntegration={userIntegration}
          open={facebookPickerOpen}
          onClose={() => setFacebookPickerOpen(false)}
          onSaved={() => onRefresh(userIntegration)}
        />
      ) : null}

      {isYoutubeConnected ? (
        <YoutubeChannelPickerModal
          userIntegration={userIntegration}
          open={youtubePickerOpen}
          onClose={() => setYoutubePickerOpen(false)}
          onSaved={() => onRefresh(userIntegration)}
        />
      ) : null}

      {isPageGraderConnected ? (
        <PageGraderClientScopeMapModal
          open={pageGraderMapOpen}
          onClose={() => setPageGraderMapOpen(false)}
          onSaved={() => onRefresh(userIntegration)}
        />
      ) : null}

      <ConfirmDialog
        open={showDisconnectDialog}
        onOpenChange={setShowDisconnectDialog}
        title="Disconnect Integration"
        description="This will remove the connection to your account. You can reconnect at any time."
        confirmText="Disconnect"
        confirmingText="Disconnecting..."
        confirmDisabled={isDisconnecting}
        onConfirm={handleDisconnectConfirm}
      />
    </>
  )
}
