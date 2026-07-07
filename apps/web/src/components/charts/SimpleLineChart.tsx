'use client'

import { useId, useMemo, useState } from 'react'

interface DataPoint {
  date: string
  value: number
}

export type SimpleChartType = 'area' | 'line' | 'bar' | 'pie'

interface SimpleLineChartProps {
  data: DataPoint[]
  color?: string
  height?: number
  /** When false, only the stroke is drawn (no gradient fill). Default true. Ignored when chartType is set. */
  showArea?: boolean
  /** Area/line/bar/pie. When omitted, uses showArea (true -> area, false -> line). */
  chartType?: SimpleChartType
}

/**
 * Minimal SVG charts for analytics: area, line, bar, and pie. No external dependencies.
 */
export function SimpleLineChart({
  data,
  color = 'var(--color-primary)',
  height = 120,
  showArea = true,
  chartType,
}: SimpleLineChartProps) {
  const uid = useId().replace(/:/g, '')
  const variant: SimpleChartType = chartType ?? (showArea ? 'area' : 'line')
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const lineMemo = useMemo(() => {
    if (!data.length || variant === 'bar' || variant === 'pie') {
      return {
        path: '',
        areaPath: '',
        points: [] as Array<{ x: number; y: number; date: string; value: number }>,
      }
    }

    const values = data.map((d) => d.value)
    const max = Math.max(...values, 1)
    const w = 100
    const h = 100
    const padding = 2

    const pts = data.map((d, i) => ({
      x: padding + (i / Math.max(data.length - 1, 1)) * (w - padding * 2),
      y: padding + (1 - d.value / max) * (h - padding * 2),
      date: d.date,
      value: d.value,
    }))

    const first = pts[0]!
    let linePath = `M ${first.x} ${first.y}`
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1]!
      const curr = pts[i]!
      const cpx = (prev.x + curr.x) / 2
      linePath += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`
    }

    const last = pts[pts.length - 1]!
    const area = `${linePath} L ${last.x} ${h} L ${first.x} ${h} Z`

    return { path: linePath, areaPath: area, points: pts }
  }, [data, variant])

  const barMemo = useMemo(() => {
    if (!data.length || variant !== 'bar') {
      return {
        bars: [] as Array<{
          left: number
          top: number
          w: number
          h: number
          cx: number
          date: string
          value: number
        }>,
      }
    }
    const values = data.map((d) => d.value)
    const max = Math.max(...values, 1)
    const n = data.length
    const pad = 4
    const chartW = 100 - pad * 2
    const slot = chartW / n
    const bw = slot * 0.72
    const maxH = 100 - pad * 2

    const bars = data.map((d, i) => {
      const barH = (d.value / max) * maxH
      const left = pad + i * slot + (slot - bw) / 2
      const top = 100 - pad - barH
      return { left, top, w: bw, h: barH, cx: left + bw / 2, date: d.date, value: d.value }
    })
    return { bars }
  }, [data, variant])

  type PieSlice =
    | {
        kind: 'arc'
        d: string
        midX: number
        midY: number
        date: string
        value: number
      }
    | {
        kind: 'circle'
        midX: number
        midY: number
        date: string
        value: number
      }

  const pieMemo = useMemo(() => {
    if (!data.length || variant !== 'pie') {
      return { slices: [] as PieSlice[] }
    }
    const values = data.map((d) => d.value)
    const total = values.reduce((a, b) => a + b, 0)
    if (total <= 0) {
      return { slices: [] as PieSlice[] }
    }

    const cx = 50
    const cy = 50
    const r = 38
    let angle = -Math.PI / 2
    const slices: PieSlice[] = []

    for (let i = 0; i < data.length; i++) {
      const d = data[i]!
      const slice = (d.value / total) * 2 * Math.PI
      if (slice <= 0) continue

      if (data.length === 1 && d.value > 0) {
        slices.push({
          kind: 'circle',
          midX: cx,
          midY: cy - r * 0.45,
          date: d.date,
          value: d.value,
        })
        break
      }

      const a0 = angle
      const a1 = angle + slice
      const x0 = cx + r * Math.cos(a0)
      const y0 = cy + r * Math.sin(a0)
      const x1 = cx + r * Math.cos(a1)
      const y1 = cy + r * Math.sin(a1)
      const largeArc = slice > Math.PI ? 1 : 0
      const dPath = `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${largeArc} 1 ${x1} ${y1} Z`
      const midAngle = a0 + slice / 2
      const midX = cx + r * 0.62 * Math.cos(midAngle)
      const midY = cy + r * 0.62 * Math.sin(midAngle)
      slices.push({ kind: 'arc', d: dPath, midX, midY, date: d.date, value: d.value })
      angle = a1
    }

    return { slices }
  }, [data, variant])

  if (!data.length) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <span className="typo-caption text-muted-foreground">No data yet</span>
      </div>
    )
  }

  if (variant === 'pie' && pieMemo.slices.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <span className="typo-caption text-muted-foreground">No data yet</span>
      </div>
    )
  }

  const gradientId = `chart-gradient-${uid}`

  const hoveredPoint =
    variant !== 'bar' && variant !== 'pie' && hoveredIndex !== null
      ? (lineMemo.points[hoveredIndex] ?? null)
      : null
  const hoveredBar =
    variant === 'bar' && hoveredIndex !== null ? (barMemo.bars[hoveredIndex] ?? null) : null
  const hoveredSlice =
    variant === 'pie' && hoveredIndex !== null ? (pieMemo.slices[hoveredIndex] ?? null) : null

  const tooltipTopPx = (() => {
    if (hoveredPoint) return Math.max(8, (hoveredPoint.y / 100) * height - 44)
    if (hoveredBar) return Math.max(8, (hoveredBar.top / 100) * height - 44)
    if (hoveredSlice) return Math.max(8, (hoveredSlice.midY / 100) * height - 44)
    return 8
  })()

  const tooltipLeftPct = (() => {
    if (hoveredPoint) return hoveredPoint.x
    if (hoveredBar) return hoveredBar.cx
    if (hoveredSlice) return hoveredSlice.midX
    return 50
  })()

  const tooltipDate = hoveredPoint?.date ?? hoveredBar?.date ?? hoveredSlice?.date
  const tooltipValue = hoveredPoint?.value ?? hoveredBar?.value ?? hoveredSlice?.value

  if (variant === 'bar') {
    return (
      <div className="relative" style={{ height }} onMouseLeave={() => setHoveredIndex(null)}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%' }}
        >
          {barMemo.bars.map((b, i) => (
            <rect
              key={`${b.date}-${i}`}
              x={b.left}
              y={b.top}
              width={b.w}
              height={Math.max(b.h, 0.5)}
              rx={1.2}
              fill={color}
              fillOpacity={hoveredIndex === i ? 1 : 0.75}
              onMouseEnter={() => setHoveredIndex(i)}
            />
          ))}
        </svg>
        {tooltipDate != null && tooltipValue != null && hoveredIndex !== null && (
          <div
            className="border-border bg-card/95 pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border px-2 py-1 shadow-md"
            style={{ left: `${tooltipLeftPct}%`, top: tooltipTopPx }}
          >
            <p className="typo-caption text-muted-foreground">
              {new Date(tooltipDate).toLocaleDateString()}
            </p>
            <p className="body-3 text-foreground font-medium">{tooltipValue.toLocaleString()}</p>
          </div>
        )}
      </div>
    )
  }

  if (variant === 'pie') {
    const n = pieMemo.slices.length
    return (
      <div className="relative" style={{ height }} onMouseLeave={() => setHoveredIndex(null)}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: '100%' }}
        >
          {pieMemo.slices.map((s, i) =>
            s.kind === 'circle' ? (
              <circle
                key={`${s.date}-${i}`}
                cx={50}
                cy={50}
                r={38}
                fill={color}
                fillOpacity={0.85}
                stroke={color}
                strokeOpacity={0.35}
                strokeWidth={0.35}
                vectorEffect="non-scaling-stroke"
                onMouseEnter={() => setHoveredIndex(i)}
                style={{ opacity: hoveredIndex === null || hoveredIndex === i ? 1 : 0.55 }}
              />
            ) : (
              <path
                key={`${s.date}-${i}`}
                d={s.d}
                fill={color}
                fillOpacity={0.28 + 0.72 * (n <= 1 ? 1 : i / Math.max(n - 1, 1))}
                stroke={color}
                strokeOpacity={0.35}
                strokeWidth={0.35}
                vectorEffect="non-scaling-stroke"
                onMouseEnter={() => setHoveredIndex(i)}
                style={{ opacity: hoveredIndex === null || hoveredIndex === i ? 1 : 0.55 }}
              />
            ),
          )}
        </svg>
        {tooltipDate != null && tooltipValue != null && hoveredIndex !== null && (
          <div
            className="border-border bg-card/95 pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border px-2 py-1 shadow-md"
            style={{ left: `${tooltipLeftPct}%`, top: tooltipTopPx }}
          >
            <p className="typo-caption text-muted-foreground">
              {new Date(tooltipDate).toLocaleDateString()}
            </p>
            <p className="body-3 text-foreground font-medium">{tooltipValue.toLocaleString()}</p>
          </div>
        )}
      </div>
    )
  }

  const { path, areaPath, points } = lineMemo
  const showFill = variant === 'area'

  return (
    <div className="relative" style={{ height }} onMouseLeave={() => setHoveredIndex(null)}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {showFill ? <path d={areaPath} fill={`url(#${gradientId})`} /> : null}
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {hoveredPoint ? (
          <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="2.4" fill={color} />
        ) : null}
        {points.map((point, idx) => (
          <g key={`${point.date}-${idx}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill="transparent"
              onMouseEnter={() => setHoveredIndex(idx)}
            />
          </g>
        ))}
      </svg>
      {hoveredPoint && (
        <div
          className="border-border bg-card/95 pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border px-2 py-1 shadow-md"
          style={{ left: `${hoveredPoint.x}%`, top: tooltipTopPx }}
        >
          <p className="typo-caption text-muted-foreground">
            {new Date(hoveredPoint.date).toLocaleDateString()}
          </p>
          <p className="body-3 text-foreground font-medium">
            {hoveredPoint.value.toLocaleString()}
          </p>
        </div>
      )}
    </div>
  )
}
