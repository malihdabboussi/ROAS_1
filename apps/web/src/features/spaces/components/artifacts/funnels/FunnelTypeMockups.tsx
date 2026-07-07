'use client'

import { Calendar, LayoutTemplate, Magnet, MousePointer2, Play, User } from 'lucide-react'

/**
 * Elite, single-element Lead Magnet Mockup.
 * Tall-page variation: 5.75rem tall, giving the actual layout maximum breathing room.
 */
export function LeadMagnetFunnelTypeMockup() {
  return (
    <div
      aria-hidden
      className="relative mx-auto flex h-28 w-full max-w-[12rem] select-none items-center justify-center"
    >
      {/* Backdrop Ambient Studio Glows */}
      <div className="bg-primary/20 absolute -z-20 h-24 w-24 rounded-full opacity-60 blur-2xl" />

      {/* The Single Unified Card: Page body stretched taller to let content shine */}
      <div className="card-glass border-white/12 relative flex h-[5.75rem] w-[11rem] gap-2 overflow-hidden border bg-slate-950/75 p-1.5 shadow-2xl backdrop-blur-md transition-transform duration-300 hover:scale-[1.02]">
        {/* LEFT PANEL: Integrated Book Graphic Cover */}
        <div className="relative flex h-full w-11 shrink-0 flex-col justify-between overflow-hidden rounded border border-white/10 bg-gradient-to-b from-slate-900 to-black p-1 shadow-inner">
          {/* Gloss Reflection Overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10" />

          {/* Book Spine Shadow */}
          <div className="absolute inset-y-0 left-0 w-1 bg-black/60 shadow-sm" />

          {/* Embedded Magnet symbol */}
          <div className="bg-primary/25 relative mx-auto mt-0.5 flex h-4 w-4 items-center justify-center rounded">
            <Magnet className="text-primary h-2.5 w-2.5 shrink-0" />
          </div>

          {/* Micro lines */}
          <div className="relative mt-auto space-y-1 pb-0.5 pl-1">
            <div className="h-[2.5px] w-full rounded-full bg-white/80" />
            <div className="h-[2px] w-4/5 rounded-full bg-white/40" />
          </div>

          {/* Corner Accent Ribbon */}
          <div className="bg-primary/40 absolute right-1 top-0 h-2.5 w-1 rounded-b-[1px]" />
        </div>

        {/* RIGHT PANEL: Integrated Conversion Panel */}
        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          {/* Header copy lines */}
          <div className="space-y-1">
            <div className="h-[5.5px] w-11/12 rounded-full bg-white/90" />
            <div className="h-[4px] w-2/3 rounded-full bg-white/40" />
          </div>

          {/* Action elements (Bigger click surfaces) */}
          <div className="space-y-1.5">
            {/* Email Input Box */}
            <div className="flex h-[1.125rem] w-full items-center rounded-sm border border-white/10 bg-black/40 px-1.5">
              <div className="h-1 w-10 rounded-full bg-white/20" />
            </div>

            {/* Action Button with shimmer */}
            <div className="relative flex h-[1.125rem] w-full items-center justify-center overflow-hidden rounded-sm bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/10">
              <div className="animate-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent" />
              <div className="h-[4px] w-1/3 rounded-full bg-white opacity-90" />
            </div>
          </div>
        </div>

        {/* Floating click cursor over the CTA */}
        <div className="pointer-events-none absolute bottom-1 right-1 z-30 rotate-12">
          <MousePointer2 className="h-3 w-3 fill-slate-950 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
        </div>
      </div>
    </div>
  )
}

/**
 * Elite, single-element Call Booking Mockup.
 * Tall-page variation: 5.75rem tall, allowing calendar slots to expand.
 */
