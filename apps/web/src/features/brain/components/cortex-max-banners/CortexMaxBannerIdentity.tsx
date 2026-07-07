'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const BELIEFS = [
  { id: 'organic', label: 'Organic > Paid', color: '#a855f7', angle: 0 },
  { id: 'community', label: 'Community first', color: '#818cf8', angle: 72 },
  { id: 'bootstrap', label: 'Bootstrap path', color: '#c084fc', angle: 144 },
  { id: 'quality', label: 'Quality over speed', color: '#6366f1', angle: 216 },
  { id: 'authenticity', label: 'Real > polished', color: '#a78bfa', angle: 288 },
]

function DataPacket({
  x1,
  y1,
  x2,
  y2,
  color,
  delay,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  delay: number
}) {
  return (
    <motion.circle
      r="1.2"
      fill={color}
      initial={{ opacity: 0, cx: x1, cy: y1 }}
      animate={{ opacity: [0, 0.8, 0], cx: [x1, x2], cy: [y1, y2] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay }}
      style={{ filter: `drop-shadow(0 0 3px ${color})` }}
    />
  )
}

export function CortexMaxBannerIdentity() {
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    let frame: number
    const animate = () => {
      setRotation((p) => (p + 0.08) % 360)
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])

  const cx = 130
  const cy = 110
  const outerR = 80
  const innerR = 55

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      <div
        className="compare-hero-brain-grid pointer-events-none absolute inset-0 opacity-30"
        aria-hidden
      />

      <div className="pointer-events-none absolute left-5 top-4 z-10">
        <p className="text-muted-foreground/50 text-[8px] font-black uppercase tracking-[0.25em]">
          Identity Formation
        </p>
      </div>

      <svg
        viewBox="0 0 260 220"
        className="text-muted-foreground/25 relative z-10 h-full max-h-full w-full max-w-full"
      >
        <circle
          cx={cx}
          cy={cy}
          r={outerR}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.35"
          strokeWidth="0.5"
        />
        <circle
          cx={cx}
          cy={cy}
          r={innerR}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.5"
          strokeWidth="0.5"
        />
        <circle
          cx={cx}
          cy={cy}
          r={30}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.4"
          strokeWidth="0.5"
        />

        {BELIEFS.map((belief, idx) => {
          const angle = ((belief.angle + rotation) * Math.PI) / 180
          const bx = cx + outerR * Math.cos(angle)
          const by = cy + outerR * Math.sin(angle)

          return (
            <React.Fragment key={belief.id}>
              <line
                x1={bx}
                y1={by}
                x2={cx}
                y2={cy}
                stroke={belief.color}
                strokeOpacity={0.06}
                strokeWidth="0.4"
              />

              <DataPacket x1={bx} y1={by} x2={cx} y2={cy} color={belief.color} delay={idx * 0.4} />

              <circle cx={bx} cy={by} r="8" fill={belief.color} fillOpacity={0.08} />

              <motion.circle
                cx={bx}
                cy={by}
                r="3.5"
                fill={belief.color}
                fillOpacity={0.8}
                animate={{ r: [3.5, 4, 3.5] }}
                transition={{ duration: 3, repeat: Infinity, delay: idx * 0.6 }}
                style={{ filter: `drop-shadow(0 0 4px ${belief.color})` }}
              />

              <text
                x={bx}
                y={by + 12}
                textAnchor="middle"
                fill="currentColor"
                fillOpacity={0.55}
                style={{ fontSize: '5px', fontWeight: 700, letterSpacing: '0.05em' }}
              >
                {belief.label}
              </text>
            </React.Fragment>
          )
        })}

        {[0, 120, 240].map((angle, idx) => {
          const a = ((angle + rotation * 1.5) * Math.PI) / 180
          const px = cx + innerR * Math.cos(a)
          const py = cy + innerR * Math.sin(a)
          const colors = ['#a855f7', '#6366f1', '#c084fc']
          return (
            <React.Fragment key={`p-${idx}`}>
              <circle cx={px} cy={py} r="5" fill={colors[idx]} fillOpacity={0.06} />
              <motion.circle
                cx={px}
                cy={py}
                r="2.5"
                fill={colors[idx]}
                fillOpacity={0.6}
                animate={{ r: [2.5, 3, 2.5] }}
                transition={{ duration: 4, repeat: Infinity, delay: idx * 1.3 }}
                style={{ filter: `drop-shadow(0 0 3px ${colors[idx]})` }}
              />
            </React.Fragment>
          )
        })}

        <circle cx={cx} cy={cy} r="16" fill="url(#identityGlow)" />
        <motion.circle
          cx={cx}
          cy={cy}
          r="6"
          fill="currentColor"
          fillOpacity={0.85}
          animate={{ r: [6, 6.5, 6], fillOpacity: [0.85, 1, 0.85] }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{ filter: 'drop-shadow(0 0 8px color-mix(in srgb, var(--color-foreground) 40%, transparent))' }}
        />

        <text
          x={cx}
          y={cy + 26}
          textAnchor="middle"
          fill="currentColor"
          fillOpacity={0.45}
          style={{
            fontSize: '6px',
            fontWeight: 900,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
          }}
        >
          Identity
        </text>

        <defs>
          <radialGradient id="identityGlow">
            <stop offset="0%" stopColor="var(--color-foreground)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--color-foreground)" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>

      <div className="cortex-max-banner-grid absolute inset-0 -z-10" aria-hidden />
    </div>
  )
}
