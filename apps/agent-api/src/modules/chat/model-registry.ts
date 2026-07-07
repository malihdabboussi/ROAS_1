/**
 * Model Registry — Single source of truth for model metadata.
 *
 * Maps model IDs to their context window sizes.
 * Used by chat.service.ts to determine when to summarize conversations.
 * Must mirror models in openclaw.json and frontend ModelSelector.tsx.
 */

export interface ModelInfo {
  contextWindow: number
  label: string
}

export const MODEL_REGISTRY: Record<string, ModelInfo> = {
  'google/gemini-3.5-flash': {
    contextWindow: 1050000,
    label: 'Gemini 3.5 Flash',
  },
  'google/gemini-3.1-pro-preview': {
    contextWindow: 1050000,
    label: 'Gemini 3.1 Pro',
  },
  'deepseek/deepseek-v4-flash': {
    contextWindow: 1048576,
    label: 'DeepSeek V4 Flash',
  },
  'minimax/minimax-m2.5': {
    contextWindow: 204800,
    label: 'MiniMax M2.5',
  },
  'gemini-2.5-flash': { contextWindow: 1000000, label: 'Gemini 2.5 Flash' },
  'gemini-2.5-pro': { contextWindow: 1000000, label: 'Gemini Pro' },
  'anthropic/claude-fable-5': { contextWindow: 1000000, label: 'Fable 5' },
  'anthropic/claude-haiku-4.5': { contextWindow: 200000, label: 'Haiku 4.5' },
  'anthropic/claude-opus-4.6': { contextWindow: 1000000, label: 'Opus 4.6' },
  'anthropic/claude-opus-4.6-fast': { contextWindow: 1000000, label: 'Opus 4.6 Fast' },
  'anthropic/claude-opus-4.7': { contextWindow: 1000000, label: 'Opus 4.7' },
  'anthropic/claude-opus-4.7-fast': { contextWindow: 1000000, label: 'Opus 4.7 Fast' },
  'anthropic/claude-opus-4.8': { contextWindow: 1000000, label: 'Opus 4.8' },
  'anthropic/claude-opus-4.8-fast': { contextWindow: 1000000, label: 'Opus 4.8 Fast' },
  'anthropic/claude-opus-4-20250514': { contextWindow: 200000, label: 'Opus' },
  'anthropic/claude-sonnet-4.6': { contextWindow: 1000000, label: 'Sonnet 4.6' },
  'anthropic/claude-sonnet-4-20250514': { contextWindow: 200000, label: 'Sonnet' },
  'openai/gpt-5.4': { contextWindow: 1050000, label: 'GPT-5.4' },
  'openai/gpt-5.4-pro': { contextWindow: 1050000, label: 'GPT-5.4 Pro' },
  'openai/gpt-5.5': { contextWindow: 1050000, label: 'GPT-5.5' },
  'openai/gpt-5.3-codex': { contextWindow: 400000, label: 'GPT-5.3 Codex' },
}

const DEFAULT_CONTEXT_WINDOW = 200000

export function getContextWindow(modelId: string | undefined | null): number {
  if (!modelId) return DEFAULT_CONTEXT_WINDOW
  return MODEL_REGISTRY[modelId]?.contextWindow ?? DEFAULT_CONTEXT_WINDOW
}
