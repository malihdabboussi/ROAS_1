import { Injectable } from '@nestjs/common'
import type { AgentLearningDreamGroup } from './agent-learning-dream.types'

type TriageOptions = {
  maxGroups: number
}

@Injectable()
export class AgentLearningDreamTriageService {
  async triageGroups(
    groups: AgentLearningDreamGroup[],
    options: TriageOptions,
  ): Promise<{ included: AgentLearningDreamGroup[] }> {
    const ranked = groups
      .map((group) => ({ group, score: this.score(group) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, options.maxGroups))

    return { included: ranked.map((item) => item.group) }
  }

  private score(group: AgentLearningDreamGroup): number {
    const text = group.text.toLowerCase()
    let score = 1
    if (group.source === 'skill_recommendation_event') score += 5
    if (group.source === 'agent_turn_feedback') score += 4
    if (group.source === 'trace') score += 3
    if (group.source === 'space_item_activity' || group.source === 'mission_log') score += 2
    if (text.includes('thumbs_up: false')) score += 4
    if (text.includes('failed') || text.includes('error')) score += 3
    if (text.includes('tool') || text.includes('schema')) score += 2
    if (group.text.trim().length < 8) score -= 2
    return score
  }
}
