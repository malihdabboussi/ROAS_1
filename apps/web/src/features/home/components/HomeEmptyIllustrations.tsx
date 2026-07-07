'use client'

import {
  Bell,
  Check,
  EyeOff,
  FolderKanban,
  LayoutGrid,
  MessageSquare,
  MousePointer2,
  Play,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

/**
 * Empty Favorite Spaces — Grid workspace mockup with a dashed empty slot.
 */
export function FavoriteSpacesEmptyIllustration() {
  return (
    <div
      aria-hidden
      className="px-spacing-4 py-spacing-2 relative flex w-full select-none justify-center"
    >
      <div className="relative w-full max-w-[100px]">
        <div className="bg-primary/20 absolute -z-10 h-16 w-16 rounded-full opacity-60 blur-xl" />

        <div className="card-glass relative aspect-[4/3] w-full rounded-2xl border-white/10 bg-[#1C1C1E] p-2 shadow-2xl ring-1 ring-white/10">
          <div className="grid h-full grid-cols-2 gap-1.5">
            <div className="flex flex-col justify-between rounded-lg bg-white/[0.04] p-1">
              <div className="h-1 w-2/3 rounded-full bg-white/20" />
              <div className="flex items-center justify-between">
                <LayoutGrid className="h-2 w-2 text-indigo-400 opacity-60" />
                <div className="h-[2px] w-4 rounded-full bg-white/15" />
              </div>
            </div>
            <div className="flex flex-col justify-between rounded-lg bg-white/[0.04] p-1">
              <div className="h-1 w-1/2 rounded-full bg-white/20" />
              <div className="flex items-center justify-between">
                <LayoutGrid className="h-2 w-2 text-rose-400 opacity-60" />
                <div className="h-[2px] w-3 rounded-full bg-white/15" />
              </div>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-1">
              <div className="rounded-full bg-white/10 p-0.5">
                <div className="h-[3px] w-[3px] rounded-full bg-white/25" />
              </div>
            </div>
            <div className="flex flex-col justify-between rounded-lg bg-white/[0.04] p-1">
              <div className="h-1 w-3/4 rounded-full bg-white/20" />
              <div className="flex items-center justify-between">
                <LayoutGrid className="h-2 w-2 text-emerald-400 opacity-60" />
                <div className="h-[2px] w-4 rounded-full bg-white/15" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Empty Favorite Campaigns — single campaign card mockup.
 */
export function FavoriteCampaignsEmptyIllustration() {
  return (
    <div
      aria-hidden
      className="px-spacing-4 py-spacing-2 relative flex w-full select-none justify-center"
    >
      <div className="relative w-full max-w-[100px]">
        <div className="absolute -z-10 h-16 w-16 rounded-full bg-orange-500/10 opacity-60 blur-xl" />

        <div className="card-glass relative flex aspect-[4/3] w-full flex-col justify-between rounded-2xl border-white/10 bg-[#1C1C1E] p-2.5 shadow-2xl ring-1 ring-white/10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <FolderKanban className="h-3 w-3 shrink-0 text-orange-400 opacity-70" />
              <div className="h-1.5 w-1/2 rounded-full bg-white/80" />
            </div>
            <div className="ml-4.5 space-y-1">
              <div className="h-1 w-3/4 rounded-full bg-white/35" />
              <div className="h-[3px] w-1/2 rounded-full bg-white/20" />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-2/3 bg-orange-400" />
            </div>
            <div className="flex h-2 w-2 items-center justify-center rounded-full bg-orange-400/20">
              <div className="h-1 w-1 rounded-full bg-orange-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Empty Favorite Conversations / Recent Conversations — Stacked chat bubble mockup.
 */
export function ConversationsEmptyIllustration({ messageCount = 2 }: { messageCount?: 2 | 3 }) {
  return (
    <div
      aria-hidden
      className="px-spacing-4 py-spacing-2 relative flex w-full select-none justify-center"
    >
      <div className="relative w-full max-w-[100px]">
        {/* Ambient background glow */}
        <div className="absolute -z-10 h-16 w-16 rounded-full bg-violet-500/10 opacity-60 blur-xl" />

        {/* Chat panel box */}
        <div
          className={cn(
            'card-glass relative flex aspect-[4/3] w-full flex-col rounded-2xl border-white/10 bg-[#1C1C1E] p-2 shadow-2xl ring-1 ring-white/10',
            messageCount === 3 ? 'justify-center gap-1' : 'gap-2',
          )}
        >
          {/* Message 1: Assistant */}
          <div className="flex items-start gap-1.5">
            <div className="h-4.5 w-4.5 flex shrink-0 items-center justify-center rounded-full border border-violet-500/20 bg-violet-500/20">
              <div className="h-2 w-2 rounded-full bg-violet-400/50" />
            </div>
            <div className="flex-1 space-y-1 rounded-lg bg-white/[0.04] p-1.5">
              <div className="h-[3px] w-full rounded-full bg-white/85" />
              <div className="h-[2px] w-2/3 rounded-full bg-white/40" />
            </div>
          </div>

          {/* Message 2: User */}
          <div className="flex items-start justify-end gap-1.5 pl-4">
            <div className="flex-1 space-y-1 rounded-lg bg-violet-500/15 p-1.5">
              <div className="h-[3px] w-3/4 rounded-full bg-white/85" />
            </div>
            <div className="h-4.5 w-4.5 flex shrink-0 items-center justify-center rounded-full bg-white/10">
              <div className="h-2 w-2 rounded-full bg-white/50" />
            </div>
          </div>

          {messageCount === 3 ? (
            <div className="flex items-start gap-1.5">
              <div className="h-4.5 w-4.5 flex shrink-0 items-center justify-center rounded-full border border-violet-500/20 bg-violet-500/20">
                <div className="h-2 w-2 rounded-full bg-violet-400/50" />
              </div>
              <div className="flex-1 rounded-lg bg-white/[0.04] p-1.5">
                <div className="h-[3px] w-4/5 rounded-full bg-white/85" />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/**
 * Empty Recent messages — channel row + DM row mockup.
 */
export function CommunicationsEmptyIllustration() {
  return (
    <div
      aria-hidden
      className="px-spacing-4 py-spacing-2 relative flex w-full select-none justify-center"
    >
      <div className="relative w-full max-w-[100px]">
        <div className="absolute -z-10 h-16 w-16 rounded-full bg-sky-500/10 opacity-60 blur-xl" />

        <div className="card-glass relative flex aspect-[4/3] w-full flex-col justify-center gap-1.5 rounded-2xl border-white/10 bg-[#1C1C1E] p-2 shadow-2xl ring-1 ring-white/10">
          <div className="flex items-center gap-1.5 rounded-md bg-white/[0.03] px-1 py-1">
            <div className="h-4.5 w-4.5 flex shrink-0 items-center justify-center rounded-md bg-sky-500/20">
              <span className="typo-caption font-semibold leading-none text-sky-300">#</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="h-1.5 w-2/3 rounded-full bg-white/70" />
              <div className="h-1 w-full rounded-full bg-white/25" />
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-md bg-white/[0.03] px-1 py-1">
            <div className="h-4.5 w-4.5 shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/15">
              <div className="m-auto mt-1 h-2 w-2 rounded-full bg-emerald-400/60" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="h-1.5 w-1/2 rounded-full bg-white/70" />
              <div className="h-1 w-4/5 rounded-full bg-white/25" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Recent conversations all-hidden — ghost list rows with eye-off badge.
 */
export function RecentConversationsHiddenIllustration() {
  return (
    <div
      aria-hidden
      className="px-spacing-4 py-spacing-2 relative flex w-full select-none justify-center"
    >
      <div className="relative w-full max-w-[100px]">
        <div className="absolute -z-10 h-16 w-16 rounded-full bg-slate-500/10 opacity-60 blur-xl" />

        <div className="card-glass relative flex aspect-[4/3] w-full flex-col justify-center gap-1.5 rounded-2xl border-white/10 bg-[#1C1C1E] p-2 shadow-2xl ring-1 ring-white/10">
          {[
            ['w-2/3', 'w-3'],
            ['w-1/2', 'w-2.5'],
            ['w-3/5', 'w-3'],
          ].map(([titleWidth, dateWidth]) => (
            <div
              key={titleWidth}
              className="flex items-center gap-1.5 rounded-md border border-dashed border-white/10 bg-white/[0.02] px-1 py-1 opacity-50"
            >
              <div className="h-4.5 w-4.5 shrink-0 rounded-full border border-dashed border-white/15 bg-white/[0.04]" />
              <div className={cn('h-1.5 rounded-full bg-white/30', titleWidth)} />
              <div className={cn('ml-auto h-1 shrink-0 rounded-full bg-white/15', dateWidth)} />
            </div>
          ))}

          <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] border-white/15 bg-[#2C2C2E] shadow-lg">
            <EyeOff className="h-3 w-3 text-white/70" strokeWidth={2.5} />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Empty Tasks / My Tasks / Waiting on You — Checklist with checkmarks, indicating clean slate.
 */
export function TasksEmptyIllustration() {
  return (
    <div
      aria-hidden
      className="px-spacing-4 py-spacing-2 relative flex w-full select-none justify-center"
    >
      <div className="relative w-full max-w-[100px]">
        {/* Ambient background glow */}
        <div className="absolute -z-10 h-16 w-16 rounded-full bg-emerald-500/15 opacity-50 blur-xl" />

        {/* Checklist Board */}
        <div className="card-glass relative flex aspect-[4/3] w-full flex-col justify-between rounded-2xl border-white/10 bg-[#1C1C1E] p-2.5 shadow-2xl ring-1 ring-white/10">
          <div className="space-y-2">
            {/* Task Item 1 (Checked) */}
            <div className="flex items-center gap-2">
              <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/20">
                <Check className="h-2.5 w-2.5 text-emerald-400" strokeWidth={3} />
              </div>
              <div className="h-1.5 w-3/4 rounded-full bg-white/20 line-through opacity-40" />
            </div>

            {/* Task Item 2 (Checked) */}
            <div className="flex items-center gap-2">
              <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/20">
                <Check className="h-2.5 w-2.5 text-emerald-400" strokeWidth={3} />
              </div>
              <div className="h-1.5 w-2/3 rounded-full bg-white/20 line-through opacity-40" />
            </div>

            {/* Task Item 3 (Checked) */}
            <div className="flex items-center gap-2">
              <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/20">
                <Check className="h-2.5 w-2.5 text-emerald-400" strokeWidth={3} />
              </div>
              <div className="h-1.5 w-1/2 rounded-full bg-white/20 line-through opacity-40" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Empty Notification feed — stacked alert rows with bell badge.
 */
export function NotificationFeedEmptyIllustration() {
  return (
    <div
      aria-hidden
      className="px-spacing-4 py-spacing-2 relative flex w-full select-none justify-center"
    >
      <div className="relative w-full max-w-[100px]">
        <div className="absolute -z-10 h-16 w-16 rounded-full bg-violet-500/10 opacity-60 blur-xl" />

        <div className="card-glass relative flex aspect-[4/3] w-full flex-col justify-center gap-1.5 rounded-2xl border-white/10 bg-[#1C1C1E] p-2 shadow-2xl ring-1 ring-white/10">
          <div className="flex items-center gap-1.5 rounded-md bg-white/[0.04] px-1 py-1">
            <span className="indicator-dot-glass-green h-1.5 w-1.5 shrink-0 rounded-full" />
            <div className="h-1 flex-1 rounded-full bg-white/50" />
            <div className="h-1 w-3 shrink-0 rounded-full bg-white/20" />
          </div>
          <div className="flex items-center gap-1.5 rounded-md bg-white/[0.03] px-1 py-1 opacity-70">
            <span className="indicator-dot-glass-blue h-1.5 w-1.5 shrink-0 rounded-full" />
            <div className="h-1 w-3/4 rounded-full bg-white/35" />
            <div className="h-1 w-2 shrink-0 rounded-full bg-white/15" />
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-dashed border-white/10 bg-white/[0.02] px-1 py-1 opacity-40">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full border border-dashed border-white/20" />
            <div className="h-1 w-1/2 rounded-full bg-white/20" />
          </div>

          <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] border-violet-500/30 bg-[#2C2C2E] shadow-lg">
            <Bell className="h-3.5 w-3.5 text-violet-400" strokeWidth={2.25} />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Empty Approval Queue — Shield and pristine document, showing all approved.
 */
export function ApprovalQueueEmptyIllustration() {
  return (
    <div
      aria-hidden
      className="px-spacing-4 py-spacing-2 relative flex w-full select-none justify-center"
    >
      <div className="relative w-full max-w-[100px]">
        {/* Ambient background glow */}
        <div className="absolute -z-10 h-16 w-16 rounded-full bg-amber-500/10 opacity-60 blur-xl" />

        {/* Certificate / Document body */}
        <div className="card-glass relative flex aspect-[4/3] w-full flex-col justify-between rounded-2xl border-white/10 bg-[#1C1C1E] p-2.5 shadow-2xl ring-1 ring-white/10">
          <div className="space-y-1.5">
            {/* Header detail */}
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-2/3 rounded-full bg-white/80" />
            </div>
            {/* Document details lines */}
            <div className="space-y-1">
              <div className="h-1 w-full rounded-full bg-white/35" />
              <div className="h-1 w-5/6 rounded-full bg-white/20" />
            </div>
          </div>

          {/* Seal / Shield Badge */}
          <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] border-amber-500/30 bg-[#2C2C2E] shadow-lg shadow-amber-500/10">
            <ShieldCheck className="h-4.5 w-4.5 text-amber-400" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Empty Completed Automations — A node graph blueprint showing trigger connected to action.
 */
export function CompletedAutomationsEmptyIllustration() {
  return (
    <div
      aria-hidden
      className="px-spacing-4 py-spacing-2 relative flex w-full select-none justify-center"
    >
      <div className="relative w-full max-w-[100px]">
        {/* Ambient background glow */}
        <div className="absolute -z-10 h-16 w-16 rounded-full bg-cyan-500/10 opacity-60 blur-xl" />

        {/* Blueprint Canvas */}
        <div className="card-glass relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border-white/10 bg-[#1C1C1E] p-2 shadow-2xl ring-1 ring-white/10">
          {/* Subtle grid background */}
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:6px_6px]" />

          {/* Trigger Node */}
          <div className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg border border-white/10 bg-slate-950 p-1 shadow-md">
            <Play className="h-3.5 w-3.5 shrink-0 fill-cyan-400/25 text-cyan-400" />
          </div>

          {/* Connected Energy Line */}
          <div className="absolute inset-x-9 top-1/2 h-[1px] -translate-y-1/2 border-t border-dashed border-white/25" />

          {/* Action Node */}
          <div className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg border border-white/10 bg-slate-950 p-1 shadow-md">
            <MessageSquare className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
          </div>

          {/* Cursor Indicator */}
          <div className="pointer-events-none absolute bottom-1.5 right-[1.5rem] z-20 rotate-12">
            <MousePointer2 className="h-2.5 w-2.5 fill-slate-950 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
          </div>
        </div>
      </div>
    </div>
  )
}
