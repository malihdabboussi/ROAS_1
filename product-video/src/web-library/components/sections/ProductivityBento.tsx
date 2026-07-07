'use client'

import React from 'react'
import { Box, Gift, LayoutTemplate, Mail, Mic } from 'lucide-react'

/* ─── Mini Brain Network — 1:1 port from Nexus ForceGraph ──────── */
/* Uses exact MEMORY_TYPE_COLORS, hexagon + diamond shapes, grid,   */
/* colored relationship edges, and electric pulse animations.       */

// Brain graph colors — sourced from globals.css :root (--brain-*)
const MEM_COLORS = {
  fact: 'var(--brain-mem-fact)',
  decision: 'var(--brain-mem-decision)',
  insight: 'var(--brain-mem-insight)',
  story: 'var(--brain-mem-story)',
  framework: 'var(--brain-mem-framework)',
  preference: 'var(--brain-mem-preference)',
  event: 'var(--brain-mem-event)',
  snapshot: 'var(--brain-mem-snapshot)',
}
const REL_COLORS = {
  supports: 'var(--brain-rel-supports)',
  elaborates: 'var(--brain-rel-elaborates)',
  related_to: 'var(--brain-rel-related_to)',
  caused_by: 'var(--brain-rel-caused_by)',
  evolved_from: 'var(--brain-rel-evolved_from)',
  contradicts: 'var(--brain-rel-contradicts)',
}

interface BNode {
  x: number
  y: number
  r: number
  color: string
  shape: 'hex' | 'diamond' | 'rect'
}

// 80 nodes in concentric rings — radial brain layout
// Center at (50, 60), rings at r=8, r=18, r=30, r=42
const CX = 50,
  CY = 50
const _c = [
  MEM_COLORS.fact,
  MEM_COLORS.insight,
  MEM_COLORS.framework,
  MEM_COLORS.story,
  MEM_COLORS.decision,
  MEM_COLORS.preference,
  MEM_COLORS.event,
  MEM_COLORS.snapshot,
  'var(--brain-ring-extra-1)',
  'var(--brain-ring-extra-2)',
  'var(--brain-ring-extra-3)',
  'var(--brain-ring-extra-4)',
]
const _s: BNode['shape'][] = [
  'hex',
  'hex',
  'hex',
  'hex',
  'hex',
  'hex',
  'diamond',
  'hex',
  'hex',
  'rect',
  'hex',
  'diamond',
]
function _ring(
  count: number,
  radius: number,
  sizeBase: number,
  sizeVar: number,
  offset = 0,
): BNode[] {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + offset
    return {
      x: CX + Math.cos(a) * radius,
      y: CY + Math.sin(a) * radius,
      r: sizeBase + (i % 3) * sizeVar,
      color: _c[i % _c.length],
      shape: _s[i % _s.length],
    }
  })
}
const NODES: BNode[] = [
  // 0: center hub
  { x: CX, y: CY, r: 1.8, color: MEM_COLORS.fact, shape: 'hex' },
  // 1-6: inner ring (6 nodes, r=7)
  ..._ring(6, 7, 1.3, 0.15, 0.2),
  // 7-18: second ring (12 nodes, r=15)
  ..._ring(12, 15, 1.0, 0.1, 0.15),
  // 19-42: third ring (24 nodes, r=24)
  ..._ring(24, 24, 0.8, 0.08, 0.1),
  // 43-79: outer ring (37 nodes, r=32)
  ..._ring(37, 32, 0.6, 0.06, 0.05),
]

