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
  { id: 's0', slide: 0, label: 'Cover', shortLabel: 'Cover', x: 6, y: 8, isCore: true },
  { id: 's1', slide: 1, label: 'Founders', shortLabel: 'Founders', x: 6, y: 18, isCore: true },
  { id: 's2', slide: 2, label: 'Problem', shortLabel: 'Problem', x: 6, y: 28, isCore: true },
  { id: 's3', slide: 3, label: 'Why now', shortLabel: 'Why now', x: 6, y: 38, isCore: true },
  {
    id: 's4',
    slide: 4,
    label: 'Meet the most powerful agent',
    shortLabel: 'Meet Vibey',
    x: 22,
    y: 10,
    isCore: true,
  },
  {
    id: 's5',
    slide: 5,
    label: 'What makes it different',
    shortLabel: 'Different',
    x: 22,
    y: 22,
    isCore: false,
  },
  { id: 's6', slide: 6, label: 'Brain — memory', shortLabel: 'Brain', x: 14, y: 34, isCore: false },
  { id: 's7', slide: 7, label: 'Cloud computer', shortLabel: 'Cloud', x: 20, y: 34, isCore: false },
  { id: 's8', slide: 8, label: 'Skills', shortLabel: 'Skills', x: 26, y: 34, isCore: false },
  {
    id: 's9',
    slide: 9,
    label: 'Integrations (layer)',
    shortLabel: 'Intros',
    x: 32,
    y: 34,
    isCore: false,
  },
  {
    id: 's10',
    slide: 10,
    label: 'How it all comes together',
    shortLabel: 'Together',
    x: 22,
    y: 46,
    isCore: true,
  },
  { id: 's11', slide: 11, label: 'Team → org', shortLabel: 'Team', x: 44, y: 10, isCore: true },
  { id: 's12', slide: 12, label: 'HR / library', shortLabel: 'HR', x: 44, y: 22, isCore: false },
  {
    id: 's13',
    slide: 13,
    label: '100+ premade skills',
    shortLabel: 'Premade',
    x: 44,
    y: 34,
    isCore: false,
  },
  {
    id: 's14',
    slide: 14,
    label: 'Create skills',
    shortLabel: 'Create',
    x: 44,
    y: 46,
    isCore: false,
  },
  {
    id: 's15',
    slide: 15,
    label: 'Preloaded & hireable',
    shortLabel: 'Preload',
    x: 44,
    y: 58,
    isCore: false,
  },
  /** Pulled up / left so it does not stack on the business row */
  { id: 's16', slide: 16, label: 'Autopilot', shortLabel: 'Autopilot', x: 38, y: 63, isCore: true },
  {
    id: 's17',
    slide: 17,
    label: 'How to Use Vibey',
    shortLabel: 'How to use',
    x: 58,
    y: 14,
    isCore: true,
  },
  {
    id: 's18',
    slide: 18,
    label: 'Studio — war room',
    shortLabel: 'Studio',
    x: 52,
    y: 28,
    isCore: false,
  },
  {
    id: 's19',
    slide: 19,
    label: 'Missions — delegation',
    shortLabel: 'Missions',
    x: 64,
    y: 28,
    isCore: false,
  },
  {
    id: 's20',
    slide: 20,
    label: 'Comms — agents come to you',
    shortLabel: 'Comms',
    x: 58,
    y: 42,
    isCore: false,
  },
  {
    id: 's21',
    slide: 21,
    label: 'Integrations + capabilities',
    shortLabel: 'Int + Cap',
    x: 74,
    y: 10,
    isCore: true,
  },
  /** Staggered so Integrations hero does not collide with capability branches */
  {
    id: 's22',
    slide: 22,
    label: 'Integrations hero',
    shortLabel: 'Integrations',
    x: 67,
    y: 22,
    isCore: false,
  },
  { id: 's23', slide: 23, label: 'GTM capability', shortLabel: 'GTM', x: 64, y: 40, isCore: false },
  {
    id: 's24',
    slide: 24,
    label: 'Media capability',
    shortLabel: 'Media',
    x: 74,
    y: 40,
    isCore: false,
  },
  { id: 's25', slide: 25, label: 'Ops capability', shortLabel: 'Ops', x: 84, y: 40, isCore: false },
  {
    id: 's40',
    slide: 26,
    label: 'Surprising use cases — setup',
    shortLabel: 'Surprise+',
    x: 62,
    y: 50,
    isCore: false,
  },
  {
    id: 's41',
    slide: 27,
    label: 'Three surprising use cases',
    shortLabel: '3 previews',
    x: 68,
    y: 52,
    isCore: false,
  },
  {
    id: 's26',
    slide: 28,
    label: 'Finance use case',
    shortLabel: 'Finance',
    x: 66,
    y: 54,
    isCore: false,
  },
  { id: 's27', slide: 29, label: 'ROAS use case', shortLabel: 'ROAS', x: 78, y: 54, isCore: false },
  {
    id: 's28',
    slide: 30,
    label: 'Neel Dhingra — use case #3',
    shortLabel: 'Neel',
    x: 74,
    y: 61,
    isCore: false,
  },
  { id: 's29', slide: 31, label: 'The model', shortLabel: 'Model', x: 8, y: 74, isCore: false },
  { id: 's30', slide: 32, label: 'Traction', shortLabel: 'Traction', x: 20, y: 74, isCore: true },
  {
    id: 's32',
    slide: 33,
    label: 'Acquisition',
    shortLabel: 'Acquire',
    x: 44,
    y: 74,
    isCore: false,
  },
  { id: 's33', slide: 34, label: 'Retention', shortLabel: 'Retain', x: 56, y: 74, isCore: false },
  { id: 's34', slide: 35, label: 'Competition', shortLabel: 'Compete', x: 68, y: 74, isCore: true },
  {
    id: 's35',
    slide: 36,
    label: 'Commando teams',
    shortLabel: 'Commando',
    x: 60,
    y: 82,
    isCore: false,
  },
  {
    id: 's36',
    slide: 37,
    label: 'Funding & runway',
    shortLabel: 'Funding',
    x: 70,
    y: 82,
    isCore: false,
  },
  { id: 's37', slide: 38, label: 'The ask', shortLabel: 'Ask', x: 80, y: 82, isCore: false },
  { id: 's38', slide: 39, label: 'Vision', shortLabel: 'Vision', x: 88, y: 82, isCore: false },
  { id: 's39', slide: 40, label: 'CTA', shortLabel: 'CTA', x: 92, y: 90, isCore: true },
]

