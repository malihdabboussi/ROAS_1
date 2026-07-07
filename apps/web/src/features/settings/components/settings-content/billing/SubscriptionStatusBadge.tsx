'use client'

interface SubscriptionStatusBadgeProps {
  status: string
  cancelAtPeriodEnd: boolean
}

export function SubscriptionStatusBadge({
  status,
  cancelAtPeriodEnd,
}: SubscriptionStatusBadgeProps) {
  // If active but set to cancel, show "Canceling"
  if (status === 'active' && cancelAtPeriodEnd) {
    return <StatusPill label="Canceling" bg="#f59e0b20" fg="#fbbf24" />
  }

  const statusConfig: Record<string, { label: string; bg: string; fg: string }> = {
    active: { label: 'Active', bg: '#22c55e20', fg: '#4ade80' },
    trialing: { label: 'Trial', bg: '#3b82f620', fg: '#60a5fa' },
    past_due: { label: 'Past Due', bg: '#ef444420', fg: '#f87171' },
    unpaid: { label: 'Unpaid', bg: '#ef444420', fg: '#f87171' },
    canceled: {
      label: 'Canceled',
      bg: 'var(--color-secondary)',
      fg: 'var(--color-muted-foreground)',
    },
  }

  const config = statusConfig[status] ?? statusConfig.canceled!

  return <StatusPill label={config.label} bg={config.bg} fg={config.fg} />
}

function StatusPill({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: bg, color: fg }}
    >
      {label}
    </span>
  )
}
