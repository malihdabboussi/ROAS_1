import type { AdminAiUsageReport } from '../types/admin-ai-usage.types'

export type SpendChartRow = { date: string } & Record<string, string | number>

export type SpendChartSeries = {
  key: string
  model: string
  total: number
}

function dateStrings(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const current = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(`${endDate}T00:00:00.000Z`)
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10))
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return dates
}

export function buildSpendChartData(
  range: AdminAiUsageReport['range'],
  dailyModelSpend: AdminAiUsageReport['dailyModelSpend'],
): { rows: SpendChartRow[]; series: SpendChartSeries[] } {
  const totals = new Map<string, number>()
  for (const item of dailyModelSpend) {
    totals.set(item.model, (totals.get(item.model) ?? 0) + item.costUsd)
  }
  const ranked = [...totals.entries()]
    .filter(([, cost]) => cost > 0)
    .sort(
      ([leftModel, leftCost], [rightModel, rightCost]) =>
        rightCost - leftCost || leftModel.localeCompare(rightModel),
    )
  const topModels = ranked.slice(0, 5)
  const groupedModels = new Set(ranked.slice(5).map(([model]) => model))
  const series: SpendChartSeries[] = topModels.map(([model, total], index) => ({
    key: `model_${index + 1}`,
    model,
    total,
  }))
  if (groupedModels.size > 0) {
    series.push({
      key: 'model_other',
      model: 'Other',
      total: ranked.slice(5).reduce((sum, [, cost]) => sum + cost, 0),
    })
  }

  const modelKeys = new Map(series.map((item) => [item.model, item.key]))
  const rows = dateStrings(range.startDate, range.endDate).map<SpendChartRow>((date) => {
    const row: SpendChartRow = { date }
    for (const item of series) row[item.key] = 0
    return row
  })
  const rowsByDate = new Map(rows.map((row) => [row.date, row]))
  for (const item of dailyModelSpend) {
    const row = rowsByDate.get(item.date)
    if (!row) continue
    const key = groupedModels.has(item.model) ? 'model_other' : modelKeys.get(item.model)
    if (key) row[key] = Number(row[key] ?? 0) + item.costUsd
  }
  return { rows, series }
}
