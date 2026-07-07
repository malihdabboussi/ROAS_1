'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import type { TrainableBrainTarget } from '@/features/brain/hooks/use-trainable-brains'
import { cn } from '@/lib/utils/cn'
import { BrainTargetAvatarStack, BrainTrainTargetSelect } from './BrainTrainTargetSelect'
import {
  TRAINING_STAGING_DOMAINS,
  TRAINING_STAGING_SOURCE_TYPES,
  TrainingStagingMetadataMenu,
} from './TrainingStagingMetadataMenu'
import type { StagedItem } from './types'

export function TrainingStagingQueue({
  staged,
  stagedCount,
  selectedCount,
  selectedStagedIds,
  onSelectAll,
  onToggle,
  onRemove,
  onUpdateMetadata,
  targets,
  onSetItemTargets,
  fallbackBrainId,
  fallbackBrainTarget,
}: {
  staged: StagedItem[]
  stagedCount: number
  selectedCount: number
  selectedStagedIds: Set<string>
  onSelectAll: (select: boolean) => void
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onUpdateMetadata: (id: string, patch: Partial<StagedItem['metadata']>) => void
  targets: TrainableBrainTarget[]
  onSetItemTargets: (id: string, brainIds: string[]) => void
  fallbackBrainId: string | null
  fallbackBrainTarget: TrainableBrainTarget | null
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollState, setScrollState] = useState({
    canScroll: false,
    atTop: true,
    atBottom: true,
  })

  const updateScrollState = useCallback(() => {
    const element = scrollRef.current
    if (!element) return
    const canScroll = element.scrollHeight > element.clientHeight + 1
    const atTop = element.scrollTop <= 1
    const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight <= 1
    setScrollState({ canScroll, atTop, atBottom })
  }, [])

  useEffect(() => {
    updateScrollState()
  }, [staged.length, updateScrollState])

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    const observer = new ResizeObserver(updateScrollState)
    observer.observe(element)
    return () => observer.disconnect()
  }, [updateScrollState])

  const showTopFade = scrollState.canScroll && !scrollState.atTop
  const showBottomFade = scrollState.canScroll && !scrollState.atBottom

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="relative z-20 shrink-0">
        <div
          className={cn(
            'border-border px-spacing-3 py-spacing-1 surface-bg flex items-center border-b',
            scrollState.canScroll && !scrollState.atTop && 'modal-scroll-header-edge',
          )}
        >
          <label className="body-4 text-muted-foreground flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedCount === stagedCount && stagedCount > 0}
              onChange={(event) => onSelectAll(event.target.checked)}
              className="checkbox-glass-green shrink-0"
            />
            Select all
          </label>
        </div>
        {showTopFade ? (
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-6 translate-y-full bg-gradient-to-b from-background to-transparent"
            aria-hidden
          />
        ) : null}
      </div>
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="relative min-h-0 flex-1 overflow-y-auto"
      >
        <ul className="py-spacing-1 space-y-1">
          {staged.map((item) => (
            <TrainingStagedRow
              key={item.id}
              item={item}
              selected={selectedStagedIds.has(item.id)}
              onToggle={() => onToggle(item.id)}
              onRemove={() => onRemove(item.id)}
              onUpdateMetadata={(patch) => onUpdateMetadata(item.id, patch)}
              targets={targets}
              onSetItemTargets={(ids) => onSetItemTargets(item.id, ids)}
              fallbackBrainId={fallbackBrainId}
              fallbackBrainTarget={fallbackBrainTarget}
            />
          ))}
        </ul>
      </div>
      {showBottomFade ? (
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-8 bg-gradient-to-t from-background to-transparent"
          aria-hidden
        />
      ) : null}
    </div>
  )
}

