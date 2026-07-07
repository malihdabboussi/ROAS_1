import { Injectable, Logger } from '@nestjs/common'
import { MissionOpenclawGateway } from '../missions/services/gateways/mission-openclaw.gateway'
import type { AgentLearningDreamGroup } from './agent-learning-dream.types'

type DreamSessionInput = {
  orgId: string
  userId: string
  agentKey: string
  runId: string
  localDate: string
  groups: AgentLearningDreamGroup[]
  sourceCounts: Record<string, number>
}

@Injectable()
export class AgentLearningDreamJaimeService {
  private readonly logger = new Logger(AgentLearningDreamJaimeService.name)

  constructor(private readonly openclawGateway: MissionOpenclawGateway) {}

  async runAgentDreamSession(
    input: DreamSessionInput,
  ): Promise<{ content: string; toolSteps?: unknown[] }> {
    const fakeMission = {
      id: input.runId,
      user_id: input.userId,
      org_id: input.orgId,
      campaign_id: null,
      correlation_id: input.runId,
      title: 'Jaime Agent Learning Dream',
      brief: 'Review recent agent work and propose guarded skill or agent file improvements',
      priority: 'low',
      assigned_agent_key: 'hr',
      current_agent_key: 'hr',
      input: {},
    }

    const prompt = [
      'You are Jaime running an Agent Learning Dream.',
      'This is a tool-loop session. The final text is not authoritative.',
      'The source of truth is the database rows created by Dream Ops tools.',
      '',
      'Use these tools when useful:',
      '- dream_inspect_agent to inspect the target agent and current org-owned skills.',
      '- dream_search_evidence to inspect collected evidence from this dream window.',
      '- dream_propose_skill_create for a new org-owned skill proposal.',
      '- dream_propose_skill_update for an existing org-owned skill proposal.',
      '- dream_propose_skill_resource_update for a skill reference/resource proposal.',
      '- dream_propose_agent_file_update for org-owned SOUL, ROLE, or IDENTITY file proposals.',
      '- dream_route_out for platform/system/tool-schema/system-skill issues hidden from users.',
      '- dream_finish exactly once when done.',
      '',
      'Rules:',
      '- You may create multiple proposals in one dream session.',
      '- Do not call normal HR apply/edit tools in this dream. They mutate real files.',
      '- Use only dream_propose_* tools for customer-visible learning-loop proposals.',
      '- Do not propose from thumbs alone. Thumbs may strengthen or weaken runtime/tool evidence.',
      '- Customer-visible proposals are only org-owned skills, skill resources, and agent files.',
      '- System skills, system agents, platform schemas, infrastructure, and product issues use dream_route_out.',
      '- If nothing is worth proposing, call dream_finish with a no_action_reason.',
      '',
      `org_id: ${input.orgId}`,
      `target_agent_key: ${input.agentKey}`,
      `dream_run_id: ${input.runId}`,
      `local_date: ${input.localDate}`,
      '',
      'Source counts:',
      JSON.stringify(input.sourceCounts, null, 2),
      '',
      'Evidence:',
      JSON.stringify(input.groups, null, 2),
    ].join('\n')

    const response = await this.openclawGateway.callOpenClawRaw(
      fakeMission,
      'hr',
      '',
      prompt,
      undefined,
      'mission_execute',
      { channel: 'dream-ops' },
    )
    this.logger.log(`agent_learning_dream: Jaime session completed run_id=${input.runId}`)
    return {
      content: String(response.content ?? ''),
      toolSteps: Array.isArray(response.toolSteps) ? response.toolSteps : undefined,
    }
  }
}
