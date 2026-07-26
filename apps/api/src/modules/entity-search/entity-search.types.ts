export type EntitySearchKind =
  | 'task'
  | 'doc'
  | 'channel'
  | 'space'
  | 'mission'
  | 'person'
  | 'agent'
  | 'conversation'
  | 'campaign'
  | 'artifact'
  | 'deliverable'

export type EntitySearchArtifactKind =
  | 'offer'
  | 'funnel'
  | 'website'
  | 'sequence'
  | 'email'
  | 'presentation'
  | 'avatar'
  | 'ad'
  | 'ad_campaign'
  | 'ad_set'
  | 'social_post'
  | 'blog_post'
  | 'page'

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
  campaignId?: string | null
  campaignIcon?: string | null
  artifactKind?: EntitySearchArtifactKind
  sequenceId?: string
  funnelId?: string
  personKind?: 'portal_user' | 'managed_person'
  relationshipKind?: 'internal' | 'external' | 'unknown'
  brainId?: string | null
}
