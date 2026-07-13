'use client'

import { type ChangeEvent, type RefObject } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Calendar, Diamond, GraduationCap, Image as ImageIcon, Layers, Search, X } from 'lucide-react'
import { ShareButton } from '@/components/org'
import { Tooltip } from '@/components/ui/tooltip'
import type { ReportingDateRangeInput } from '@/lib/reporting'
import {
  ARTIFACT_SLIDE_PREVIEW_TOOLBAR_MOTION,
  TOOLBAR_DOCK_SLOT_SPRING,
} from '@/lib/ui/toolbar-motion'
import type { BrainQueueUiJob } from '../hooks/use-brain-queue'
import type { BrainHealthData, BrainMemory } from '../types'
import {
  BrainCreatedAtRangeDropdown,
  brainDateRangeSummary,
} from './BrainCreatedAtRangeDropdown'
import { BrainDockHoverButton } from './BrainDockHoverButton'
import BrainProcessingQueue from './BrainProcessingQueue'
import BrainStats from './BrainStats'
import { BrainVoiceTrigger } from './BrainVoiceTrigger'
import { CortexMaxIcon } from './CortexMaxIcon'
import { BrainSearchResultsPanel } from './BrainSearchResultsPanel'

const BRAIN_SEARCH_INPUT_WIDTH_PX = 200

type BrainDockScope = {
  brainId?: string | null
  agentId?: string | null
  label: string
  scopeType?: string
}

interface BrainVisualizationDockProps {
  onActivateVoice: () => void
  searchAnchorRef: RefObject<HTMLDivElement | null>
  searchInput: string
  searchLoading: boolean
  searchResults: BrainMemory[]
  searchDockOpen: boolean
  onOpenSearchDock: () => void
  onSearchInputChange: (event: ChangeEvent<HTMLInputElement>) => void
  onSearchInputBlur: () => void
  onSearchEscape: () => void
  onClearSearch: () => void
  onOpenImageSearch: () => void
  onSelectSearchResult: (memory: BrainMemory) => void
  topRightScopeReady: boolean
  selectedScope?: BrainDockScope
  brainDateRange: ReportingDateRangeInput
  brainDateFilterActive: boolean
  onBrainDateRangePatch: (patch: Partial<ReportingDateRangeInput>) => void
  onClearBrainDateRange: () => void
  experiencesOnly: boolean
  onSetExperiencesOnly: (value: boolean) => void
  onOpenCortexMax: () => void
  onTrainBrain: () => void
  onOpenCrystallize: () => void
  queueJobs: BrainQueueUiJob[]
  onCancelQueueJob: (jobId: string) => void
  onRetryQueueJob: (jobId: string) => void
  onDismissQueueJob: (jobId: string) => void
  statsHealthForBar: BrainHealthData | null
  activeQueueCount: number
  beliefCount?: number
  perspectiveCount?: number
}

function BrainScopeActions({
  selectedScope,
  onOpenCortexMax,
  onTrainBrain,
  onOpenCrystallize,
}: {
  selectedScope: BrainDockScope
  onOpenCortexMax: () => void
  onTrainBrain: () => void
  onOpenCrystallize: () => void
}) {
  return (
    <>
      <BrainDockHoverButton
        ariaLabel="Open Cortex MAX"
        icon={<CortexMaxIcon size="sm" />}
        label={
          <span className="flex items-center gap-1">
            <span>Cortex</span>
            <span className="cortex-max-gradient-text font-extrabold">MAX</span>
          </span>
        }
        onClick={onOpenCortexMax}
      />
      <BrainDockHoverButton
        ariaLabel="Train brain"
        icon={<GraduationCap className="h-3.5 w-3.5" />}
        label={selectedScope.agentId ? `Train ${selectedScope.label}` : 'Train brain'}
        onClick={onTrainBrain}
      />
      <BrainDockHoverButton
        ariaLabel="Crystallize brain"
        icon={<Diamond className="h-3.5 w-3.5" />}
        label="Crystallize"
        onClick={onOpenCrystallize}
      />
      <div className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" aria-hidden />
    </>
  )
}

