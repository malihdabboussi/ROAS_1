import { Injectable, Logger, Optional } from '@nestjs/common'
import { MissionOpenclawGateway } from '../missions/services/gateways/mission-openclaw.gateway'
import { MissionJsonService } from '../missions/services/utils/mission-json.service'
import { MissionWorkerBillingClientService } from '../provider-billing/mission-worker-billing-client.service'
import {
  CompanyCortexObjectRepository,
  type CompanyCortexObjectDraft,
  type CompanyCortexObjectEdgeDraft,
} from './company-cortex-object.repository'

type FormationObjectType = CompanyCortexObjectDraft['object_type']

type FormationRelationType = CompanyCortexObjectEdgeDraft['relation_type']

const FORMATION_TYPES = new Set<FormationObjectType>([
  'belief',
  'perspective',
  'tension',
  'standard',
  'move',
  'anti_pattern',
  'protocol',
  'decision',
  'retrieval_rule',
])

const RELATION_TYPES = new Set<FormationRelationType>([
  'supports',
  'contradicts',
  'contains',
  'enforces',
  'derived_from',
  'refines',
])

const GEMINI_EMBEDDING_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent'
const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001'

@Injectable()
export class CompanyCortexFormationService {
  private readonly logger = new Logger(CompanyCortexFormationService.name)

  constructor(
    private readonly openclawGateway: MissionOpenclawGateway,
    private readonly objects: CompanyCortexObjectRepository,
    private readonly jsonService: MissionJsonService,
    @Optional() private readonly billingClient?: MissionWorkerBillingClientService,
  ) {}

  async runFormation(input: {
    outboxId: string
    userId: string
    orgId: string
    brainId: string
    payload?: Record<string, unknown>
  }): Promise<{ objectsCreated: number; edgesCreated: number; signalsMerged: number }> {
    const requestedSignalIds = this.payloadSignalIds(input.payload)
    const signals = await this.objects.listFormationSignals({
      brainId: input.brainId,
      limit: 50,
      signalIds: requestedSignalIds,
    })
    if (signals.length === 0) return { objectsCreated: 0, edgesCreated: 0, signalsMerged: 0 }
    const activeSignalIds = new Set(signals.map((signal) => String(signal.id)))

    const fakeMission = {
      id: input.outboxId,
      user_id: input.userId,
      org_id: input.orgId,
      campaign_id: null,
      correlation_id: input.outboxId,
      title: 'Company Cortex Formation',
      brief: 'Form reviewed Company Cortex signals into stable company cognition',
      priority: 'low',
      assigned_agent_key: 'atlas',
      current_agent_key: 'atlas',
      input: {},
    }

    const prompt = [
      'You are Atlas running Company Cortex formation.',
      'Read reviewed company signals and return ONLY JSON formation operations.',
      'Only use source_signal_ids from the reviewed signals shown below.',
      'Every object operation must include non-empty source_signal_ids, non-empty evidence_refs, and retrieval_rule.trigger plus retrieval_rule.context_form.',
      '',
      `org_id: ${input.orgId}`,
      `brain_id: ${input.brainId}`,
      '',
      'Reviewed active signals:',
      JSON.stringify(signals, null, 2),
    ].join('\n')

    const content = await this.callAtlasWithJsonRetry(
      fakeMission,
      prompt,
      'company_cortex_formation',
    )
    const { objects, relations, signalIds } = this.parseOperations(content, {
      orgId: input.orgId,
      brainId: input.brainId,
      activeSignalIds,
    })
    const embeddedObjects = await this.withEmbeddings(objects, {
      userId: input.userId,
      orgId: input.orgId,
      brainId: input.brainId,
    })
    const inserted = await this.objects.insertObjects(embeddedObjects)
    const titleToId = new Map(inserted.map((row) => [row.title.trim().toLowerCase(), row.id]))
    const edges = this.resolveRelations(relations, titleToId, {
      orgId: input.orgId,
      brainId: input.brainId,
    })
    const edgesCreated = await this.objects.insertEdges(edges)
    await this.objects.markSignalsMerged(signalIds)
    return { objectsCreated: inserted.length, edgesCreated, signalsMerged: signalIds.length }
  }

