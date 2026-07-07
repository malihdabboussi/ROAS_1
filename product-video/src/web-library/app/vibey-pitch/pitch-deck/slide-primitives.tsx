import type { ComponentType, CSSProperties, ReactNode } from 'react'

export function Slide({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center overflow-hidden px-8 py-12 md:px-16 lg:px-24 ${className}`}
    >
      {children}
    </div>
  )
}

export function SlideLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mb-4 inline-block rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/50">
      {children}
    </span>
  )
}

export function SlideTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="max-w-4xl text-center font-[family-name:var(--font-site-headline)] text-3xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
      {children}
    </h2>
  )
}

export function SlideSub({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 max-w-2xl text-center text-base leading-relaxed text-white/50 md:text-lg">
      {children}
    </p>
  )
}

export function StatCard({
  value,
  label,
  accent = 'emerald',
}: {
  value: string
  label: string
  accent?: 'emerald' | 'blue' | 'purple' | 'amber'
}) {
  const colors = {
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-400',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-400',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400',
  }
  return (
    <div className={`rounded-2xl border bg-gradient-to-b p-6 text-center ${colors[accent]}`}>
      <div className="font-[family-name:var(--font-site-headline)] text-3xl font-bold md:text-4xl">
        {value}
      </div>
      <div className="mt-2 text-xs font-medium uppercase tracking-wider text-white/40">{label}</div>
    </div>
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
      className={`shrink-0 overflow-hidden rounded-full border border-white/15 ${className}`}
      style={{ width: size, height: size }}
    >
      <img src={src} alt={name ?? ''} className="h-full w-full object-cover" />
    </div>
  )
}

export function PillarBadge({
  icon: Icon,
  label,
  description,
  accent,
}: {
  icon: ComponentType<{ size?: number; className?: string; style?: CSSProperties }>
  label: string
  description: string
  accent: string
}) {
  return (
    <div className="border-white/8 flex items-start gap-3 rounded-xl border bg-white/[0.03] px-4 py-3">
      <div
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}
      >
        <Icon size={16} style={{ color: accent }} />
      </div>
      <div>
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="mt-0.5 text-xs text-white/40">{description}</div>
      </div>
    </div>
  )
}

export function CapChip({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ size?: number; className?: string }>
  label: string
}) {
  return (
    <span className="border-white/8 inline-flex items-center gap-1.5 rounded-full border bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/60">
      <Icon size={12} className="text-white/40" />
      {label}
    </span>
  )
}

export function OrgNode({
  name,
  role,
  src,
  highlight = false,
}: {
  name: string
  role: string
  src: string
  highlight?: boolean
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-3 text-center ${
        highlight ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-white/8 bg-white/[0.03]'
      }`}
    >
      <AgentAvatar src={src} name={name} size={40} />
      <div>
        <div className="text-xs font-semibold text-white">{name}</div>
        <div className="text-[10px] text-white/40">{role}</div>
      </div>
    </div>
  )
}