export function BrainVisualizationDock({
  onActivateVoice,
  searchAnchorRef,
  searchInput,
  searchLoading,
  searchResults,
  searchDockOpen,
  onOpenSearchDock,
  onSearchInputChange,
  onSearchInputBlur,
  onSearchEscape,
  onClearSearch,
  onOpenImageSearch,
  onSelectSearchResult,
  topRightScopeReady,
  selectedScope,
  brainDateRange,
  brainDateFilterActive,
  onBrainDateRangePatch,
  onClearBrainDateRange,
  experiencesOnly,
  onSetExperiencesOnly,
  onOpenCortexMax,
  onTrainBrain,
  onOpenCrystallize,
  queueJobs,
  onCancelQueueJob,
  onRetryQueueJob,
  onDismissQueueJob,
  statsHealthForBar,
  activeQueueCount,
  beliefCount,
  perspectiveCount,
}: BrainVisualizationDockProps) {
  const panelOpen = searchLoading || searchResults.length > 0 || searchInput.trim().length >= 2

  return (
    <div className="bottom-spacing-4 absolute left-1/2 z-40 flex -translate-x-1/2 flex-col items-center">
      <div className="mb-2">
        <BrainVoiceTrigger onActivate={onActivateVoice} />
      </div>
      <div ref={searchAnchorRef} className="relative z-40 mb-2 w-fit max-w-full shrink-0">
        {panelOpen && (
          <BrainSearchResultsPanel
            searchLoading={searchLoading}
            searchInput={searchInput}
            searchResults={searchResults}
            onSelectResult={onSelectSearchResult}
          />
        )}
        <motion.div
          layout
          transition={TOOLBAR_DOCK_SLOT_SPRING}
          className="surface-card border-border px-spacing-2 py-spacing-1 inline-flex h-8 max-w-full shrink-0 items-center gap-0.5 rounded-full border shadow-lg sm:max-w-xl"
        >
          {topRightScopeReady && selectedScope?.brainId ? (
            <BrainScopeActions
              selectedScope={selectedScope}
              onOpenCortexMax={onOpenCortexMax}
              onTrainBrain={onTrainBrain}
              onOpenCrystallize={onOpenCrystallize}
            />
          ) : null}
          <div className="inline-flex shrink-0 items-center gap-0.5">
            <AnimatePresence mode="popLayout" initial={false}>
              {searchDockOpen ? (
                <motion.div
                  key="brain-search-field"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: BRAIN_SEARCH_INPUT_WIDTH_PX, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={ARTIFACT_SLIDE_PREVIEW_TOOLBAR_MOTION}
                  className="flex h-7 shrink-0 items-center overflow-hidden"
                >
                  <div className="body-3 gap-spacing-1 px-spacing-2 border-border bg-background focus-within:border-primary flex h-7 w-full min-w-0 items-center rounded-md border text-xs">
                    <Search className="icon-sm text-muted-foreground shrink-0" aria-hidden />
                    <input
                      autoFocus
                      type="search"
                      placeholder="Search memories…"
                      value={searchInput}
                      onChange={onSearchInputChange}
                      onBlur={onSearchInputBlur}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') onSearchEscape()
                      }}
                      className="text-foreground placeholder:text-muted-foreground min-h-0 min-w-0 flex-1 bg-transparent py-0 text-xs outline-none"
                      aria-label="Search brain"
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="brain-search-icon"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={TOOLBAR_DOCK_SLOT_SPRING}
                  className="flex h-7 shrink-0 items-center justify-center"
                >
                  <Tooltip label="Search" side="top" triggerClassName="flex h-full items-center">
                    <span className="inline-flex">
                      <button
                        type="button"
                        onClick={onOpenSearchDock}
                        className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded-md p-1.5 transition-colors"
                        aria-label="Search"
                      >
                        <Search className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </Tooltip>
                </motion.div>
              )}
            </AnimatePresence>

            <Tooltip label="Search by image" side="top" triggerClassName="flex h-full items-center">
              <span className="inline-flex">
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={onOpenImageSearch}
                  className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded-md p-1.5 transition-colors"
                  aria-label="Search by image"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                </button>
              </span>
            </Tooltip>

            {searchDockOpen && searchInput ? (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={onClearSearch}
                className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded-md p-1.5 transition-colors"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <div className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" aria-hidden />

          <div className="flex h-7 shrink-0 items-center justify-center">
            {brainDateFilterActive ? (
              <BrainCreatedAtRangeDropdown
                value={brainDateRange}
                onPatch={onBrainDateRangePatch}
                onClear={onClearBrainDateRange}
                customTrigger={
                  <span className="badge-glass badge-glass-blue rounded-spacing-2 gap-spacing-1 inline-flex max-w-28 shrink-0 items-center truncate py-1 pl-2 pr-5 text-xs font-medium transition-opacity hover:opacity-90">
                    <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{brainDateRangeSummary(brainDateRange)}</span>
                  </span>
                }
              />
            ) : (
              <Tooltip
                label="Filter by created date"
                side="top"
                triggerClassName="flex h-full items-center"
              >
                <span className="inline-flex">
                  <BrainCreatedAtRangeDropdown
                    value={brainDateRange}
                    onPatch={onBrainDateRangePatch}
                    customTrigger={
                      <span className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground inline-flex rounded-md p-1.5 transition-colors">
                        <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      </span>
                    }
                  />
                </span>
              </Tooltip>
            )}
          </div>

          <div className="flex h-7 shrink-0 items-center justify-center">
            <AnimatePresence mode="popLayout" initial={false}>
              {experiencesOnly ? (
                <motion.div
                  key="brain-exp-active"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={TOOLBAR_DOCK_SLOT_SPRING}
                  className="flex h-7 items-center justify-center"
                >
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onSetExperiencesOnly(false)}
                    className="badge-glass badge-glass-blue rounded-spacing-2 group inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-90"
                  >
                    <span className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                      <Layers className="h-3.5 w-3.5 transition-opacity group-hover:opacity-0" />
                      <X className="absolute inset-0 h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                    </span>
                    <span>Experiences</span>
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="brain-exp-idle"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={TOOLBAR_DOCK_SLOT_SPRING}
                  className="flex h-7 items-center justify-center"
                >
                  <Tooltip
                    label="Experiences only"
                    side="top"
                    triggerClassName="flex h-full items-center"
                  >
                    <span className="inline-flex">
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => onSetExperiencesOnly(true)}
                        className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded-md p-1.5 transition-colors"
                        aria-label="Experiences only"
                      >
                        <Layers className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </Tooltip>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {selectedScope?.brainId ? (
            <div className="flex h-7 shrink-0 items-center justify-center">
              <ShareButton
                resourceType="brain"
                resourceId={selectedScope.brainId}
                resourceName={selectedScope.label}
                variant="toolbar"
              />
            </div>
          ) : null}
        </motion.div>
      </div>
      <BrainProcessingQueue
        jobs={queueJobs}
        onCancel={onCancelQueueJob}
        onRetry={onRetryQueueJob}
        onDismiss={onDismissQueueJob}
      />
      {!!statsHealthForBar && (
        <BrainStats
          health={statsHealthForBar}
          queueCount={activeQueueCount}
          beliefCount={beliefCount}
          perspectiveCount={perspectiveCount}
          variant={selectedScope?.scopeType === 'campaign_knowledge' ? 'knowledge' : 'memories'}
        />
      )}
      {!statsHealthForBar && selectedScope?.scopeType === 'agent' && (
        <div>
          <div className="gap-spacing-4 surface-card border-border px-spacing-4 flex items-center rounded-lg border py-2">
            <span className="typo-caption text-muted-foreground">Loading stats...</span>
          </div>
        </div>
      )}
    </div>
  )
}
