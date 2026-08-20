import { Injectable, Logger } from '@nestjs/common'
import { MissionOpenclawGateway } from '../missions/services/gateways/mission-openclaw.gateway'
import { MissionJsonService } from '../missions/services/utils/mission-json.service'
import {
  CompanyCortexSignalRepository,
  shouldAutoPromoteCompanyCortexSignal,
  type CompanyCortexSignalDraft,
} from './company-cortex-signal.repository'

type DreamSignalType = CompanyCortexSignalDraft['signal_type']

const SIGNAL_TYPES = new Set<DreamSignalType>([
  'belief',
  'standard',
  'move',
  'anti_pattern',
  'protocol',
  'decision',
  'tension_candidate',
  'retrieval_rule',
])

@Injectable()
export class CompanyDailyDreamAtlasService {
  private readonly logger = new Logger(CompanyDailyDreamAtlasService.name)

  constructor(
    private readonly openclawGateway: MissionOpenclawGateway,
    private readonly signals: CompanyCortexSignalRepository,
    private readonly jsonService: MissionJsonService,
  ) {}

  async runDailyDreamChunk(input: Record<string, unknown>): Promise<{ signals: unknown[] }> {
    const orgId = String(input.orgId ?? '')
    const brainId = String(input.brainId ?? '')
    const runId = String(input.runId ?? '')
    const groups = Array.isArray(input.groups) ? input.groups : []
    const localDate = String(input.localDate ?? '')

    const fakeMission = {
      id: runId,
      user_id: String(input.userId ?? ''),
      org_id: orgId,
      campaign_id: null,
      correlation_id: runId,
      title: 'Company Cortex Daily Dream',
      brief: 'Analyze the daily company digest and propose Company Cortex signals',
      priority: 'low',
      assigned_agent_key: 'atlas',
      current_agent_key: 'atlas',
      input: {},
    }

    const prompt = [
      'You are Atlas running the Company Cortex daily dream.',
      'Read the compressed daily digest and return ONLY JSON with proposed company-level signals.',
      'Return {"signals":[]} if nothing is worth keeping.',
      '',
      `org_id: ${orgId}`,
      `brain_id: ${brainId}`,
      `dream_run_id: ${runId}`,
      `local_date: ${localDate}`,
      '',
      'Digest groups:',
      JSON.stringify(groups, null, 2),
    ].join('\n')

    const content = await this.callAtlasWithJsonRetry(fakeMission, prompt, 'company_daily_dream')
    const parsedSignals = this.parseSignals(content, {
      orgId,
      brainId,
      runId,
    })
    const inserted = await this.signals.insertProposedSignals(parsedSignals)
    await this.autoPromoteHighConfidenceSignals({
      orgId,
      brainId,
      userId: String(input.userId ?? ''),
      inserted,
    })
    return { signals: parsedSignals }
  }

  async autoPromoteHighConfidenceSignals(input: {
    orgId: string
    brainId: string
    userId: string
    inserted: Array<{ id: string; confidence: number }>
  }): Promise<{ promotedSignalIds: string[] }> {
    const eligibleIds = input.inserted
      .filter((row) => shouldAutoPromoteCompanyCortexSignal(row.confidence))
      .map((row) => row.id)
    if (eligibleIds.length === 0 || !input.userId) {
      return { promotedSignalIds: [] }
    }

    const promotedSignalIds = await this.signals.promoteHighConfidenceSignals({
      brainId: input.brainId,
      orgId: input.orgId,
      signalIds: eligibleIds,
      reviewedBy: input.userId,
    })
    for (const signalId of promotedSignalIds) {
      await this.signals.insertFormationOutbox({
        brainId: input.brainId,
        orgId: input.orgId,
        userId: input.userId,
        signalId,
        source: 'auto_high_confidence',
      })
    }
    if (promotedSignalIds.length > 0) {
      this.logger.log(
        `company_daily_dream: auto-promoted ${promotedSignalIds.length} high-confidence signal(s) (brain_id=${input.brainId})`,
      )
    }
    return { promotedSignalIds }
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
      `${label}: first Atlas response did not parse; retrying once (dream_run_id=${String(mission.id ?? '')}, preview=${firstContent.trim().slice(0, 500)})`,
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
      `${label}: Atlas response did not parse to signal JSON after retry (preview=${secondContent.trim().slice(0, 200)})`,
    )
  }

  parseSignals(
    content: string,
    context: { orgId: string; brainId: string; runId: string },
  ): CompanyCortexSignalDraft[] {
    if (!content.trim()) return []
    const parsed = this.jsonService.tryParseJsonStrict(content)
    if (!parsed) {
      throw new Error('company_daily_dream: Atlas response did not parse to signal JSON')
    }
    const rawSignals = parsed.signals
    if (!Array.isArray(rawSignals)) return []

    const signals: CompanyCortexSignalDraft[] = []
    const assertedAt = new Date().toISOString()
    for (const raw of rawSignals) {
      if (!raw || typeof raw !== 'object') continue
      const item = raw as Record<string, unknown>
      const type = String(item.type ?? '')
      const truth = String(item.truth ?? '').trim()
      if (!SIGNAL_TYPES.has(type as DreamSignalType) || !truth) continue
      const confidence =
        typeof item.confidence === 'number' ? Math.max(0, Math.min(1, item.confidence)) : 0.5
      signals.push({
        org_id: context.orgId,
        brain_id: context.brainId,
        dream_run_id: context.runId || null,
        signal_type: type as DreamSignalType,
        truth,
        scope:
          item.scope && typeof item.scope === 'object' && !Array.isArray(item.scope)
            ? (item.scope as Record<string, unknown>)
            : {},
        evidence_refs: Array.isArray(item.evidence)
          ? (item.evidence.filter((ref) => ref && typeof ref === 'object') as Array<
              Record<string, unknown>
            >)
          : [],
        confidence,
        reason: typeof item.reason === 'string' ? item.reason : null,
        context_form:
          typeof item.suggested_context_form === 'string' ? item.suggested_context_form : null,
        status: 'proposed',
        source: 'daily_dream',
        evidence_started_at: assertedAt,
        evidence_ended_at: assertedAt,
        valid_from: assertedAt,
        temporal_status: 'current',
        temporal_confidence: confidence,
        temporal_source: 'daily_dream_run',
      })
    }
    return signals
  }
}
