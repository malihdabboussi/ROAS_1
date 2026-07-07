import type { WaitlistResponse } from '../types/waitlist.types'

export function WaitlistMetricsCards({ metrics }: { metrics: WaitlistResponse['metrics'] }) {
  const cards = [
    { label: 'Total signups', value: metrics.total },
    { label: 'Pending', value: metrics.pending },
    { label: 'Invited', value: metrics.invited },
    { label: 'Registered', value: metrics.registered },
    {
      label: 'Machines / cap',
      value: `${metrics.provisionedMachines} / ${metrics.machineCapacity}`,
    },
  ]
  return (
    <div className="mb-spacing-6 gap-spacing-4 grid sm:grid-cols-2 lg:grid-cols-5">
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
