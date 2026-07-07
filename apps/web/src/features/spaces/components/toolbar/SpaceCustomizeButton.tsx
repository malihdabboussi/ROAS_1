'use client'

import { Settings2 } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { useSpacePermission } from '../../hooks/use-space-permission'
import { useSpacesStore } from '../../store/use-spaces-store'

export type SpaceCustomizeButtonProps = {
  schemaEditorOpen: boolean
  closeCustomizePanel: () => void
  openCustomizeFromToolbar: (initial?: 'main' | 'fields' | 'people' | 'ig_format') => void
}

export function SpaceCustomizeButton({
  schemaEditorOpen,
  closeCustomizePanel,
  openCustomizeFromToolbar,
}: SpaceCustomizeButtonProps) {
  const activeSpace = useSpacesStore((s) =>
    s.activeSpaceId ? (s.spaces.find((sp) => sp.id === s.activeSpaceId) ?? null) : null,
  )
  const viewCount = activeSpace?.schema?.views?.length ?? 0
  const perm = useSpacePermission(activeSpace)
  // Customize view is a schema-mutating action → admin only.
  if (!perm.canAdmin) return null
  if (viewCount === 0) return null

  return (
    <Tooltip label="Customize view" side="bottom">
      <span className="inline-flex">
        <button
          type="button"
          onClick={() => {
            if (schemaEditorOpen) {
              closeCustomizePanel()
            } else {
              openCustomizeFromToolbar('main')
            }
          }}
          className="rounded-md border border-[var(--color-border)] p-1.5 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      </span>
    </Tooltip>
  )
}
