export function formatAgencyDate(value: unknown): string {
  if (typeof value !== 'string' || !value) return 'Not set'

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value)

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatAgencyBudget(
  amount: number | null | undefined,
  currency?: string | null,
  budgetType?: string | null,
): string {
  if (amount == null) return 'Not set'
  const prefix = currency || '$'
  return `${prefix}${amount.toLocaleString()}${budgetType ? ` / ${budgetType}` : ''}`
}
