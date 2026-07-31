export function resolveRouterPlugins(
  model: string,
  allowedModels: string[],
  costQualityTradeoff: number,
) {
  if (model !== 'openrouter/auto-beta') return undefined
  return [
    {
      id: 'auto-router' as const,
      allowedModels,
      costQualityTradeoff,
    },
  ]
}
