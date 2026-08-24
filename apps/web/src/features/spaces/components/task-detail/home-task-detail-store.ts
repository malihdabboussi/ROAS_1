import { useSpacesStore } from '../../store/use-spaces-store'
import type { Space, SpaceItem } from '../../types'
import { DEFAULT_SPACE_SCHEMA, type SpaceSchema, type ViewDef } from '../../types/space-schema'

export type HomeTaskStoreSnapshot = {
  activeSpaceId: string | null
  activeViewId: string | null
  items: SpaceItem[]
  spaces: Space[]
  itemsLoadedForSpaceId: string | null
}

const TASK_DETAIL_VIEW_TYPES = new Set<ViewDef['type']>(['list', 'table', 'kanban'])

export function captureHomeTaskStoreSnapshot(): HomeTaskStoreSnapshot {
  const state = useSpacesStore.getState()
  return {
    activeSpaceId: state.activeSpaceId,
    activeViewId: state.activeViewId,
    items: state.items,
    spaces: state.spaces,
    itemsLoadedForSpaceId: state.itemsLoadedForSpaceId,
  }
}

export function restoreHomeTaskStoreSnapshot(snapshot: HomeTaskStoreSnapshot) {
  useSpacesStore.setState({
    activeSpaceId: snapshot.activeSpaceId,
    activeViewId: snapshot.activeViewId,
    items: snapshot.items,
    spaces: snapshot.spaces,
    itemsLoadedForSpaceId: snapshot.itemsLoadedForSpaceId,
  })
}

export function mergeHomeTaskSchema(raw: SpaceSchema): SpaceSchema {
  const existingIds = new Set(raw.fields.map((field) => field.id))
  const missingFields = DEFAULT_SPACE_SCHEMA.fields.filter((field) => !existingIds.has(field.id))
  return missingFields.length === 0 ? raw : { ...raw, fields: [...raw.fields, ...missingFields] }
}

export function pickHomeTaskDetailView(schema: SpaceSchema): ViewDef {
  return schema.views.find((view) => TASK_DETAIL_VIEW_TYPES.has(view.type)) ?? schema.views[0]!
}

export function hydrateStoreForHomeTask(space: Space, items: SpaceItem[], viewId: string) {
  useSpacesStore.setState((state) => ({
    activeSpaceId: space.id,
    activeViewId: viewId,
    items,
    itemsLoadedForSpaceId: space.id,
    spaces: state.spaces.some((candidate) => candidate.id === space.id)
      ? state.spaces
      : [space, ...state.spaces],
  }))
}

export function openHomeTaskWithHistory(
  item: SpaceItem,
  items: SpaceItem[],
  setSelectedItem: (item: SpaceItem | null) => void,
  setTaskHistory: (updater: (stack: SpaceItem[]) => SpaceItem[]) => void,
) {
  if (!item.parent_item_id) {
    setTaskHistory(() => [])
    setSelectedItem(item)
    return
  }
  const parent = items.find((candidate) => candidate.id === item.parent_item_id)
  setTaskHistory(() => (parent ? [parent] : []))
  setSelectedItem(item)
}
