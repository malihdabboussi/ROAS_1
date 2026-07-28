import { existsSync } from 'fs'
import * as fs from 'fs/promises'
import * as path from 'path'
import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { AgentPolicyService } from '../../agent-policy/services/agent-policy.service'
import { OpenClawGatewayService } from '../../shared/services/openclaw-gateway.service'
import { AgentSyncMaterializationRepository } from '../repositories/agent-sync-materialization.repository'
import { AgentSyncRepository } from '../repositories/agent-sync.repository'
import { AgentRuntimeSkillScopeService } from './agent-runtime-skill-scope.service'
import { AgentSyncAgentService } from './agent-sync-agent.service'
import { AgentSyncAllService } from './agent-sync-all.service'
import { AgentSyncBrainLibraryService } from './agent-sync-brain-library.service'
import { AgentSyncFileMaterializationService } from './agent-sync-file-materialization.service'
import { AgentSyncOrchestrationContext } from './agent-sync-orchestration.types'
import { AgentSyncOrgAgentService } from './agent-sync-org-agent.service'
import { AgentSyncOrgSharedSkillsService } from './agent-sync-org-shared-skills.service'
import { AgentSyncPolicySkillService } from './agent-sync-policy-skill.service'
import {
  AgentSyncRequiredSkillsService,
  type SyncRequiredSkillsInput,
} from './agent-sync-required-skills.service'
import {
  AgentSyncRuntimeIdentityService,
  ARCHETYPE_IDENTITY_FILE_RE,
  RUNTIME_IDENTITY_FILE_NAMES,
  type BindRuntimeIdentityInput,
  type ResetRuntimeIdentityInput,
  type RuntimeIdentityStateUpdate,
} from './agent-sync-runtime-identity.service'
import { AgentSyncScopeService } from './agent-sync-scope.service'
import { AgentSyncVerificationService } from './agent-sync-verification.service'
import {
  isUserProfileDefinitionFile,
  type AgentRegistryRow,
  type AgentSkillResourceRow,
  type AgentSkillRow,
  type AgentWorkflowRow,
  type SyncManifestEntry,
  type SyncResult,
} from './agent-sync.types'
import type { SkillGeneratorDomain } from './vibey-api-skill-generator'

export type { SyncManifestEntry, SyncResult } from './agent-sync.types'

@Injectable()
export class AgentSyncService implements OnModuleInit {
  private readonly logger = new Logger(AgentSyncService.name)
  private readonly supabase: SupabaseClient
  private readonly agentPolicyService: AgentPolicyService
  private userId: string
  private readonly agentsBaseDir: string
  private readonly runtimeIdentity: AgentSyncRuntimeIdentityService
  private agentSyncBrainLibraryService?: AgentSyncBrainLibraryService
  private agentSyncFileMaterializationService?: AgentSyncFileMaterializationService
  private agentSyncOrgSharedSkillsService?: AgentSyncOrgSharedSkillsService

  constructor(
    private readonly config: ConfigService,
    private readonly svc: SupabaseServiceClient,
    private readonly gateway: OpenClawGatewayService,
    private readonly skillScope: AgentRuntimeSkillScopeService,
    private readonly repository: AgentSyncRepository = new AgentSyncRepository(),
    private readonly materializationRepository: AgentSyncMaterializationRepository = new AgentSyncMaterializationRepository(),
    agentSyncBrainLibraryService?: AgentSyncBrainLibraryService,
    agentSyncFileMaterializationService?: AgentSyncFileMaterializationService,
    agentSyncOrgSharedSkillsService?: AgentSyncOrgSharedSkillsService,
    private readonly agentSyncScopeService: AgentSyncScopeService = new AgentSyncScopeService(),
    private readonly agentSyncPolicySkillService: AgentSyncPolicySkillService = new AgentSyncPolicySkillService(),
    private readonly agentSyncVerificationService: AgentSyncVerificationService = new AgentSyncVerificationService(),
    private readonly agentSyncAllService: AgentSyncAllService = new AgentSyncAllService(),
    private readonly agentSyncAgentService: AgentSyncAgentService = new AgentSyncAgentService(),
    private readonly agentSyncOrgAgentService: AgentSyncOrgAgentService = new AgentSyncOrgAgentService(),
    private readonly agentSyncRequiredSkillsService: AgentSyncRequiredSkillsService = new AgentSyncRequiredSkillsService(),
  ) {
    this.supabase = svc.client
    this.agentPolicyService = new AgentPolicyService(svc)
    this.userId = this.config.get<string>('USER_ID', '')
    this.agentsBaseDir = this.resolveAgentsBaseDir()
    this.runtimeIdentity = new AgentSyncRuntimeIdentityService({
      agentsBaseDir: this.agentsBaseDir,
      config: this.config,
      logger: this.logger,
      repository: this.repository,
      supabase: this.supabase,
    })
    this.agentSyncBrainLibraryService = agentSyncBrainLibraryService
    this.agentSyncFileMaterializationService = agentSyncFileMaterializationService
    this.agentSyncOrgSharedSkillsService = agentSyncOrgSharedSkillsService
  }

