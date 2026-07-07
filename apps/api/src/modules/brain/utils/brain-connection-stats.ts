/** Sum all connection counts from brain_legend_connection_counts (includes emerged_from). */
export function sumBrainConnectionCounts(byType: Record<string, number> | undefined): number {
  if (!byType) return 0
  return Object.values(byType).reduce((sum, value) => sum + (Number(value) || 0), 0)
}
