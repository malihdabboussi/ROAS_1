import type { CSSProperties, ReactNode } from 'react'

export function LegendSectionLabel({ children }: { children: ReactNode }) {
  return <p className="typo-section-label text-muted-foreground">{children}</p>
}

interface LegendMarkerRowProps {
  label: ReactNode
  count?: number
  className?: string
  style: CSSProperties
}

export function LegendMarkerRow({
  label,
  count,
  className = 'h-2.5 w-2.5 flex-shrink-0 rounded-sm',
  style,
}: LegendMarkerRowProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={className} style={style} />
      <span className="body-3 text-muted-foreground">{label}</span>
      {count != null && <LegendCount>{count}</LegendCount>}
    </div>
  )
}

interface LegendLineRowProps {
  label: string
  count?: number
  varName: string
}

export function LegendLineRow({ label, count, varName }: LegendLineRowProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex w-3 flex-shrink-0 items-center">
        <div
          className="h-px w-full"
          style={{
            background: `rgba(var(${varName}), 0.8)`,
            boxShadow: `0 0 4px rgba(var(${varName}), 0.5)`,
          }}
        />
      </div>
      <span className="body-3 text-muted-foreground capitalize">{label}</span>
      {count != null && <LegendCount>{count}</LegendCount>}
    </div>
  )
}

export function LegendCount({ children }: { children: number }) {
  return <span className="typo-caption text-muted-foreground ml-auto">{children}</span>
}