  private syncStatus: 'pending' | 'ok' | 'failed' = 'pending'
  private userIdResolved = false
  private lastSyncResult: SyncResult | null = null
  private syncReadyResolve!: () => void
  private readonly syncReadyPromise = new Promise<void>((resolve) => {
    this.syncReadyResolve = resolve
  })

  private getAgentSyncBrainLibraryService(): AgentSyncBrainLibraryService {
    if (!this.agentSyncBrainLibraryService) {
      this.agentSyncBrainLibraryService = new AgentSyncBrainLibraryService(
        this.svc,
        this.materializationRepository,
      )
    }
    return this.agentSyncBrainLibraryService
  }

  private getAgentSyncFileMaterializationService(): AgentSyncFileMaterializationService {
    if (!this.agentSyncFileMaterializationService) {
      this.agentSyncFileMaterializationService = new AgentSyncFileMaterializationService()
    }
    return this.agentSyncFileMaterializationService
  }

  private getAgentSyncOrgSharedSkillsService(): AgentSyncOrgSharedSkillsService {
    if (!this.agentSyncOrgSharedSkillsService) {
      this.agentSyncOrgSharedSkillsService = new AgentSyncOrgSharedSkillsService(
        this.materializationRepository,
      )
    }
    return this.agentSyncOrgSharedSkillsService
  }

  private resolveAgentsBaseDir(): string {
    const configured = this.config.get<string>('AGENTS_BASE_DIR', '').trim()
    if (configured) return configured

    const dockerPath = '/app/agents'
    if (existsSync(dockerPath)) return dockerPath

    const localPath = path.join(process.cwd(), '.local', 'agents')
    if (existsSync(localPath)) return localPath

    return localPath
  }

  getAgentsBaseDir(): string {
    return this.agentsBaseDir
  }

  getSyncStatus(): 'pending' | 'ok' | 'failed' {
    return this.syncStatus
  }

  async waitForSyncReady(timeoutMs = 30_000): Promise<void> {
    if (this.syncStatus !== 'pending') return
    const timeout = new Promise<void>((resolve) => {
      setTimeout(() => {
        this.logger.warn(
          `waitForSyncReady timed out after ${timeoutMs}ms — proceeding before identity readiness completed`,
        )
        resolve()
      }, timeoutMs)
    })
    await Promise.race([this.syncReadyPromise, timeout])
  }

  isUserIdResolved(): boolean {
    return this.userIdResolved
  }

  getLastSyncResult(): SyncResult | null {
    return this.lastSyncResult
  }

  isSharedRuntime(): boolean {
    return this.config.get<string>('AGENT_RUNTIME_MODE', '').trim() === 'shared'
  }

  private readonly applyRuntimeIdentityState = (update: RuntimeIdentityStateUpdate): void => {
    if (update.userId !== undefined) this.userId = update.userId
    if (update.userIdResolved !== undefined) this.userIdResolved = update.userIdResolved
    if (update.syncStatus !== undefined) this.syncStatus = update.syncStatus
    if ('lastSyncResult' in update) this.lastSyncResult = update.lastSyncResult ?? null
    if (update.envUserId === null) {
      delete process.env.USER_ID
    } else if (update.envUserId !== undefined) {
      process.env.USER_ID = update.envUserId
    }
  }

  async bindRuntimeIdentity(input: BindRuntimeIdentityInput) {
    return this.runtimeIdentity.bindRuntimeIdentity(input, this.applyRuntimeIdentityState)
  }

  async resetRuntimeIdentity(input: ResetRuntimeIdentityInput) {
    return this.runtimeIdentity.resetRuntimeIdentity(input, this.applyRuntimeIdentityState)
  }

  private async resolveUserIdFromMachineId(): Promise<string | null> {
    return this.runtimeIdentity.resolveUserIdFromMachineId()
  }

