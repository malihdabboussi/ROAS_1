import { Injectable } from '@nestjs/common'
import type { CompanyDreamGroup } from './company-dream-signal-triage.service'

@Injectable()
export class CompanyDreamSemanticClassifierService {
  async classifyGroups(
    groups: CompanyDreamGroup[],
  ): Promise<Array<{ id: string; labels: string[] }>> {
    return groups.map((group) => ({
      id: group.id,
      labels: this.classifyText(group.turns.map((turn) => turn.text).join('\n')),
    }))
  }

  private classifyText(text: string): string[] {
    const normalized = text.toLowerCase()
    const labels: string[] = []
    if (/feels like us|not in your face|subtle|this is the tone|love how/i.test(normalized)) {
      labels.push('taste_positive')
    }
    if (/too polished|salesy|not our vibe|too corporate|too hypey/i.test(normalized)) {
      labels.push('taste_negative')
    }
    if (/asked first|handoff worked/i.test(normalized)) labels.push('agent_behavior_positive')
    if (/automatically|why did you create|don't do that|do not do that/i.test(normalized)) {
      labels.push('agent_behavior_negative')
    }
    if (/good version|needs to include|missing/i.test(normalized)) labels.push('quality_standard')
    if (/we decided|from now on/i.test(normalized)) labels.push('company_decision')
    if (/customers care|buyers always ask|our customers/i.test(normalized)) {
      labels.push('customer_generalization')
    }
    return labels.length > 0 ? labels : ['low_signal']
  }
}
