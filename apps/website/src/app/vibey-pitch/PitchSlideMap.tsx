'use client'

/**
 * Pitch deck map — visual graph of all slides on a fixed “world” rectangle (BOARD_W × BOARD_H).
 *
 * - **Pan / zoom**: CSS transform on one layer (`translate3d` + `scale`), origin top-left.
 * - **Overview vs detail**: Below `baselineZoom * DETAIL_ZOOM_FACTOR`, non-`isCore` nodes are hidden and only
 *   `CORE_SPINE_IDS` edges draw — fast mental model of the story spine. Zoom in to see every slide + all edges.
 * - **Navigate**: Click a card → `onSelectSlide` (parent closes map and jumps the deck).
 * - **fitToView**: Scales the whole board into the viewport with padding; `fitScaleRef` stores that baseline for the detail threshold.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Crosshair, Maximize2, Minus, Plus } from 'lucide-react'

export type PitchMapNode = {
  id: string
  slide: number
  label: string
  shortLabel: string
  x: number
  y: number
  isCore: boolean
}

const PITCH_MAP_NODES: PitchMapNode[] = [
  // ─── Cover / Founders / Opening (lane y=8) ────────────────────────────────
  { id: 's0', slide: 0, label: 'Cover', shortLabel: 'Cover', x: 4, y: 8, isCore: true },
  { id: 's1', slide: 1, label: 'The Shift', shortLabel: 'Shift', x: 14, y: 8, isCore: true },
  {
    id: 's25',
    slide: 2,
    label: 'Founders — track record',
    shortLabel: 'Founders',
    x: 24,
    y: 8,
    isCore: true,
  },
  {
    id: 's2',
    slide: 3,
    label: 'Problem — Generalist Agents',
    shortLabel: 'Agents',
    x: 34,
    y: 8,
    isCore: true,
  },
  {
    id: 's2b',
    slide: 4,
    label: 'Problem — Tool Sprawl',
    shortLabel: 'Sprawl',
    x: 44,
    y: 8,
    isCore: false,
  },
  // ─── The Solution (lane y=20) ─────────────────────────────────────────────
  {
    id: 's3',
    slide: 5,
    label: 'Outcomes, not tools',
    shortLabel: 'Outcomes',
    x: 10,
    y: 20,
    isCore: true,
  },
  // ─── Your Workforce (lane y=32) ───────────────────────────────────────────
  {
    id: 's5',
    slide: 6,
    label: 'Workforce reveal',
    shortLabel: 'Workforce',
    x: 10,
    y: 32,
    isCore: true,
  },
  {
    id: 's6',
    slide: 7,
    label: 'Day 1 onboarding',
    shortLabel: 'Org chart',
    x: 22,
    y: 32,
    isCore: false,
  },
  // ─── Demo (lane y=46) ─────────────────────────────────────────────────────
  // Capabilities slides moved to appendix; Live Demo bridges Workforce → Use Cases
  { id: 's16', slide: 8, label: 'Live demo', shortLabel: 'Demo', x: 10, y: 46, isCore: true },
  // ─── Use Cases (lane y=60) ────────────────────────────────────────────────
  // SurprisingUseCasesIntro removed — use cases stand alone now
  {
    id: 's18',
    slide: 9,
    label: 'Brian — finance',
    shortLabel: 'Brian',
    x: 8,
    y: 60,
    isCore: false,
  },
  {
    id: 's19',
    slide: 10,
    label: 'ROAS — onboarding',
    shortLabel: 'ROAS',
    x: 22,
    y: 60,
    isCore: false,
  },
  {
    id: 's20',
    slide: 11,
    label: 'Neel Dhingra — $1M webinar',
    shortLabel: 'Neel',
    x: 36,
    y: 60,
    isCore: true,
  },
  {
    id: 's20b',
    slide: 12,
    label: 'Adley — viral content',
    shortLabel: 'Adley',
    x: 50,
    y: 60,
    isCore: false,
  },
  // ─── Business Story (lane y=74) ───────────────────────────────────────────
  // Founders moved to slide 3 — closes the gap left in this lane
  { id: 's21', slide: 13, label: 'The model', shortLabel: 'Model', x: 8, y: 74, isCore: false },
  { id: 's22', slide: 14, label: 'Traction', shortLabel: 'Traction', x: 20, y: 74, isCore: true },
  {
    id: 's23',
    slide: 15,
    label: 'Competition',
    shortLabel: 'Compete',
    x: 32,
    y: 74,
    isCore: true,
  },
  { id: 's24', slide: 16, label: 'Go-to-market', shortLabel: 'GTM', x: 44, y: 74, isCore: false },
  {
    id: 's26',
    slide: 17,
    label: 'Team ops',
    shortLabel: 'Team',
    x: 56,
    y: 74,
    isCore: false,
  },
  { id: 's27', slide: 18, label: 'Market', shortLabel: 'Market', x: 68, y: 74, isCore: false },
  // ─── Closing (lane y=86) ──────────────────────────────────────────────────
  // Vision removed — closing tightens to Funding → Ask → CTA
  {
    id: 's28',
    slide: 19,
    label: 'Funding & runway',
    shortLabel: 'Funding',
    x: 14,
    y: 86,
    isCore: false,
  },
  { id: 's29', slide: 20, label: 'The ask — $1.5M / 10%', shortLabel: 'Ask', x: 42, y: 86, isCore: true },
  { id: 's31', slide: 21, label: 'CTA — Ready to scale', shortLabel: 'CTA', x: 72, y: 86, isCore: true },
  // ─── Appendix (lane y=96, parked behind end card) ─────────────────────────
  {
    id: 's4',
    slide: 22,
    label: 'Appendix · Meet Vibey',
    shortLabel: 'Meet',
    x: 4,
    y: 96,
    isCore: false,
  },
  { id: 's7', slide: 23, label: 'HR & library', shortLabel: 'HR', x: 14, y: 96, isCore: false },
  {
    id: 's8',
    slide: 24,
    label: 'Four pillars',
    shortLabel: 'Pillars',
    x: 24,
    y: 96,
    isCore: false,
  },
  { id: 's9', slide: 25, label: 'Brain', shortLabel: 'Brain', x: 34, y: 96, isCore: false },
  {
    id: 's10',
    slide: 26,
    label: 'Cloud computer',
    shortLabel: 'Cloud',
    x: 44,
    y: 96,
    isCore: false,
  },
  { id: 's11', slide: 27, label: 'Skills', shortLabel: 'Skills', x: 54, y: 96, isCore: false },
  {
    id: 's12',
    slide: 28,
    label: 'Pre-loaded & hireable',
    shortLabel: 'Preload',
    x: 64,
    y: 96,
    isCore: false,
  },
  {
    id: 's13',
    slide: 29,
    label: 'Integrations',
    shortLabel: 'Intgrtns',
    x: 74,
    y: 96,
    isCore: false,
  },
  {
    id: 's14',
    slide: 30,
    label: 'GTM capabilities',
    shortLabel: 'GTM Cap',
    x: 84,
    y: 96,
    isCore: false,
  },
  {
    id: 's15',
    slide: 31,
    label: 'Autopilot + north star',
    shortLabel: 'Autopilot',
    x: 94,
    y: 96,
    isCore: false,
  },
]

const PITCH_MAP_EDGES: [string, string][] = [
  // Cover → Shift → Founders → Problem (Founders is the new credibility beat at slide 3)
  ['s0', 's1'],
  ['s1', 's25'],
  ['s25', 's2'],
  ['s2', 's2b'],
  // Problem → Solution → Workforce → Day 1 → Demo (capabilities pushed to appendix)
  ['s2b', 's3'],
  ['s3', 's5'],
  ['s5', 's6'],
  ['s6', 's16'],
  // Demo → Use Cases (Surprising UC intro removed — use cases stand alone)
  ['s16', 's18'],
  ['s18', 's19'],
  ['s19', 's20'],
  ['s20', 's20b'],
  // Use Cases → Business Story (Founders moved out of this chain to slide 3)
  ['s20b', 's21'],
  ['s21', 's22'],
  ['s22', 's23'],
  ['s23', 's24'],
  ['s24', 's26'],
  ['s26', 's27'],
  // Business Story → Closing (Vision removed)
  ['s27', 's28'],
  ['s28', 's29'],
  ['s29', 's31'],
  // Closing → Appendix chain (Meet Vibey first preview, then capability deep-dives)
  ['s31', 's4'],
  ['s4', 's7'],
  ['s7', 's8'],
  ['s8', 's9'],
  ['s9', 's10'],
  ['s10', 's11'],
  ['s11', 's12'],
  ['s12', 's13'],
  ['s13', 's14'],
  ['s14', 's15'],
]

const CORE_SPINE_IDS: string[] = [
  's0', // Cover
  's25', // Founders — credibility beat right after the cover
  's2', // Problem — Generalist Agents (lead beat)
  's3', // Outcomes, not tools (the solution)
  's5', // Workforce reveal
  's16', // Live demo (the proof-in-motion)
  's20', // Neel — proof use case
  's22', // Traction (3 paying clients — proof beat)
  's23', // Competition
  's29', // The ask — $1.5M / 10%
  's31', // CTA (end card — Ready to scale)
]

/** Canvas size in px — pan/zoom applies to this layer; coords are % of this box. */
const BOARD_W = 2000
const BOARD_H = 1320
const MIN_ZOOM = 0.1
const MAX_ZOOM = 3.2
const DETAIL_ZOOM_FACTOR = 1.38
/** When centering on the current slide, prefer at least this × baseline fit zoom (readable thumbnails). */
const LOCATE_ZOOM_MIN_FACTOR = 1.22
const LOCATE_ZOOM_CAP = 1.85

