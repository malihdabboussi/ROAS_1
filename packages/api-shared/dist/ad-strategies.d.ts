export type AdStrategyKey = 'visual_contrast' | 'founder_authority' | 'product_hero' | 'ugc_native' | 'bold_offer' | 'social_proof' | 'problem_symptom' | 'transformation' | 'comparison' | 'curiosity_pattern';
export type AdFormatRecommendation = 'single_image' | 'carousel' | 'video' | 'story';
export interface AdStrategyDefinition {
    key: AdStrategyKey;
    name: string;
    description: string;
    whenToUse: string;
    requiredAssets: string[];
    recommendedFormat: AdFormatRecommendation;
    defaultPromptTemplate: string;
    suggestedOverlay: string;
}
export declare const AD_STRATEGIES: readonly AdStrategyDefinition[];
export declare const AD_STRATEGY_BY_KEY: Record<AdStrategyKey, AdStrategyDefinition>;
export declare function getAdStrategy(key: AdStrategyKey): AdStrategyDefinition;
