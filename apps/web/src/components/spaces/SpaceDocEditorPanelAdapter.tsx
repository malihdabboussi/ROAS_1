'use client'

import { useCallback, useEffect, useState } from 'react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { DocEditorPanel } from '@/features/spaces/components/docs/DocEditorPanel'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import type { ShellArtifactViewerTarget } from '@/lib/artifacts'
import { fetchSpaceItem, fetchSpaceItemById, type SpaceItem } from '@/lib/spaces'

export function SpaceDocEditorPanelAdapter({
  target,
  onClose,
  embedded = false,
  googleActionTarget = null,
}: {
  target: ShellArtifactViewerTarget
  onClose: () => void
  embedded?: boolean
  googleActionTarget?: HTMLElement | null
}) {
  const spaces = useSpacesStore((state) => state.spaces)
  const roster = useSpacesStore((state) => state.roster)
  const currentUserId = useSpacesStore((state) => state.currentUserId)
  const loadSpaces = useSpacesStore((state) => state.loadSpaces)
  const loadRoster = useSpacesStore((state) => state.loadRoster)
  const [item, setItem] = useState<SpaceItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const entityId = target.entityId || target.id

  const loadItem = useCallback(
    async (itemId: string) => {
      setError(null)
      try {
        const loaded = await fetchSpaceItemById(itemId, target.title).catch(() => {
          if (!target.spaceId) throw new Error('Space document not found')
          return fetchSpaceItem(target.spaceId, itemId)
        })
        setItem(loaded)
      } catch (cause) {
        setItem(null)
        setError(cause instanceof Error ? cause.message : 'Space document not found')
      }
    },
    [target.spaceId, target.title],
  )

  useEffect(() => {
    void loadSpaces()
    void loadRoster()
  }, [loadRoster, loadSpaces])

  useEffect(() => {
    setItem(null)
    void loadItem(entityId)
  }, [entityId, loadItem])

  const spaceId = item?.space_id ?? target.spaceId ?? null
  const space = spaces.find((candidate) => candidate.id === spaceId)
  const fields = space?.schema.fields ?? []
  const docView = space?.schema.views.find((view) => view.type === 'docs')
  const categoryField = fields.find((field) => field.id === 'category') ?? null

  if (!item && !error) {
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb text="Loading document..." />
      </div>
    )
  }

  if (error || !item) {
    return <div className="body-2 text-muted-foreground p-spacing-4">{error}</div>
  }

  return (
    <DocEditorPanel
      key={item.id}
      item={item}
      view={docView}
      categoryField={categoryField}
      allFields={fields}
      roster={roster}
      currentUserId={currentUserId}
      campaignId={target.campaignId ?? space?.campaign_id ?? null}
      spaceIdOverride={item.space_id}
      inline
      embedded={embedded}
      googleActionTarget={googleActionTarget}
      onClose={onClose}
      onUpdated={() => void loadItem(item.id)}
      onSelectChildDoc={(childId) => void loadItem(childId)}
    />
  )
}
