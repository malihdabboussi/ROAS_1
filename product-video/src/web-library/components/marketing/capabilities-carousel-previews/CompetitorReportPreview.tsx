'use client'

import { useId } from 'react'

/** Area sparkline — same visual language as admin `DashboardMetricsCards` Revenue Trends (emerald fill, dashed grid). */
function StrategyBriefTrendChart() {
  const gid = useId().replace(/:/g, '')
  const values = [118, 124, 121, 132, 148, 156, 164]
  const w = 320
  const h = 88
  const padX = 8
  const padY = 10
  const minV = Math.min(...values) * 0.94
  const maxV = Math.max(...values) * 1.03
  const n = values.length
  const pts = values.map((v, i) => {
    const x = padX + (i / Math.max(1, n - 1)) * (w - 2 * padX)
    const y = padY + (1 - (v - minV) / (maxV - minV)) * (h - 2 * padY)
    return { x, y }
  })
  const lineD = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')
  const baseY = (h - padY).toFixed(1)
  const areaD = `${lineD} L ${pts[n - 1].x.toFixed(1)} ${baseY} L ${pts[0].x.toFixed(1)} ${baseY} Z`
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const y = padY + t * (h - 2 * padY)
    return (
      <line
        key={t}
        x1={padX}
        x2={w - padX}
        y1={y}
        y2={y}
        stroke="#E5E7EB"
        strokeWidth={1}
        strokeDasharray="4 4"
      />
    )
  })

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`pdfChartFill-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#10b981" stopOpacity={0.78} />
          <stop offset="95%" stopColor="#10b981" stopOpacity={0.08} />
        </linearGradient>
      </defs>
      {gridLines}
      <path d={areaD} fill={`url(#pdfChartFill-${gid})`} />
      <path
        d={lineD}
        fill="none"
        stroke="#10b981"
        strokeWidth={2.25}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Strategy Brief PDF — dense text, KPI strip, admin-style trend chart. */
export function CompetitorReportPreview() {
  const kpis = [
    { label: 'Pipeline (90d)', value: '$2.4M', delta: '+18.2%', up: true },
    { label: 'SQL → Close', value: '31.4%', delta: '+4.1 pts', up: true },
    { label: 'Blended CAC', value: '$2,180', delta: '−9.6%', up: true },
  ] as const

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: '#fff',
        fontFamily: '"Source Sans 3", system-ui, sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          height: '100%',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          boxSizing: 'border-box',
          padding: '18px 20px 20px',
        }}
      >
        <div style={{ borderBottom: '3px solid #10B981', paddingBottom: 12, marginBottom: 14 }}>
          <h1
            style={{
              fontSize: 19,
              fontWeight: 900,
              color: '#111827',
              marginBottom: 4,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
            }}
          >
            STRATEGY BRIEF: Q2 GROWTH & CHANNEL EFFICIENCY
          </h1>
          <p style={{ fontSize: 10, color: '#6B7280', fontWeight: 600, letterSpacing: '0.04em' }}>
            CONFIDENTIAL · STRATEGY OPS · APR 2026 · VERSION 2.1
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 8,
            marginBottom: 14,
          }}
        >
          {kpis.map((k) => (
            <div
              key={k.label}
              style={{
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: 10,
                padding: '10px 10px 8px',
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#6B7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 6,
                }}
              >
                {k.label}
              </div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 900,
                  color: '#111827',
                  lineHeight: 1,
                  marginBottom: 4,
                }}
              >
                {k.value}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: k.up ? '#059669' : '#DC2626' }}>
                {k.delta} vs prior quarter
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            background: '#F9FAFB',
            padding: '14px 16px',
            borderRadius: 10,
            border: '1px solid #E5E7EB',
            marginBottom: 12,
          }}
        >
          <h2 style={{ fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
            1. Executive summary
          </h2>
          <p
            style={{
              fontSize: 11,
              lineHeight: 1.58,
              color: '#374151',
              margin: 0,
              marginBottom: 10,
            }}
          >
            Enterprise demand remains resilient: marketing-qualified volume grew{' '}
            <strong>14%</strong> quarter-over-quarter while sales-accepted leads held a{' '}
            <strong>92%</strong> acceptance rate. The constraint is not top-of-funnel awareness — it
            is speed-to-SQL and consistent nurture after the first human touch.
          </p>
          <p style={{ fontSize: 11, lineHeight: 1.58, color: '#374151', margin: 0 }}>
            We recommend doubling down on high-intent channels where CAC payback is under{' '}
            <strong>11 months</strong>, retiring two underperforming content series that drove{' '}
            <strong>22%</strong> of spend but only <strong>6%</strong> of sourced revenue, and
            tightening handoffs between outbound and product-led signups to protect pipeline
            hygiene.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.15fr',
            gap: 10,
            marginBottom: 12,
            alignItems: 'stretch',
          }}
        >
          <div
            style={{
              background: '#F9FAFB',
              padding: '14px 16px',
              borderRadius: 10,
              border: '1px solid #E5E7EB',
              minWidth: 0,
            }}
          >
            <h2 style={{ fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
              2. Competitive pressure
            </h2>
            <p style={{ fontSize: 11, lineHeight: 1.55, color: '#4B5563', margin: '0 0 10px' }}>
              Two peers raised positioning spend in search and comparison keywords; impression share
              on non-brand terms slipped <strong>7 points</strong> in March. Win/loss interviews
              cite proof velocity (time-to-ROI narrative) more often than pricing.
            </p>
            <ul
              style={{
                margin: 0,
                paddingLeft: 16,
                fontSize: 11,
                lineHeight: 1.5,
                color: '#374151',
              }}
            >
              <li style={{ marginBottom: 6 }}>
                Top rival shortened demo-to-trial from <strong>14.2 → 6.1</strong> days (rolling 90d
                median).
              </li>
              <li style={{ marginBottom: 6 }}>
                Our technical win rate when a security review starts within <strong>48h</strong> is{' '}
                <strong>64%</strong>; when delayed, it falls to <strong>38%</strong>.
              </li>
              <li>
                Referenceable customers in Fintech vertical: <strong>11</strong> active,{' '}
                <strong>4</strong> in late procurement.
              </li>
            </ul>
          </div>

          <div
            style={{
              background: '#FFFFFF',
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid #E5E7EB',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 6,
                gap: 8,
              }}
            >
              <h2 style={{ fontSize: 12, fontWeight: 800, color: '#111827', margin: 0 }}>
                3. Qualified pipeline trend
              </h2>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#6B7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Trailing 7 weeks · $K
              </span>
            </div>
            <p style={{ fontSize: 10, lineHeight: 1.45, color: '#6B7280', margin: '0 0 8px' }}>
              Weekly qualified opportunity value in $ thousands; seven-week trailing window.
            </p>
            <StrategyBriefTrendChart />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 6,
                fontSize: 9,
                fontWeight: 600,
                color: '#9CA3AF',
              }}
            >
              {['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7'].map((lb) => (
                <span key={lb}>{lb}</span>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#F9FAFB',
            padding: '14px 16px',
            borderRadius: 10,
            border: '1px solid #E5E7EB',
          }}
        >
          <h2 style={{ fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
            4. Channel allocation (next 60 days)
          </h2>
          <p style={{ fontSize: 11, lineHeight: 1.55, color: '#4B5563', margin: '0 0 10px' }}>
            Reallocate roughly <strong>$180K</strong> from broad awareness into intent capture:
            retargeting engaged accounts, partner co-marketing, and lifecycle email upgrades tied to
            product usage triggers. Expect blended CPL to rise slightly (<strong>+6–9%</strong>)
            while SQL quality improves.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              {
                ch: 'Meta paid social',
                pct: '28%',
                note: 'Lookalike refresh + creative batch every 10 days',
              },
              {
                ch: 'LinkedIn ABM',
                pct: '22%',
                note: 'Tier-1 accounts only; 4-touch sequence cap',
              },
              {
                ch: 'Lifecycle & product-email',
                pct: '24%',
                note: 'Behavior triggers for PQL → sales-assist',
              },
              {
                ch: 'Content & SEO',
                pct: '18%',
                note: 'Prune low-converting clusters; three pillar pages',
              },
              {
                ch: 'Events & field',
                pct: '8%',
                note: 'Two flagship dinners; strict RSVP-to-SQL SLA',
              },
            ].map((row, i) => (
              <div
                key={row.ch}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  fontSize: 11,
                  color: '#374151',
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    background: '#10B981',
                    color: '#fff',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontWeight: 800, color: '#111827' }}>{row.pct}</span>
                  {` · ${row.ch} — `}
                  <span style={{ color: '#4B5563' }}>{row.note}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
