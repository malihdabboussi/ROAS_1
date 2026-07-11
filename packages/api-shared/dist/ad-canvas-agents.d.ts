export interface AdCanvasAgentDefinition {
    agentKey: string;
    displayName: string;
    skillKey: string;
    description: string;
    bestFor: string;
}
export declare const AD_CANVAS_AGENTS: readonly AdCanvasAgentDefinition[];
export declare const AD_CANVAS_AGENT_SKILL_KEYS: readonly ["ad-builder", "premium-ad-image-generation", "ad-creative-design"];
export type AdCanvasAgentSkillKey = (typeof AD_CANVAS_AGENT_SKILL_KEYS)[number];
