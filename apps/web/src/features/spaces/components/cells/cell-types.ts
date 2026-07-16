import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import type { SpaceItem } from '../../types'
import type {
  DateDisplayFormat,
  DateDisplayFormats,
  FieldDef,
  SelectOption,
} from '../../types/space-schema'

export interface BaseCellProps {
  field: FieldDef
  value: unknown
  onChange: (value: unknown) => void
  readonly?: boolean
  /**
   * Space list: title is read-only; full cell opens task. Enables emerald + pointer look.
   * Use with `nameListHoverGroup` for the correct `group` / `group/row` hover class.
   */
  nameAsListOpenTarget?: boolean
  nameListHoverGroup?: 'row' | 'self'
  listInlineEditActive?: boolean
  onListInlineTitleEditEnd?: () => void
  /**
   * When true, the cell’s own popover/dropdown (email, phone, select, etc.) opens on first mount.
   * Used e.g. bulk “Custom fields” sub-flyout so the user is not an extra click away from the editor.
   */
  openOnMount?: boolean
  /**
   * Bulk custom-field sub-panel: render the value editor in-flow in the sub-panel; no extra trigger
   * row and no portaled second card (saves a duplicate / misaligned popover for phone, email, etc.).
   */
  bulkInlineEditor?: boolean
  dateDisplayFormat?: DateDisplayFormat
  dateDisplayFormats?: DateDisplayFormats
}

export interface ExtendedCellProps extends BaseCellProps {
  roster?: TeamRosterEntry[]
  currentUserId?: string | null
  onEditStatuses?: () => void
  onEditCategories?: () => void
  onCreateOption?: (fieldId: string, option: SelectOption) => void
  onUpdateOption?: (fieldId: string, optionId: string, updates: Partial<SelectOption>) => void
  onDeleteOption?: (fieldId: string, optionId: string) => void
  /** Persisted on the fielddef as `tag_custom_swatches` in space schema */
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
  /** Kanban task row: URL empty = centered globe; filled = icon + text (like due date) — no extra chrome. */
  fieldRowVariant?: 'default' | 'kanban'
  /** When set, due_date + start_date use one merged date picker. */
  spaceItem?: SpaceItem
  onItemPatch?: (patch: Partial<SpaceItem>) => void
  /** Status field from space schema; used by recurrence "reset to" picker. */
  statusField?: FieldDef
  /** `mission` field: create linked mission (rocket) for agent-assigned items. */
  onPushToAgent?: (
    itemId: string,
    options?: import('./MissionSendDropdown').MissionSendOptions,
  ) => Promise<void>
  /** All field definitions from the space schema; needed by MissionSendDropdown. */
  allFields?: FieldDef[]
  /** Open another space item (e.g. Source call parent meeting). */
  onOpenDetail?: (item: SpaceItem) => void
}
