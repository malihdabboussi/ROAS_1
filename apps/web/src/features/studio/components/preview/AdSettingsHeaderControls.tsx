import { createPortal } from 'react-dom'
import { Loader2, PanelRightOpen, RefreshCw, Rocket } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'

interface AdSettingsHeaderControlsProps {
  isPublished: boolean
  hasPendingChanges: boolean
  metaEffectiveStatus?: string | null
  settingMetaStatus: boolean
  refreshingStatus: boolean
  onSetMetaStatus: (status: 'ACTIVE' | 'PAUSED') => void
  onRefreshStatus: () => void
  onOpenReview: () => void
  onCollapseSettings?: () => void
  publishHostEl?: HTMLElement | null
  refreshHostEl?: HTMLElement | null
}

export function AdSettingsHeaderControls({
  isPublished,
  hasPendingChanges,
  metaEffectiveStatus,
  settingMetaStatus,
  refreshingStatus,
  onSetMetaStatus,
  onRefreshStatus,
  onOpenReview,
  onCollapseSettings,
  publishHostEl,
  refreshHostEl,
}: AdSettingsHeaderControlsProps) {
  const publishCluster = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {hasPendingChanges && (
        <span className="flex items-center gap-1 rounded-lg bg-warning/10 px-2.5 py-1.5 text-xs font-medium text-warning">
          <span className="h-1.5 w-1.5 rounded-full bg-warning" />
          Pending changes
        </span>
      )}
      {isPublished && (
        <div className="flex items-center gap-1.5">
          {metaEffectiveStatus === 'ACTIVE' ? (
            <>
              <button
                type="button"
                disabled={settingMetaStatus}
                onClick={() => onSetMetaStatus('PAUSED')}
                className="flex items-center gap-1 rounded-lg bg-warning/10 px-2.5 py-1.5 text-xs font-semibold text-warning transition-colors hover:bg-warning/10 disabled:opacity-60"
              >
                {settingMetaStatus ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Pause'}
              </button>
              <span className="flex items-center gap-1 rounded-lg bg-success/10 px-2.5 py-1.5 text-xs font-semibold text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Running
              </span>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={settingMetaStatus}
                onClick={() => onSetMetaStatus('ACTIVE')}
                className="flex items-center gap-1 rounded-lg bg-success/10 px-2.5 py-1.5 text-xs font-semibold text-success transition-colors hover:bg-success/10 disabled:opacity-60"
              >
                {settingMetaStatus ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Activate'}
              </button>
              <span className="flex items-center gap-1 rounded-lg bg-warning/10 px-2.5 py-1.5 text-xs font-semibold text-warning">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                Paused
              </span>
            </>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={onOpenReview}
        className="chip-glass-green flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors"
      >
        <Rocket className="h-3 w-3" />
        {isPublished ? 'Republish' : 'Publish'}
      </button>
    </div>
  )

  const refreshCluster = (
    <Tooltip label="Refresh Meta status" side="bottom">
      <button
        type="button"
        onClick={onRefreshStatus}
        disabled={refreshingStatus}
        className="text-muted-foreground hover:text-foreground p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw className={`h-4 w-4 ${refreshingStatus ? 'animate-spin' : ''}`} />
      </button>
    </Tooltip>
  )

  const headerSlotsHosted = !!(publishHostEl && refreshHostEl)

  return (
    <>
      {!headerSlotsHosted && (
        <div className="flex items-center gap-2 px-4 py-2">
          {onCollapseSettings ? (
            <Tooltip label="Back to preview" side="bottom">
              <button
                type="button"
                onClick={onCollapseSettings}
                className="text-muted-foreground hover:bg-secondary hover:text-foreground rounded-md p-1.5 transition-colors"
                aria-label="Back to preview"
              >
                <PanelRightOpen className="h-4 w-4" />
              </button>
            </Tooltip>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
            {publishCluster}
            {refreshCluster}
          </div>
        </div>
      )}
      {publishHostEl ? createPortal(publishCluster, publishHostEl) : null}
      {refreshHostEl ? createPortal(refreshCluster, refreshHostEl) : null}
    </>
  )
}
