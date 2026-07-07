export type EntitySearchKind =
  | 'task'
  | 'doc'
  | 'channel'
  | 'space'
  | 'mission'
  | 'person'
  | 'agent'
  | 'conversation'

export interface EntitySearchResult {
  kind: EntitySearchKind
  id: string
  label: string
  subtitle: string | null
  iconUrl: string | null
  url: string | null
  /** Status option id for tasks (e.g. 'todo', 'in_progress', 'in_review', 'done'). */
  status?: string | null
  /** Status option color name from the space schema (e.g. 'cyan', 'amber', a hex, or a gradient). */
  statusColor?: string | null
  /** Status option label from the space schema (e.g. 'In Progress'). */
  statusLabel?: string | null
}
