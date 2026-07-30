export function stripOpenRouterPrefixFromSubscriptionModel(model: string): string {
  let normalized = model.trim()
  while (normalized.startsWith('openrouter/openrouter/')) {
    normalized = normalized.replace(/^openrouter\//, '')
  }
  const lower = normalized.toLowerCase()
  if (
    lower.startsWith('openrouter/openai-codex/') ||
    lower.startsWith('openrouter/anthropic-subscription/')
  ) {
    return normalized.slice('openrouter/'.length)
  }
  return normalized
}
