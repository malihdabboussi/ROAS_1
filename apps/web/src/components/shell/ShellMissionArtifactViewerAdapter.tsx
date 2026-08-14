'use client'

import { useCallback, useEffect, useState } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { MissionDetailModal } from '@/components/missions/MissionDetailModalAdapter'
import { Tooltip } from '@/components/ui/tooltip'
import type { ShellArtifactViewerTarget } from '@/lib/artifacts'
import { fetchMissionById, type Mission } from '@/lib/missions'
import { cn } from '@/lib/utils/cn'
import { SHELL_RIGHT_PANEL_MESSAGES } from './shell-right-panel.messages.config'
import { useShellStore } from './use-shell-store'

export function ShellMissionArtifactViewerAdapter({
  target,
}: {
  target: ShellArtifactViewerTarget
}) {
  const close = useShellStore((state) => state.closeArtifactViewer)
  const [mission, setMission] = useState<Mission | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const load = useCallback(async () => {
    setLoadFailed(false)
    try {
      setMission(await fetchMissionById(target.entityId || target.id))
    } catch {
      setLoadFailed(true)
    }
  }, [target.entityId, target.id])

  useEffect(() => {
    void load()
  }, [load])

  if (loadFailed) {
    return (
      <div className="surface-card p-spacing-4 flex h-full flex-col items-center justify-center">
        <p className="body-3 text-destructive">{SHELL_RIGHT_PANEL_MESSAGES.missionLoadError}</p>
        <button
          type="button"
          className="button-default button-glass-neutral mt-spacing-3"
          onClick={() => void load()}
        >
          {SHELL_RIGHT_PANEL_MESSAGES.missionRetry}
        </button>
      </div>
    )
  }
  if (!mission) {
    return (
      <div className="surface-card body-3 text-muted-foreground p-spacing-4 h-full">
        {SHELL_RIGHT_PANEL_MESSAGES.missionLoading}
      </div>
    )
  }
  const headerActions = expanded ? (
    <Tooltip label="Collapse" side="bottom">
      <button
        type="button"
        onClick={() => setExpanded(false)}
        aria-label="Collapse mission viewer"
        className="btn-icon-bare shrink-0"
      >
        <Minimize2 className="icon-sm" />
      </button>
    </Tooltip>
  ) : (
    <Tooltip label="Expand" side="bottom">
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-label="Expand mission viewer"
        className="btn-icon-bare shrink-0"
      >
        <Maximize2 className="icon-sm" />
      </button>
    </Tooltip>
  )

  return (
    <div
      className={cn(
        'flex h-full min-h-0 w-full',
        expanded && 'z-modal-content absolute inset-0 w-full',
      )}
      data-shell-mission-artifact-viewer
    >
      <MissionDetailModal
        mission={mission}
        presentation="panel"
        headerActions={headerActions}
        onClose={close}
        onUpdated={() => void load()}
      />
    </div>
  )
}
