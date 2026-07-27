import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import type { SpaceItem } from '../../types'
import type { FieldDef, SelectOption } from '../../types/space-schema'

export type PageGraderBulkSendPanelProps = {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  selectedCount: number
  selectedItems: SpaceItem[]
  roster: TeamRosterEntry[]
  spaceId: string | null
  campaignId: string | null
  campaignName: string | null
  tagsField?: FieldDef
  attendeesField?: FieldDef
  onCreateOption?: (fieldId: string, option: SelectOption) => void
  onClose: () => void
  onSend: (input: {
    clientId: string
    clientName: string
    taskType: string
    note: string
    dueDate: string
    clientTagId: string
    clientTagLabel: string
    assignee: {
      pageGraderUserId?: string
      email?: string
      name?: string
    } | null
  }) => Promise<void>
}