export function CallBookingFunnelTypeMockup() {
  return (
    <div
      aria-hidden
      className="relative mx-auto flex h-28 w-full max-w-[12rem] select-none items-center justify-center"
    >
      {/* Backdrop Ambient Studio Glows */}
      <div className="bg-primary/15 absolute -z-20 h-24 w-24 rounded-full opacity-50 blur-2xl" />

      {/* The Single Unified Card: Pure Booking Page */}
      <div className="card-glass border-white/12 relative flex h-[5.75rem] w-[11rem] gap-2 overflow-hidden border bg-slate-950/75 p-1.5 shadow-2xl backdrop-blur-md transition-transform duration-300 hover:scale-[1.02]">
        {/* LEFT PANEL: Host/Intro profile */}
        <div className="flex w-[3.25rem] shrink-0 flex-col items-center justify-between py-1">
          {/* host avatar badge */}
          <div className="relative shrink-0">
            <div className="border-primary/30 bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full border shadow-inner">
              <User className="text-primary h-5 w-5 opacity-80" />
            </div>
            {/* online dot */}
            <div className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-slate-950 bg-emerald-500" />
          </div>

          {/* host intro copy lines */}
          <div className="w-full space-y-[3px] text-center">
            <div className="h-[4px] w-full rounded-full bg-white/80" />
            <div className="mx-auto h-[3px] w-4/5 rounded-full bg-white/40" />
          </div>
        </div>

        {/* RIGHT PANEL: Modern Booking Day / Slot Widget */}
        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          {/* Widget header */}
          <div className="flex items-center gap-1 border-b border-white/5 pb-1">
            <Calendar className="text-primary h-2.5 w-2.5 shrink-0 opacity-70" />
            <div className="h-1.5 w-2/3 rounded-full bg-white/70" />
          </div>

          {/* Booking Slots grid (4 columns) - expanded height */}
          <div className="grid grid-cols-4 gap-1 py-1">
            {[1, 2, 3, 4].map((slot) => {
              const isSelected = slot === 2
              const isBooked = slot === 4
              return (
                <div
                  key={slot}
                  className={`flex h-4 items-center justify-center rounded-sm text-[5.5px] font-bold ${
                    isSelected
                      ? 'bg-primary text-background shadow-primary/20 opacity-95 shadow-sm'
                      : isBooked
                        ? 'bg-secondary/10 text-muted-foreground line-through opacity-15'
                        : 'border border-white/5 bg-black/30 text-white/50 hover:bg-black/40'
                  }`}
                >
                  {slot === 1 ? '9a' : slot === 2 ? '10a' : slot === 3 ? '1p' : '3p'}
                </div>
              )
            })}
          </div>

          {/* Booking Confirmation CTA Button */}
          <div className="bg-primary/25 relative flex h-[1.125rem] w-full items-center justify-center overflow-hidden rounded-sm opacity-90 shadow-sm transition-opacity">
            <div className="bg-primary h-1 w-1/3 rounded-full opacity-80" />
          </div>
        </div>

        {/* Floating click cursor over slot 2 */}
        <div className="pointer-events-none absolute bottom-1 right-[4.5rem] z-30 rotate-12">
          <MousePointer2 className="h-3 w-3 fill-slate-950 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
        </div>
      </div>
    </div>
  )
}

/**
 * Elite, single-element Webinar Mockup.
 * Tall-page variation: 5.75rem tall, giving streaming details extra area.
 */
