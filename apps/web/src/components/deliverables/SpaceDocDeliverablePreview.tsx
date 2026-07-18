'use client'

import { useMemo } from 'react'
import { SpaceDocEditorPanelAdapter } from '@/components/spaces/SpaceDocEditorPanelAdapter'
import type { ShellArtifactViewerTarget } from '@/lib/artifacts'

export function SpaceDocDeliverablePreview({
  spaceId,
  itemId,
  title,
  googleActionTarget = null,
}: {
  spaceId: string
  itemId: string
  title?: string | null
  googleActionTarget?: HTMLElement | null
}) {
  const target = useMemo<ShellArtifactViewerTarget>(
    () => ({
      id: itemId,
      entityId: itemId,
      entityTable: 'space_items',
      spaceId,
      title: title?.trim() || 'Untitled',
      type: 'doc',
    }),
    [itemId, spaceId, title],
  )

  return (
    <SpaceDocEditorPanelAdapter
      target={target}
      onClose={() => undefined}
      embedded
      googleActionTarget={googleActionTarget}
    />
  )
}
