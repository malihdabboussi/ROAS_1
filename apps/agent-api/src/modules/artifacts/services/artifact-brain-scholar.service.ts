import { Injectable } from '@nestjs/common'
import { ArtifactBrainCognitionRepository } from '../repositories/artifact-brain-cognition.repository'
import { ArtifactBrainScholarRepository } from '../repositories/artifact-brain-scholar.repository'
import type { ArtifactActionHandler } from './artifact-action.registry'
import { ArtifactAtlasBrainContextService } from './artifact-atlas-brain-context.service'
import { ArtifactBrainAccessService } from './artifact-brain-access.service'
import { ArtifactBrainBeliefActionsService } from './artifact-brain-belief-actions.service'
import { ArtifactBrainIngestionActionsService } from './artifact-brain-ingestion-actions.service'
import { ArtifactBrainLintActionsService } from './artifact-brain-lint-actions.service'
import { ArtifactBrainNarrativeActionsService } from './artifact-brain-narrative-actions.service'
import { ArtifactBrainPerspectiveActionsService } from './artifact-brain-perspective-actions.service'
import { ArtifactBrainReadActionsService } from './artifact-brain-read-actions.service'
import { ArtifactBrainSearchActionsService } from './artifact-brain-search-actions.service'
import { ArtifactBrainTimelineActionsService } from './artifact-brain-timeline-actions.service'
import { ArtifactUserBrainTopicSynthesisService } from './artifact-user-brain-topic-synthesis.service'

