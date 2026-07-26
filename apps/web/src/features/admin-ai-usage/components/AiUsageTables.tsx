import type { AdminAiUsageReport } from '../types/admin-ai-usage.types'

const integer = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 3,
})

export function AiUsageTables({ report }: { report: AdminAiUsageReport }) {
  return (
    <>
      <DataTable
        title="OpenRouter breakdown"
        subtitle="The workload and underlying model behind every OpenRouter request."
        headers={[
          'Workload',
          'Requested model',
          'Resolved model',
          'Calls',
          'Tokens',
          'Cost',
          'Unsettled',
        ]}
        rows={report.openRouterModels.map((row) => [
          row.workload,
          row.requestedModel,
          row.resolvedModel ?? 'Not reported',
          integer.format(row.attempts),
          compact.format(row.tokens),
          usd.format(row.costUsd),
          integer.format(row.unsettled),
        ])}
      />
      <DataTable
        title="Model workload"
        subtitle="All traced models, including subscription-backed OpenAI/Codex runs."
        headers={['Model', 'Route', 'Runs', 'Tokens', 'Cost', 'Failed']}
        rows={report.models.map((row) => [
          row.model,
          row.routeId,
          integer.format(row.traces),
          compact.format(row.tokens),
          usd.format(row.costUsd),
          integer.format(row.failed),
        ])}
      />
      <DataTable
        title="Highest-cost traces"
        subtitle="The first place to inspect oversized or unexpectedly expensive work."
        headers={['When', 'Channel', 'Model', 'Status', 'Tokens', 'Cost']}
        rows={report.recentCostlyTraces.map((row) => [
          new Date(row.createdAt).toLocaleString(),
          row.channel,
          row.model,
          row.status,
          compact.format(row.tokens),
          usd.format(row.costUsd),
        ])}
      />
    </>
  )
}

function DataTable({
  title,
  subtitle,
  headers,
  rows,
}: {
  title: string
  subtitle: string
  headers: string[]
  rows: string[][]
}) {
  return (
    <section className="surface-card rounded-spacing-3 border-border overflow-hidden border">
      <div className="p-spacing-4">
        <h2 className="body-1 text-foreground font-semibold">{title}</h2>
        <p className="body-4 text-muted-foreground mt-spacing-1">{subtitle}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="body-3 w-full text-left">
          <thead className="bg-secondary text-muted-foreground">
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  className="px-spacing-4 py-spacing-2 whitespace-nowrap font-medium"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {rows.map((row, rowIndex) => (
              <tr key={`${title}-${rowIndex}`} className="hover:bg-hover-subtle">
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${rowIndex}-${cellIndex}`}
                    className="text-foreground px-spacing-4 py-spacing-3 max-w-80 whitespace-nowrap"
                  >
                    <span className="block truncate">{cell}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