// Connections: hub→inner, inner→second, second→third, third→outer + cross-links
interface BEdge {
  from: number
  to: number
  rel: string
}
const _rels = ['supports', 'elaborates', 'related_to', 'caused_by', 'evolved_from', 'contradicts']
const EDGES: BEdge[] = (() => {
  const e: BEdge[] = []
  const rel = (i: number) => _rels[i % _rels.length]
  // Hub to inner ring
  for (let i = 1; i <= 6; i++) e.push({ from: 0, to: i, rel: rel(i) })
  // Inner ring chain + to second ring
  for (let i = 1; i <= 6; i++) {
    e.push({ from: i, to: (i % 6) + 1, rel: rel(i + 6) })
    e.push({ from: i, to: 7 + (i - 1) * 2, rel: rel(i + 12) })
    e.push({ from: i, to: 7 + (i - 1) * 2 + 1, rel: rel(i + 18) })
  }
  // Second ring chain + to third ring
  for (let i = 7; i <= 18; i++) {
    e.push({ from: i, to: i === 18 ? 7 : i + 1, rel: rel(i) })
    e.push({ from: i, to: 19 + (i - 7) * 2, rel: rel(i + 20) })
  }
  // Third ring chain + to outer ring
  for (let i = 19; i <= 42; i++) {
    e.push({ from: i, to: i === 42 ? 19 : i + 1, rel: rel(i) })
    const outerIdx = 43 + Math.floor(((i - 19) * 37) / 24)
    if (outerIdx < 80) e.push({ from: i, to: outerIdx, rel: rel(i + 30) })
  }
  // Outer ring chain
  for (let i = 43; i <= 79; i++) {
    e.push({ from: i, to: i === 79 ? 43 : i + 1, rel: rel(i) })
  }
  // Cross-links across rings for brain-like density
  for (let i = 1; i <= 6; i++) {
    e.push({ from: i, to: 19 + i * 4, rel: rel(i + 40) })
  }
  for (let i = 7; i <= 18; i++) {
    const target = 43 + (((i - 7) * 3) % 37)
    e.push({ from: i, to: target, rel: rel(i + 50) })
  }
  return e
})()