type MapView = { zoom: number; pan: { x: number; y: number } }

function nodeById(id: string) {
  return PITCH_MAP_NODES.find((n) => n.id === id)
}

function curvedPath(a: { x: number; y: number }, b: { x: number; y: number }) {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const px = -dy / len
  const py = dx / len
  const bend = Math.min(5, len * 0.22)
  const cx = mx + px * bend
  const cy = my + py * bend
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`
}

function hueForSlide(slideIndex: number) {
  return (slideIndex * 47) % 360
}

/** Dark 16:9 mini “slide screenshot” — reads as deck chrome, not a separate theme. */
function SlideMapThumbnail({
  slideIndex,
  shortLabel,
  isCore,
  active,
}: {
  slideIndex: number
  shortLabel: string
  isCore: boolean
  active: boolean
}) {
  const h = hueForSlide(slideIndex)
  const wPx = isCore ? 'w-[118px] sm:w-[128px]' : 'w-[100px] sm:w-[108px]'
  return (
    <div
      className={`relative overflow-hidden rounded-md border shadow-lg transition-[box-shadow,transform] duration-200 ${wPx} max-w-[128px] ${
        active
          ? 'border-emerald-400/90 shadow-[0_0_24px_rgba(52,211,153,0.35)] ring-2 ring-emerald-500/50'
          : 'border-white/12 bg-[#0a0a0b] hover:border-white/25 hover:shadow-xl'
      } `}
      style={{ aspectRatio: '16 / 9' }}
    >
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background: `linear-gradient(135deg, hsla(${h}, 35%, 22%, 0.95) 0%, #09090b 55%, hsla(${(h + 40) % 360}, 30%, 14%, 0.9) 100%)`,
        }}
      />
      <div className="absolute inset-x-0 top-0 h-[18%] border-b border-white/[0.07] bg-black/25" />
      <div className="absolute left-[8%] right-[8%] top-[28%] space-y-1">
        <div
          className="h-1 rounded-full bg-white/[0.12]"
          style={{ width: `${55 + (slideIndex % 5) * 8}%` }}
        />
        <div
          className="h-1 rounded-full bg-white/[0.08]"
          style={{ width: `${40 + (slideIndex % 4) * 6}%` }}
        />
        <div className="h-1 w-2/3 rounded-full bg-white/[0.06]" />
      </div>
      <div className="absolute bottom-1 left-1 right-1 flex items-end justify-between gap-1">
        <span className="line-clamp-1 text-left text-[8px] font-semibold leading-tight text-white/75">
          {shortLabel}
        </span>
        <span className="shrink-0 rounded bg-black/50 px-1 py-0.5 font-mono text-[7px] tabular-nums text-emerald-400/95">
          {slideIndex + 1}
        </span>
      </div>
    </div>
  )
}

