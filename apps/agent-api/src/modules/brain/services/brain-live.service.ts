import { randomUUID } from 'crypto'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { AgentRuntimeReadinessService } from '../../agent-sync/services/agent-runtime-readiness.service'
import { CreditsService } from '../../billing/services/credits.service'
import { AgentRuntimeService } from '../../shared/services/agent-runtime.service'
import { RequestContextService } from '../../shared/services/request-context.service'
import { BrainLiveDocumentRepository } from '../repositories/brain-live-document.repository'
import { BrainLiveRepository } from '../repositories/brain-live.repository'
import { BrainContextService } from './brain-context.service'
import { BrainLiveActionsService } from './brain-live-actions.service'
import { BrainLiveDelegationStreamService } from './brain-live-delegation-stream.service'
import { BrainLiveDelegationService } from './brain-live-delegation.service'
import { BrainLiveDocumentService } from './brain-live-document.service'
import { BrainLiveInstructionService } from './brain-live-instruction.service'
import { BrainLiveToolDeclarationsService } from './brain-live-tool-declarations.service'
import { BrainLiveTranscriptService } from './brain-live-transcript.service'
import {
  BRAIN_LIVE_ACTIONS,
  DEFAULT_GEMINI_LIVE_MODEL,
  MAX_SESSION_DURATION_MS,
  SESSION_TTL_MS,
} from './brain-live.types'
import type {
  BrainLiveAction,
  DelegationState,
  LiveDelegationSummary,
  LiveSession,
  LiveSessionScope,
} from './brain-live.types'
import { CrystallizationService } from './crystallization.service'
import { EmbeddingService } from './embedding.service'
import { MemoriesService } from './memories.service'
import { VoiceAssignmentService } from './voice-assignment.service'

export type { DelegationState, LiveSession, LiveSessionScope } from './brain-live.types'

@Injectable()
export class BrainLiveService {
  private readonly logger = new Logger(BrainLiveService.name)
  private readonly sessions = new Map<string, LiveSession>()
  private readonly delegations = new Map<string, DelegationState>()
  private readonly supabase: SupabaseClient
  private instructionService?: BrainLiveInstructionService
  private delegationStream?: BrainLiveDelegationStreamService
  private toolDeclarationsService?: BrainLiveToolDeclarationsService
  private brainActionService?: BrainLiveActionsService
  private delegationService?: BrainLiveDelegationService
  private documentService?: BrainLiveDocumentService
  private transcriptService?: BrainLiveTranscriptService

  constructor(
    private readonly config: ConfigService,
    private readonly svc: SupabaseServiceClient,
    private readonly memoriesService: MemoriesService,
    private readonly crystallizationService: CrystallizationService,
    private readonly embeddingService: EmbeddingService,
    private readonly creditsService: CreditsService,
    private readonly voiceAssignment: VoiceAssignmentService,
    private readonly requestContext: RequestContextService,
    private readonly brainContext: BrainContextService,
    private readonly agentRuntime: AgentRuntimeService,
    private readonly runtimeReadiness: AgentRuntimeReadinessService,
    private readonly liveRepository: BrainLiveRepository = new BrainLiveRepository(),
    private readonly documentRepository: BrainLiveDocumentRepository = new BrainLiveDocumentRepository(),
    delegationStream: BrainLiveDelegationStreamService = new BrainLiveDelegationStreamService(),
    toolDeclarationsService: BrainLiveToolDeclarationsService = new BrainLiveToolDeclarationsService(),
    brainActionService: BrainLiveActionsService = new BrainLiveActionsService(),
    delegationService: BrainLiveDelegationService = new BrainLiveDelegationService(),
    documentService: BrainLiveDocumentService = new BrainLiveDocumentService(),
    transcriptService: BrainLiveTranscriptService = new BrainLiveTranscriptService(),
  ) {
    this.supabase = svc.client
    this.delegationStream = delegationStream
    this.toolDeclarationsService = toolDeclarationsService
    this.brainActionService = brainActionService
    this.delegationService = delegationService
    this.documentService = documentService
    this.transcriptService = transcriptService
    this.instructionService = new BrainLiveInstructionService(
      this.config,
      this.supabase,
      this.memoriesService,
      this.agentRuntime,
      this.runtimeReadiness,
      this.liveRepository,
      this.logger,
    )
  }

  private getInstructionService(): BrainLiveInstructionService {
    if (!this.instructionService) {
      this.instructionService = new BrainLiveInstructionService(
        this.config,
        this.supabase,
        this.memoriesService,
        this.agentRuntime,
        this.runtimeReadiness,
        this.liveRepository,
        this.logger,
      )
    }
    return this.instructionService
  }

  private getDelegationStreamService(): BrainLiveDelegationStreamService {
    if (!this.delegationStream) this.delegationStream = new BrainLiveDelegationStreamService()
    return this.delegationStream
  }

  private getToolDeclarationsService(): BrainLiveToolDeclarationsService {
    if (!this.toolDeclarationsService) {
      this.toolDeclarationsService = new BrainLiveToolDeclarationsService()
    }
    return this.toolDeclarationsService
  }