  private async autoUpdateProfileMachineId(userId: string): Promise<void> {
    return this.runtimeIdentity.autoUpdateProfileMachineId(userId)
  }

  onModuleInit() {
    this.bootstrapAsync()
      .catch((err) => {
        this.syncStatus = 'failed'
        this.logger.error(`[identity] Background bootstrap failed: ${err}`)
      })
      .finally(() => {
        this.syncReadyResolve()
      })
  }

  private async bootstrapAsync(): Promise<void> {
    await this.runtimeIdentity.bootstrapIdentity(this.userId, this.applyRuntimeIdentityState)
  }

  async syncAll(overrideUserId?: string): Promise<SyncResult> {
    return this.agentSyncAllService.syncAll(this.createOrchestrationContext(), overrideUserId)
  }

  async syncAgent(
    agentKey: string,
    overrideUserId?: string,
    useExistingGatewayBatch = false,
  ): Promise<SyncResult> {
    return this.agentSyncAgentService.syncAgent(
      this.createOrchestrationContext(),
      agentKey,
      overrideUserId,
      useExistingGatewayBatch,
    )
  }

  async syncOrgAgent(
    orgId: string,
    agentKey: string,
    useExistingGatewayBatch = false,
  ): Promise<SyncResult> {
    return this.agentSyncOrgAgentService.syncOrgAgent(
      this.createOrchestrationContext(),
      orgId,
      agentKey,
      useExistingGatewayBatch,
    )
  }

  async syncRequiredSkillsForAgent(input: SyncRequiredSkillsInput): Promise<number> {
    return this.agentSyncRequiredSkillsService.syncRequiredSkills(
      this.createOrchestrationContext(),
      input,
    )
  }

  private createOrchestrationContext(): AgentSyncOrchestrationContext {
    return {
      agentsBaseDir: this.agentsBaseDir,
      gateway: this.gateway,
      logger: this.logger,
      materializationRepository: this.materializationRepository,
      skillScope: this.skillScope,
      supabase: this.supabase,
      getUserId: () => this.userId,
      setLastSyncResult: (result) => {
        this.lastSyncResult = result
      },
      isSharedRuntime: () => this.isSharedRuntime(),
      loadSystemAgentKeys: () => this.loadSystemAgentKeys(),
      loadSkillDenySet: (userId, orgId) => this.loadSkillDenySet(userId, orgId),
      filterSystemAgentRows: <
        T extends { agent_key: string; user_id?: string | null; org_id?: string | null },
      >(
        rows: T[],
        systemKeys: Set<string>,
      ) => this.filterSystemAgentRows(rows, systemKeys),
      deduplicateSkills: (rows, orgId) => this.deduplicateSkills(rows, orgId),
      deduplicatePersonalSkills: (rows, userId) => this.deduplicatePersonalSkills(rows, userId),
      deduplicateResources: (rows, orgId) => this.deduplicateResources(rows, orgId),
      deduplicatePersonalResources: (rows, userId) =>
        this.deduplicatePersonalResources(rows, userId),
      deduplicateWorkflows: (rows, orgId) => this.deduplicateWorkflows(rows, orgId),
      fetchLibraryResources: (skillKeys) => this.fetchLibraryResources(skillKeys),
      mergeWithLibraryFallback: (agentResources, libraryResources) =>
        this.mergeWithLibraryFallback(agentResources, libraryResources),
      syncAgentSkills: (agentKey, rows, resources, useKeyAsDir, manifest, options) =>
        this.syncAgentSkills(agentKey, rows, resources, useKeyAsDir, manifest, options),
      syncAgentWorkflows: (agentKey, rows, useKeyAsDir, manifest) =>
        this.syncAgentWorkflows(agentKey, rows, useKeyAsDir, manifest),
      resolveAllowedActions: (row, scope) => this.resolveAllowedActions(row, scope),
      resolveEnabledSkillKeys: (rows) => this.resolveEnabledSkillKeys(rows),
      writeScopedVibeyApiSkill: (agentKeyOrDir, allowedActions, useKeyAsDir, domain, manifest) =>
        this.writeScopedVibeyApiSkill(agentKeyOrDir, allowedActions, useKeyAsDir, domain, manifest),
      syncAllOrgAgents: (userId) => this.syncAllOrgAgents(userId),
      syncOrgSharedSkills: (userId, agentKeys, manifest) =>
        this.syncOrgSharedSkills(userId, agentKeys, manifest),
      syncSharedSkillsForAgent: (params) => this.syncSharedSkillsForAgent(params),
      cleanupStaleDefinitionFiles: (agentDir, definitions) =>
        this.cleanupStaleDefinitionFiles(agentDir, definitions),
      syncBrainLibrary: (agentKey, userId, manifest, agentDirOverride) =>
        this.syncBrainLibrary(agentKey, userId, manifest, agentDirOverride),
      verifyAndRetry: (manifest, syncedCount) => this.verifyAndRetry(manifest, syncedCount),
    }
  }

