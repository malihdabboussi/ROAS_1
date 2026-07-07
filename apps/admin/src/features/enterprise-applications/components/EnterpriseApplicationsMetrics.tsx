import type { EnterpriseApplicationsResponse } from '../types/enterprise-applications.types'

export function EnterpriseApplicationsMetrics({
  metrics,
}: {
  metrics: EnterpriseApplicationsResponse['metrics']
}) {
  const cards = [
    { label: 'Total', value: metrics.total },
    { label: 'Pending', value: metrics.pending },
    { label: 'Contacted', value: metrics.contacted },
    { label: 'Approved', value: metrics.approved },
    { label: 'Declined', value: metrics.declined },
    { label: 'From App', value: metrics.fromApp },
    { label: 'From Website', value: metrics.fromWebsite },
  ]
  return (
    <div className="mb-spacing-6 gap-spacing-4 grid sm:grid-cols-3 lg:grid-cols-7">
      {cards.map((c) => (
        <div
          key={c.label}
          className="surface-card rounded-spacing-3 px-spacing-4 py-spacing-3 border border-[var(--border)]"
        >
          <p className="body-3 text-muted-foreground">{c.label}</p>
          <p className="title-h3 text-foreground mt-spacing-1">{c.value}</p>
        </div>
      ))}
    </div>
  )
}
