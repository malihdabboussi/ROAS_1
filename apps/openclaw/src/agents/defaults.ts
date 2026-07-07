// Defaults for agent metadata when upstream does not supply them.
// Default to OpenRouter (Vibey platform baseline).
export const DEFAULT_PROVIDER = "openrouter";
export const DEFAULT_MODEL = "anthropic/claude-opus-4.6";
// Conservative fallback used when model metadata is unavailable.
export const DEFAULT_CONTEXT_TOKENS = 200_000;