  private async syncAllOrgAgents(
    userId: string,
  ): Promise<{ synced: number; failed: SyncResult['failed'] }> {
    return this.getAgentSyncOrgSharedSkillsService().syncAllOrgAgents({
      supabase: this.supabase,
      syncOrgAgent: (orgId, agentKey, useExistingGatewayBatch) =>
        this.syncOrgAgent(orgId, agentKey, useExistingGatewayBatch),
      userId,
    })
  }

  private async syncOrgSharedSkills(
    userId: string,
    agentKeys: Set<string>,
    manifest?: SyncManifestEntry[],
  ): Promise<void> {
    await this.getAgentSyncOrgSharedSkillsService().syncOrgSharedSkills({
      agentKeys,
      agentsBaseDir: this.agentsBaseDir,
      logger: this.logger,
      manifest,
      supabase: this.supabase,
      userId,
    })
  }

  private async syncSharedSkillsForAgent(params: {
    userId: string | null
    orgId: string | null
    agentDir: string
    agentKey: string
    manifest?: SyncManifestEntry[]
  }): Promise<number> {
    return this.getAgentSyncOrgSharedSkillsService().syncSharedSkillsForAgent({
      ...params,
      logger: this.logger,
      supabase: this.supabase,
    })
  }

  private async loadSystemAgentKeys(): Promise<Set<string>> {
    return this.agentSyncScopeService.loadSystemAgentKeys({
      logger: this.logger,
      repository: this.repository,
      supabase: this.supabase,
    })
  }

  private async loadSkillDenySet(
    userId: string | null,
    orgId: string | null,
  ): Promise<Set<string>> {
    return this.agentSyncScopeService.loadSkillDenySet({
      logger: this.logger,
      orgId,
      repository: this.repository,
      supabase: this.supabase,
      userId,
    })
  }

  private filterSystemAgentRows<
    T extends { agent_key: string; user_id?: string | null; org_id?: string | null },
  >(rows: T[], systemKeys: Set<string>): T[] {
    return this.agentSyncScopeService.filterSystemAgentRows(rows, systemKeys)
  }

  private deduplicateSkills(
    rows: (AgentSkillRow & { org_id?: string | null })[],
    orgId: string,
  ): AgentSkillRow[] {
    return this.agentSyncScopeService.deduplicateSkills(rows, orgId)
  }

  private deduplicatePersonalSkills(
    rows: (AgentSkillRow & { user_id?: string | null })[],
    userId: string,
  ): AgentSkillRow[] {
    return this.agentSyncScopeService.deduplicatePersonalSkills(rows, userId)
  }

  private deduplicateResources(
    rows: (AgentSkillResourceRow & { org_id?: string | null })[],
    orgId: string,
  ): AgentSkillResourceRow[] {
    return this.agentSyncScopeService.deduplicateResources(rows, orgId)
  }

  private deduplicatePersonalResources(
    rows: (AgentSkillResourceRow & { user_id?: string | null })[],
    userId: string,
  ): AgentSkillResourceRow[] {
    return this.agentSyncScopeService.deduplicatePersonalResources(rows, userId)
  }

  private deduplicateWorkflows(
    rows: (AgentWorkflowRow & { org_id?: string | null })[],
    orgId: string,
  ): AgentWorkflowRow[] {
    return this.agentSyncScopeService.deduplicateWorkflows(rows, orgId)
  }

  private async fetchLibraryResources(skillKeys: string[]): Promise<AgentSkillResourceRow[]> {
    return this.agentSyncScopeService.fetchLibraryResources({
      logger: this.logger,
      repository: this.repository,
      skillKeys,
      supabase: this.supabase,
    })
  }

  private mergeWithLibraryFallback(
    agentResources: AgentSkillResourceRow[],
    libraryResources: AgentSkillResourceRow[],
  ): AgentSkillResourceRow[] {
    return this.agentSyncScopeService.mergeWithLibraryFallback(agentResources, libraryResources)
  }

