'use client'

interface OutlierChipProps {
  score: number
}

export function OutlierChip({ score }: OutlierChipProps) {
  let color: string | undefined
  if (score >= 3) color = '#34d399'
  else if (score >= 2) color = '#facc15'

  return (
    <span className="badge-glass badge-glass-muted whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium">
      <span style={color ? { color } : undefined}>{score.toFixed(1)}x</span>
    </span>
  )
}