export function WebinarFunnelTypeMockup() {
  return (
    <div
      aria-hidden
      className="relative mx-auto flex h-28 w-full max-w-[12rem] select-none items-center justify-center"
    >
      {/* Backdrop Ambient Studio Glows */}
      <div className="bg-primary/15 absolute -z-20 h-24 w-24 rounded-full opacity-50 blur-2xl" />

      {/* The Single Unified Card: Pure Webinar page */}
      <div className="card-glass border-white/12 relative flex h-[5.75rem] w-[11rem] gap-2 overflow-hidden border bg-slate-950/75 p-1.5 shadow-2xl backdrop-blur-md transition-transform duration-300 hover:scale-[1.02]">
        {/* LEFT PANEL: Streaming player layout */}
        <div className="relative flex h-full w-[5.25rem] shrink-0 flex-col justify-between overflow-hidden rounded border border-white/10 bg-slate-900 shadow-inner">
          {/* Main video view container */}
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
            {/* Soft play circle */}
            <div className="bg-primary/80 shadow-primary/20 relative z-10 flex h-5 w-5 items-center justify-center rounded-full shadow-lg">
              <Play className="text-foreground ml-0.5 h-2 w-2 fill-current" />
            </div>
            {/* Live pulsing tag */}
            <div className="absolute left-1 top-1 flex items-center gap-[2px] rounded bg-rose-500 px-0.5 py-[1px] text-[4px] font-bold text-white">
              <div className="h-0.5 w-0.5 animate-pulse rounded-full bg-white" />
              LIVE
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Integrated countdown timer & registration details */}
        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5 text-left">
          {/* Title description lines */}
          <div className="space-y-1">
            <div className="h-[5.5px] w-full rounded-full bg-white/90" />
            <div className="h-[4px] w-2/3 rounded-full bg-white/40" />
          </div>

          {/* Static countdown pill */}
          <div className="flex shrink-0 items-center justify-between rounded border border-white/5 bg-black/40 px-1.5 py-0.5">
            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />
            <div className="h-[3.5px] w-[2.25rem] shrink-0 rounded-full bg-white/70" />
          </div>

          {/* Action room registration button */}
          <div className="bg-primary relative flex h-[1.125rem] w-full shrink-0 items-center justify-center overflow-hidden rounded-sm opacity-90 shadow-sm">
            <div className="bg-background h-1 w-1/3 rounded-full opacity-90" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Elite, single-element VSL (Video Sales Letter) Mockup.
 * Tall-page variation: 5.75rem tall, letting pricing & buy CTA expand vertically.
 */
export function VslFunnelTypeMockup() {
  return (
    <div
      aria-hidden
      className="relative mx-auto flex h-28 w-full max-w-[12rem] select-none items-center justify-center"
    >
      {/* Backdrop Ambient Studio Glows */}
      <div className="bg-primary/15 absolute -z-20 h-24 w-24 rounded-full opacity-50 blur-2xl" />

      {/* The Single Unified Card: Pure VSL page */}
      <div className="card-glass border-white/12 relative flex h-[5.75rem] w-[11rem] gap-2 overflow-hidden border bg-slate-950/75 p-1.5 shadow-2xl backdrop-blur-md transition-transform duration-300 hover:scale-[1.02]">
        {/* LEFT PANEL: Cinema player layout */}
        <div className="relative flex h-full w-[5.25rem] shrink-0 flex-col justify-between overflow-hidden rounded border border-white/10 bg-slate-950 shadow-inner">
          {/* Video poster graphic */}
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90">
            {/* Elegant glass play button */}
            <div className="bg-primary/90 shadow-primary/30 relative z-10 flex h-5 w-5 items-center justify-center rounded-full shadow-lg">
              <Play className="text-foreground ml-0.5 h-2 w-2 fill-current" />
            </div>
            {/* Timeline progress line */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10">
              <div className="bg-primary h-full w-2/3" />
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Conversion Offer checkout detail */}
        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5 text-left">
          {/* Headline details */}
          <div className="space-y-1">
            <div className="h-[5.5px] w-full rounded-full bg-white/90" />
            <div className="h-[4px] w-5/6 rounded-full bg-white/40" />
          </div>

          {/* Pricing detail container */}
          <div className="flex shrink-0 items-center gap-1.5 py-0.5">
            <div className="bg-primary/20 border-primary/20 flex h-[14px] w-9 shrink-0 items-center justify-center rounded border">
              <div className="bg-primary h-1 w-6 rounded-full opacity-80" />
            </div>
            <div className="h-[4px] w-6 shrink-0 rounded-full bg-white/25" />
          </div>

          {/* Conversion Buy Button */}
          <div className="relative flex h-[1.125rem] w-full shrink-0 items-center justify-center overflow-hidden rounded-sm bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm">
            <div className="animate-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <div className="h-[4px] w-1/3 rounded-full bg-white opacity-90" />
          </div>
        </div>

        {/* Floating click cursor over Buy button */}
        <div className="pointer-events-none absolute bottom-0.5 right-0.5 z-30 rotate-12">
          <MousePointer2 className="h-3 w-3 fill-slate-950 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
        </div>
      </div>
    </div>
  )
}

/**
 * Elite, single-element Custom (Blank Canvas) Mockup.
 * Tall-page variation: 5.75rem tall, letting grid points expand.
 */
export function CustomFunnelTypeMockup() {
  return (
    <div
      aria-hidden
      className="relative mx-auto flex h-28 w-full max-w-[12rem] select-none items-center justify-center"
    >
      {/* Backdrop Ambient Studio Glows */}
      <div className="bg-primary/15 absolute -z-20 h-24 w-24 rounded-full opacity-50 blur-2xl" />

      {/* The Single Unified Card: Pure Workspace Page */}
      <div className="card-glass border-white/12 relative flex h-[5.75rem] w-[11rem] gap-2 overflow-hidden border bg-slate-950/75 p-1.5 shadow-2xl backdrop-blur-md transition-transform duration-300 hover:scale-[1.02]">
        {/* LEFT PANEL: Elements dock column */}
        <div className="flex w-[2.25rem] shrink-0 flex-col gap-1 rounded border border-white/5 bg-slate-900/50 p-1">
          <div className="h-3.5 w-full rounded-sm bg-white/25" />
          <div className="h-2 w-3/4 rounded-full bg-white/10" />
          <div className="h-2 w-full rounded-full bg-white/10" />
          <div className="h-2 w-2/3 rounded-full bg-white/10" />
        </div>

        {/* RIGHT PANEL: Main workspace with grid background */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded border border-white/5 bg-slate-900/30">
          {/* Crisp, modern radial grid points */}
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:6px_6px]" />

          {/* Centered builder blueprint node */}
          <div className="border-primary/40 z-10 flex h-10 w-[4.5rem] flex-col items-center justify-center gap-1 rounded border border-dashed bg-slate-950/80 p-1 shadow-md">
            <LayoutTemplate className="text-primary h-3 w-3 shrink-0 opacity-60" />
            <div className="h-1 w-2/3 shrink-0 rounded-full bg-white/20" />
          </div>
        </div>

        {/* Floating click cursor over work area */}
        <div className="pointer-events-none absolute bottom-0.5 right-[1.5rem] z-30 rotate-12">
          <MousePointer2 className="h-3 w-3 fill-slate-950 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
        </div>
      </div>
    </div>
  )
}
