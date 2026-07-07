export function isSocialResearchAnalyzed(customData: Record<string, unknown>): boolean {
  return typeof customData.analyzed_at === 'string' && customData.analyzed_at.trim().length > 0
}

export function hasSocialResearchFormulaBreakdown(customData: Record<string, unknown>): boolean {
  const breakdown = customData.video_breakdown
  return Boolean(breakdown && typeof breakdown === 'object' && !Array.isArray(breakdown))
}

export function resolveSocialResearchEnrichmentFlags(customData: Record<string, unknown>): {
  analyzed: boolean
  hasFormulaBreakdown: boolean
} {
  return {
    analyzed: isSocialResearchAnalyzed(customData),
    hasFormulaBreakdown: hasSocialResearchFormulaBreakdown(customData),
  }
}
