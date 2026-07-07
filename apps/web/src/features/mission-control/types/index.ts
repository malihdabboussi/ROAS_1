import type { AgentKey, MissionStatus } from '@/lib/missions'

export type {
  ReadyEmployeeProfile,
  ReadyEmployeeSkillProfile,
} from '@/lib/agents/ready-employee-types'
export {
  CORE_DELIVERABLE_TYPES,
  EXTRA_DELIVERABLE_TYPES,
  getDeliverableCategory,
  groupDeliverablesByCategory,
} from '@/lib/missions'
export type {
  AgentKey,
  AssigneeType,
  CreateMissionInput,
  DeliverableCategory,
  DeliverableType,
  IntentPacket,
  Mission,
  MissionDeliverable,
  MissionExecutionState,
  MissionPriority,
  MissionStatus,
  MissionSubtask,
  MissionToolStep,
  SubtaskStatus,
} from '@/lib/missions'

export type AgentStatus = 'online' | 'idle' | 'working' | 'offline'

export type KanbanStatus = 'planning' | 'todo' | 'in_progress' | 'review' | 'blocked' | 'done'

export interface MissionLog {
  id: string
  mission_id: string
  user_id: string
  event_type: string
  from_status: MissionStatus | null
  to_status: MissionStatus | null
  agent_key: AgentKey | null
  correlation_id: string | null
  payload: Record<string, unknown>
  created_at: string
}

export interface AgentStats {
  execution_speed?: number
  quality?: number
  reliability?: number
  initiative?: number
  communication?: number
  spec_adherence?: number
  learning_rate?: number
  overall?: number
  missions_scored?: number
  last_scored_at?: string | null
}

export interface MissionAgent {
  id: string
  user_id: string
  agent_key: AgentKey
  name: string
  role: string
  status: AgentStatus
  skills: string[]
  level?: string
  specialty?: string | null
  image_url?: string | null
  is_active?: boolean
  team_id?: string | null
  config?: Record<string, unknown>
  stats?: AgentStats
  sync_status?: 'pending' | 'syncing' | 'ready' | 'failed'
  sort_order?: number
  created_at: string
  updated_at: string
}

export type MissionAgentSidebar = Pick<
  MissionAgent,
  | 'id'
  | 'agent_key'
  | 'name'
  | 'image_url'
  | 'is_active'
  | 'status'
  | 'updated_at'
  | 'level'
  | 'team_id'
  | 'role'
  | 'sort_order'
>

/** Reference file or uploaded asset attached to a skill (`agent_skill_resources`). */
export interface MissionAgentSkillResource {
  id: string
  agent_key: string
  skill_key: string
  file_path: string
  /** Omitted (undefined) in summary list payloads (`fields=summary`); string or null on full fetches. */
  content?: string | null
  content_type: string | null
  storage_url: string | null
}

export interface MissionAgentSkill {
  id: string
  user_id: string | null
  org_id?: string | null
  agent_key: AgentKey
  skill_key: string
  name: string
  description: string
  /** Omitted (undefined) in summary list payloads (`fields=summary`); always a string on full fetches. */
  markdown_content?: string
  is_enabled: boolean
  /** Platform-wide row (not user- or org-owned). */
  is_system?: boolean
  /** Where this skill originated: system, template, default seeder, or user-created. */
  source?: 'system' | 'template' | 'default' | 'user'
  /** Reference files / assets for this skill (from `agent_skill_resources`). */
  resources?: MissionAgentSkillResource[]
  created_at: string
  updated_at: string
}

export interface MissionAgentWorkflow {
  id: string
  user_id: string | null
  agent_key: AgentKey
  workflow_key: string
  name: string
  description: string
  markdown_content: string
  steps: unknown[]
  is_enabled: boolean
  archetype_filter: string[] | null
  created_at: string
  updated_at: string
}

export interface MissionHarnessSource {
  type?: string
  ref?: string
  summary?: string
}

export interface MissionHarnessContextSnapshot {
  summary?: string
  campaignFacts?: string[]
  customerFacts?: string[]
  avatarFacts?: string[]
  productFacts?: string[]
  sourceRefs?: MissionHarnessSource[]
}

export interface MissionHarnessClarificationQuestion {
  id?: string
  question?: string
  whyNeeded?: string
  blocksPlanning?: boolean
  defaultAssumption?: string
}

export interface MissionHarnessAssumption {
  id?: string
  statement?: string
  risk?: string
  validationPath?: string
}

export interface MissionHarnessAssertion {
  assertionKey?: string
  category?: string
  priority?: 'must' | 'should' | 'could' | string
  statement?: string
  evidenceRequirement?: string
  validationMethod?: string
  antiPatterns?: string[]
}

export interface MissionHarnessAssertionCoverage {
  assertionKey?: string
  implementedBy?: string[]
  verifiedBy?: string[]
}

