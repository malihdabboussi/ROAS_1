import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'

/**
 * Reserved for the row chrome (grip). Row drag is activated on the `SpaceListDndShell` wrapper;
 * children get no-op / empty values so the shell keeps the only activator.
 */
export type SpaceListDndDragHandleProps = {
  setActivatorNodeRef: (el: HTMLElement | null) => void
  dndAttributes: DraggableAttributes
  dndListeners: DraggableSyntheticListeners
}
