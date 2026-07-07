import { Loader2 } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import type { DriveFolderMapping } from '@/lib/services/drive-mappings-api'
import { cn } from '@/lib/utils/cn'
import { driveMappingStatusLabel, driveMappingStatusTooltip } from './drive-folders-panel-utils'

export function DriveMappingStatusIndicator({ mapping }: { mapping: DriveFolderMapping }) {
  const label = driveMappingStatusTooltip(mapping)
  const summary = driveMappingStatusLabel(mapping)
  const syncing = mapping.sync_status === 'syncing'

  const dotClass =
    mapping.sync_status === 'error' || mapping.last_sync_error
      ? 'bg-destructive'
      : mapping.sync_status === 'idle' && !mapping.last_synced_at
        ? 'bg-warning'
        : mapping.sync_status === 'idle'
          ? 'bg-success'
          : 'bg-primary'

  return (
    <Tooltip label={label} side="left" wide triggerClassName="inline-flex shrink-0">
      <span
        className="hover:bg-hover-subtle focus-visible:ring-ring flex size-6 cursor-default items-center justify-center rounded-md outline-none focus-visible:ring-2"
        tabIndex={0}
        role="img"
        aria-label={summary}
      >
        {syncing ? (
          <Loader2 className="h-3 w-3 shrink-0 animate-spin text-primary" aria-hidden />
        ) : (
          <span className={cn('h-2 w-2 shrink-0 rounded-full', dotClass)} aria-hidden />
        )}
      </span>
    </Tooltip>
  )
}
