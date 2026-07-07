import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Check,
  Copy,
  FolderInput,
  Loader2,
  User,
} from 'lucide-react'
import type { OrgMembership } from '@/lib/org'
import type { TransferMode } from '@/lib/transfer'
import {
  getTransferGroupCount,
  type TransferDestination,
  type TransferDisplayGroup,
} from './transfer-dialog.logic'
import { TransferContextBadge } from './TransferContextBadge'

export function TransferModeSelector({
  mode,
  onModeChange,
}: {
  mode: TransferMode
  onModeChange: (mode: TransferMode) => void
}) {
  return (
    <div>
      <label className="body-3 text-muted-foreground mb-spacing-2 block">Operation</label>
      <div className="gap-spacing-2 flex">
        <button
          type="button"
          onClick={() => onModeChange('move')}
          className={`button-default body-3 ${
            mode === 'move'
              ? 'button-glass-blue'
              : 'button-glass-neutral hover:bg-hover-subtle hover:text-foreground'
          }`}
        >
          <FolderInput className="icon-sm" />
          Move
        </button>
        <button
          type="button"
          onClick={() => onModeChange('copy')}
          className={`button-default body-3 ${
            mode === 'copy'
              ? 'button-glass-blue'
              : 'button-glass-neutral hover:bg-hover-subtle hover:text-foreground'
          }`}
        >
          <Copy className="icon-sm" />
          Duplicate
        </button>
      </div>
    </div>
  )
}

export function TransferDestinationSelector({
  activeOrgId,
  destinations,
  memberships,
  targetOrgId,
  onTargetSelect,
}: {
  activeOrgId: string | null
  destinations: TransferDestination[]
  memberships: OrgMembership[]
  targetOrgId: string | null | undefined
  onTargetSelect: (orgId: string | null) => void
}) {
  return (
    <div>
      <label className="body-3 text-muted-foreground mb-spacing-2 block">From</label>
      <div className="gap-spacing-2 mb-spacing-3 flex items-center">
        <TransferContextBadge orgId={activeOrgId} memberships={memberships} />
        <ArrowRight className="text-muted-foreground icon-sm shrink-0" />
        <span className="body-3 text-muted-foreground">
          {targetOrgId === undefined
            ? 'Select destination'
            : targetOrgId === null
              ? 'Personal Account'
              : (memberships.find((membership) => membership.org_id === targetOrgId)?.organizations
                  .name ?? 'Organization')}
        </span>
      </div>

      <label className="body-3 text-muted-foreground mb-spacing-2 block">Destination</label>
      <div className="surface-bg border-border rounded-spacing-2 space-y-spacing-1 p-spacing-2 border">
        {destinations.map((destination) => (
          <button
            key={destination.key}
            type="button"
            onClick={() => onTargetSelect(destination.org_id)}
            className={`gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center text-left transition-all ${
              targetOrgId === destination.org_id
                ? 'button-glass-blue'
                : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
            }`}
          >
            {destination.org_id ? (
              <Building2 className="icon-sm shrink-0" />
            ) : (
              <User className="icon-sm shrink-0" />
            )}
            <span className="truncate">{destination.label}</span>
          </button>
        ))}
        {destinations.length === 0 && (
          <p className="body-3 text-muted-foreground px-spacing-2 py-spacing-2">
            No other contexts available
          </p>
        )}
      </div>
    </div>
  )
}

export function TransferPreviewChecklist({
  allSelected,
  childrenByTable,
  excludedGroups,
  includedCount,
  onToggleAll,
  onToggleGroup,
  visibleGroups,
}: {
  allSelected: boolean
  childrenByTable: Record<string, number>
  excludedGroups: Set<string>
  includedCount: number
  onToggleAll: () => void
  onToggleGroup: (key: string) => void
  visibleGroups: TransferDisplayGroup[]
}) {
  return (
    <div>
      <div className="mb-spacing-2 flex items-center justify-between">
        <label className="body-3 text-muted-foreground">
          What to include
          {includedCount > 0 && (
            <span className="text-muted-foreground/60 ml-spacing-1">
              ({includedCount} item{includedCount !== 1 ? 's' : ''})
            </span>
          )}
        </label>
        <button
          type="button"
          onClick={onToggleAll}
          className="body-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          {allSelected ? 'Deselect all' : 'Select all'}
        </button>
      </div>
      <div className="surface-bg border-border rounded-spacing-2 p-spacing-1 max-h-[240px] overflow-y-auto border">
        {visibleGroups.map((group) => {
          const count = getTransferGroupCount(group, childrenByTable)
          const included = !excludedGroups.has(group.key)
          return (
            <button
              key={group.key}
              type="button"
              onClick={() => onToggleGroup(group.key)}
              className={`gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center text-left transition-all ${
                included ? 'text-foreground' : 'text-muted-foreground/50'
              } hover:bg-hover-subtle`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                  included ? 'bg-primary border-primary' : 'border-border'
                }`}
              >
                {included && <Check className="icon-xs text-background" />}
              </span>
              <span className="flex-1 truncate">{group.label}</span>
              <span className="typo-caption text-muted-foreground tabular-nums">{count}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function TransferDialogStatus({
  done,
  error,
  loading,
  mode,
  showReady,
  warnings,
}: {
  done: boolean
  error: string | null
  loading: boolean
  mode: TransferMode
  showReady: boolean
  warnings: string[]
}) {
  return (
    <>
      {loading && (
        <div className="gap-spacing-2 py-spacing-2 flex items-center">
          <Loader2 className="text-muted-foreground icon-sm animate-spin" />
          <span className="body-3 text-muted-foreground">Loading preview...</span>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="space-y-spacing-1">
          {warnings.map((warning, index) => (
            <p key={index} className="body-3 text-warning gap-spacing-1 flex items-center">
              <AlertTriangle className="icon-xs shrink-0" />
              {warning}
            </p>
          ))}
        </div>
      )}
      {error && <p className="body-3 text-destructive">{error}</p>}
      {done && <p className="body-3 text-success">Transfer complete!</p>}
      {showReady && !done && !error && !loading && warnings.length === 0 ? (
        <p className="body-3 text-muted-foreground">Ready to {mode}</p>
      ) : null}
    </>
  )
}