  private getBrainActionService(): BrainLiveActionsService {
    if (!this.brainActionService) this.brainActionService = new BrainLiveActionsService()
    return this.brainActionService
  }

  private getDelegationService(): BrainLiveDelegationService {
    if (!this.delegationService) this.delegationService = new BrainLiveDelegationService()
    return this.delegationService
  }

  private getDocumentService(): BrainLiveDocumentService {
    if (!this.documentService) this.documentService = new BrainLiveDocumentService()
    return this.documentService
  }

  private getTranscriptService(): BrainLiveTranscriptService {
    if (!this.transcriptService) this.transcriptService = new BrainLiveTranscriptService()
    return this.transcriptService
  }

  async setupRequestContext(session: LiveSession): Promise<void> {
    if (!session.conversationId || !session.accessToken) return
    const campaignId = await this.resolveCampaignId(session)
    this.requestContext.set(
      session.conversationId,
      session.userId,
      campaignId,
      session.accessToken,
      null,
      null,
      session.orgId,
      'studio',
      null,
      null,
      'unknown',
    )
  }

  clearRequestContext(session: LiveSession): void {
    if (session.conversationId) {
      this.requestContext.clear(session.conversationId)
    }
  }

  async resolveCampaignId(session: LiveSession): Promise<string | null> {
    if (session.campaignId !== undefined) return session.campaignId ?? null
    if (!session.conversationId) {
      session.campaignId = null
      return null
    }
    session.campaignId = await this.liveRepository.findConversationCampaignId(
      this.supabase,
      session.conversationId,
    )
    return session.campaignId
  }

  getGeminiApiKey(): string {
    return this.config.get<string>('GEMINI_API_KEY') ?? ''
  }

  getGeminiLiveModel(): string {
    const model = this.config.get<string>('GEMINI_LIVE_MODEL')?.trim()
    if (!model) return DEFAULT_GEMINI_LIVE_MODEL
    return model.startsWith('models/') ? model : `models/${model}`
  }

  isKnownBrainAction(name: string): boolean {
    return BRAIN_LIVE_ACTIONS.includes(name as BrainLiveAction)
  }

  createSession(
    userId: string,
    orgId: string | null,
    scope?: LiveSessionScope,
    conversationId?: string,
    voiceName?: string,
    accessToken?: string,
  ): LiveSession {
    this.pruneExpiredSessions()
    const session: LiveSession = {
      id: randomUUID(),
      userId,
      orgId,
      scope: scope ?? { type: 'user' },
      createdAt: Date.now(),
      conversationId,
      voiceName,
      accessToken,
    }
    this.sessions.set(session.id, session)
    return session
  }

  validateSession(sessionId: string, userId: string): LiveSession | null {
    const session = this.sessions.get(sessionId)
    if (!session) return null
    if (session.userId !== userId) return null
    if (Date.now() - session.createdAt > SESSION_TTL_MS && !session.connectedAt) return null
    return session
  }

