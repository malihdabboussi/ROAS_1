export interface AdCanvasAgentDefinition {
  agentKey: string
  displayName: string
  skillKey: string
  description: string
  bestFor: string
}

/** Default agents available on the canvas before dynamic discovery. */
export const AD_CANVAS_AGENTS: readonly AdCanvasAgentDefinition[] = [
  {
    agentKey: 'vibey',
    displayName: 'Vibey',
    skillKey: 'ad-builder',
    description: 'Full ad creative system — strategy, image, copy, campaign structure.',
    bestFor: 'End-to-end ad creation from brief to saved ad.',
  },
  {
    agentKey: 'designer',
    displayName: 'Lux',
    skillKey: 'ad-creative-design',
    description: 'Visual ad design — TSX layouts and image-first creatives.',
    bestFor: 'Design my ad visuals and make them look on-brand.',
  },
] as const

export const AD_CANVAS_AGENT_SKILL_KEYS = [
  'ad-builder',
  'premium-ad-image-generation',
  'ad-creative-design',
] as const

export type AdCanvasAgentSkillKey = (typeof AD_CANVAS_AGENT_SKILL_KEYS)[number]
