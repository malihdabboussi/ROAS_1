'use client'

import { HomeTaskDetailHost } from '@/features/home/components/HomeTaskDetailHost'
import type { ShellArtifactViewerTarget } from '@/lib/artifacts'
import { useShellStore } from './use-shell-store'

export function ShellTaskArtifactViewerAdapter({ target }: { target: ShellArtifactViewerTarget }) {
  const close = useShellStore((state) => state.closeArtifactViewer)
  const now = new Date().toISOString()

  if (!target.spaceId) return null

  return (
    <HomeTaskDetailHost
      presentation="panel"
      onClose={close}
      item={{
        kind: 'space_item',
        id: target.entityId || target.id,
        title: target.title,
        status: '',
        assignee_user_id: null,
        org_id: null,
        mission_id: null,
        space_id: target.spaceId,
        suggestion_state: null,
        due_at: null,
        source_url: target.internalUrl || null,
        preview: target.content || null,
        created_at: now,
        updated_at: null,
      }}
    />
  )
}