const PITCH_MAP_EDGES: [string, string][] = [
  ['s0', 's1'],
  ['s1', 's2'],
  ['s2', 's3'],
  ['s3', 's4'],
  ['s4', 's5'],
  ['s5', 's6'],
  ['s5', 's7'],
  ['s5', 's8'],
  ['s5', 's9'],
  ['s6', 's10'],
  ['s7', 's10'],
  ['s8', 's10'],
  ['s9', 's10'],
  ['s10', 's11'],
  ['s11', 's12'],
  ['s12', 's13'],
  ['s13', 's14'],
  ['s14', 's15'],
  ['s15', 's16'],
  ['s16', 's17'],
  ['s17', 's18'],
  ['s17', 's19'],
  ['s17', 's20'],
  ['s20', 's21'],
  ['s21', 's22'],
  ['s22', 's23'],
  ['s22', 's24'],
  ['s22', 's25'],
  ['s22', 's40'],
  ['s25', 's40'],
  ['s40', 's41'],
  ['s41', 's26'],
  ['s26', 's27'],
  ['s27', 's28'],
  ['s28', 's29'],
  ['s29', 's30'],
  ['s30', 's32'],
  ['s32', 's33'],
  ['s33', 's34'],
  ['s34', 's35'],
  ['s35', 's36'],
  ['s36', 's37'],
  ['s37', 's38'],
  ['s38', 's39'],
]

const CORE_SPINE_IDS: string[] = [
  's0',
  's1',
  's2',
  's3',
  's4',
  's10',
  's11',
  's16',
  's17',
  's21',
  's22',
  's30',
  's34',
  's39',
]

/** Canvas size in px — pan/zoom applies to this layer; coords are % of this box. */
const BOARD_W = 2000
const BOARD_H = 1200
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

export function PitchSlideMapV1({ onSelectSlide, currentSlide }: PitchSlideMapProps) {
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

              {/* Zone labels — story hierarchy */}
              <div className="pointer-events-none absolute left-[2%] top-[1.5%] text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                Opening
              </div>
              <div className="pointer-events-none absolute left-[18%] top-[1.5%] text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                Product
              </div>
              <div className="pointer-events-none absolute left-[38%] top-[1.5%] text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                Team &amp; ops
              </div>
              <div className="pointer-events-none absolute left-[54%] top-[1.5%] text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                Modes
              </div>
              <div className="pointer-events-none absolute left-[70%] top-[1.5%] text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                GTM &amp; proof
              </div>
              <div className="pointer-events-none absolute left-[4%] top-[68%] text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                Business story
              </div>
              <div className="pointer-events-none absolute left-[58%] top-[78%] text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                Close
              </div>

              <div
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-full text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-500/80"
                style={{ left: '6%', top: '3%' }}
              >
                Start
              </div>
              <div
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-full text-[9px] font-bold uppercase tracking-[0.2em] text-white/35"
                style={{ left: '92%', top: '85%' }}
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