  private async resolveAllowedActions(
    row: AgentRegistryRow,
    scope: { orgId: string | null; userId: string | null },
  ): Promise<{
    actions: Set<string>
    domain: SkillGeneratorDomain
  }> {
    return this.agentSyncPolicySkillService.resolveAllowedActions({
      agentPolicyService: this.agentPolicyService,
      row,
      scope,
    })
  }

  private resolveEnabledSkillKeys(rows: AgentSkillRow[]): string[] {
    return this.agentSyncPolicySkillService.resolveEnabledSkillKeys(rows)
  }

  private async writeScopedVibeyApiSkill(
    agentKeyOrDir: string,
    allowedActions: Set<string>,
    useKeyAsDir = false,
    domain: SkillGeneratorDomain = 'management',
    manifest?: SyncManifestEntry[],
  ): Promise<void> {
    return this.agentSyncPolicySkillService.writeScopedVibeyApiSkill({
      agentKeyOrDir,
      agentsBaseDir: this.agentsBaseDir,
      allowedActions,
      domain,
      logger: this.logger,
      manifest,
      useKeyAsDir,
    })
  }

  private async cleanupStaleDefinitionFiles(
    agentDir: string,
    definitions: Array<{ file_name: string }>,
  ): Promise<void> {
    const expected = new Set(
      definitions
        .filter((def) => !isUserProfileDefinitionFile(def.file_name))
        .map((def) => def.file_name),
    )
    const managedFiles = new Set(['AGENTS.md', 'TOOLS.md', ...RUNTIME_IDENTITY_FILE_NAMES])

    let entries: string[]
    try {
      entries = await fs.readdir(agentDir)
    } catch {
      return
    }

    for (const entry of entries) {
      if (expected.has(entry)) continue
      if (!managedFiles.has(entry) && !ARCHETYPE_IDENTITY_FILE_RE.test(entry)) continue
      try {
        await fs.unlink(path.join(agentDir, entry))
      } catch (err) {
        this.logger.warn(
          `Failed to remove stale definition file ${entry}: ${(err as Error).message}`,
        )
      }
    }
  }

  private async syncAgentSkills(
    agentKey: string,
    rows: AgentSkillRow[],
    resources: AgentSkillResourceRow[],
    useKeyAsDir = false,
    manifest?: SyncManifestEntry[],
    options?: { replaceExisting?: boolean; writeIndex?: boolean },
  ): Promise<number> {
    return this.getAgentSyncFileMaterializationService().syncAgentSkills({
      agentsBaseDir: this.agentsBaseDir,
      agentKey,
      rows,
      resources,
      useKeyAsDir,
      manifest,
      ...options,
    })
  }

  private async syncAgentWorkflows(
    agentKey: string,
    rows: AgentWorkflowRow[],
    useKeyAsDir = false,
    manifest?: SyncManifestEntry[],
  ): Promise<number> {
    return this.getAgentSyncFileMaterializationService().syncAgentWorkflows({
      agentsBaseDir: this.agentsBaseDir,
      agentKey,
      rows,
      useKeyAsDir,
      manifest,
    })
  }

  private async verifySyncManifest(manifest: SyncManifestEntry[]): Promise<void> {
    return this.agentSyncVerificationService.verifySyncManifest(manifest)
  }

  private async retryFailedEntries(
    manifest: SyncManifestEntry[],
  ): Promise<{ retried: number; retriedOk: number }> {
    return this.agentSyncVerificationService.retryFailedEntries(manifest)
  }

  private buildSyncResult(
    manifest: SyncManifestEntry[],
    retried: number,
    retriedOk: number,
  ): SyncResult {
    return this.agentSyncVerificationService.buildSyncResult(manifest, retried, retriedOk)
  }

  private async syncBrainLibrary(
    agentKey: string,
    userId: string,
    manifest: SyncManifestEntry[],
    agentDirOverride?: string,
  ): Promise<number> {
    return this.getAgentSyncBrainLibraryService().syncBrainLibrary({
      agentBaseDir: this.agentsBaseDir,
      agentDirOverride,
      agentKey,
      logger: this.logger,
      manifest,
      userId,
    })
  }

  private async verifyAndRetry(
    manifest: SyncManifestEntry[],
    _syncedCount: number,
  ): Promise<SyncResult> {
    return this.agentSyncVerificationService.verifyAndRetry({
      logger: this.logger,
      manifest,
    })
  }
}