// SVG helpers — exact port from ForceGraph.tsx drawHexagon / drawDiamond
function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`)
  }
  return pts.join(' ')
}
function diamondPoints(cx: number, cy: number, r: number): string {
  return `${cx},${cy - r * 1.3} ${cx + r},${cy} ${cx},${cy + r * 1.3} ${cx - r},${cy}`
}

function BrainNetwork() {
  return (
    <div className="h-full w-full">
      <svg viewBox="10 10 80 80" preserveAspectRatio="xMidYMid meet" className="h-full w-full">
        <defs>
          {EDGES.map((e, i) => {
            const a = NODES[e.from],
              b = NODES[e.to]
            return <path key={`ep${i}`} id={`bp${i}`} d={`M${a.x},${a.y} L${b.x},${b.y}`} />
          })}
        </defs>

        {/* Edges — colored per relationship type */}
        {EDGES.map((e, i) => {
          const a = NODES[e.from],
            b = NODES[e.to]
          const col = REL_COLORS[e.rel as keyof typeof REL_COLORS] || REL_COLORS.related_to
          return (
            <line
              key={`edge${i}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={col}
              strokeWidth="0.3"
              opacity="0.3"
            />
          )
        })}

        {/* Arrow heads */}
        {EDGES.map((e, i) => {
          const a = NODES[e.from],
            b = NODES[e.to]
          const col = REL_COLORS[e.rel as keyof typeof REL_COLORS] || REL_COLORS.related_to
          const angle = Math.atan2(b.y - a.y, b.x - a.x)
          const nr = NODES[e.to].r + 0.5
          const ex = b.x - nr * Math.cos(angle)
          const ey = b.y - nr * Math.sin(angle)
          const hl = 1.5
          const x1 = ex - hl * Math.cos(angle - Math.PI / 6)
          const y1 = ey - hl * Math.sin(angle - Math.PI / 6)
          const x2 = ex - hl * Math.cos(angle + Math.PI / 6)
          const y2 = ey - hl * Math.sin(angle + Math.PI / 6)
          return (
            <g key={`arrow${i}`} stroke={col} strokeWidth="0.25" opacity="0.3" fill="none">
              <line x1={ex} y1={ey} x2={x1} y2={y1} />
              <line x1={ex} y1={ey} x2={x2} y2={y2} />
            </g>
          )
        })}

        {/* Electric pulses along edges */}
        {EDGES.map((e, i) => {
          const col = NODES[e.from].color
          const dur = 2.5 + (i % 6) * 0.5
          const begin = (i * 0.4) % 5
          return (
            <circle key={`pulse${i}`} r="0.8" fill={col} opacity="0">
              <animate
                attributeName="opacity"
                values="0;0.9;0.9;0"
                dur={`${dur}s`}
                begin={`${begin}s`}
                repeatCount="indefinite"
              />
              <animateMotion dur={`${dur}s`} begin={`${begin}s`} repeatCount="indefinite">
                <mpath href={`#bp${i}`} />
              </animateMotion>
            </circle>
          )
        })}

        {/* Node glows */}
        {NODES.map((n, i) => (
          <circle key={`glow${i}`} cx={n.x} cy={n.y} r={n.r * 2.2} fill={n.color} opacity="0.06" />
        ))}

        {/* Nodes — hexagons, diamonds, rects */}
        {NODES.map((n, i) => {
          if (n.shape === 'hex') {
            return (
              <g key={`node${i}`}>
                <polygon points={hexPoints(n.x, n.y, n.r)} fill={n.color} opacity="0.85" />
                <polygon
                  points={hexPoints(n.x, n.y, n.r)}
                  fill="none"
                  stroke={n.color}
                  strokeWidth="0.25"
                  opacity="0.4"
                />
              </g>
            )
          }
          if (n.shape === 'diamond') {
            return (
              <g key={`node${i}`}>
                <polygon points={diamondPoints(n.x, n.y, n.r)} fill={n.color} opacity="0.85" />
                <polygon
                  points={diamondPoints(n.x, n.y, n.r)}
                  fill="none"
                  stroke={n.color}
                  strokeWidth="0.25"
                  opacity="0.4"
                />
                <circle cx={n.x} cy={n.y} r="0.6" fill="var(--fill-diamond-inner)" />
              </g>
            )
          }
          const half = n.r
          return (
            <g key={`node${i}`}>
              <rect
                x={n.x - half}
                y={n.y - half}
                width={half * 2}
                height={half * 2}
                rx="0.8"
                fill={n.color}
                fillOpacity="0.15"
                stroke={n.color}
                strokeWidth="0.3"
                opacity="0.8"
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function ProductivityBento() {
  const entrance = (delay = 0): React.CSSProperties => ({
    animation: `bento-fade-in 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s both`,
  })

  return (
    <section className="bg-color-deep relative overflow-hidden pb-14 pt-20 md:pb-20 md:pt-28">
      <div className="site-container">
        <div className="mx-auto mb-10 max-w-2xl" style={entrance(0)}>
          <h2 className="h1 tracking-tighter text-white">Build faster. Launch smarter.</h2>
          <p className="text-color-muted body-1 mt-6">
            Everything you need to go from idea to live campaign without switching tools.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-6 lg:grid-cols-12">
          {/* Card 1: Funnels (Animated Cards) */}
          <div
            className="glass-card relative h-[400px] overflow-hidden md:col-span-3 lg:col-span-4"
            style={entrance(0.1)}
          >
            <div className="relative z-10 p-8">
              <h3 className="h3 text-white">Automated Funnels</h3>
              <p className="text-color-dim body-3 mt-2">
                Landing pages, presentations, and email sequences built in seconds.
              </p>
            </div>

            <div className="relative z-10 mt-4 flex flex-col items-center gap-4 px-8">
              {[
                {
                  icon: LayoutTemplate,
                  label: 'Landing Page',
                  color: 'var(--accent-emerald)',
                  delay: '0s',
                },
                {
                  icon: Gift,
                  label: 'Presentation',
                  color: 'var(--accent-secondary-light)',
                  delay: '0.2s',
                },
                { icon: Mail, label: 'Email Sequence', color: 'var(--accent-blue)', delay: '0.4s' },
              ].map((item, i) => (
                <div
                  key={i}
                  className="funnel-slide-card border-color-glass bg-color-surface w-full rounded-xl border p-4 shadow-xl"
                  style={{ animationDelay: item.delay }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="bg-color-subtle-hover flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{ color: item.color }}
                    >
                      <item.icon size={18} />
                    </div>
                    <span className="body-3 font-medium text-white">{item.label}</span>
                    <div className="border-emerald-soft bg-emerald-soft ml-auto flex items-center gap-1.5 rounded-full border px-2 py-0.5">
                      <div className="bg-emerald-accent h-1 w-1 animate-pulse rounded-full" />
                      <span className="text-emerald-accent text-[10px]">Ready</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Ambient light beam behind */}
            <div
              className="bento-beam-bg"
              style={
                { '--beam-color': 'rgb(var(--accent-emerald-rgb) / 0.15)' } as React.CSSProperties
              }
            />
          </div>

          {/* Card 2: Voice Chat (Animated Orb) */}
          <div
            className="glass-card relative h-[400px] overflow-hidden md:col-span-3 lg:col-span-4"
            style={entrance(0.2)}
          >
            <div className="relative z-10 p-8">
              <h3 className="h3 text-white">Voice Commands</h3>
              <p className="text-color-dim body-3 mt-2">
                Talk to your marketing agent. Hands-free execution, brain-to-funnel speed.
              </p>
            </div>

            <div className="relative z-10 flex flex-1 flex-col items-center justify-center pt-4">
              <div className="voice-orb-container relative">
                <div className="voice-orb-pulse absolute inset-0 rounded-full" />
                <div className="voice-orb-glass flex h-24 w-24 items-center justify-center rounded-full">
                  <Mic size={32} className="text-color-emerald" />
                </div>
              </div>

              <div className="mt-12 flex h-8 items-end justify-center gap-1">
                {[0.4, 0.7, 0.2, 0.9, 0.5, 0.8, 0.3, 0.6, 0.4].map((h, i) => (
                  <div
                    key={i}
                    className="voice-wave-bar bg-color-emerald w-1 rounded-full"
                    style={{
                      height: `${h * 100}%`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            </div>
            <div
              className="bento-beam-bg"
              style={
                { '--beam-color': 'rgb(var(--accent-secondary-rgb) / 0.15)' } as React.CSSProperties
              }
            />
          </div>

          {/* Card 3: Brain Network (Infinite Context) */}
          <div
            className="glass-card relative h-[400px] overflow-hidden md:col-span-6 lg:col-span-4"
            style={entrance(0.3)}
          >
            {/* Header */}
            <div className="relative z-10 p-8 pb-4">
              <h3 className="h3 text-white">Infinite Context</h3>
              <p className="text-color-dim body-3 mt-2">
                Vibey remembers your brand voice, history, and goals across every task.
              </p>
            </div>

            {/* Brain network — absolutely fills area below header */}
            <div className="absolute inset-0 top-[90px] z-[1] flex items-start justify-start pl-4 pt-2">
              <div className="h-full max-h-[280px] w-full max-w-[280px]">
                <BrainNetwork />
              </div>
            </div>

            {/* Floating NodeDetailModal mockup — bottom right */}
            <div className="border-strong bg-overlay-panel absolute bottom-4 right-4 z-20 w-52 overflow-hidden rounded-xl border shadow-2xl backdrop-blur-md">
              {/* Header */}
              <div className="border-hairline flex items-center gap-1.5 border-b px-3 py-2">
                <div
                  className="h-3.5 w-3.5 rounded-sm"
                  style={{ background: 'var(--accent-secondary)' }}
                />
                <span className="text-color-secondary body-4 font-semibold">Memory</span>
                <span className="text-emerald-accent ml-auto flex items-center gap-0.5 text-[8px]">
                  <span className="bg-emerald-accent inline-block h-1.5 w-1.5 rounded-full" />
                  New
                </span>
              </div>
              {/* Body */}
              <div className="space-y-2 px-3 py-2.5">
                <div>
                  <div className="text-color-dim body-4 font-semibold uppercase tracking-wider">
                    Memory
                  </div>
                  <p className="text-color-secondary mt-0.5 text-[9px] leading-relaxed">
                    SaaS founders respond 3x better to ROI-specific headlines vs. feature lists.
                  </p>
                </div>
                <div>
                  <div className="text-color-dim body-4 font-semibold uppercase tracking-wider">
                    Space
                  </div>
                  <p className="text-color-subtle mt-0.5 font-mono text-[9px]">workspace-brain</p>
                </div>
                <div>
                  <div className="text-color-dim body-4 font-semibold uppercase tracking-wider">
                    Tags
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    <span className="border-strong bg-color-pixel-mid text-color-subtle rounded border px-1.5 py-0.5 text-[8px]">
                      insight
                    </span>
                    <span className="border-strong bg-color-pixel-mid text-color-subtle rounded border px-1.5 py-0.5 text-[8px]">
                      saas
                    </span>
                    <span className="border-strong bg-color-pixel-mid text-color-subtle rounded border px-1.5 py-0.5 text-[8px]">
                      copy
                    </span>
                  </div>
                </div>
              </div>
              {/* Footer */}
              <div className="border-hairline flex items-center justify-between border-t px-3 py-1.5">
                <span className="text-color-dimmer text-[8px]">2/15/2026</span>
                <span className="text-color-faint font-mono text-[8px]"># 9a3dffbb-d321-469c</span>
              </div>
            </div>

            <div
              className="bento-beam-bg"
              style={
                { '--beam-color': 'rgb(var(--accent-emerald-rgb) / 0.1)' } as React.CSSProperties
              }
            />
          </div>

          {/* Card 4: Artifact Preview (Live Render Scroll) */}
          <div
            className="glass-card relative h-[500px] overflow-hidden md:col-span-6 lg:col-span-12"
            style={entrance(0.4)}
          >
            <div className="relative z-10 flex h-full flex-col md:flex-row">
              <div className="p-8 md:w-1/3">
                <div className="bento-icon-tile-emerald mb-4">
                  <Box size={24} />
                </div>
                <h3 className="h2 text-white">Live Production Preview</h3>
                <p className="text-color-dim body-2 mt-4 leading-relaxed">
                  Watch your landing pages and funnels render in real-time. No code, no staging,
                  just production-ready assets instantly.
                </p>
                <div className="mt-8 flex flex-col gap-3">
                  {['Instant Hosting', 'SSR Optimized', 'Global Edge CDN'].map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <div className="bg-emerald-accent h-1 w-1 rounded-full" />
                      <span className="text-color-secondary body-3">{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-color-deep-darker relative flex-1 p-4 sm:p-8">
                <div className="border-color-glass bg-color-deep h-full w-full overflow-hidden rounded-xl border shadow-2xl">
                  {/* Browser Toolbar */}
                  <div className="border-color-glass flex items-center gap-2 border-b px-4 py-2">
                    <div className="flex gap-1.5">
                      <div className="bg-dot-close h-2 w-2 rounded-full" />
                      <div className="bg-dot-minimize h-2 w-2 rounded-full" />
                      <div className="h-2 w-2 rounded-full bg-[var(--dot-expand)]" />
                    </div>
                    <div className="bg-color-subtle-hover text-color-faint ml-4 flex-1 rounded px-3 py-0.5 text-[10px]">
                      your-funnel.govibey.com
                    </div>
                  </div>

                  {/* Auto-scrolling content */}
                  <div className="artifact-scroll-container h-full overflow-hidden">
                    <div className="artifact-scroll-content space-y-8 p-8">
                      {/* Original Content */}
                      <div className="text-center">
                        <div className="bento-chart-fade mx-auto mb-4 h-12 w-32 rounded" />
                        <h4 className="h2 text-white">
                          Scale your SaaS <br />
                          without the noise.
                        </h4>
                        <p className="text-color-dim body-3 mx-auto mt-4 max-w-sm">
                          The only platform that handles your entire sales pipeline so you can focus
                          on building.
                        </p>
                        <div className="bg-emerald-accent text-on-emerald body-3 mt-6 inline-block rounded-lg px-6 py-2 font-bold">
                          Join Waitlist
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="border-slot bg-color-pixel h-24 rounded-lg border"
                          />
                        ))}
                      </div>
                      <div className="bento-secondary-glow border-slot h-40 rounded-lg border" />

                      {/* Duplicated Content for Seamless Scroll */}
                      <div className="text-center">
                        <div className="bento-chart-fade mx-auto mb-4 h-12 w-32 rounded" />
                        <h4 className="h2 text-white">
                          Scale your SaaS <br />
                          without the noise.
                        </h4>
                        <p className="text-color-dim body-3 mx-auto mt-4 max-w-sm">
                          The only platform that handles your entire sales pipeline so you can focus
                          on building.
                        </p>
                        <div className="bg-emerald-accent text-on-emerald body-3 mt-6 inline-block rounded-lg px-6 py-2 font-bold">
                          Join Waitlist
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={`dup-${i}`}
                            className="border-slot bg-color-pixel h-24 rounded-lg border"
                          />
                        ))}
                      </div>
                      <div className="bento-secondary-glow border-slot h-40 rounded-lg border" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div
              className="bento-beam-bg"
              style={
                { '--beam-color': 'rgb(var(--accent-secondary-rgb) / 0.1)' } as React.CSSProperties
              }
            />
          </div>
        </div>
      </div>
    </section>
  )
}
