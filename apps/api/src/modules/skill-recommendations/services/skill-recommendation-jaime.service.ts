import { Injectable } from '@nestjs/common'
import { z } from 'zod'
import { MissionAgentGatewayService } from '../../missions/services/gateways/mission-agent-gateway.service'
import type {
  SkillRecommendationCandidateRow,
  SkillRecommendationEventRow,
  AgentTurnFeedbackSummary,
  SkillRecommendationJobRow,
  SkillRecommendationProposalKind,
  SkillRecommendationResource,
  SkillRecommendationRouteOutType,
  SkillRecommendationTargetArtifactKind,
  SkillRecommendationTraceEvidence,
} from '../types/skill-recommendations.types'

const ResourceSchema = z.object({
  file_path: z.string().min(1),
  content_type: z.string().min(1).default('text/markdown'),
  content: z.string().default(''),
})

const ProposalSchema = z.object({
  proposal_kind: z
    .enum(['skill_create', 'skill_update', 'skill_resource_update', 'agent_file_update', 'route_out'])
    .default('skill_create'),
  route_out_type: z
    .enum(['system_artifact_internal_review', 'product_fix_proposal', 'unsupported_scope'])
    .nullable()
    .optional(),
  customer_visible: z.boolean().default(true),
  target_agent_key: z.string().min(1),
  skill_key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  markdown_content: z.string().min(1),
  resources: z.array(ResourceSchema).default([]),
  workflow_summary: z.string().min(1),
  recommended_actions: z.array(z.string()).default([]),
  evidence_event_ids: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.5),
  target_artifact_kind: z
    .enum(['skill', 'skill_resource', 'agent_file', 'tool_schema'])
    .default('skill'),
  target_artifact_key: z.string().nullable().optional(),
  artifact_lock_key: z.string().nullable().optional(),
  priority_score: z.number().int().min(0).max(100).default(0),
  proposed_patch: z.record(z.unknown()).default({}),
  quality_failures: z.array(z.string()).default([]),
})

const JaimeReviewSchema = z.object({
  verdict: z.enum(['recommend', 'skip']),
  reason: z.string().optional(),
  proposal: ProposalSchema.nullable().optional(),
})

export type JaimeReviewResult =
  | {
      verdict: 'skip'
      reason: string
      raw: string
    }
  | {
      verdict: 'recommend'
      proposal: {
        target_agent_key: string
        proposal_kind: SkillRecommendationProposalKind
        route_out_type: SkillRecommendationRouteOutType | null
        customer_visible: boolean
        target_artifact_kind: SkillRecommendationTargetArtifactKind
        target_artifact_key: string | null
        artifact_lock_key: string | null
        priority_score: number
        proposed_patch: Record<string, unknown>
        quality_failures: string[]
        skill_key: string
        name: string
        description: string
        markdown_content: string
        resources: SkillRecommendationResource[]
        workflow_summary: string
        recommended_actions: string[]
        evidence_event_ids: string[]
        confidence: number
      }
      raw: string
    }

@Injectable()
export class SkillRecommendationJaimeService {
  constructor(private readonly gateway: MissionAgentGatewayService) {}

  async reviewCandidate(input: {
    job: SkillRecommendationJobRow
    candidate: SkillRecommendationCandidateRow
    events: SkillRecommendationEventRow[]
    traceEvidence?: SkillRecommendationTraceEvidence[]
    existingSkills: Array<{ skill_key: string; name: string; description: string }>
    feedbackSummary?: AgentTurnFeedbackSummary
  }): Promise<JaimeReviewResult> {
    const { job, candidate, events, traceEvidence = [], existingSkills, feedbackSummary } = input
    const response = await this.gateway.callOpenClawForBrainJob(
      job.user_id,
      'hr',
      this.buildSystemPrompt(),
      this.buildUserPrompt(candidate, events, traceEvidence, existingSkills, feedbackSummary),
      undefined,
      undefined,
      undefined,
      job.org_id,
    )
    const raw = this.extractText(response)
    return this.parseReview(raw, candidate.agent_key)
  }

