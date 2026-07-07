'use client'

import { Inbox, Layers, Loader2, Plus } from 'lucide-react'
import type { TrainableBrainTarget } from '@/features/brain/hooks/use-trainable-brains'
import { cn } from '@/lib/utils/cn'
import type { SkDomain, SkSourceType } from '../../services/sk.service'
import {
  TRAINING_STAGING_DOMAIN_PLACEHOLDER,
  TRAINING_STAGING_DOMAINS,
  TRAINING_STAGING_SOURCE_TYPES,
  TRAINING_STAGING_TYPE_PLACEHOLDER,
  TrainingStagingMetadataMenu,
} from './TrainingStagingMetadataMenu'
import { TrainingStagingQueue } from './TrainingStagingQueue'
import type { StagedItem } from './types'

export function TrainingStagingPanel({
  staged,
  stagedCount,
  selectedCount,
  selectedStagedIds,
  onClear,
  onSelectAll,
  onToggle,
  onRemove,
  onUpdateMetadata,
  targets,
  onSetItemTargets,
  fallbackBrainId,
  fallbackBrainTarget,
  bulkSourceType,
  bulkDomain,
  bulkOpenMenu,
  onBulkSourceTypeChange,
  onBulkDomainChange,
  onBulkOpenMenuChange,
  onApplyBulk,
  submitting,
  canAdd,
  onAddAll,
}: {
  staged: StagedItem[]
  stagedCount: number
  selectedCount: number
  selectedStagedIds: Set<string>
  onClear: () => void
  onSelectAll: (select: boolean) => void
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onUpdateMetadata: (id: string, patch: Partial<StagedItem['metadata']>) => void
  targets: TrainableBrainTarget[]
  onSetItemTargets: (id: string, brainIds: string[]) => void
  fallbackBrainId: string | null
  fallbackBrainTarget: TrainableBrainTarget | null
  bulkSourceType: SkSourceType | ''
  bulkDomain: SkDomain | ''
  bulkOpenMenu: 'type' | 'domain' | null
  onBulkSourceTypeChange: (value: SkSourceType | '') => void
  onBulkDomainChange: (value: SkDomain | '') => void
  onBulkOpenMenuChange: (value: 'type' | 'domain' | null) => void
  onApplyBulk: () => void
  submitting: boolean
  canAdd: boolean
  onAddAll: () => void
}) {
  return (
    <aside className="border-border bg-muted/10 rounded-spacing-3 flex h-full min-h-0 flex-col overflow-hidden border">
      <div className="border-border px-spacing-3 py-spacing-2 flex shrink-0 items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <Inbox className="icon-xs text-muted-foreground" />
          <span className="body-3 text-foreground font-semibold">Staging ({stagedCount})</span>
        </div>
        {stagedCount > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="body-4 text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        {stagedCount === 0 ? (
          <div className="text-muted-foreground body-4 px-spacing-4 flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <Layers className="icon-md opacity-50" />
            <p>Pick items from any source.</p>
            <p className="typo-caption">
              Tip: paste a URL or list of URLs anywhere in this modal.
            </p>
          </div>
        ) : (
          <TrainingStagingQueue
            staged={staged}
            stagedCount={stagedCount}
            selectedCount={selectedCount}
            selectedStagedIds={selectedStagedIds}
            onSelectAll={onSelectAll}
            onToggle={onToggle}
            onRemove={onRemove}
            onUpdateMetadata={onUpdateMetadata}
            targets={targets}
            onSetItemTargets={onSetItemTargets}
            fallbackBrainId={fallbackBrainId}
            fallbackBrainTarget={fallbackBrainTarget}
          />
        )}

        <div
          aria-hidden={selectedCount === 0}
          className={cn(
            'left-spacing-2 right-spacing-2 bottom-spacing-2 absolute z-20 transition-all duration-200 ease-out',
            selectedCount > 0
              ? 'pointer-events-auto translate-y-0 opacity-100'
              : 'pointer-events-none translate-y-3 opacity-0',
          )}
        >
          <div className="surface-card card-elevated border-border rounded-spacing-2 px-spacing-3 py-spacing-2 gap-spacing-2 flex items-center border">
            <span className="body-4 text-muted-foreground min-w-0 flex-1 truncate">
              {selectedCount} selected — bulk apply:
            </span>
            <div className="gap-spacing-1 flex shrink-0 items-center">
              <TrainingStagingMetadataMenu<SkSourceType | ''>
                value={bulkSourceType}
                options={TRAINING_STAGING_SOURCE_TYPES}
                onChange={onBulkSourceTypeChange}
                open={bulkOpenMenu === 'type'}
                onOpenChange={(open) => onBulkOpenMenuChange(open ? 'type' : null)}
                ariaLabel="Type"
                placement="top"
                placeholder={TRAINING_STAGING_TYPE_PLACEHOLDER}
              />
              <TrainingStagingMetadataMenu<SkDomain | ''>
                value={bulkDomain}
                options={TRAINING_STAGING_DOMAINS}
                onChange={onBulkDomainChange}
                open={bulkOpenMenu === 'domain'}
                onOpenChange={(open) => onBulkOpenMenuChange(open ? 'domain' : null)}
                ariaLabel="Domain"
                placement="top"
                placeholder={TRAINING_STAGING_DOMAIN_PLACEHOLDER}
              />
              <button
                type="button"
                disabled={!bulkSourceType && !bulkDomain}
                onClick={onApplyBulk}
                className="body-4 button-glass-neutral h-spacing-7 px-spacing-3 rounded-spacing-1 disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-spacing-3 py-spacing-2 shrink-0">
        <button
          type="button"
          disabled={submitting || stagedCount === 0 || !canAdd}
          onClick={onAddAll}
          className="button-glass-accent body-3 py-spacing-2 flex w-full items-center justify-center gap-2 rounded-lg font-medium disabled:opacity-40"
        >
          {submitting ? <Loader2 className="icon-xs animate-spin" /> : <Plus className="icon-xs" />}
          {submitting
            ? 'Adding…'
            : stagedCount === 0
              ? 'Add to queue'
              : `Add ${stagedCount} to queue`}
        </button>
      </div>
    </aside>
  )
}
