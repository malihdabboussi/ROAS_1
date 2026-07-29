import { prependActionContractProtocol } from '@vibey/agent-policy'
import {
  ARCHETYPE_IDENTITY_FILE_RE,
  RUNTIME_IDENTITY_FILE_NAMES,
} from './agent-sync-runtime-identity.service'

export type AgentDefinitionRow = {
  agent_key: string
  file_name: string
  content: string
  archetype_filter: string[] | null
  user_id?: string | null
  org_id?: string | null
}

export type AgentSkillRow = {
  id: string
  agent_key: string
  skill_key: string
  name: string
  description: string
  markdown_content: string
  is_enabled: boolean
  archetype_filter: string[] | null
  user_id?: string | null
  org_id?: string | null
}

export type AgentSkillResourceRow = {
  agent_key: string
  skill_key: string
  file_path: string
  content: string | null
  content_type?: string
  storage_url?: string | null
  user_id?: string | null
  org_id?: string | null
}

export type AgentWorkflowRow = {
  id: string
  agent_key: string
  workflow_key: string
  name: string
  description: string
  markdown_content: string
  steps: unknown[]
  is_enabled: boolean
  archetype_filter: string[] | null
}

export type AgentRegistryRow = {
  agent_key: string
  org_id?: string | null
  user_id?: string | null
  role?: string | null
  level?: string | null
  config?: Record<string, unknown> | null
}

export type SyncManifestEntry = {
  category:
    | 'definition'
    | 'skill'
    | 'skill-resource'
    | 'workflow'
    | 'vibey-api'
    | 'org-skill'
    | 'brain-page'
  agentKey: string
  filePath: string
  content?: string
  status: 'ok' | 'failed'
  error?: string
}

export type SyncResult = {
  synced: number
  expected: number
  failed: Array<{ agentKey: string; filePath: string; category: string; error?: string }>
  retried: number
  retriedOk: number
  healthy: boolean
}

export const REMOVED_SKILL_RESOURCE_CONTENT_TYPE = 'application/vnd.vibey.resource-removed'
export const SKILL_KEY_VIBEY_API = 'vibey-api'

/**
 * System agents read from the canonical (NULL,NULL) row only. The DB flag is
 * the source of truth; this fallback preserves runtime behavior if lookup fails.
 */
export const SYSTEM_AGENT_KEYS_FALLBACK = new Set<string>([
  'atlas',
  'vibey',
  'hr',
  'viktor',
  'brain_scholar',
  'widget_builder',
  'delegator',
])

/** USER.md is generated from `profiles` during sync, not from agent_definitions rows. */
export function isUserProfileDefinitionFile(fileName: string): boolean {
  return fileName.trim().toLowerCase() === 'user.md'
}

export function composeDefinitionContent(fileName: string, content: string): string {
  if (fileName.trim().toLowerCase() !== 'tools.md') return content
  return prependActionContractProtocol(content)
}

function normalizeRuntimeIdentityFileName(
  fileName: string,
): 'SOUL.md' | 'ROLE.md' | 'IDENTITY.md' | null {
  if (RUNTIME_IDENTITY_FILE_NAMES.has(fileName)) {
    return fileName as 'SOUL.md' | 'ROLE.md' | 'IDENTITY.md'
  }
  const match = fileName.match(ARCHETYPE_IDENTITY_FILE_RE)
  if (!match?.[1]) return null
  return `${match[1].toUpperCase()}.md` as 'SOUL.md' | 'ROLE.md' | 'IDENTITY.md'
}

export function expandRuntimeIdentityDefinitions<T extends { file_name: string; content: string }>(
  definitions: T[],
): T[] {
  const expanded = [...definitions]
  const fileNames = new Set(definitions.map((def) => def.file_name))
  for (const def of definitions) {
    const runtimeFileName = normalizeRuntimeIdentityFileName(def.file_name)
    if (!runtimeFileName || fileNames.has(runtimeFileName)) continue
    expanded.push({ ...def, file_name: runtimeFileName })
    fileNames.add(runtimeFileName)
  }
  return expanded
}