function TrainingStagedRow({
  item,
  selected,
  onToggle,
  onRemove,
  onUpdateMetadata,
  targets,
  onSetItemTargets,
  fallbackBrainId,
  fallbackBrainTarget,
}: {
  item: StagedItem
  selected: boolean
  onToggle: () => void
  onRemove: () => void
  onUpdateMetadata: (patch: Partial<StagedItem['metadata']>) => void
  targets: TrainableBrainTarget[]
  onSetItemTargets: (brainIds: string[]) => void
  fallbackBrainId: string | null
  fallbackBrainTarget: TrainableBrainTarget | null
}) {
  const [openMenu, setOpenMenu] = useState<'type' | 'domain' | null>(null)
  const warnAlready = item.warnings.alreadyInBrain
  const warnDup = item.warnings.duplicateInBatch
  const hasWarning = warnAlready || warnDup
  const warningTooltip = [
    warnAlready ? 'Already in brain' : null,
    warnDup ? 'Duplicate in batch' : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const title = item.metadata.titleOverride || item.preview.title
  const fullTitle = item.preview.subtitle ? `${title} — ${item.preview.subtitle}` : title
  const actionsForced = openMenu !== null

  const itemTargetIds =
    item.targetBrainIds && item.targetBrainIds.length > 0
      ? item.targetBrainIds
      : fallbackBrainId
        ? [fallbackBrainId]
        : []
  const targetsByBrainId = useMemo(() => {
    const map = new Map<string, TrainableBrainTarget>()
    for (const target of targets) map.set(target.brainId, target)
    return map
  }, [targets])
  const itemTargets = useMemo(() => {
    const list = itemTargetIds
      .map((brainId) => targetsByBrainId.get(brainId))
      .filter((target): target is TrainableBrainTarget => !!target)
    if (list.length === 0 && fallbackBrainTarget) return [fallbackBrainTarget]
    return list
  }, [itemTargetIds, targetsByBrainId, fallbackBrainTarget])

  const itemScopeIds = useMemo(
    () =>
      itemTargets
        .map((target) => target.scopeId)
        .filter((scopeId) => targets.some((target) => target.scopeId === scopeId)),
    [itemTargets, targets],
  )

  const showPicker = targets.length > 0

  return (
    <li
      className={cn(
        'mx-spacing-2 rounded-spacing-1 px-spacing-1 py-spacing-1 gap-spacing-2 group flex items-center transition-colors',
        selected ? 'bg-primary/5' : 'hover:bg-hover-subtle',
      )}
    >
      <div className="h-spacing-6 w-spacing-5 flex shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label="Select"
          className={cn(
            'checkbox-glass-green shrink-0 transition-opacity',
            selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
        />
      </div>
      <p className="body-3 text-foreground min-w-0 flex-1 truncate" title={fullTitle}>
        {title}
      </p>
      {hasWarning ? (
        <Tooltip label={warningTooltip} side="top" delayMs={250}>
          <span aria-label={warningTooltip} className="flex shrink-0 items-center">
            <AlertTriangle className="icon-sm text-warning" />
          </span>
        </Tooltip>
      ) : null}
      {showPicker && itemTargets.length > 0 ? (
        <div className={cn('shrink-0', actionsForced ? 'hidden' : 'flex group-hover:hidden')}>
          <BrainTrainTargetSelect
            targets={targets}
            values={itemScopeIds}
            align="right"
            onChange={(scopeIds) => {
              const brainIds = scopeIds
                .map((scopeId) => targets.find((target) => target.scopeId === scopeId)?.brainId)
                .filter((brainId): brainId is string => !!brainId)
              onSetItemTargets(brainIds)
            }}
            trigger={
              <span className="rounded-spacing-1 hover:bg-hover-subtle p-spacing-1 inline-flex items-center transition-colors">
                <BrainTargetAvatarStack targets={itemTargets} size="xs" max={3} />
              </span>
            }
          />
        </div>
      ) : null}
      <div
        className={cn(
          'gap-spacing-1 shrink-0 items-center',
          actionsForced ? 'flex' : 'hidden group-hover:flex',
        )}
      >
        <TrainingStagingMetadataMenu
          value={item.metadata.sourceType}
          options={TRAINING_STAGING_SOURCE_TYPES}
          onChange={(value) => onUpdateMetadata({ sourceType: value })}
          open={openMenu === 'type'}
          onOpenChange={(open) => setOpenMenu(open ? 'type' : null)}
          ariaLabel="Type"
        />
        <TrainingStagingMetadataMenu
          value={item.metadata.domain}
          options={TRAINING_STAGING_DOMAINS}
          onChange={(value) => onUpdateMetadata({ domain: value })}
          open={openMenu === 'domain'}
          onOpenChange={(open) => setOpenMenu(open ? 'domain' : null)}
          ariaLabel="Domain"
        />
        <Tooltip label="Remove from staging" side="top" delayMs={250}>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove from staging"
            className="text-muted-foreground hover:text-foreground hover:bg-hover-subtle rounded-spacing-1 h-spacing-6 w-spacing-6 flex items-center justify-center"
          >
            <Trash2 className="icon-sm" />
          </button>
        </Tooltip>
      </div>
    </li>
  )
}
