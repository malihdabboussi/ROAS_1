'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bot,
  Check,
  ChevronDown,
  ChevronLeft,
  FileText,
  Filter,
  FolderTree,
  Grid2x2,
  Grid3x3,
  HardDrive,
  Hash,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Library,
  List,
  MessageSquare,
  Rows3,
  Search,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { AddColumnsButton } from '../_shared/AddColumnsButton'
import { SaveViewSlot } from '../_shared/SaveViewSeparator'
import { SpaceToolbarSearchInput } from '../_shared/SpaceQuickFilterDock'
import { ToolbarShell } from '../_shared/ToolbarShell'
import { DriveFoldersPanel } from '../../components/docs/DriveFoldersPanel'
import { DocsAddDocMenu, SpaceCustomizeButton } from '../../components/toolbar'
import type { DocsDriveCardSize, DocsDriveGroupBy } from '../../types/space-schema'
import {
  DOC_SOURCE_LABELS,
  DOCS_VIEW_SOURCE_KEYS,
  type DocSourceKey,
} from '../../types/space-schema'
import type { SpaceToolbarContext } from '../types'

const DOC_SOURCE_ICON_BY_KEY = {
  studio: MessageSquare,
  channel: Hash,
  dm: UserRound,
  space: FileText,
  mission: Bot,
  campaign: Library,
} satisfies Record<
  (typeof DOCS_VIEW_SOURCE_KEYS)[number],
  React.ComponentType<{ className?: string }>
>