  private async callAtlasWithJsonRetry(
    mission: Record<string, unknown>,
    prompt: string,
    label: string,
  ): Promise<string> {
    const first = await this.openclawGateway.callOpenClawRaw(
      mission,
      'atlas',
      '',
      prompt,
      undefined,
      'mission_execute',
      { channel: 'brain-ops' },
    )
    const firstContent = String(first.content ?? '')
    if (this.jsonService.tryParseJsonStrict(firstContent)) return firstContent

    this.logger.warn(
      `${label}: first Atlas response did not parse; retrying once (outbox_id=${String(mission.id ?? '')}, preview=${firstContent.trim().slice(0, 500)})`,
    )

    const retryPrompt = [
      prompt,
      '',
      'Your previous response could not be parsed as JSON.',
      'Return ONLY valid JSON matching the schema. No markdown fences or commentary.',
      '',
      'Failed output:',
      firstContent.trim().slice(0, 2000),
    ].join('\n')

    const second = await this.openclawGateway.callOpenClawRaw(
      mission,
      'atlas',
      '',
      retryPrompt,
      undefined,
      'mission_execute',
      { channel: 'brain-ops' },
    )
    const secondContent = String(second.content ?? '')
    if (this.jsonService.tryParseJsonStrict(secondContent)) return secondContent

    throw new Error(
      `${label}: Atlas response did not parse to formation JSON after retry (preview=${secondContent.trim().slice(0, 200)})`,
    )
  }

  parseOperations(
    content: string,
    context: { orgId: string; brainId: string; activeSignalIds?: Set<string> },
  ): {
    objects: CompanyCortexObjectDraft[]
    relations: Array<{
      from_title: string
      to_title: string
      type: FormationRelationType
      confidence: number
    }>
    signalIds: string[]
  } {
    const parsed = this.jsonService.tryParseJsonStrict(content)
    if (!parsed) {
      throw new Error('company_cortex_formation: Atlas response did not parse to formation JSON')
    }
    const operations = parsed.operations
    if (!Array.isArray(operations)) return { objects: [], relations: [], signalIds: [] }

    const objects: CompanyCortexObjectDraft[] = []
    const signalIds = new Set<string>()
    for (const operation of operations) {
      if (!operation || typeof operation !== 'object') continue
      const item = operation as Record<string, unknown>
      const objectType = String(item.object_type ?? '')
      const truth = String(item.truth ?? '').trim()
      const title = String(item.title ?? truth.slice(0, 80)).trim()
      if (!FORMATION_TYPES.has(objectType as FormationObjectType) || !truth || !title) continue
      const sourceSignalIds = Array.isArray(item.source_signal_ids)
        ? item.source_signal_ids.filter((id): id is string => typeof id === 'string')
        : []
      if (sourceSignalIds.length === 0) {
        this.logger.warn(
          `company_cortex_formation: dropped object without source_signal_ids (title="${title}", brain_id=${context.brainId})`,
        )
        continue
      }
      if (
        context.activeSignalIds &&
        sourceSignalIds.some((id) => !context.activeSignalIds?.has(id))
      ) {
        this.logger.warn(
          `company_cortex_formation: dropped object with unreviewed source_signal_ids (title="${title}", brain_id=${context.brainId})`,
        )
        continue
      }
      const evidenceRefs = Array.isArray(item.evidence_refs)
        ? (item.evidence_refs.filter((ref) => ref && typeof ref === 'object') as Array<
            Record<string, unknown>
          >)
        : []
      if (evidenceRefs.length === 0) {
        this.logger.warn(
          `company_cortex_formation: dropped object without evidence_refs (title="${title}", brain_id=${context.brainId})`,
        )
        continue
      }
      const retrievalRule =
        item.retrieval_rule && typeof item.retrieval_rule === 'object'
          ? (item.retrieval_rule as Record<string, unknown>)
          : {}
      if (!this.hasCompleteRetrievalRule(retrievalRule)) {
        this.logger.warn(
          `company_cortex_formation: dropped object without retrieval_rule trigger/context_form (title="${title}", brain_id=${context.brainId})`,
        )
        continue
      }
      for (const id of sourceSignalIds) signalIds.add(id)
      const confidence =
        typeof item.confidence === 'number' ? Math.max(0, Math.min(1, item.confidence)) : 0.5
      objects.push({
        org_id: context.orgId,
        brain_id: context.brainId,
        object_type: objectType as FormationObjectType,
        title,
        truth,
        status: this.normalizeStatus(item.status),
        confidence,
        source_signal_ids: sourceSignalIds,
        evidence_refs: evidenceRefs,
        retrieval_rule: retrievalRule,
        metadata: {
          operation: typeof item.operation === 'string' ? item.operation : 'create',
          ingestion_path: 'worker',
          source_type: 'company_cortex_formation',
        },
      })
    }

    const relations: Array<{
      from_title: string
      to_title: string
      type: FormationRelationType
      confidence: number
    }> = []
    const rawRelations = parsed.relations
    if (Array.isArray(rawRelations)) {
      for (const raw of rawRelations) {
        if (!raw || typeof raw !== 'object') continue
        const item = raw as Record<string, unknown>
        const fromTitle = String(item.from_title ?? '').trim()
        const toTitle = String(item.to_title ?? '').trim()
        const type = String(item.type ?? '') as FormationRelationType
        if (!fromTitle || !toTitle || !RELATION_TYPES.has(type)) continue
        const confidence =
          typeof item.confidence === 'number' ? Math.max(0, Math.min(1, item.confidence)) : 0.5
        relations.push({ from_title: fromTitle, to_title: toTitle, type, confidence })
      }
    }

    return { objects, relations, signalIds: [...signalIds] }
  }

