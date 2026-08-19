'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CircleCheck, Search, Users, X } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { TOOLBAR_DOCK_SLOT_SPRING } from '@/lib/ui/toolbar-motion'
import type { SpaceToolbarContext } from '../types'

const TOOLBAR_SEARCH_DEBOUNCE_MS = 150

export function SpaceToolbarSearchInput({
  committedQuery,
  onCommittedQueryChange,
  onClose,
  placeholder = 'Search…',
}: {
  committedQuery: string
  onCommittedQueryChange: (value: string) => void
  onClose: () => void
  placeholder?: string
}) {
  const [draft, setDraft] = useState(committedQuery)

  useEffect(() => {
    setDraft(committedQuery)
  }, [committedQuery])

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (draft !== committedQuery) onCommittedQueryChange(draft)
    }, TOOLBAR_SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [committedQuery, draft, onCommittedQueryChange])

  const flushCommitted = useCallback(() => {
    onCommittedQueryChange(draft)
  }, [draft, onCommittedQueryChange])

  return (
    <input
      autoFocus
      type="search"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        flushCommitted()
        if (!draft.trim()) onClose()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setDraft('')
          onCommittedQueryChange('')
          onClose()
        }
      }}
      placeholder={placeholder}
      className="w-[160px] rounded-md border border-[var(--color-border)] bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)]"
    />
  )
}