/** Toolbar for docs view. Has tree mode (replaces left side) + add-doc menu. */
export function DocsToolbar({ ctx }: { ctx: SpaceToolbarContext }) {
  const {
    activeView,
    activeSpaceId,
    docsConfigToolbar,
    docsIsTreeLayout,
    docsPreTreeDisplayModeRef,
    showAddColumnsToolbar,
    showGroupByInToolbar,
    groupByField,
    groupByBtnRef,
    setGroupByOpen,
    docsDisplayMenuOpen,
    setDocsDisplayMenuOpen,
    docsDisplayBtnRef,
    docsDisplayMenuRef,
    docsSourceFilterOpen,
    setDocsSourceFilterOpen,
    docsSourceFilterBtnRef,
    docsSourceFilterWrapRef,
    docsSourceFilterDropdownRef,
    docsListSourceMenuOpen,
    setDocsListSourceMenuOpen,
    docsListSourceWrapRef,
    handleViewPatch,
    setDriveMappingsSyncing,
    refresh,
    docsPlusOpen,
    setDocsPlusOpen,
    docsPlusRootRef,
    docsCloud,
    createItem,
    schemaEditorOpen,
    closeCustomizePanel,
    openCustomizeFromToolbar,
    docsDriveBrowseActive,
    docsDriveGroupBy,
    setDocsDriveGroupBy,
    docsDriveCardSize,
    setDocsDriveCardSize,
    docsCampaignId,
    campaignDocsLoading,
    loadCampaignDocs,
    spaceToolbarSearchOpen,
    setSpaceToolbarSearchOpen,
    spaceToolbarSearch,
    setSpaceToolbarSearch,
  } = ctx

  const [driveGroupOpen, setDriveGroupOpen] = useState(false)
  const driveGroupBtnRef = useRef<HTMLButtonElement>(null)
  const driveGroupMenuRef = useRef<HTMLDivElement>(null)
  const [driveSizeOpen, setDriveSizeOpen] = useState(false)
  const driveSizeBtnRef = useRef<HTMLButtonElement>(null)
  const driveSizeMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!docsDriveBrowseActive) setDriveSizeOpen(false)
  }, [docsDriveBrowseActive])

  useEffect(() => {
    if (!driveSizeOpen) return
    const handle = (e: MouseEvent) => {
      const t = e.target as Node
      if (!driveSizeBtnRef.current?.contains(t) && !driveSizeMenuRef.current?.contains(t))
        setDriveSizeOpen(false)
    }
    document.addEventListener('mousedown', handle, true)
    return () => document.removeEventListener('mousedown', handle, true)
  }, [driveSizeOpen])

  const driveSizeOptions: {
    id: DocsDriveCardSize
    label: string
    Icon: React.ComponentType<{ className?: string }>
  }[] = [
    { id: 'preview', label: 'Preview', Icon: ImageIcon },
    { id: 'compact', label: 'Compact', Icon: Rows3 },
    { id: 'small', label: 'Small grid', Icon: Grid3x3 },
  ]
  const driveSizeActive = driveSizeOptions.find((o) => o.id === docsDriveCardSize)
  const DriveSizeActiveIcon = driveSizeActive?.Icon ?? Grid2x2

  useEffect(() => {
    if (!docsDriveBrowseActive) setDriveGroupOpen(false)
  }, [docsDriveBrowseActive])

  useEffect(() => {
    if (!driveGroupOpen) return
    const handle = (e: MouseEvent) => {
      const t = e.target as Node
      if (!driveGroupBtnRef.current?.contains(t) && !driveGroupMenuRef.current?.contains(t))
        setDriveGroupOpen(false)
    }
    document.addEventListener('mousedown', handle, true)
    return () => document.removeEventListener('mousedown', handle, true)
  }, [driveGroupOpen])

  const driveGroupOptions: { id: DocsDriveGroupBy; label: string }[] = [
    { id: 'flat', label: 'Flat' },
    { id: 'type', label: 'Type' },
    { id: 'modified', label: 'Modified' },
  ]
  const driveGroupActiveLabel =
    driveGroupOptions.find((o) => o.id === docsDriveGroupBy)?.label ?? 'Flat'

  // Stable identity: an inline arrow here gave DriveFoldersPanel's load
  // callback a new identity on every toolbar render, refiring its
  // status/mappings requests (see perf round-2 docs audit).
  const handleDriveMappingsChanged = useCallback(() => {
    void refresh()
  }, [refresh])

  const docsToolbarSourceKeys = DOCS_VIEW_SOURCE_KEYS.filter(
    (key) => key !== 'campaign' || docsCampaignId,
  )

  const ensureCampaignDocsLoaded = useCallback(() => {
    if (!docsCampaignId || campaignDocsLoading) return
    loadCampaignDocs()
  }, [docsCampaignId, campaignDocsLoading, loadCampaignDocs])

  const driveFoldersToolbar =
    activeSpaceId != null ? (
      <DriveFoldersPanel
        spaceId={activeSpaceId}
        onMappingsChanged={handleDriveMappingsChanged}
        onSyncingStateChange={setDriveMappingsSyncing}
      />
    ) : null

  return (
    <ToolbarShell ctx={ctx}>
      <div className="flex shrink-0 flex-nowrap items-center gap-1">
        <AnimatePresence mode="wait" initial={false}>
          {docsIsTreeLayout ? (
            <motion.div
              key="docs-tree-controls"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="flex items-center gap-1"
            >
              <button
                type="button"
                onClick={() => {
                  void handleViewPatch({
                    docs_config: {
                      ...docsConfigToolbar,
                      display_mode: docsPreTreeDisplayModeRef.current,
                    },
                  })
                }}
                className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <motion.div
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15, delay: 0.05, ease: 'easeOut' }}
              >
                <Tooltip label="Group by" side="bottom">
                  <span ref={groupByBtnRef} className="inline-flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => setGroupByOpen((o) => !o)}
                      className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors ${
                        groupByField
                          ? 'badge-glass-purple'
                          : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      <Layers className="h-3 w-3" />
                      {groupByField ? groupByField.name : 'Group by'}
                    </button>
                  </span>
                </Tooltip>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15, delay: 0.1, ease: 'easeOut' }}
                className="relative"
                ref={docsSourceFilterWrapRef}
              >
                {(() => {
                  const activeFilters = docsConfigToolbar.doc_source_filters ?? []
                  const hasFilter = activeFilters.length > 0
                  const toggleSource = (src: DocSourceKey) => {
                    if (src === 'campaign') ensureCampaignDocsLoaded()
                    const current = docsConfigToolbar.doc_source_filters ?? []
                    const next = current.includes(src)
                      ? current.filter((s) => s !== src)
                      : [...current, src]
                    void handleViewPatch({
                      docs_config: { ...docsConfigToolbar, doc_source_filters: next },
                    })
                  }
                  const docSourceOpts: {
                    key: DocSourceKey
                    label: string
                    Icon: React.ComponentType<{ className?: string }>
                    colorClass: string
                  }[] = [
                    ...docsToolbarSourceKeys.map((key) => ({
                      key: key as DocSourceKey,
                      label: DOC_SOURCE_LABELS[key],
                      Icon: DOC_SOURCE_ICON_BY_KEY[key],
                      colorClass: '',
                    })),
                    { key: 'drive', label: 'Drive', Icon: HardDrive, colorClass: '' },
                  ]
                  return (
                    <>
                      {hasFilter ? (
                        <Tooltip label="Filter by doc source" side="bottom">
                          <button
                            ref={docsSourceFilterBtnRef}
                            type="button"
                            onClick={() => setDocsSourceFilterOpen((o) => !o)}
                            className="badge-glass badge-glass-blue body-3 rounded-spacing-2 inline-flex h-7 shrink-0 items-center gap-1 px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-90"
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
                            <ChevronDown
                              className={`h-3 w-3 shrink-0 opacity-70 transition-transform ${docsSourceFilterOpen ? 'rotate-180' : ''}`}
                            />
                          </button>
                        </Tooltip>
                      ) : (
                        <Tooltip label="Filter by doc source" side="bottom">
                          <button
                            ref={docsSourceFilterBtnRef}
                            type="button"
                            onClick={() => setDocsSourceFilterOpen((o) => !o)}
                            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                              docsSourceFilterOpen
                                ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                                : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
                            }`}
                            aria-expanded={docsSourceFilterOpen}
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                          </button>
                        </Tooltip>
                      )}
                      {docsSourceFilterOpen && typeof document !== 'undefined'
                        ? createPortal(
                            <div
                              ref={(el) => {
                                docsSourceFilterDropdownRef.current = el
                              }}
                              className="dropdown-menu-solid fixed z-[100001] min-w-[12rem] rounded-xl py-1 shadow-lg"
                              style={(() => {
                                const r = docsSourceFilterBtnRef.current?.getBoundingClientRect()
                                if (!r) return { top: 0, left: 0 }
                                return { top: r.bottom + 4, left: r.left }
                              })()}
                            >
                              {docSourceOpts.map(({ key, label, Icon, colorClass }) => {
                                const sel = activeFilters.includes(key)
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
                                    onClick={() => toggleSource(key)}
                                  >
                                    <span className="flex items-center gap-2">
                                      <Icon className={`h-3.5 w-3.5 shrink-0 ${colorClass}`} />
                                      {label}
                                    </span>
                                    {sel ? (
                                      <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
                                    ) : null}
                                  </button>
                                )
                              })}
                              {(docsConfigToolbar.doc_source_filters ?? []).length > 0 ? (
                                <div className="border-t border-[var(--border)] pt-0.5">
                                  <button
                                    type="button"
                                    className="w-full px-3 py-1.5 text-left text-[10px] text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                                    onClick={() => {
                                      void handleViewPatch({
                                        docs_config: {
                                          ...docsConfigToolbar,
                                          doc_source_filters: [],
                                        },
                                      })
                                      setDocsSourceFilterOpen(false)
                                    }}
                                  >
                                    Clear filters
                                  </button>
                                </div>
                              ) : null}
                            </div>,
                            document.body,
                          )
                        : null}
                    </>
                  )
                })()}
              </motion.div>
              {driveFoldersToolbar ? (
                <motion.div
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15, delay: 0.14, ease: 'easeOut' }}
                >
                  {driveFoldersToolbar}
                </motion.div>
              ) : null}
            </motion.div>
          ) : docsDriveBrowseActive ? (
            <motion.div
              key="drive-group-by"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="relative"
            >
              <Tooltip label="Group Drive items by" side="bottom">
                <span className="inline-flex shrink-0 items-center">
                  <button
                    ref={driveGroupBtnRef}
                    type="button"
                    onClick={() => setDriveGroupOpen((o) => !o)}
                    className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors ${
                      docsDriveGroupBy !== 'flat'
                        ? 'badge-glass-purple'
                        : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    <Layers className="h-3 w-3" />
                    {docsDriveGroupBy !== 'flat'
                      ? `Drive: ${driveGroupActiveLabel}`
                      : 'Group Drive by'}
                    <ChevronDown
                      className={`h-3 w-3 opacity-70 transition-transform ${
                        driveGroupOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </span>
              </Tooltip>
              {driveGroupOpen ? (
                <div
                  ref={driveGroupMenuRef}
                  className="dropdown-menu-solid absolute left-0 top-full z-[100001] mt-1 w-44 rounded-xl py-1 shadow-lg"
                >
                  {driveGroupOptions.map((opt) => {
                    const selected = docsDriveGroupBy === opt.id
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setDocsDriveGroupBy(opt.id)
                          setDriveGroupOpen(false)
                        }}
                        className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
                      >
                        <span>{opt.label}</span>
                        {selected ? (
                          <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </motion.div>
          ) : showGroupByInToolbar ? (
            <motion.div
              key="group-by"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              <Tooltip label="Group by" side="bottom">
                <span ref={groupByBtnRef} className="inline-flex shrink-0 items-center">
                  <button
                    type="button"
                    onClick={() => setGroupByOpen((o) => !o)}
                    className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors ${
                      groupByField
                        ? 'badge-glass-purple'
                        : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    <Layers className="h-3 w-3" />
                    {groupByField ? groupByField.name : 'Group by'}
                  </button>
                </span>
              </Tooltip>
            </motion.div>
          ) : null}
        </AnimatePresence>
        {!docsIsTreeLayout && activeView ? (
          <div ref={docsDisplayMenuRef} className="relative shrink-0">
            <Tooltip label="Layout" side="bottom">
              <span className="inline-flex shrink-0 items-center">
                <button
                  ref={docsDisplayBtnRef}
                  type="button"
                  onClick={() => {
                    setDocsDisplayMenuOpen((o) => !o)
                    setDocsListSourceMenuOpen(false)
                  }}
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                    docsDisplayMenuOpen
                      ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                      : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
                  }`}
                  aria-label="Layout"
                >
                  {(docsConfigToolbar.display_mode ?? 'grid') === 'list' ? (
                    <List className="h-3.5 w-3.5" />
                  ) : (docsConfigToolbar.display_mode ?? 'grid') === 'tree' ? (
                    <FolderTree className="h-3.5 w-3.5" />
                  ) : (
                    <LayoutGrid className="h-3.5 w-3.5" />
                  )}
                </button>
              </span>
            </Tooltip>
            {docsDisplayMenuOpen ? (
              <div className="dropdown-menu-solid absolute left-0 top-full z-50 mt-1 w-44 rounded-xl py-1 shadow-lg">
                {(['grid', 'list', 'tree'] as const).map((mode) => {
                  const Icon = mode === 'grid' ? LayoutGrid : mode === 'list' ? List : FolderTree
                  const label = mode === 'grid' ? 'Grid' : mode === 'list' ? 'List' : 'Tree'
                  const selected = (docsConfigToolbar.display_mode ?? 'grid') === mode
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        void handleViewPatch({
                          docs_config: { ...docsConfigToolbar, display_mode: mode },
                        })
                        setDocsDisplayMenuOpen(false)
                      }}
                      className="flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors hover:bg-[var(--color-hover-subtle)]"
                    >
                      <span className="flex items-center gap-2 text-[var(--foreground)]">
                        <Icon className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                        {label}
                      </span>
                      {selected ? (
                        <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
                      ) : null}
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>
        ) : null}
        {!docsIsTreeLayout ? driveFoldersToolbar : null}
        {showAddColumnsToolbar ? <AddColumnsButton ctx={ctx} /> : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
        <SaveViewSlot ctx={ctx} />
        {docsDriveBrowseActive && (docsConfigToolbar.display_mode ?? 'grid') === 'grid' ? (
          <div className="relative shrink-0">
            <Tooltip label="Card size" side="bottom">
              <span className="inline-flex shrink-0 items-center">
                <button
                  ref={driveSizeBtnRef}
                  type="button"
                  onClick={() => setDriveSizeOpen((o) => !o)}
                  className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors ${
                    driveSizeOpen
                      ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                      : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
                  }`}
                  aria-label="Drive card size"
                  aria-expanded={driveSizeOpen}
                >
                  <DriveSizeActiveIcon className="h-3.5 w-3.5 shrink-0" />
                  <span>{driveSizeActive?.label ?? 'Preview'}</span>
                  <ChevronDown
                    className={`h-3 w-3 shrink-0 opacity-70 transition-transform ${
                      driveSizeOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </span>
            </Tooltip>
            {driveSizeOpen ? (
              <div
                ref={driveSizeMenuRef}
                className="dropdown-menu-solid absolute right-0 top-full z-[100001] mt-1 min-w-[10rem] rounded-xl py-1 shadow-lg"
              >
                {driveSizeOptions.map(({ id, label, Icon }) => {
                  const selected = docsDriveCardSize === id
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setDocsDriveCardSize(id)
                        setDriveSizeOpen(false)
                      }}
                      className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                        {label}
                      </span>
                      {selected ? (
                        <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
                      ) : null}
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>
        ) : null}
        {!docsDriveBrowseActive && activeView ? (
          <div className="flex h-7 items-center">
            <AnimatePresence>
              {spaceToolbarSearchOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 180, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="flex h-7 items-center overflow-hidden"
                >
                  <SpaceToolbarSearchInput
                    committedQuery={spaceToolbarSearch}
                    onCommittedQueryChange={setSpaceToolbarSearch}
                    onClose={() => setSpaceToolbarSearchOpen(false)}
                    placeholder="Search docs..."
                  />
                </motion.div>
              )}
            </AnimatePresence>
            <Tooltip label="Search docs" side="bottom" triggerClassName="flex h-7 items-center">
              <span className="inline-flex h-7 items-center">
                <button
                  type="button"
                  onClick={() => setSpaceToolbarSearchOpen(true)}
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                    spaceToolbarSearchOpen || spaceToolbarSearch
                      ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                      : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
                  }`}
                  aria-label="Search docs"
                >
                  <Search className="h-3.5 w-3.5" />
                </button>
              </span>
            </Tooltip>
          </div>
        ) : null}
        {!docsIsTreeLayout && !docsDriveBrowseActive && activeView ? (
          <div ref={docsListSourceWrapRef} className="relative shrink-0">
            {(() => {
              const activeFilters = docsConfigToolbar.doc_source_filters ?? []
              const mainFilters = activeFilters.filter(
                (k): k is (typeof DOCS_VIEW_SOURCE_KEYS)[number] =>
                  (docsToolbarSourceKeys as readonly string[]).includes(k),
              )
              const mainFiltersOrdered = docsToolbarSourceKeys.filter((k) =>
                mainFilters.includes(k),
              )
              const toggleMainSource = (src: (typeof DOCS_VIEW_SOURCE_KEYS)[number]) => {
                if (src === 'campaign') ensureCampaignDocsLoaded()
                const current = docsConfigToolbar.doc_source_filters ?? []
                const next = current.includes(src)
                  ? current.filter((s) => s !== src)
                  : [...current, src]
                void handleViewPatch({
                  docs_config: { ...docsConfigToolbar, doc_source_filters: next },
                })
              }
              const mainOpts = docsToolbarSourceKeys.map((key) => ({
                key,
                label: DOC_SOURCE_LABELS[key],
                Icon: DOC_SOURCE_ICON_BY_KEY[key],
              }))
              return (
                <>
                  <Tooltip label="Source" side="bottom">
                    <span className="inline-flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => {
                          setDocsListSourceMenuOpen((o) => !o)
                          setDocsDisplayMenuOpen(false)
                        }}
                        className={
                          mainFiltersOrdered.length > 0
                            ? 'badge-glass badge-glass-blue rounded-spacing-2 inline-flex shrink-0 cursor-pointer items-center border-0 px-2 py-1 shadow-none transition-opacity hover:opacity-90'
                            : docsListSourceMenuOpen
                              ? 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                              : 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
                        }
                        aria-label="Source"
                        aria-expanded={docsListSourceMenuOpen}
                      >
                        {mainFiltersOrdered.length > 0 ? (
                          <span className="flex -space-x-1.5">
                            {mainFiltersOrdered.map((key) => {
                              const Icon = DOC_SOURCE_ICON_BY_KEY[key]
                              return (
                                <span
                                  key={key}
                                  className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-secondary)] ring-1 ring-[var(--background)]"
                                >
                                  <Icon className="h-2.5 w-2.5 shrink-0 text-[var(--color-muted-foreground)]" />
                                </span>
                              )
                            })}
                          </span>
                        ) : (
                          <Filter className="h-3.5 w-3.5 shrink-0" />
                        )}
                      </button>
                    </span>
                  </Tooltip>
                  {docsListSourceMenuOpen ? (
                    <div className="dropdown-menu-solid absolute right-0 top-full z-50 mt-1 min-w-[12rem] rounded-xl py-1 shadow-lg">
                      {mainOpts.map(({ key, label, Icon }) => {
                        const sel = activeFilters.includes(key)
                        return (
                          <button
                            key={key}
                            type="button"
                            className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
                            onClick={() => toggleMainSource(key)}
                          >
                            <span className="flex items-center gap-2">
                              <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                              {label}
                            </span>
                            {sel ? (
                              <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
                            ) : null}
                          </button>
                        )
                      })}
                      {mainFilters.length > 0 ? (
                        <div className="border-t border-[var(--border)] pt-0.5">
                          <button
                            type="button"
                            className="w-full px-3 py-1.5 text-left text-[10px] text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                            onClick={() => {
                              const cur = docsConfigToolbar.doc_source_filters ?? []
                              const rest = cur.filter(
                                (k) => !(docsToolbarSourceKeys as readonly string[]).includes(k),
                              )
                              void handleViewPatch({
                                docs_config: {
                                  ...docsConfigToolbar,
                                  doc_source_filters: rest.length === 0 ? [] : rest,
                                },
                              })
                              setDocsListSourceMenuOpen(false)
                            }}
                          >
                            Clear source filters
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )
            })()}
          </div>
        ) : null}
        {!docsIsTreeLayout ? (
          <div className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" aria-hidden />
        ) : null}
        {!docsIsTreeLayout ? (
          <div className="flex shrink-0 flex-wrap items-center gap-1">
            <SpaceCustomizeButton
              schemaEditorOpen={schemaEditorOpen}
              closeCustomizePanel={closeCustomizePanel}
              openCustomizeFromToolbar={openCustomizeFromToolbar}
            />
            <DocsAddDocMenu
              open={docsPlusOpen}
              setOpen={setDocsPlusOpen}
              rootRef={docsPlusRootRef}
              docsCloud={docsCloud}
              createItem={createItem}
              campaignId={docsCampaignId}
            />
          </div>
        ) : null}
      </div>
    </ToolbarShell>
  )
}