type PitchSlideMapProps = {
  onSelectSlide: (slideIndex: number) => void
  currentSlide: number
}

export function PitchSlideMap({ onSelectSlide, currentSlide }: PitchSlideMapProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const fitScaleRef = useRef(0.4)
  const viewRef = useRef<MapView>({ zoom: 0.4, pan: { x: 0, y: 0 } })
  const panningRef = useRef(false)

  const [view, setView] = useState<MapView>({ zoom: 0.4, pan: { x: 0, y: 0 } })
  const [ready, setReady] = useState(false)
  const [isPanning, setIsPanning] = useState(false)

  const dragRef = useRef<{ px: number; py: number; pan0: { x: number; y: number } } | null>(null)

  useEffect(() => {
    viewRef.current = view
  }, [view])

  const fitToView = useCallback(() => {
    const vp = viewportRef.current
    if (!vp) return
    const pad = 20
    const vw = vp.clientWidth
    const vh = vp.clientHeight
    const s = Math.min((vw - pad * 2) / BOARD_W, (vh - pad * 2) / BOARD_H)
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, s))
    fitScaleRef.current = clamped
    const next: MapView = {
      zoom: clamped,
      pan: {
        x: (vw - BOARD_W * clamped) / 2,
        y: (vh - BOARD_H * clamped) / 2,
      },
    }
    viewRef.current = next
    setView(next)
  }, [])

  useLayoutEffect(() => {
    fitToView()
    setReady(true)
  }, [fitToView])

  useEffect(() => {
    const ro = new ResizeObserver(() => {
      if (panningRef.current) return
      fitToView()
    })
    const vp = viewportRef.current
    if (vp) ro.observe(vp)
    return () => ro.disconnect()
  }, [fitToView])

  const showDetailNodes = view.zoom >= fitScaleRef.current * DETAIL_ZOOM_FACTOR

  const spinePaths = useMemo(() => {
    const out: { d: string; key: string }[] = []
    for (let i = 0; i < CORE_SPINE_IDS.length - 1; i++) {
      const ia = CORE_SPINE_IDS[i]!
      const ib = CORE_SPINE_IDS[i + 1]!
      const A = nodeById(ia)
      const B = nodeById(ib)
      if (!A || !B) continue
      out.push({ d: curvedPath(A, B), key: `spine-${ia}-${ib}` })
    }
    return out
  }, [])

  /** Last core-spine milestone index reached at or before `currentSlide` (deck order). */
  const coreSpineMilestoneIndex = useMemo(() => {
    let best = -1
    for (let i = 0; i < CORE_SPINE_IDS.length; i++) {
      const n = nodeById(CORE_SPINE_IDS[i]!)
      if (n && n.slide <= currentSlide) best = i
    }
    return best
  }, [currentSlide])

  const spinePathsProgress = useMemo(() => {
    if (coreSpineMilestoneIndex < 1) return [] as { d: string; key: string }[]
    const out: { d: string; key: string }[] = []
    for (let i = 0; i < coreSpineMilestoneIndex; i++) {
      const ia = CORE_SPINE_IDS[i]!
      const ib = CORE_SPINE_IDS[i + 1]!
      const A = nodeById(ia)
      const B = nodeById(ib)
      if (!A || !B) continue
      out.push({ d: curvedPath(A, B), key: `spine-prog-${ia}-${ib}` })
    }
    return out
  }, [coreSpineMilestoneIndex])

  const edgePaths = useMemo(() => {
    return PITCH_MAP_EDGES.map(([ia, ib], i) => {
      const A = nodeById(ia)
      const B = nodeById(ib)
      if (!A || !B) return null
      return { d: curvedPath(A, B), key: `${ia}-${ib}-${i}` }
    }).filter(Boolean) as { d: string; key: string }[]
  }, [])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const vp = viewportRef.current
    if (!vp) return
    const rect = vp.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08
    setView((v) => {
      const prev = v.zoom
      const p = v.pan
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev * factor))
      const worldX = (mx - p.x) / prev
      const worldY = (my - p.y) / prev
      const out = {
        zoom: next,
        pan: { x: mx - worldX * next, y: my - worldY * next },
      }
      viewRef.current = out
      return out
    })
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-map-card]')) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    panningRef.current = true
    dragRef.current = {
      px: e.clientX,
      py: e.clientY,
      pan0: { ...viewRef.current.pan },
    }
    setIsPanning(true)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    e.preventDefault()
    const dx = e.clientX - d.px
    const dy = e.clientY - d.py
    const nextPan = { x: d.pan0.x + dx, y: d.pan0.y + dy }
    viewRef.current = { ...viewRef.current, pan: nextPan }
    setView((v) => ({ ...v, pan: nextPan }))
  }, [])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragRef.current = null
    panningRef.current = false
    setIsPanning(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
  }, [])

  const zoomBy = useCallback((delta: number) => {
    const vp = viewportRef.current
    if (!vp) return
    const cx = vp.clientWidth / 2
    const cy = vp.clientHeight / 2
    const factor = delta > 0 ? 1.15 : 1 / 1.15
    setView((v) => {
      const prev = v.zoom
      const p = v.pan
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev * factor))
      const worldX = (cx - p.x) / prev
      const worldY = (cy - p.y) / prev
      const out = {
        zoom: next,
        pan: { x: cx - worldX * next, y: cy - worldY * next },
      }
      viewRef.current = out
      return out
    })
  }, [])

  /** Pan/zoom so the active deck slide’s node is centered — easier to answer “where am I?”. */
  const centerOnCurrentSlide = useCallback(() => {
    const vp = viewportRef.current
    if (!vp) return
    const node = PITCH_MAP_NODES.find((n) => n.slide === currentSlide)
    if (!node) return
    const vw = vp.clientWidth
    const vh = vp.clientHeight
    const baseline = fitScaleRef.current
    const targetZoom = Math.min(
      MAX_ZOOM,
      Math.max(baseline * LOCATE_ZOOM_MIN_FACTOR, MIN_ZOOM),
      baseline * LOCATE_ZOOM_CAP,
    )
    const nx = (node.x / 100) * BOARD_W
    const ny = (node.y / 100) * BOARD_H
    const pan = {
      x: vw / 2 - nx * targetZoom,
      y: vh / 2 - ny * targetZoom,
    }
    const out: MapView = { zoom: targetZoom, pan }
    viewRef.current = out
    setView(out)
  }, [currentSlide])

  const slideCount = PITCH_MAP_NODES.length
  const currentNode = PITCH_MAP_NODES.find((n) => n.slide === currentSlide)

  return (
    <div
      role="region"
      aria-label="Deck map — drag to pan, wheel to zoom"
      className="relative flex h-full min-h-0 w-full flex-col bg-[#09090b]"
      onWheel={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      <div className="pointer-events-none absolute left-4 top-3 z-20 flex max-w-[min(100%,18rem)] flex-col gap-1.5 md:left-6 md:top-4 md:max-w-md">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
          Deck map
        </span>
        <p className="text-[10px] leading-snug text-white/40 md:text-[11px]">
          <span className="text-white/55">Start</span>
          {' → '}
          <span className="text-emerald-400/90">now</span>
          {' → '}
          <span className="text-white/55">end</span>
          <span className="text-white/30"> · </span>
          {showDetailNodes ? 'Every slide & branch.' : 'Spine only — zoom in for detail.'}
        </p>
        {currentNode && (
          <p className="border-l-2 border-emerald-500/50 pl-2.5 text-[10px] leading-snug text-white/65 md:text-[11px]">
            <span className="font-mono tabular-nums text-emerald-400/90">
              {currentSlide + 1}/{slideCount}
            </span>
            <span className="text-white/35"> · </span>
            <span className="font-medium text-white/85">{currentNode.shortLabel}</span>
            <span className="block truncate text-[9px] text-white/40 md:text-[10px]">
              {currentNode.label}
            </span>
          </p>
        )}
      </div>

      <div className="pointer-events-none absolute right-3 top-3 z-20 flex flex-col gap-1.5 md:right-5 md:top-4">
        <div className="pointer-events-auto flex items-center gap-1 rounded-lg border border-white/10 bg-black/55 p-1 shadow-lg backdrop-blur-md">
          <button
            type="button"
            className="rounded-md p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-emerald-300"
            title="Center on current slide"
            onClick={(e) => {
              e.stopPropagation()
              centerOnCurrentSlide()
            }}
          >
            <Crosshair size={16} />
          </button>
          <button
            type="button"
            className="rounded-md p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            title="Zoom out"
            onClick={(e) => {
              e.stopPropagation()
              zoomBy(-1)
            }}
          >
            <Minus size={16} />
          </button>
          <button
            type="button"
            className="rounded-md p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            title="Zoom in"
            onClick={(e) => {
              e.stopPropagation()
              zoomBy(1)
            }}
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            className="rounded-md p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            title="Fit entire map"
            onClick={(e) => {
              e.stopPropagation()
              fitToView()
            }}
          >
            <Maximize2 size={16} />
          </button>
        </div>
        <span className="text-right text-[9px] tabular-nums text-white/30">
          {Math.round(view.zoom * 100)}%
        </span>
      </div>

      <div
        ref={viewportRef}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={`relative z-10 min-h-0 flex-1 touch-none overflow-hidden bg-[#09090b] ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <div
          className={`h-full w-full ${ready ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}
        >
          <div
            className="will-change-transform"
            style={{
              transform: `translate3d(${view.pan.x}px, ${view.pan.y}px, 0) scale(${view.zoom})`,
              transformOrigin: '0 0',
              width: BOARD_W,
              height: BOARD_H,
            }}
          >
            <div className="relative h-full w-full overflow-visible">
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                shapeRendering="geometricPrecision"
              >
                <defs>
                  <linearGradient id="pitch-map-wire" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgb(52, 211, 153)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="rgb(167, 139, 250)" stopOpacity={0.5} />
                  </linearGradient>
                  <linearGradient id="pitch-map-spine" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgb(52, 211, 153)" stopOpacity={0.75} />
                    <stop offset="100%" stopColor="rgb(129, 140, 248)" stopOpacity={0.65} />
                  </linearGradient>
                </defs>

                {!showDetailNodes && (
                  <>
                    {spinePaths.map(({ d, key }) => (
                      <path
                        key={key}
                        d={d}
                        fill="none"
                        stroke="rgba(255,255,255,0.12)"
                        strokeWidth={0.36}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="1.2 0.9"
                        vectorEffect="non-scaling-stroke"
                      />
                    ))}
                    {spinePathsProgress.map(({ d, key }) => (
                      <path
                        key={key}
                        d={d}
                        fill="none"
                        stroke="url(#pitch-map-spine)"
                        strokeWidth={0.48}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="1.2 0.9"
                        vectorEffect="non-scaling-stroke"
                      />
                    ))}
                  </>
                )}

                {showDetailNodes &&
                  edgePaths.map(({ d, key }) => (
                    <path
                      key={key}
                      d={d}
                      fill="none"
                      stroke="url(#pitch-map-wire)"
                      strokeWidth={0.42}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="1.4 1.1"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
              </svg>

              {/* Zone labels — section flow */}
              <div className="pointer-events-none absolute left-[2%] top-[2%] text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                Opening
              </div>
              <div className="pointer-events-none absolute left-[2%] top-[14%] text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                Solution
              </div>
              <div className="pointer-events-none absolute left-[2%] top-[26%] text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                Workforce
              </div>
              <div className="pointer-events-none absolute left-[2%] top-[40%] text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                Demo
              </div>
              <div className="pointer-events-none absolute left-[2%] top-[54%] text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                Use cases
              </div>
              <div className="pointer-events-none absolute left-[2%] top-[68%] text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                Business story
              </div>
              <div className="pointer-events-none absolute left-[2%] top-[80%] text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                Close
              </div>
              <div className="pointer-events-none absolute left-[2%] top-[90%] text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                Appendix
              </div>

              <div
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-full text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-500/80"
                style={{ left: '6%', top: '3%' }}
              >
                Start
              </div>
              <div
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-full text-[9px] font-bold uppercase tracking-[0.2em] text-white/35"
                style={{ left: '78%', top: '83%' }}
              >
                End
              </div>

              {PITCH_MAP_NODES.map((n) => {
                const active = n.slide === currentSlide
                const isDetail = !n.isCore
                const visible = !isDetail || showDetailNodes
                const opacity = visible ? 1 : 0
                return (
                  <div
                    key={n.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${n.x}%`,
                      top: `${n.y}%`,
                      opacity,
                      pointerEvents: visible ? 'auto' : 'none',
                      transition: 'opacity 0.28s ease',
                      zIndex: active ? 30 : 10,
                    }}
                  >
                    <button
                      type="button"
                      data-map-card
                      title={n.label}
                      disabled={!visible}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!visible) return
                        onSelectSlide(n.slide)
                      }}
                      className="flex flex-col items-center gap-1.5 text-left outline-none"
                    >
                      <SlideMapThumbnail
                        slideIndex={n.slide}
                        shortLabel={n.shortLabel}
                        isCore={n.isCore}
                        active={active}
                      />
                      {showDetailNodes && (
                        <span className="max-w-[128px] text-center text-[9px] leading-snug text-white/40">
                          {n.label}
                        </span>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <p className="pointer-events-none shrink-0 border-t border-white/[0.06] bg-[#09090b] px-3 py-2 text-center text-[10px] text-white/35 md:text-[11px]">
        Click a slide to jump · Drag to pan · Wheel to zoom · Esc to close
      </p>
    </div>
  )
}
