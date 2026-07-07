'use client'

interface CreditBarProps {
  used: number
  total: number
  label?: string
}

export default function CreditBar({ used, total, label }: CreditBarProps) {
  const remaining = Math.max(0, total - used)
  const percentage = total > 0 ? Math.min(100, (used / total) * 100) : 0

  // Color transitions: green → yellow → red based on usage
  const getBarColorClass = () => {
    if (percentage < 60) return 'bg-primary'
    if (percentage < 85) return 'bg-amber-500'
    return 'bg-destructive'
  }

  const formatNumber = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K` : n.toString()

  return (
    <div>
      {label && <p className="body-3 mb-spacing-1 text-muted-foreground">{label}</p>}
      <div className="mb-spacing-2 flex items-center justify-between">
        <span className="body-2 text-foreground font-medium">
          {formatNumber(remaining)} remaining
        </span>
        <span className="body-3 text-muted-foreground">
          {formatNumber(used)} / {formatNumber(total)} used
        </span>
      </div>
      <div className="bg-secondary h-2.5 w-full overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${getBarColorClass()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
