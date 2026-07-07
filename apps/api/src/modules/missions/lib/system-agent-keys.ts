/**
 * Single source of truth for "this agent is a system agent".
 *
 * System agents (atlas, vibey, hr, viktor) are engineering-owned: their
 * canonical platform definitions and skills ship from
 * `docker/agents/templates/...` to the canonical (NULL,NULL) DB row via
 * `scripts/seed-system-agents.ts`. Users may toggle individual skills on/off
 * via `agent_overrides` (capability_kind = 'skill'). Custom skill writes are
 * blocked only for SKILL_WRITE_LOCKED_KEYS; Jaime/HR is intentionally writable
 * because HR owns agent management and skill creation.
 *
 * Enforcement layers:
 *  - DB: `agents_registry.is_system` flag + RLS deny policies.
 *  - Repository: `rejectSystemAgentWrite` throws ForbiddenException.
 *  - Services: `isSystemAgentFieldLocked` checks per-field.
 *  - UI: hides edit-content controls when `is_system=true`.
 */

/** Template `role_key` -> fixed registry `agent_key` for default system hires.
 * `widget_builder` is the DB slug for the Viktor template, not Viktor's name.
 * `brain_scholar` is the DB slug for the Atlas template.
 */
export const SYSTEM_AGENT_FIXED_KEYS: Record<string, string> = {
  widget_builder: 'viktor',
  brain_scholar: 'atlas',
}

export const SYSTEM_AGENT_KEYS = new Set(['vibey', 'viktor', 'atlas', 'brain_scholar', 'hr'])

/** Template keys that resolve to a system agent. Used by repository write-path
 * locks (e.g. `upsertTemplateSkill`) to refuse seeding per-user clones for
 * agents whose content is engineering-owned. */
export const SYSTEM_TEMPLATE_KEYS = new Set([
  'atlas',
  'vibey',
  'hr',
  'viktor',
  'brain_scholar',
  'widget_builder',
])

/** Agents whose SKILLS specifically cannot be written (created / updated / deleted)
 * by users. Vibey and HR are intentionally NOT in this set so users can teach
 * Vibey new skills and Jaime/HR can create skills for herself and other agents.
 * Their identity / lifecycle / brain access remain locked via SYSTEM_AGENT_KEYS. */
export const SKILL_WRITE_LOCKED_KEYS = new Set([
  'viktor',
  'widget_builder',
  'atlas',
  'brain_scholar',
])

export type SystemAgentField =
  | 'identity'
  | 'platform_skill'
  | 'brain_grant'
  | 'campaign_grant'
  | 'team_assignment'
  | 'lifecycle'
  | 'portrait'
  | 'custom_skill'
  | 'comms'
  | 'channel_grant'
  | 'system_skill_content'

export function isSystemAgentKey(key: string): boolean {
  return SYSTEM_AGENT_KEYS.has(key)
}

/** Hidden from Manage Agents and other user-facing agent rosters. Registry rows stay for history. */
export const HIDDEN_USER_AGENT_LIST_KEYS = new Set(['viktor', 'widget_builder'])

/** Loop (Flows) is limited to these orgs until broader rollout. */
export const LOOP_AGENT_ROLLOUT_ORG_IDS = new Set(['699e3530-881c-4653-b507-4c4b5993538f'])

export function isHiddenFromUserAgentList(agentKey: string): boolean {
  if (HIDDEN_USER_AGENT_LIST_KEYS.has(agentKey)) return true
  return agentKey.startsWith('viktor_') || agentKey.startsWith('widget_builder_')
}

export function isLoopAgentRolloutOrg(orgId?: string | null): boolean {
  return Boolean(orgId && LOOP_AGENT_ROLLOUT_ORG_IDS.has(orgId))
}

export function isVisibleInOrgAgentList(agentKey: string, orgId?: string | null): boolean {
  if (isHiddenFromUserAgentList(agentKey)) return false
  if (agentKey === 'loop' && !isLoopAgentRolloutOrg(orgId)) return false
  return true
}

export function isSystemTemplateKey(key: string): boolean {
  return SYSTEM_TEMPLATE_KEYS.has(key)
}

export function isSkillWriteLocked(key: string): boolean {
  return SKILL_WRITE_LOCKED_KEYS.has(key)
}

export function isSystemAgentFieldLocked(key: string, field: SystemAgentField): boolean {
  if (!isSystemAgentKey(key)) return false
  return (
    field === 'identity' ||
    field === 'platform_skill' ||
    field === 'brain_grant' ||
    field === 'campaign_grant' ||
    field === 'team_assignment' ||
    field === 'lifecycle' ||
    field === 'system_skill_content'
  )
}
