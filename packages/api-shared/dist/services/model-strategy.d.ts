export type ModelStrategy = 'auto' | 'auto:economy' | 'auto:power';
export type ChatGenerationStage = 'research' | 'write';
export type TaskType = 'chat' | 'mission_plan' | 'mission_execute' | 'mission_review' | 'mission_awareness' | 'mission_quality_eval';
export type StrategyModelReasoningEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
export interface StrategyModelSettings {
    reasoning_effort?: StrategyModelReasoningEffort;
    context_window_tokens?: number;
    speed_mode?: 'standard' | 'fast';
}
export interface ResolvedStrategyModel {
    modelId: string;
    reason: string;
    modelSettings?: StrategyModelSettings;
}
export declare function isModelStrategy(value: unknown): value is ModelStrategy;
export declare function resolveModelForStrategy(strategy: ModelStrategy, task: TaskType): ResolvedStrategyModel;
export declare function resolveChatStageModel(strategy: ModelStrategy, stage: ChatGenerationStage): ResolvedStrategyModel;
export declare function resolveFallbackForStrategy(strategy: ModelStrategy, task: TaskType): ResolvedStrategyModel;
