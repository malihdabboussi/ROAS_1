'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

/** Wide % + scale() otherwise anchors left — shifts previews right and clips. */
function ScaledPitchMockup({
  heightClass,
  sizePercent,
  scale,
  opacityClass = 'opacity-70',
  clip = true,
  children,
}: {
  heightClass: string
  sizePercent: number
  scale: number
  opacityClass?: string
  /** When false, overflow visible so mockup animations aren’t clipped (pitch “How to Use ROAS”). */
  clip?: boolean
  children: React.ReactNode
}) {
  const pct = `${sizePercent}%`
  return (
    <div
      className={`relative mt-2 w-full rounded-xl ${clip ? 'overflow-hidden' : 'overflow-visible'} ${opacityClass} ${heightClass}`}
    >
      <div
        className="absolute left-1/2 top-0 origin-top"
        style={{
          width: pct,
          height: pct,
          transform: `translateX(-50%) scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  )
}

/** Full-viewport white burst; on complete runs once (close zoom + glow). */
function PitchFlashBurst({ tick, onComplete }: { tick: number; onComplete: () => void }) {
  if (tick <= 0) return null
  return (
    <motion.div
      key={tick}
      className="pointer-events-none fixed inset-0 z-[10001] bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.88, 0] }}
      transition={{ duration: 0.45, times: [0, 0.22, 1], ease: [0.4, 0, 0.2, 1] }}
      onAnimationComplete={onComplete}
    />
  )
}

function StatCard({
  value,
  label,
  accent = 'emerald',
  index = 0,
  variant = 'gradient',
}: {
  value: string
  label: string
  accent?: 'emerald' | 'blue' | 'purple'
  index?: number
  /** `panel` — bordered cards matching Distribution / Commando deck slides */
  variant?: 'gradient' | 'panel'
}) {
  const colors = {
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400',
    blue: 'from-blue-500/20 to-blue-500/5 text-blue-400',
    purple: 'from-purple-500/20 to-purple-500/5 text-purple-400',
  }
  const valueTint = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
  }
  const ringTint = {
    emerald: 'ring-emerald-500/15',
    blue: 'ring-blue-500/15',
    purple: 'ring-purple-500/15',
  }
  if (variant === 'panel') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 + index * 0.12 }}
        className={`rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center ring-1 ${ringTint[accent]}`}
      >
        <div
          className={`font-[family-name:var(--font-site-headline)] text-2xl font-bold md:text-3xl ${valueTint[accent]}`}
        >
          {value}
        </div>
        <div className="mt-1.5 text-[10px] font-medium uppercase tracking-wider text-white/40">
          {label}
        </div>
      </motion.div>
    )
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.2 + index * 0.12 }}
      className={`rounded-2xl bg-gradient-to-b p-6 text-center ${colors[accent]}`}
    >
      <div className="font-[family-name:var(--font-site-headline)] text-3xl font-bold md:text-4xl">
        {value}
      </div>
      <div className="mt-2 text-xs font-medium uppercase tracking-wider text-white/40">{label}</div>
    </motion.div>
  )
}

export function AgentAvatar({
  src,
  name,
  size = 56,
  className = '',
}: {
  src: string
  name?: string
  size?: number
  className?: string
}) {
  return (
    <div
      className={`shrink-0 overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size }}
    >
      <img src={src} alt={name ?? ''} className="h-full w-full object-cover" />
    </div>
  )
}

