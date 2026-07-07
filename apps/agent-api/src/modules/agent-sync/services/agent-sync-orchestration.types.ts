import type { Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { OpenClawGatewayService } from '../../shared/services/openclaw-gateway.service'
import type { AgentSyncMaterializationRepository } from '../repositories/agent-sync-materialization.repository'
import type { AgentRuntimeSkillScopeService } from './agent-runtime-skill-scope.service'
import type { SkillGeneratorDomain } from './vibey-api-skill-generator'
import type {
  AgentDefinitionRow,
  AgentRegistryRow,
  AgentSkillResourceRow,
  AgentSkillRow,
  AgentWorkflowRow,
  SyncManifestEntry,
  SyncResult,
} from './agent-sync.types'

export type AgentSyncOrchestrationContext = {
  agentsBaseDir: string
  gateway: OpenClawGatewayService
  logger: Logger
  materializationRepository: AgentSyncMaterializationRepository
  skillScope: AgentRuntimeSkillScopeService
  supabase: SupabaseClient
  getUserId(): string
  setLastSyncResult(result: SyncResult): void
  isSharedRuntime(): boolean
  loadSystemAgentKeys(): Promise<Set<string>>
  loadSkillDenySet(userId: string | null, orgId: string | null): Promise<Set<string>>
  filterSystemAgentRows<
    T extends { agent_key: string; user_id?: string | null; org_id?: string | null },
  >(
    rows: T[],
    systemKeys: Set<string>,
  ): T[]
  deduplicateSkills(
    rows: (AgentSkillRow & { org_id?: string | null })[],
    orgId: string,
  ): AgentSkillRow[]
  deduplicatePersonalSkills(
    rows: (AgentSkillRow & { user_id?: string | null })[],
    userId: string,
  ): AgentSkillRow[]
  deduplicateResources(
    rows: (AgentSkillResourceRow & { org_id?: string | null })[],
    orgId: string,
  ): AgentSkillResourceRow[]
  deduplicatePersonalResources(
    rows: (AgentSkillResourceRow & { user_id?: string | null })[],
    userId: string,
  ): AgentSkillResourceRow[]
  deduplicateWorkflows(
    rows: (AgentWorkflowRow & { org_id?: string | null })[],
    orgId: string,
  ): AgentWorkflowRow[]
  fetchLibraryResources(skillKeys: string[]): Promise<AgentSkillResourceRow[]>
  mergeWithLibraryFallback(
    agentResources: AgentSkillResourceRow[],
    libraryResources: AgentSkillResourceRow[],
  ): AgentSkillResourceRow[]
  syncAgentSkills(
    agentKey: string,
    rows: AgentSkillRow[],
    resources: AgentSkillResourceRow[],
    useKeyAsDir: boolean,
    manifest?: SyncManifestEntry[],
  ): Promise<number>
  syncAgentWorkflows(
    agentKey: string,
    rows: AgentWorkflowRow[],
    useKeyAsDir: boolean,
    manifest?: SyncManifestEntry[],
  ): Promise<number>
  resolveAllowedActions(
    row: AgentRegistryRow,
    scope: { orgId: string | null; userId: string | null },
  ): Promise<{ actions: Set<string>; domain: SkillGeneratorDomain }>
  resolveEnabledSkillKeys(rows: AgentSkillRow[]): string[]
  writeScopedVibeyApiSkill(
    agentKeyOrDir: string,
    allowedActions: Set<string>,
    useKeyAsDir: boolean,
    domain: SkillGeneratorDomain,
    manifest?: SyncManifestEntry[],
  ): Promise<void>
  syncAllOrgAgents(userId: string): Promise<{ synced: number; failed: SyncResult['failed'] }>
  syncOrgSharedSkills(
    userId: string,
    agentKeys: Set<string>,
    manifest?: SyncManifestEntry[],
  ): Promise<void>
  syncSharedSkillsForAgent(params: {
    userId: string | null
    orgId: string | null
    agentDir: string
    agentKey: string
    manifest?: SyncManifestEntry[]
  }): Promise<number>
  cleanupStaleDefinitionFiles(
    agentDir: string,
    definitions: Array<{ file_name: string }>,
  ): Promise<void>
  syncBrainLibrary(
    agentKey: string,
    userId: string,
    manifest: SyncManifestEntry[],
    agentDirOverride?: string,
  ): Promise<number>
  verifyAndRetry(manifest: SyncManifestEntry[], syncedCount: number): Promise<SyncResult>
}

export function createEmptySyncResult(): SyncResult {
  return {
    synced: 0,
    expected: 0,
    failed: [],
    retried: 0,
    retriedOk: 0,
    healthy: true,
  }
}