@Injectable()
export class ArtifactBrainScholarService {
  constructor(
    private readonly brainScholarRepository: ArtifactBrainScholarRepository = new ArtifactBrainScholarRepository(),
    private readonly brainCognitionRepository: ArtifactBrainCognitionRepository = new ArtifactBrainCognitionRepository(),
    private readonly atlasBrainContextService: ArtifactAtlasBrainContextService = new ArtifactAtlasBrainContextService(),
    private readonly brainAccessService: ArtifactBrainAccessService = new ArtifactBrainAccessService(),
    private readonly brainBeliefActionsService: ArtifactBrainBeliefActionsService = new ArtifactBrainBeliefActionsService(),
    private readonly brainIngestionActionsService: ArtifactBrainIngestionActionsService = new ArtifactBrainIngestionActionsService(),
    private readonly brainLintActionsService: ArtifactBrainLintActionsService = new ArtifactBrainLintActionsService(),
    private readonly brainNarrativeActionsService: ArtifactBrainNarrativeActionsService = new ArtifactBrainNarrativeActionsService(),
    private readonly brainPerspectiveActionsService: ArtifactBrainPerspectiveActionsService = new ArtifactBrainPerspectiveActionsService(),
    private readonly brainReadActionsService: ArtifactBrainReadActionsService = new ArtifactBrainReadActionsService(),
    private readonly brainSearchActionsService: ArtifactBrainSearchActionsService = new ArtifactBrainSearchActionsService(),
    private readonly brainTimelineActionsService: ArtifactBrainTimelineActionsService = new ArtifactBrainTimelineActionsService(),
    private readonly userBrainTopicSynthesisService: ArtifactUserBrainTopicSynthesisService = new ArtifactUserBrainTopicSynthesisService(),
  ) {}

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      search_brain_context: (data, sessionKey) =>
        this.brainSearchActionsService.searchBrainContext(target, data, sessionKey),
      search_agent_brain: (data, sessionKey) =>
        this.brainSearchActionsService.searchSkEntries(target, data, sessionKey),
      search_campaign_brain: (data, sessionKey) =>
        this.brainSearchActionsService.searchCampaignBrain(target, data, sessionKey),
      get_brain_stats: (data, sessionKey) =>
        this.brainReadActionsService.getBrainStats(target, data, sessionKey),
      resolve_agent_brain: (data, sessionKey) => this.resolveAgentSkBrain(target, data, sessionKey),
      list_available_brain_scopes: (data, sessionKey) =>
        this.brainReadActionsService.listBrainScopes(target, data, sessionKey),
      list_user_brain_memories: (data, sessionKey) =>
        this.brainReadActionsService.listRecentMemories(target, data, sessionKey),
      synthesize_user_brain_topic: (data, sessionKey) =>
        this.userBrainTopicSynthesisService.synthesizeTopic(target, data, sessionKey),
      list_agent_brain_domains: (data, sessionKey) =>
        this.brainReadActionsService.listBrainDomains(target, data, sessionKey),
      get_agent_brain_gaps: (data, sessionKey) =>
        this.brainReadActionsService.getBrainGaps(target, data, sessionKey),
      list_agent_brain_imports: (data, sessionKey) =>
        this.brainReadActionsService.listBrainImports(target, data, sessionKey),
      crystallize_user_brain: (data, sessionKey) =>
        this.brainIngestionActionsService.triggerCrystallization(target, data, sessionKey),
      ingest_user_brain_link: (data, sessionKey) =>
        this.brainIngestionActionsService.ingestBrainLink(target, data, sessionKey),
      ingest_user_brain_text: (data, sessionKey) =>
        this.brainIngestionActionsService.ingestBrainText(target, data, sessionKey),
      ingest_user_brain_document: (data, sessionKey) =>
        this.brainIngestionActionsService.ingestUserDocument(target, data, sessionKey),
      ingest_agent_brain_text: (data, sessionKey) =>
        this.brainIngestionActionsService.ingestSkText(target, data, sessionKey),
      ingest_agent_brain_link: (data, sessionKey) =>
        this.brainIngestionActionsService.ingestSkLink(target, data, sessionKey),
      ingest_meeting_transcript: (data, sessionKey) =>
        this.brainIngestionActionsService.ingestMeetingTranscript(target, data, sessionKey),
      transfer_brain_node: (data, sessionKey) =>
        this.brainIngestionActionsService.transferBrainNode(target, data, sessionKey),
      transfer_brain_by_source: (data, sessionKey) =>
        this.brainIngestionActionsService.transferBrainBySource(target, data, sessionKey),
      assign_user_memory_source: (data, sessionKey) =>
        this.brainIngestionActionsService.assignMemorySource(target, data, sessionKey),
      delete_brain_node: (data, sessionKey) =>
        this.brainIngestionActionsService.deleteBrainNode(target, data, sessionKey),
      get_brain_pages: (data, sessionKey) =>
        this.brainNarrativeActionsService.getNarrativePages(
          target,
          data,
          sessionKey,
          this.resolveNarrativeBrainId.bind(this),
        ),
      get_brain_timelines: (data, sessionKey) =>
        this.brainTimelineActionsService.getBrainTimelines(
          target,
          data,
          sessionKey,
          this.resolveNarrativeBrainId.bind(this),
        ),
      get_brain_timeline_items: (data, sessionKey) =>
        this.brainTimelineActionsService.getBrainTimelineItems(
          target,
          data,
          sessionKey,
          this.resolveNarrativeBrainId.bind(this),
        ),
      create_brain_timeline: (data, sessionKey) =>
        this.brainTimelineActionsService.createBrainTimeline(
          target,
          data,
          sessionKey,
          this.ensureAtlasNarrativeWriter.bind(this),
          this.resolveNarrativeBrainId.bind(this),
          this.resolveSessionAgentKey.bind(this),
        ),
      upsert_brain_timeline_items: (data, sessionKey) =>
        this.brainTimelineActionsService.upsertBrainTimelineItems(
          target,
          data,
          sessionKey,
          this.ensureAtlasNarrativeWriter.bind(this),
          this.resolveNarrativeBrainId.bind(this),
        ),
      archive_brain_timeline: (data, sessionKey) =>
        this.brainTimelineActionsService.archiveBrainTimeline(
          target,
          data,
          sessionKey,
          this.ensureAtlasNarrativeWriter.bind(this),
          this.resolveNarrativeBrainId.bind(this),
        ),
      create_brain_page: (data, sessionKey) =>
        this.brainNarrativeActionsService.createNarrativePage(
          target,
          data,
          sessionKey,
          this.ensureAtlasNarrativeWriter.bind(this),
          this.resolveNarrativeBrainId.bind(this),
        ),
      patch_brain_page: (data, sessionKey) =>
        this.brainNarrativeActionsService.patchNarrativePage(
          target,
          data,
          sessionKey,
          this.ensureAtlasNarrativeWriter.bind(this),
          this.resolveNarrativeBrainId.bind(this),
        ),
      update_brain_page: (data, sessionKey) =>
        this.brainNarrativeActionsService.updateNarrativePage(
          target,
          data,
          sessionKey,
          this.ensureAtlasNarrativeWriter.bind(this),
          this.resolveNarrativeBrainId.bind(this),
        ),
      archive_brain_page: (data, sessionKey) =>
        this.brainNarrativeActionsService.archiveNarrativePage(
          target,
          data,
          sessionKey,
          this.ensureAtlasNarrativeWriter.bind(this),
          this.resolveNarrativeBrainId.bind(this),
        ),
      link_brain_pages: (data, sessionKey) =>
        this.brainNarrativeActionsService.linkNarrativePages(
          target,
          data,
          sessionKey,
          this.ensureAtlasNarrativeWriter.bind(this),
          this.resolveNarrativeBrainId.bind(this),
        ),
      unlink_brain_pages: (data, sessionKey) =>
        this.brainNarrativeActionsService.unlinkNarrativePages(
          target,
          data,
          sessionKey,
          this.ensureAtlasNarrativeWriter.bind(this),
          this.resolveNarrativeBrainId.bind(this),
        ),
      get_brain_log: (data, sessionKey) =>
        this.brainNarrativeActionsService.getBrainLog(
          target,
          data,
          sessionKey,
          this.resolveNarrativeBrainId.bind(this),
        ),
      log_brain_event: (data, sessionKey) =>
        this.brainNarrativeActionsService.logBrainEvent(
          target,
          data,
          sessionKey,
          this.resolveNarrativeBrainId.bind(this),
        ),
      get_brain_belief_patterns: (data, sessionKey) =>
        this.brainBeliefActionsService.getBeliefPatterns(
          target,
          data,
          sessionKey,
          this.resolveCognitionContext.bind(this),
        ),
      create_brain_belief_pattern: (data, sessionKey) =>
        this.brainBeliefActionsService.createBeliefPattern(
          target,
          data,
          sessionKey,
          this.resolveCognitionContext.bind(this),
        ),
      update_brain_belief_pattern: (data, sessionKey) =>
        this.brainBeliefActionsService.updateBeliefPattern(
          target,
          data,
          sessionKey,
          this.resolveCognitionContext.bind(this),
        ),
      archive_brain_belief_pattern: (data, sessionKey) =>
        this.brainBeliefActionsService.archiveBeliefPattern(
          target,
          data,
          sessionKey,
          this.resolveCognitionContext.bind(this),
        ),
      merge_brain_belief_patterns: (data, sessionKey) =>
        this.brainBeliefActionsService.mergeBeliefPatterns(
          target,
          data,
          sessionKey,
          this.resolveCognitionContext.bind(this),
        ),
      connect_brain_belief_to_memory: (data, sessionKey) =>
        this.brainBeliefActionsService.connectBeliefToMemory(
          target,
          data,
          sessionKey,
          this.resolveCognitionContext.bind(this),
        ),
      disconnect_brain_belief_from_memory: (data, sessionKey) =>
        this.brainBeliefActionsService.disconnectBeliefFromMemory(
          target,
          data,
          sessionKey,
          this.resolveCognitionContext.bind(this),
        ),
      get_brain_perspectives: (data, sessionKey) =>
        this.brainPerspectiveActionsService.getPerspectives(
          target,
          data,
          sessionKey,
          this.resolveCognitionContext.bind(this),
        ),
      create_brain_perspective: (data, sessionKey) =>
        this.brainPerspectiveActionsService.createPerspective(
          target,
          data,
          sessionKey,
          this.resolveCognitionContext.bind(this),
        ),
      update_brain_perspective: (data, sessionKey) =>
        this.brainPerspectiveActionsService.updatePerspective(
          target,
          data,
          sessionKey,
          this.resolveCognitionContext.bind(this),
        ),
      archive_brain_perspective: (data, sessionKey) =>
        this.brainPerspectiveActionsService.archivePerspective(
          target,
          data,
          sessionKey,
          this.resolveCognitionContext.bind(this),
        ),
      connect_brain_belief_to_perspective: (data, sessionKey) =>
        this.brainPerspectiveActionsService.connectBeliefToPerspective(
          target,
          data,
          sessionKey,
          this.resolveCognitionContext.bind(this),
        ),
      disconnect_brain_belief_from_perspective: (data, sessionKey) =>
        this.brainPerspectiveActionsService.disconnectBeliefFromPerspective(
          target,
          data,
          sessionKey,
          this.resolveCognitionContext.bind(this),
        ),
      get_brain_lint: (data, sessionKey) =>
        this.brainLintActionsService.getBrainLint(
          target,
          data,
          sessionKey,
          this.resolveNarrativeBrainId.bind(this),
        ),
      run_brain_lint: (data, sessionKey) =>
        this.brainLintActionsService.runBrainLint(
          target,
          data,
          sessionKey,
          this.resolveNarrativeBrainId.bind(this),
        ),
      resolve_brain_lint: (data, sessionKey) =>
        this.brainLintActionsService.resolveBrainLint(
          target,
          data,
          sessionKey,
          this.resolveNarrativeBrainId.bind(this),
        ),
      atlas_save_brain_context: (data, sessionKey) =>
        this.atlasBrainContextService.saveBrainContext(
          target,
          data,
          sessionKey,
          this.resolveAgentSkBrain.bind(this),
        ),
    }
  }

  private async resolveAgentSkBrain(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.brainAccessService.resolveAgentSkBrain(target, input, sessionKey)
  }

  private resolveSessionAgentKey(target: Record<string, any>, sessionKey?: string): string | null {
    return this.brainAccessService.resolveSessionAgentKey(target, sessionKey)
  }

  private async resolveBrainId(target: Record<string, any>, userId: string): Promise<string> {
    return this.brainAccessService.resolveBrainId(target, userId)
  }

  private parseBrainIdFromBrainJobSession(sessionKey?: string): string | null {
    return this.brainAccessService.parseBrainIdFromBrainJobSession(sessionKey)
  }

  private async assertCanAccessBrain(
    target: Record<string, any>,
    userId: string,
    brainId: string,
    required: 'view' | 'query' | 'train',
    sessionKey?: string,
  ): Promise<{ success: false; error: string } | null> {
    return this.brainAccessService.assertCanAccessBrain(
      target,
      userId,
      brainId,
      required,
      sessionKey,
    )
  }

  // ── Narrative Pages ───────────────────────────────────────────────────────

  private async resolveNarrativeBrainId(
    target: Record<string, any>,
    input: Record<string, unknown>,
    userId: string,
    sessionKey?: string,
    requiredAccess: 'view' | 'query' | 'train' = 'query',
  ): Promise<{ brainId: string } | { error: string }> {
    const brainType = String(input.brain_type ?? '').trim()
    if (!brainType) return { error: 'brain_type is required' }
    const normalizedBrainType = brainType === 'user_default' ? 'user' : brainType
    if (!['user', 'agent', 'customer', 'company'].includes(normalizedBrainType)) {
      return { error: 'brain_type must be user_default, user, agent, customer, or company' }
    }
    const explicit =
      typeof input.brain_id === 'string' && input.brain_id.trim().length > 0
        ? input.brain_id.trim()
        : null
    const brainId = explicit ?? this.parseBrainIdFromBrainJobSession(sessionKey)
    if (brainId) {
      const { data: brainCheck } = await this.brainScholarRepository.findBrainForAccess(
        target.serviceClient,
        brainId,
      )
      if (!brainCheck) return { error: 'Brain not found' }
      if (brainCheck.scope !== normalizedBrainType) {
        return { error: `brain_id must reference a ${normalizedBrainType} brain` }
      }
      const access = await this.assertCanAccessBrain(
        target,
        userId,
        brainId,
        requiredAccess,
        sessionKey,
      )
      if (access) return { error: access.error }
      return { brainId }
    }
    if (normalizedBrainType !== 'user') {
      return { error: 'brain_id is required unless brain_type is user_default' }
    }
    return { brainId: await this.resolveBrainId(target, userId) }
  }

  private ensureAtlasNarrativeWriter(
    target: Record<string, any>,
    sessionKey?: string,
  ): { success: false; error: string } | null {
    const sessionAgent =
      typeof target.parseAgentIdFromSessionKey === 'function' && sessionKey
        ? target.parseAgentIdFromSessionKey(sessionKey)
        : null
    const configuredAgent = target.config?.agentKey as string | undefined
    const agentKey = String(sessionAgent ?? configuredAgent ?? '').toLowerCase()
    if (agentKey === 'atlas' || agentKey === 'brain_scholar') return null
    return {
      success: false,
      error: 'Narrative pages are maintained by Atlas and cannot be edited by humans.',
    }
  }

  // ── Belief Patterns (Dispenza L4) ────────────────────────────────────────

  private async resolveCognitionContext(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
    requiredAccess: 'view' | 'query' | 'train' = 'query',
  ): Promise<
    | {
        userId: string
        subjectId: string
        brainId: string
        includeLegacySubjectFallback: boolean
      }
    | { error: string }
  > {
    const userId = target.resolveUserId(sessionKey)
    if (!userId) return { error: 'Could not resolve user' }

    const resolved = await this.resolveNarrativeBrainId(
      target,
      input,
      userId,
      sessionKey,
      requiredAccess,
    )
    if ('error' in resolved) return { error: resolved.error }

    const { data: brain, error } = await this.brainScholarRepository.findBrainForCognition(
      target.serviceClient,
      resolved.brainId,
    )
    if (error || !brain) return { error: 'Brain not found' }

    const includeLegacySubjectFallback =
      brain.is_default === true &&
      !brain.agent_id &&
      !brain.campaign_id &&
      (brain.scope == null || brain.scope === 'user')

    // Agent/customer cognition belongs to the brain, not the human owner —
    // same convention the mission-worker uses for customer-brain writes.
    const subjectId =
      brain.scope === 'agent' || brain.scope === 'customer' ? resolved.brainId : userId

    return {
      userId,
      subjectId,
      brainId: resolved.brainId,
      includeLegacySubjectFallback,
    }
  }
}
