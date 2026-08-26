'use client'

import { useCallback, useEffect, useState } from 'react'
import { MissionDetailModal } from '@/components/missions/MissionDetailModalAdapter'
import { PageSkeleton } from '@/components/ui/feedback/ListSkeleton'
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
  const handleToggleExpanded = useCallback(() => setExpanded((current) => !current), [])
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
      <div className="surface-card p-spacing-4 h-full">
        <PageSkeleton rows={6} label={SHELL_RIGHT_PANEL_MESSAGES.missionLoading} className="p-0" />
      </div>
    )
  }
  return (
    <div
      className={cn(
        'flex h-full min-h-0 w-full',
        expanded ? 'z-modal-content absolute inset-0 w-full' : 'relative',
      )}
      data-shell-mission-artifact-viewer
    >
      <MissionDetailModal
        mission={mission}
        presentation="panel"
        panelExpanded={expanded}
        onTogglePanelExpanded={handleToggleExpanded}
        onClose={close}
        onUpdated={() => void load()}
      />
    </div>
  )
}
