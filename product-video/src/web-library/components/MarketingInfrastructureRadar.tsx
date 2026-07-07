'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  Image,
  Instagram,
  LayoutTemplate,
  Linkedin,
  Mail,
  Megaphone,
  UserCircle,
  Video,
} from 'lucide-react'
import { FeatureFloatingMockShell } from './feature-pages/FeatureFloatingMockShell'

/** How many concentric half-rings we draw (extra outer ones extend past card width and clip). */
const RING_COUNT = 16
/** Outermost ring diameter as % of card width (>100 ⇒ clipped left/right, tighter vertical spacing). */
const MAX_DIAMETER_PCT = 265

const ARC_OPACITIES = Array.from(
  { length: RING_COUNT },
  (_, i) => 0.52 - (i / Math.max(1, RING_COUNT - 1)) * 0.4,
)

function ringFraction(ringIndex: number) {
  return (ringIndex + 1) / RING_COUNT
}

/** Diameter % of container; centered, bottom-aligned — true semicircle via aspect-ratio 2/1. */
function ringWidthPct(ringIndex: number) {
  return (MAX_DIAMETER_PCT * (ringIndex + 1)) / RING_COUNT
}

type RadarItem = {
  icon: ReactNode
  label: string
  ring: number
  /** 0° = right on diameter, 90° = apex, 180° = left on diameter */
  angle: number
  revealOrder: number
}

const iconProps = { size: 18, strokeWidth: 1.75 as const }

/** Outer row bearings (°). Inner row uses a wider arc so the five sit farther apart on the same rays order. */
const RADAR_OUTER_RING = 13
const RADAR_INNER_RING = 7
const RADAR_OUTER_BEARINGS = [36, 63, 90, 117, 144]
/** 3 inner nodes evenly across 45°–135° arc (centered on 90° apex). */
const RADAR_INNER_BEARINGS = [45, 90, 135]

const ITEMS: RadarItem[] = [
  {
    icon: <Image {...iconProps} />,
    label: 'Image',
    ring: RADAR_OUTER_RING,
    angle: RADAR_OUTER_BEARINGS[4],
    revealOrder: 6,
  },
  {
    icon: <Video {...iconProps} />,
    label: 'Video',
    ring: RADAR_OUTER_RING,
    angle: RADAR_OUTER_BEARINGS[3],
    revealOrder: 4,
  },
  {
    icon: <LayoutTemplate {...iconProps} />,
    label: 'Funnel',
    ring: RADAR_OUTER_RING,
    angle: RADAR_OUTER_BEARINGS[2],
    revealOrder: 5,
  },
  {
    icon: <Megaphone {...iconProps} />,
    label: 'Ad',
    ring: RADAR_OUTER_RING,
    angle: RADAR_OUTER_BEARINGS[1],
    revealOrder: 0,
  },
  {
    icon: <Instagram {...iconProps} />,
    label: 'IG',
    ring: RADAR_OUTER_RING,
    angle: RADAR_OUTER_BEARINGS[0],
    revealOrder: 2,
  },
  {
    icon: <Linkedin {...iconProps} />,
    label: 'LinkedIn',
    ring: RADAR_INNER_RING,
    angle: RADAR_INNER_BEARINGS[2],
    revealOrder: 7,
  },
  {
    icon: <UserCircle {...iconProps} />,
    label: 'Avatar',
    ring: RADAR_INNER_RING,
    angle: RADAR_INNER_BEARINGS[1],
    revealOrder: 1,
  },
  {
    icon: <Mail {...iconProps} />,
    label: 'Email',
    ring: RADAR_INNER_RING,
    angle: RADAR_INNER_BEARINGS[0],
    revealOrder: 3,
  },
]

const TOTAL_ITEM_DELAY = ITEMS.length * 0.1
const SWEEP_DELAY = TOTAL_ITEM_DELAY + 0.3

function HalfArcs() {
  return (
    <>
      {Array.from({ length: RING_COUNT }, (_, i) => {
        const w = ringWidthPct(i)
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.05, duration: 0.25 }}
            className="radar-arc pointer-events-none absolute bottom-0 left-1/2"
            style={
              {
                width: `${w}%`,
                aspectRatio: '2 / 1',
                height: 'auto',
                transform: 'translateX(-50%)',
                '--arc-opacity': ARC_OPACITIES[i],
              } as React.CSSProperties
            }
          />
        )
      })}
    </>
  )
}

function SweepBeam() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: SWEEP_DELAY, duration: 0.5 }}
      className="radar-sweep pointer-events-none absolute bottom-0 left-1/2"
      style={{ width: 2, height: '100%', marginLeft: -1 }}
    >
      <div
        style={{
          width: 2,
          height: '100%',
          background: 'linear-gradient(to top, rgb(var(--accent-emerald-rgb) / 0.6), transparent)',
        }}
      />
    </motion.div>
  )
}

/**
 * Stage is min-h panel; f = (ring+1)/RING_COUNT. left% = 50 + 50·f·cos(θ), top% = (1 − f·sin(θ))·100
 */
function RadarNode({ item }: { item: RadarItem }) {
  const f = ringFraction(item.ring)
  const rad = (item.angle * Math.PI) / 180
  const left = Math.round((50 + 50 * f * Math.cos(rad)) * 1e4) / 1e4
  const top = Math.round((1 - f * Math.sin(rad)) * 100 * 1e4) / 1e4

  return (
    <div
      className="absolute z-50 flex flex-col items-center gap-1"
      style={{ top: `${top}%`, left: `${left}%`, transform: 'translate(-50%, -50%)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: item.revealOrder * 0.1, duration: 0.35, ease: 'easeOut' }}
        className="relative flex flex-col items-center"
      >
        <div className="radar-node-icon text-color-muted">{item.icon}</div>
        <span className="radar-node-label mt-1">{item.label}</span>
      </motion.div>
    </div>
  )
}

function BaselineDot() {
  return (
    <div
      className="absolute bottom-0 left-1/2 z-30 rounded-full"
      style={{
        width: 6,
        height: 6,
        marginLeft: -3,
        marginBottom: -3,
        background: 'var(--accent-emerald)',
        boxShadow: '0 0 12px rgb(var(--accent-emerald-rgb) / 0.5)',
      }}
    />
  )
}

export function MarketingInfrastructureRadarMockup() {
  return (
    <FeatureFloatingMockShell>
      <div className="relative min-h-[420px] w-full overflow-hidden">
        <HalfArcs />
        <SweepBeam />
        <BaselineDot />
        {ITEMS.map((item) => (
          <RadarNode key={item.label} item={item} />
        ))}
      </div>
    </FeatureFloatingMockShell>
  )
}
