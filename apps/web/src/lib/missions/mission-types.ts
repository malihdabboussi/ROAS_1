export type MissionStatus =
  | 'inbox'
  | 'backlog'
  | 'planning'
  | 'pending_approval'
  | 'awaiting_access_approval'
  | 'todo'
  | 'in_progress'
  | 'awaiting_human'
  | 'review'
  | 'blocked'
  | 'done'
  | 'archived'
  | 'error'
  | 'failed'
  | 'dead_letter'

export type MissionPriority = 'low' | 'medium' | 'high' | 'urgent'
export type AgentKey = string
export type AssigneeType = 'agent' | 'human'

export interface Mission {
  id: string
  user_id: string
  parent_mission_id: string | null
  campaign_id: string | null
  space_id?: string | null
  title: string
  brief: string | null
  description: string | null
  status: MissionStatus
  priority: MissionPriority
  assigned_agent_key: string | null
  current_agent_key: string | null
  progress_notes: string | null
  plan_id: string | null
  correlation_id: string
  idempotency_key: string
  retry_count: number
  input: Record<string, unknown>
  output: Record<string, unknown>
  error: string | null
  scheduled_at: string | null
  created_at: string
  updated_at: string
  started_at: string | null
  completed_at: string | null
  subtask_total?: number
  subtask_done?: number
  subtask_agent_keys?: string[]
}

export type SubtaskStatus =
  | 'pending'
  | 'in_progress'
  | 'awaiting_human'
  | 'done'
  | 'revision'
  | 'blocked'
  | 'cancelled'

export interface IntentPacket {
  why: string
  story: string
  sensory: string
  endState: string
  ecology: string
}

export interface MissionToolStep {
  action: string
  title: string
  label: string
  toolAction?: string
  state: 'active' | 'complete' | 'failed'
  startedAt?: number
  endedAt?: string
}

export interface MissionExecutionState {
  execution_status?: 'streaming' | 'complete' | 'failed'
  partial_output?: string
  current_tool?: {
    name: string
    label: string
    action?: string
    startedAt: number
  } | null
  completed_actions?: MissionToolStep[]
  last_checkpoint_at?: string
}

export interface MissionSubtask {
  id: string
  mission_id: string
  user_id: string
  title: string
  status: SubtaskStatus
  assigned_agent_key: AgentKey | null
  assignee_type: AssigneeType
  assigned_user_id: string | null
  awaiting_human_since: string | null
  sla_escalate_at: string | null
  sla_escalated_at: string | null
  bounce_reason: string | null
  sort_order: number
  depends_on: string[]
  assertionKeys?: string[]
  output: Record<string, unknown>
  feedback: string | null
  deliverable_id: string | null
  intent?: IntentPacket
  scheduled_at: string | null
  created_at: string
  updated_at: string
  execution_state?: MissionExecutionState
}

export interface CreateMissionInput {
  title: string
  brief?: string
  description?: string
  priority?: MissionPriority
  assigned_agent_key?: AgentKey
  campaign_id?: string
  space_id?: string
  input?: Record<string, unknown>
  idempotency_key?: string
  scheduled_at?: string | null
}

export type DeliverableType =
  | 'doc'
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'file'
  | 'offer'
  | 'funnel'
  | 'form'
  | 'task'
  | 'mission'
  | 'flow'
  | 'presentation'
  | 'sequence'
  | 'email'
  | 'blog_post'
  | 'social_post'
  | 'ad'
  | 'ad_set'
  | 'ad_campaign'
  | 'avatar'
  | 'website'
  | 'theme'
  | 'custom_object'
  | 'visual_doc'

export const CORE_DELIVERABLE_TYPES = new Set<DeliverableType>([
  'offer',
  'funnel',
  'form',
  'task',
  'mission',
  'flow',
  'presentation',
  'sequence',
  'email',
  'blog_post',
  'social_post',
  'ad',
  'ad_set',
  'ad_campaign',
  'avatar',
  'website',
  'theme',
  'custom_object',
  'visual_doc',
  'pdf',
])

export const EXTRA_DELIVERABLE_TYPES = new Set<DeliverableType>([
  'doc',
  'text',
  'file',
  'image',
  'video',
  'audio',
])

export type DeliverableCategory = 'documents' | 'media' | 'artifacts'

const DOCUMENT_TYPES: ReadonlySet<DeliverableType> = new Set(['doc', 'text', 'pdf', 'file'])
const MEDIA_TYPES: ReadonlySet<DeliverableType> = new Set(['image', 'video', 'audio'])

export function getDeliverableCategory(type: DeliverableType): DeliverableCategory {
  if (DOCUMENT_TYPES.has(type)) return 'documents'
  if (MEDIA_TYPES.has(type)) return 'media'
  return 'artifacts'
}

export interface MissionDeliverable {
  id: string
  mission_id: string
  campaign_id?: string | null
  user_id: string
  agent_key: string
  type: DeliverableType
  title: string
  content: string | null
  file_url: string | null
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  metadata: Record<string, unknown>
  entity_id?: string | null
  entity_table?: string | null
  source?: 'mission' | 'chat' | null
  created_at: string
}

export function groupDeliverablesByCategory(
  deliverables: MissionDeliverable[],
): Record<DeliverableCategory, MissionDeliverable[]> {
  const out: Record<DeliverableCategory, MissionDeliverable[]> = {
    documents: [],
    media: [],
    artifacts: [],
  }
  for (const d of deliverables) out[getDeliverableCategory(d.type)].push(d)
  return out
}