/** Default + missions: Search · Show completed · Filter by assignee · Me mode. */
export function SpaceQuickFilterDock({ ctx }: { ctx: SpaceToolbarContext }) {
  const {
    activeView,
    spaceToolbarSearch,
    setSpaceToolbarSearch,
    spaceToolbarSearchOpen,
    setSpaceToolbarSearchOpen,
    toggleToolbarShowCompleted,
    toggleToolbarAssignedToMe,
    clearToolbarAssigneeFilter,
    setAssigneeFilterOpen,
    toolbarMeAvatarUrl,
    toolbarMeInitials,
    toolbarAssigneeAvatars,
    currentUserId,
  } = ctx

  const completedActive =
    activeView?.type === 'missions'
      ? activeView.missions_config?.show_closed === true
      : activeView?.show_closed_tasks === true

  const hasAssigneeFilter =
    (activeView?.toolbar_filter_assignee_participant_ids?.length ?? 0) > 0 ||
    (activeView?.missions_config?.toolbar_filter_agent_keys?.length ?? 0) > 0

  const meActive =
    activeView?.type === 'missions'
      ? !!activeView.missions_config?.toolbar_assigned_to_me
      : !!activeView?.toolbar_assigned_to_me

  return (
    <>
      <div className="flex h-7 shrink-0 items-center gap-0.5">
        {/* Search */}
        <div className="flex h-7 shrink-0 items-center justify-center">
          <AnimatePresence mode="popLayout" initial={false}>
            {spaceToolbarSearchOpen ? (
              <motion.div
                key="dock-search-field"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={TOOLBAR_DOCK_SLOT_SPRING}
                className="flex h-7 items-center justify-center"
              >
                <SpaceToolbarSearchInput
                  committedQuery={spaceToolbarSearch}
                  onCommittedQueryChange={setSpaceToolbarSearch}
                  onClose={() => setSpaceToolbarSearchOpen(false)}
                />
              </motion.div>
            ) : (
              <motion.div
                key="dock-search-icon"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={TOOLBAR_DOCK_SLOT_SPRING}
                className="flex h-7 items-center justify-center"
              >
                <Tooltip label="Search" side="bottom" triggerClassName="flex h-full items-center">
                  <span className="inline-flex">
                    <button
                      type="button"
                      aria-label="Search"
                      onClick={() => setSpaceToolbarSearchOpen(true)}
                      className="rounded-md p-1.5 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                    >
                      <Search className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </Tooltip>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Show completed */}
        <div className="flex h-7 shrink-0 items-center justify-center">
          <AnimatePresence mode="popLayout" initial={false}>
            {completedActive ? (
              <motion.div
                key="dock-check-active"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={TOOLBAR_DOCK_SLOT_SPRING}
                className="flex h-7 items-center justify-center"
              >
                <button
                  type="button"
                  onClick={toggleToolbarShowCompleted}
                  className="badge-glass badge-glass-blue rounded-spacing-2 group inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-90"
                >
                  <span className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                    <CircleCheck className="h-3.5 w-3.5 transition-opacity group-hover:opacity-0" />
                    <X className="absolute inset-0 h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                  </span>
                  <span>Completed</span>
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="dock-check-idle"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={TOOLBAR_DOCK_SLOT_SPRING}
                className="flex h-7 items-center justify-center"
              >
                <Tooltip
                  label="Show completed"
                  side="bottom"
                  triggerClassName="flex h-full items-center"
                >
                  <span className="inline-flex">
                    <button
                      type="button"
                      aria-label="Show completed"
                      onClick={toggleToolbarShowCompleted}
                      className="rounded-md p-1.5 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                    >
                      <CircleCheck className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </Tooltip>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Assignee filter */}
        <div className="flex h-7 shrink-0 items-center justify-center">
          <AnimatePresence mode="popLayout" initial={false}>
            {hasAssigneeFilter ? (
              <motion.div
                key="dock-assignee-active"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={TOOLBAR_DOCK_SLOT_SPRING}
                className="flex h-7 items-center justify-center"
              >
                <button
                  type="button"
                  aria-label="Clear assignee filter"
                  onClick={clearToolbarAssigneeFilter}
                  className="badge-glass badge-glass-blue rounded-spacing-2 group inline-flex shrink-0 cursor-pointer items-center border-0 px-2 py-1 shadow-none transition-opacity hover:opacity-90"
                >
                  <span className="relative flex shrink-0 items-center justify-center">
                    <span className="flex -space-x-1.5 transition-opacity group-hover:opacity-0">
                      {toolbarAssigneeAvatars.map((entry) => (
                        <React.Fragment key={entry.participant_id}>
                          {entry.avatar_url ? (
                            <img
                              src={entry.avatar_url}
                              alt={entry.display_name}
                              className="h-4 w-4 rounded-full object-cover ring-1 ring-[var(--background)]"
                            />
                          ) : (
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-secondary)] text-[7px] font-semibold text-[var(--foreground)] ring-1 ring-[var(--background)]">
                              {entry.display_name.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                        </React.Fragment>
                      ))}
                    </span>
                    <X className="absolute inset-0 m-auto h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                  </span>
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="dock-assignee-idle"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={TOOLBAR_DOCK_SLOT_SPRING}
                className="flex h-7 items-center justify-center"
              >
                <Tooltip
                  label="Filter by assignee"
                  side="bottom"
                  triggerClassName="flex h-full items-center"
                >
                  <span className="inline-flex">
                    <button
                      type="button"
                      aria-label="Filter by assignee"
                      onClick={() => setAssigneeFilterOpen(true)}
                      className="rounded-md p-1.5 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                    >
                      <Users className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </Tooltip>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Me mode */}
        <div className="flex h-7 shrink-0 items-center justify-center">
          <AnimatePresence mode="popLayout" initial={false}>
            {meActive ? (
              <motion.div
                key="dock-me-active"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={TOOLBAR_DOCK_SLOT_SPRING}
                className="flex h-7 items-center justify-center"
              >
                <button
                  type="button"
                  onClick={toggleToolbarAssignedToMe}
                  className="badge-glass badge-glass-blue group inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap !rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-90"
                >
                  <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                    {toolbarMeAvatarUrl ? (
                      <img
                        src={toolbarMeAvatarUrl}
                        alt=""
                        className="h-4 w-4 rounded-full object-cover transition-opacity group-hover:opacity-0"
                      />
                    ) : (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-secondary)] text-[7px] font-semibold transition-opacity group-hover:opacity-0">
                        {toolbarMeInitials}
                      </span>
                    )}
                    <X className="absolute inset-0 h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                  </span>
                  <span>Me mode</span>
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="dock-me-idle"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={TOOLBAR_DOCK_SLOT_SPRING}
                className="flex h-7 items-center justify-center"
              >
                <Tooltip
                  label="Assigned to me"
                  side="bottom"
                  triggerClassName="flex h-full items-center"
                >
                  <span className="inline-flex">
                    <button
                      type="button"
                      aria-label="Assigned to me"
                      onClick={toggleToolbarAssignedToMe}
                      disabled={!currentUserId}
                      className="inline-flex shrink-0 items-center justify-center rounded-full p-0.5 transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
                    >
                      {toolbarMeAvatarUrl ? (
                        <img
                          src={toolbarMeAvatarUrl}
                          alt=""
                          className="h-5 w-5 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-secondary)] text-[8px] font-semibold text-[var(--foreground)]">
                          {toolbarMeInitials}
                        </span>
                      )}
                    </button>
                  </span>
                </Tooltip>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" aria-hidden />
    </>
  )
}