  markConnected(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) session.connectedAt = Date.now()
  }

  removeSession(sessionId: string): LiveSession | undefined {
    const session = this.sessions.get(sessionId)
    this.sessions.delete(sessionId)
    return session
  }

  async resolveScopeBrainId(scope: LiveSessionScope, userId: string): Promise<string> {
    if (scope.brainId) return scope.brainId

    if (scope.type === 'agent' && scope.agentId) {
      const brainId = await this.liveRepository.findAgentBrainId(this.supabase, {
        userId,
        agentId: scope.agentId,
      })
      if (brainId) return brainId
      this.logger.warn(
        `resolve_scope_brain_miss scope=agent agentId=${scope.agentId} userId=${userId} — no agent brain row found, falling back to default`,
      )
    }

    return this.liveRepository.findDefaultUserBrainId(this.supabase, userId)
  }

  async buildAtlasSystemInstruction(scope: LiveSessionScope, userId: string): Promise<string> {
    return this.getInstructionService().buildAtlasSystemInstruction(scope, userId)
  }

  async buildSystemInstruction(session: LiveSession): Promise<string> {
    return this.getInstructionService().buildSystemInstruction(session)
  }

  async resolveVoiceForSession(session: LiveSession): Promise<string> {
    if (session.voiceName) return session.voiceName
    if (session.scope.type === 'agent' && session.scope.agentId) {
      return this.voiceAssignment.resolveAgentVoice(
        session.scope.agentId,
        session.userId,
        session.orgId,
      )
    }
    if (session.scope.type === 'user') return 'Enceladus'
    if (session.scope.type === 'company') return 'Enceladus'
    return 'Kore'
  }

  private async buildBrainContext(userId: string, scope: LiveSessionScope): Promise<string | null> {
    return this.getInstructionService().buildBrainContext(userId, scope)
  }

  buildToolDeclarations(scope: LiveSessionScope): object[] {
    return this.getToolDeclarationsService().buildToolDeclarations(scope)
  }

  buildAgentToolDeclarations(agentKey: string): object[] {
    return this.getToolDeclarationsService().buildAgentToolDeclarations(agentKey)
  }

  buildToolsForSession(session: LiveSession): object[] {
    return this.getToolDeclarationsService().buildToolsForSession(session)
  }

  async executeBrainAction(
    userId: string,
    orgId: string | null,
    scope: LiveSessionScope,
    action: string,
    data: Record<string, unknown>,
    sessionId: string,
  ): Promise<Record<string, unknown>> {
    return this.getBrainActionService().executeBrainAction({
      supabase: this.supabase,
      memoriesService: this.memoriesService,
      crystallizationService: this.crystallizationService,
      liveRepository: this.liveRepository,
      logger: this.logger,
      resolveScopeBrainId: (currentScope, currentUserId) =>
        this.resolveScopeBrainId(currentScope, currentUserId),
      userId,
      orgId,
      scope,
      action,
      data,
      sessionId,
    })
  }

  async startDelegation(
    session: LiveSession,
    task: string,
    onEvent: (type: string, data: Record<string, unknown>) => void,
  ): Promise<string> {
    return this.getDelegationService().startDelegation({
      session,
      task,
      onEvent,
      delegations: this.delegations,
      config: this.config,
      agentRuntime: this.agentRuntime,
      runtimeReadiness: this.runtimeReadiness,
      liveRepository: this.liveRepository,
      supabase: this.supabase,
      logger: this.logger,
      delegationStream: this.getDelegationStreamService(),
      resolveCampaignId: (currentSession) => this.resolveCampaignId(currentSession),
    })
  }

  async checkDelegation(
    delegationId: string | undefined,
    waitSeconds?: number,
  ): Promise<Record<string, unknown>> {
    return this.getDelegationService().checkDelegation(
      this.delegations,
      delegationId,
      waitSeconds,
    )
  }

  async queueMessage(
    delegationId: string | undefined,
    message: string,
    onEvent: (type: string, data: Record<string, unknown>) => void,
  ): Promise<Record<string, unknown>> {
    return this.getDelegationService().queueMessage({
      delegationId,
      message,
      onEvent,
      delegations: this.delegations,
      config: this.config,
      delegationStream: this.getDelegationStreamService(),
    })
  }

  getDelegationState(delegationId: string): DelegationState | undefined {
    return this.delegations.get(delegationId)
  }

  getAllActiveDelegations(): DelegationState[] {
    return [...this.delegations.values()]
  }

  listActiveDelegationsForSession(
    userId: string,
    orgId: string | null,
    conversationId: string,
    agentId: string,
  ): LiveDelegationSummary[] {
    return this.getDelegationService().listActiveDelegationsForSession(
      this.delegations,
      userId,
      orgId,
      conversationId,
      agentId,
    )
  }

  private async buildDelegationInput(
    session: LiveSession,
    task: string,
  ): Promise<Array<{ type: string; role: string; content: string }>> {
    return this.getDelegationService().buildDelegationInput({
      liveRepository: this.liveRepository,
      supabase: this.supabase,
      logger: this.logger,
      session,
      task,
    })
  }

  executeReadFile(agentKey: string, filePath: string): Record<string, unknown> {
    return this.getDocumentService().executeReadFile({
      instructionService: this.getInstructionService(),
      agentKey,
      filePath,
    })
  }

  async executeReadDocument(
    session: LiveSession,
    args: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.getDocumentService().executeReadDocument({
      session,
      args,
      supabase: this.supabase,
      documentRepository: this.documentRepository,
      embeddingService: this.embeddingService,
    })
  }

  async saveTranscriptMessage(
    conversationId: string,
    userId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null> {
    void userId
    return this.getTranscriptService().saveTranscriptMessage({
      liveRepository: this.liveRepository,
      supabase: this.supabase,
      logger: this.logger,
      conversationId,
      role,
      content,
      metadata,
    })
  }

  async saveVoiceTasksSummary(
    conversationId: string,
    userId: string,
    tasks: Array<{ delegationId: string; task: string; status: string }>,
    agentId?: string,
  ): Promise<void> {
    void userId
    return this.getTranscriptService().saveVoiceTasksSummary({
      liveRepository: this.liveRepository,
      supabase: this.supabase,
      logger: this.logger,
      conversationId,
      tasks,
      agentId,
      delegations: this.delegations,
    })
  }

  async trackSessionUsage(
    userId: string,
    durationSeconds: number,
    orgId?: string | null,
  ): Promise<void> {
    return this.getTranscriptService().trackSessionUsage({
      creditsService: this.creditsService,
      logger: this.logger,
      userId,
      durationSeconds,
      orgId,
    })
  }

  private pruneExpiredSessions(): void {
    const now = Date.now()
    for (const [id, session] of this.sessions) {
      if (!session.connectedAt && now - session.createdAt > SESSION_TTL_MS) {
        this.sessions.delete(id)
      } else if (session.connectedAt && now - session.connectedAt > MAX_SESSION_DURATION_MS) {
        this.sessions.delete(id)
      }
    }
  }
}
