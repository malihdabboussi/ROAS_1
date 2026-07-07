'use client'

import { Label, PolarGrid, PolarRadiusAxis, RadialBar, RadialBarChart } from 'recharts'
import { Card } from '@/components/ui/card'
import { ChartConfig, ChartContainer } from '@/components/ui/chart'
import type { Profitability } from '../types/finances.types'

interface ProfitabilityGaugesProps {
  profitability: Profitability | null
  loading: boolean
}

export function ProfitabilityGauges({ profitability, loading }: ProfitabilityGaugesProps) {
  if (loading || !profitability) {
    return (
      <div className="gap-spacing-6 grid grid-cols-1 md:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i} className="card-glass p-spacing-6">
            <div className="animate-pulse">
              <div className="bg-muted mb-4 h-6 w-1/3 rounded" />
              <div className="bg-muted h-[250px] rounded" />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  const gauges = [
    {
      title: 'Profit Margin',
      subtitle: 'Percentage of revenue retained after costs',
      value: Math.min(Math.max(profitability.profitMargin, 0), 100),
      display: `${profitability.profitMargin.toFixed(1)}%`,
      label: 'Profit margin',
      color: profitability.profitMargin >= 0 ? '#10b981' : 'rgb(255,149,0)',
      numberClass: profitability.profitMargin >= 0 ? 'text-emerald' : 'text-destructive',
    },
    {
      title: 'ROI',
      subtitle: 'Net profit divided by total cost (same window)',
      value: Math.min(Math.max(profitability.roi * 20, 0), 100),
      display: `${profitability.roi.toFixed(2)}x`,
      label: 'Return on cost',
      color: profitability.roi >= 1 ? '#10b981' : 'rgb(255,149,0)',
      numberClass: profitability.roi >= 1 ? 'text-emerald' : 'text-orange',
    },
  ]

  return (
    <div className="gap-spacing-6 grid grid-cols-1 md:grid-cols-2">
      {gauges.map((g) => (
        <Card key={g.title} className="card-glass p-spacing-6 flex flex-col items-center">
          <h3 className="title-h4 text-foreground mb-spacing-1">{g.title}</h3>
          <p className="body-4 text-muted-foreground mb-spacing-4">{g.subtitle}</p>
          <ChartContainer
            config={{ gauge: { label: g.title, color: g.color } } satisfies ChartConfig}
            className="mx-auto aspect-square max-h-[250px]"
          >
            <RadialBarChart
              data={[{ metric: g.title, value: g.value, fill: g.color }]}
              startAngle={0}
              endAngle={250}
              innerRadius={80}
              outerRadius={110}
            >
              <PolarGrid
                gridType="circle"
                radialLines={false}
                stroke="none"
                className="first:fill-muted last:fill-card"
                polarRadius={[86, 74]}
              />
              <RadialBar dataKey="value" background cornerRadius={10} />
              <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                      const cx = viewBox.cx ?? 0
                      const cy = viewBox.cy ?? 0
                      return (
                        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan
                            x={cx}
                            y={cy}
                            style={{
                              fill: 'var(--foreground)',
                              fontSize: '1.5rem',
                              fontWeight: 700,
                            }}
                          >
                            {g.display}
                          </tspan>
                          <tspan
                            x={cx}
                            y={cy + 22}
                            style={{
                              fill: 'var(--muted-foreground)',
                              fontSize: '0.75rem',
                            }}
                          >
                            {g.label}
                          </tspan>
                        </text>
                      )
                    }
                    return null
                  }}
                />
              </PolarRadiusAxis>
            </RadialBarChart>
          </ChartContainer>
          <div className="mt-spacing-4 w-full text-center">
            <p className={`title-h2 tabular-nums ${g.numberClass}`}>{g.display}</p>
            <p className="body-3 text-muted-foreground mt-spacing-1">{g.label}</p>
          </div>
        </Card>
      ))}
    </div>
  )
}
