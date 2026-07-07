export type CompanyDreamGroup = {
  id: string
  source:
    | 'conversation'
    | 'channel_thread'
    | 'space_activity'
    | 'deliverable'
    | 'conversation_document'
  turns: Array<{ role: 'user' | 'assistant' | 'agent' | 'system' | 'tool'; text: string }>
  metadata?: Record<string, unknown>
}

export type CompanyDreamTriageResult = {
  included: Array<CompanyDreamGroup & { reason: string; labels?: string[] }>
  skipped: Array<{ id: string; reason: string }>
}

type SemanticClassifier = {
  classifyGroups(groups: CompanyDreamGroup[]): Promise<Array<{ id: string; labels: string[] }>>
}

const HOT_SIGNAL_PATTERNS = [
  /\bnext time\b/i,
  /\bdon['’]?t\b/i,
  /\bnever\b/i,
  /\balways\b/i,
  /\bmust\b/i,
  /\bshould\b/i,
  /\bstop\b/i,
  /\bavoid\b/i,
  /\btoo much\b/i,
  /\bwrong\b/i,
  /\bnot like this\b/i,
  /\bkeep this\b/i,
  /\buse this\b/i,
  /\bthis is good\b/i,
  /\bfrom now on\b/i,
]

const LOW_CONTEXT_ACKNOWLEDGEMENTS = new Set(['thanks', 'thank you', 'ok', 'okay', 'continue'])
const HIGH_SIGNAL_LABELS = new Set([
  'taste_positive',
  'taste_negative',
  'agent_behavior_positive',
  'agent_behavior_negative',
  'quality_standard',
  'company_decision',
  'customer_generalization',
])

export class CompanyDreamSignalTriageService {
  constructor(private readonly deps: { semanticClassifier: SemanticClassifier }) {}

  async triageGroups(
    groups: CompanyDreamGroup[],
    options: { maxGroups: number },
  ): Promise<CompanyDreamTriageResult> {
    const included: CompanyDreamTriageResult['included'] = []
    const skipped: CompanyDreamTriageResult['skipped'] = []
    const borderline: CompanyDreamGroup[] = []

    for (const group of groups) {
      if (this.isHardNoise(group)) {
        skipped.push({ id: group.id, reason: 'hard_noise' })
        continue
      }

      if (this.hasHotSignal(group)) {
        included.push({ ...group, reason: 'deterministic_hot_signal' })
        continue
      }

      if (this.isLowContextAcknowledgement(group)) {
        skipped.push({ id: group.id, reason: 'low_context_acknowledgement' })
        continue
      }

      borderline.push(group)
    }

    if (borderline.length > 0) {
      const classifications = await this.deps.semanticClassifier.classifyGroups(borderline)
      const labelsById = new Map(classifications.map((item) => [item.id, item.labels]))

      for (const group of borderline) {
        const labels = labelsById.get(group.id) ?? []
        if (labels.some((label) => HIGH_SIGNAL_LABELS.has(label))) {
          included.push({ ...group, reason: 'semantic_high_signal', labels })
        } else if (included.length < options.maxGroups) {
          included.push({ ...group, reason: 'semantic_uncertain', labels })
        } else {
          skipped.push({ id: group.id, reason: 'digest_budget' })
        }
      }
    }

    return {
      included: included.slice(0, options.maxGroups),
      skipped,
    }
  }

  private hasHotSignal(group: CompanyDreamGroup): boolean {
    return HOT_SIGNAL_PATTERNS.some((pattern) => pattern.test(this.groupText(group)))
  }

  private isLowContextAcknowledgement(group: CompanyDreamGroup): boolean {
    const userTexts = group.turns
      .filter((turn) => turn.role === 'user')
      .map((turn) => turn.text.trim().toLowerCase())
      .filter(Boolean)
    return userTexts.length > 0 && userTexts.every((text) => LOW_CONTEXT_ACKNOWLEDGEMENTS.has(text))
  }

  private isHardNoise(group: CompanyDreamGroup): boolean {
    if (group.turns.length === 0) return true
    if (group.turns.every((turn) => turn.role === 'system' || turn.role === 'tool')) return true

    const lastHumanIndex = this.findLastTurnIndex(group, (role) => role === 'user')
    const lastAssistantIndex = this.findLastTurnIndex(
      group,
      (role) => role === 'assistant' || role === 'agent',
    )
    if (lastAssistantIndex > lastHumanIndex) {
      const assistantText = group.turns[lastAssistantIndex]?.text ?? ''
      if (assistantText.length > 3000) return true
    }

    return false
  }

  private groupText(group: CompanyDreamGroup): string {
    return group.turns.map((turn) => turn.text).join('\n')
  }

  private findLastTurnIndex(
    group: CompanyDreamGroup,
    predicate: (role: CompanyDreamGroup['turns'][number]['role']) => boolean,
  ): number {
    for (let i = group.turns.length - 1; i >= 0; i--) {
      const role = group.turns[i]?.role
      if (role && predicate(role)) return i
    }
    return -1
  }
}