  private buildSystemPrompt(): string {
    return [
      'You are Jaime, the HR agent. Review repeated agent workflow metadata and decide whether it deserves an Agent Learning Loop proposal.',
      'Do not create, update, or mutate any agent file or skill. Return JSON only.',
      '',
      'Recommend only when the repeated workflow is specific, useful, and likely to improve future runs.',
      'Skip when the pattern is too generic, already covered by an existing skill, too weak, or unsafe to encode.',
      '',
      'Agent Learning Loop scope: customer-visible proposals may only target org-owned skills, skill resource files, or org-owned ROLE.md, IDENTITY.md, or SOUL.md files.',
      'Return proposal_kind "route_out" with customer_visible false for platform-owned tool schema problems, system-owned agents, official/system skills, memories, workflows, or unsupported surfaces.',
      'Use route_out_type "product_fix_proposal" for platform-owned tool schema problems.',
      'Use route_out_type "system_artifact_internal_review" for system-owned agents or official/system skills.',
      'Use route_out_type "unsupported_scope" for memories, workflows, or anything outside Jaime ownership.',
      '',
      'Trace evidence may include redacted prompts, responses, tool steps, and LLM input/output excerpts from repeated runs.',
      'Use trace evidence to understand the workflow, but do not copy private names, URLs, IDs, secrets, or one-off user data into the skill.',
      '',
      'When recommending, draft a database-backed skill proposal. The markdown_content must be a complete SKILL.md body with frontmatter.',
      'Use bundled resource files only when they reduce repeated context or capture stable reference material.',
      '',
      'Return exactly this JSON shape:',
      JSON.stringify(
        {
          verdict: 'recommend | skip',
          reason: 'short reason, required for skip',
          proposal: {
            proposal_kind:
              'skill_create | skill_update | skill_resource_update | agent_file_update | route_out',
            route_out_type:
              'system_artifact_internal_review | product_fix_proposal | unsupported_scope | null',
            customer_visible: true,
            target_agent_key: 'agent key that should own the skill',
            target_artifact_kind: 'skill | skill_resource | agent_file | tool_schema',
            target_artifact_key: 'skill key, resource key, ROLE.md, IDENTITY.md, SOUL.md, or tool name',
            artifact_lock_key: 'scope:agent:artifact_kind:artifact_key',
            priority_score: 78,
            skill_key: 'url-safe-key',
            name: 'Human name',
            description: 'Trigger description',
            markdown_content: 'Full SKILL.md markdown',
            resources: [
              {
                file_path: 'references/example.md',
                content_type: 'text/markdown',
                content: 'file content',
              },
            ],
            workflow_summary: 'what repeated workflow this captures',
            recommended_actions: ['short action the skill should guide'],
            evidence_event_ids: ['uuid'],
            confidence: 0.82,
            proposed_patch: {
              markdown_content: 'new skill markdown, updated skill markdown, agent file content, or route-out summary',
            },
            quality_failures: [],
          },
        },
        null,
        2,
      ),
      '',
      'If verdict is "skip", omit proposal or set it to null.',
    ].join('\n')
  }

  private buildUserPrompt(
    candidate: SkillRecommendationCandidateRow,
    events: SkillRecommendationEventRow[],
    traceEvidence: SkillRecommendationTraceEvidence[],
    existingSkills: Array<{ skill_key: string; name: string; description: string }>,
    feedbackSummary?: AgentTurnFeedbackSummary,
  ): string {
    return JSON.stringify(
      {
        candidate: {
          id: candidate.id,
          target_agent_key: candidate.agent_key,
          run_count: candidate.run_count,
          tool_names: candidate.tool_names,
          first_event_at: candidate.first_event_at,
          last_event_at: candidate.last_event_at,
        },
        examples: events.map((event) => ({
          id: event.id,
          prompt_excerpt: event.prompt_excerpt,
          tool_names: event.tool_names,
          channel: event.channel,
          created_at: event.created_at,
        })),
        trace_evidence: traceEvidence,
        existing_skills: existingSkills,
        feedback_summary: feedbackSummary ?? {
          total_count: 0,
          positive_count: 0,
          negative_count: 0,
          trusted_negative_count: 0,
          top_tags: [],
        },
      },
      null,
      2,
    )
  }

  private parseReview(raw: string, fallbackAgentKey: string): JaimeReviewResult {
    const parsed = JaimeReviewSchema.parse(JSON.parse(this.extractJson(raw)))
    if (parsed.verdict === 'skip') {
      return { verdict: 'skip', reason: parsed.reason?.trim() || 'Jaime skipped this pattern', raw }
    }
    if (!parsed.proposal) {
      throw new Error('Jaime recommended a skill without proposal data')
    }
    const proposal = parsed.proposal
    return {
      verdict: 'recommend',
      proposal: {
        target_agent_key: proposal.target_agent_key || fallbackAgentKey,
        proposal_kind: proposal.proposal_kind,
        route_out_type: proposal.route_out_type ?? null,
        customer_visible:
          proposal.proposal_kind === 'route_out' ? false : proposal.customer_visible,
        target_artifact_kind: proposal.target_artifact_kind,
        target_artifact_key:
          proposal.target_artifact_key ??
          (proposal.target_artifact_kind === 'skill' ? proposal.skill_key : null),
        artifact_lock_key: proposal.artifact_lock_key ?? null,
        priority_score: proposal.priority_score,
        proposed_patch: proposal.proposed_patch,
        quality_failures: proposal.quality_failures,
        skill_key: proposal.skill_key,
        name: proposal.name,
        description: proposal.description,
        markdown_content: proposal.markdown_content,
        resources: proposal.resources,
        workflow_summary: proposal.workflow_summary,
        recommended_actions: proposal.recommended_actions,
        evidence_event_ids: proposal.evidence_event_ids,
        confidence: proposal.confidence,
      },
      raw,
    }
  }

  private extractJson(raw: string): string {
    const trimmed = raw.trim()
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed
    const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed)
    if (fenced?.[1]) return fenced[1].trim()
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) return trimmed.slice(start, end + 1)
    throw new Error('Jaime response did not contain JSON')
  }

  private extractText(result: Record<string, unknown>): string {
    if (typeof result.content === 'string') return result.content
    if (typeof result.output_text === 'string') return result.output_text
    if (typeof result.text === 'string') return result.text
    if (typeof result.message === 'string') return result.message
    const output = result.output as Array<Record<string, unknown>> | undefined
    if (Array.isArray(output)) {
      const chunks: string[] = []
      for (const item of output) {
        const content = item.content as Array<Record<string, unknown>> | string | undefined
        if (typeof content === 'string') chunks.push(content)
        if (Array.isArray(content)) {
          for (const part of content) {
            if (typeof part.text === 'string') chunks.push(part.text)
          }
        }
      }
      if (chunks.length > 0) return chunks.join('')
    }
    return JSON.stringify(result)
  }
}
