import type { SpaceShareLevel } from '../../../services/spaces.service'

export const PERMISSION_OPTIONS: ReadonlyArray<{ value: SpaceShareLevel; label: string }> = [
  { value: 'admin', label: 'Admin' },
  { value: 'edit', label: 'Edit' },
  { value: 'view', label: 'View only' },
]

export interface PermissionMenuPosition {
  top: number
  left: number
  width: number
}