  resolveRelations(
    relations: Array<{
      from_title: string
      to_title: string
      type: FormationRelationType
      confidence: number
    }>,
    titleToId: Map<string, string>,
    context: { orgId: string; brainId: string },
  ): CompanyCortexObjectEdgeDraft[] {
    const seen = new Set<string>()
    const edges: CompanyCortexObjectEdgeDraft[] = []
    for (const relation of relations) {
      const sourceId = titleToId.get(relation.from_title.trim().toLowerCase())
      const targetId = titleToId.get(relation.to_title.trim().toLowerCase())
      if (!sourceId || !targetId || sourceId === targetId) {
        this.logger.warn(
          `company_cortex_formation: dropped relation with unresolved title reference (from="${relation.from_title}", to="${relation.to_title}", type="${relation.type}", brain_id=${context.brainId})`,
        )
        continue
      }
      const key = `${sourceId}:${targetId}:${relation.type}`
      if (seen.has(key)) continue
      seen.add(key)
      edges.push({
        org_id: context.orgId,
        brain_id: context.brainId,
        source_object_id: sourceId,
        target_object_id: targetId,
        relation_type: relation.type,
        confidence: relation.confidence,
      })
    }
    return edges
  }

  private async withEmbeddings(
    objects: CompanyCortexObjectDraft[],
    billing: { userId: string; orgId: string; brainId: string },
  ): Promise<CompanyCortexObjectDraft[]> {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return objects
    return Promise.all(
      objects.map(async (object) => {
        const text = `${object.title}\n${object.truth}`
        const embedding = await this.getEmbedding(text, apiKey)
        if (embedding) {
          await this.chargeEmbeddingUsage(billing, text, object.title)
        }
        return { ...object, embedding }
      }),
    )
  }

  private async getEmbedding(text: string, apiKey: string): Promise<string | null> {
    if (!text.trim()) return null
    const res = await fetch(`${GEMINI_EMBEDDING_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text: text.slice(0, 12000) }] },
        outputDimensionality: 768,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const values = data?.embedding?.values
    return Array.isArray(values) && values.length > 0 ? `[${values.join(',')}]` : null
  }

  private async chargeEmbeddingUsage(
    billing: { userId: string; orgId: string; brainId: string },
    text: string,
    objectTitle: string,
  ): Promise<void> {
    if (!this.billingClient) {
      if (process.env.NODE_ENV === 'test') return
      throw new Error('mission_worker_billing_client_not_configured')
    }
    const inputTokens = Math.max(1, Math.ceil(text.length / 4))
    await this.billingClient.chargeDirectTextUsage({
      userId: billing.userId,
      orgId: billing.orgId,
      feature: 'brain',
      action: 'company_cortex_object_embedding',
      modelName: GEMINI_EMBEDDING_MODEL,
      usage: {
        input: inputTokens,
        output: 0,
        totalTokens: inputTokens,
      },
      costSource: 'char_estimate',
      metadata: {
        source: 'company_cortex_formation',
        brain_id: billing.brainId,
        object_title: objectTitle.slice(0, 120),
      },
    })
  }

  private normalizeStatus(value: unknown): CompanyCortexObjectDraft['status'] {
    if (
      value === 'emerging' ||
      value === 'active' ||
      value === 'challenged' ||
      value === 'transforming' ||
      value === 'retired'
    ) {
      return value
    }
    return 'active'
  }

  private payloadSignalIds(payload: Record<string, unknown> | undefined): string[] | undefined {
    if (!payload || !Array.isArray(payload.signal_ids)) return undefined
    const signalIds = payload.signal_ids
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim())
    return signalIds.length > 0 ? Array.from(new Set(signalIds)) : undefined
  }

  private hasCompleteRetrievalRule(rule: Record<string, unknown>): boolean {
    const trigger = typeof rule.trigger === 'string' ? rule.trigger.trim() : ''
    const contextForm = typeof rule.context_form === 'string' ? rule.context_form.trim() : ''
    return trigger.length > 0 && contextForm.length > 0
  }
}
