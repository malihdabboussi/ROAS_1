export function formatBudget(cents: number | null): string {
  if (!cents) return 'Not set'
  return `$${(cents / 100).toFixed(2)}/day`
}

export function hasPositiveBudget(value: number | null | undefined): boolean {
  return typeof value === 'number' && value > 0
}
