export const MODEL_STRATEGIES = [
  {
    id: 'auto:economy',
    label: 'Economy',
    description: 'Discounted Terra with lighter thinking for routine work',
    chipClass: 'chip-glass-green',
    textClass: 'text-chip-strategy-green',
  },
  {
    id: 'auto',
    label: 'Auto',
    description: 'Discounted Terra with balanced thinking for everyday work',
    chipClass: 'chip-glass-blue',
    textClass: 'text-chip-strategy-blue',
  },
  {
    id: 'auto:power',
    label: 'Power',
    description: 'Opus 5 for highest-stakes work',
    chipClass: 'chip-glass-purple',
    textClass: 'text-chip-strategy-purple',
  },
] as const

export type ModelStrategy = (typeof MODEL_STRATEGIES)[number]
export type ModelStrategyId = ModelStrategy['id']

export function isModelStrategyId(value: string | null | undefined): value is ModelStrategyId {
  return value === 'auto' || value === 'auto:economy' || value === 'auto:power'
}

export function agentModelId(agent: { config?: unknown }): string {
  const cfg = (agent.config as Record<string, unknown> | null | undefined) ?? {}
  return typeof cfg.model_id === 'string' && cfg.model_id.length > 0 ? cfg.model_id : 'auto'
}

export function resolveAgentModelDisplay(
  modelId: string,
  modelOptions?: ReadonlyArray<{ id: string; label: string }>,
): { id: string; label: string; chipClass: string } {
  const strategy = MODEL_STRATEGIES.find((s) => s.id === modelId)
  if (strategy) {
    return { id: modelId, label: strategy.label, chipClass: strategy.chipClass }
  }
  const known = modelOptions?.find((m) => m.id === modelId)
  const raw = (known?.label ?? modelId).trim()
  const label = raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : modelId
  return { id: modelId, label, chipClass: 'chip-glass-neutral' }
}
