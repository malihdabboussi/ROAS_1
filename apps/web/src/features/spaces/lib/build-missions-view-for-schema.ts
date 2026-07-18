import { buildNewViewDef } from '../components/ViewSwitcher'
import type { ViewDef } from '../types/space-schema'

export const MISSIONS_VIEW_CATALOG_ITEM = {
  type: 'missions',
  label: 'Missions',
  icon: 'rocket',
  description: 'Campaign mission control',
} as const

export function buildMissionsViewForSchema(existingViews: ViewDef[]): ViewDef {
  const base = buildNewViewDef(MISSIONS_VIEW_CATALOG_ITEM)
  const existingIds = new Set(existingViews.map((view) => view.id))
  const existingNames = new Set(existingViews.map((view) => view.name))
  if (!existingIds.has(base.id) && !existingNames.has(base.name)) return base

  let n = 2
  let nextId = `${base.id}_${n}`
  while (existingIds.has(nextId)) {
    n += 1
    nextId = `${base.id}_${n}`
  }
  let nextName = `${base.name} ${n}`
  while (existingNames.has(nextName)) {
    n += 1
    nextName = `${base.name} ${n}`
  }
  return { ...base, id: nextId, name: nextName }
}