export interface MissionHarnessValidatorPlan {
  validator?: string
  scope?: string
  checks?: string[]
}

export interface MissionHarnessSpec {
  contextSnapshot?: MissionHarnessContextSnapshot | null
  clarificationQuestions?: MissionHarnessClarificationQuestion[]
  assumptions?: MissionHarnessAssumption[]
  assertions?: MissionHarnessAssertion[]
  assertionCoverage?: MissionHarnessAssertionCoverage[]
  validatorPlan?: MissionHarnessValidatorPlan[]
  subtaskAssertionKeys?: Record<string, string[]>
}

export interface MissionPlanContent {
  title: string
  summary: string
  approach: string
  outOfScope?: string[]
  harness?: MissionHarnessSpec
}

export interface MissionPlan {
  id: string
  mission_id: string
  user_id: string
  content: MissionPlanContent
  version: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface MissionAccessRequest {
  id: string
  mission_id: string
  subtask_id: string | null
  user_id: string
  org_id: string | null
  agent_key: AgentKey
  capability_kind: 'action_domain'
  capability_id: string
  reason: string | null
  status: 'pending' | 'approved' | 'denied' | 'revoked' | 'expired'
  requested_by: string
  approved_by: string | null
  requested_at: string
  approved_at: string | null
  expires_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type MissionExecEvent =
  | {
      event: 'tool_start'
      payload: { name: string; label: string; action?: string; tool_call_id?: string }
    }
  | { event: 'tool_update'; payload: { name: string; detail: string; tool_call_id?: string } }
  | {
      event: 'tool_done'
      payload: {
        name: string
        label: string
        action?: string
        status: 'completed' | 'failed'
        tool_call_id?: string
      }
    }
  | { event: 'thinking_delta'; payload: { delta: string; text: string } }
  | { event: 'assistant_delta'; payload: { delta: string } }
  | { event: 'exec_complete'; payload: Record<string, unknown> }
  | { event: 'exec_failed'; payload: { error?: string } }

export interface PrdStory {
  id: string
  title: string
  description?: string
  priority?: string
  storyPoints?: number
  dependsOn?: string[]
  acceptanceCriteria?: string[]
}

export interface PrdContent {
  title?: string
  summary?: string
  overview?: string
  sections?: { heading: string; body: string }[]
  stories?: PrdStory[]
  patterns?: string[]
  outOfScope?: string[]
  harness?: MissionHarnessSpec
  context?: Record<string, unknown>
  techStack?: Record<string, unknown>
}

export interface MissionPrd {
  id: string
  mission_id: string
  content: PrdContent | null
  version: number
  created_at: string
  updated_at: string
}

export const MISSION_DETAIL_ERRORS = {
  UPDATE_FAILED: { userMessage: "Hmm, couldn't save those changes. Give it another shot?" },
  DELETE_FAILED: { userMessage: 'Having trouble removing this mission. Mind trying again?' },
  STATUS_CHANGE_FAILED: { userMessage: "Couldn't update status. Try again." },
  PRIORITY_CHANGE_FAILED: { userMessage: "Couldn't update priority. Try again." },
  SEND_COMMENT_FAILED: { userMessage: "Couldn't send comment. Try again." },
  DOWNLOAD_PDF_FAILED: { userMessage: "Couldn't download PDF. Try again." },
} as const

export const ALL_MISSION_STATUSES: { value: MissionStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'inbox', label: 'Queue' },
  { value: 'planning', label: 'Planning' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'awaiting_access_approval', label: 'Access Needed' },
  { value: 'todo', label: 'Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
  { value: 'blocked', label: 'Blocked' },
]

export interface RecommendedHire {
  role_key: string
  reason?: string
}

export interface AwarenessPoint {
  id: string
  user_id: string
  org_id: string | null
  agent_key: string
  session_id: string | null
  campaign_id: string | null
  point_type: string
  content: string
  read_at: string | null
  created_at: string
}

export type NotificationType =
  | 'mission_blocked'
  | 'mission_completed'
  | 'mission_failed'
  | 'deliverable_ready'
  | 'subtask_blocked'
  | 'plan_approval_required'
  | 'agent_message'
  | 'human_dm_message'
  | 'org_invitation'
  | 'human_subtask_awaiting'
  | 'human_subtask_sla_escalated'
  | 'human_subtask_cancelled'
  | 'brain_cross_suggestion'
  | 'brain_import_succeeded'
  | 'brain_import_failed'
  | 'awareness_paused'

export interface UserNotification {
  id: string
  user_id: string
  org_id: string | null
  type: NotificationType
  title: string
  body: string | null
  mission_id: string | null
  action_url: string | null
  read_at: string | null
  channel_sent: Record<string, unknown>
  metadata: Record<string, unknown> | null
  created_at: string
}
