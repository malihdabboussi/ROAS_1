'use client'

import { useCallback, useEffect, useRef } from 'react'
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  FileText,
  Flag,
  Plus,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import {
  MARKETING_AGENT_LIBRARY_FALLBACK,
  VIBEY_MARKETING_PORTRAIT_FALLBACK,
} from '@/lib/agent-library-fallback'
import type { MarketingSampleDeliverable } from '@/lib/marketing-mission-deliverable-samples'
import type { PublicAgentLibraryRow } from '@/lib/public-agent-library'

/** Aligns with apps/web `DELIVERABLE_TYPE_BADGE` / `DELIVERABLE_TYPE_LABEL` (campaigns constants). */
const DELIVERABLE_TYPE_BADGE: Record<MarketingSampleDeliverable['type'], string> = {
  funnel: 'badge-glass badge-glass-blue',
  sequence: 'badge-glass badge-glass-orange',
  presentation: 'badge-glass badge-glass-purple',
  social_post: 'badge-glass badge-glass-purple',
}

const DELIVERABLE_TYPE_LABEL: Record<MarketingSampleDeliverable['type'], string> = {
  funnel: 'Funnel',
  sequence: 'Sequence',
  presentation: 'Presentation',
  social_post: 'Social Post',
}

const MOCK_EXTRA_DOCUMENTS_COUNT = 3

const ASSIGNEE_ROLE_ORDER = ['analyst', 'copywriter', 'designer', 'pm_marketing'] as const

const SUBTASKS = [
  {
    id: '1',
    title: 'Research ICP + competitor proof points',
    status: 'done' as const,
    assignee: 'analyst',
  },
  {
    id: '2',
    title: 'Outline 3-email nurture arc + CTAs',
    status: 'in_progress' as const,
    assignee: 'copywriter',
  },
  {
    id: '3',
    title: 'Draft email copy (emails 1–3)',
    status: 'pending' as const,
    assignee: 'copywriter',
  },
  {
    id: '4',
    title: 'Design visual blocks + hero variants',
    status: 'pending' as const,
    assignee: 'designer',
  },
  { id: '5', title: 'QA pass + Brain sync', status: 'pending' as const, assignee: 'pm_marketing' },
]

function buildAgentByRole(libraryAgents: PublicAgentLibraryRow[] | undefined) {
  const byRole = new Map<string, PublicAgentLibraryRow>()
  for (const r of MARKETING_AGENT_LIBRARY_FALLBACK) {
    byRole.set(r.role_key, r)
  }
  if (libraryAgents) {
    for (const r of libraryAgents) {
      byRole.set(r.role_key, r)
    }
  }
  return byRole
}

function resolveVibeyPortrait(vibeyPortraitUrl: string | undefined) {
  const t = vibeyPortraitUrl?.trim()
  return t && t.length > 0 ? t : VIBEY_MARKETING_PORTRAIT_FALLBACK
}

function MetaAssigneeFace(props: { agent: PublicAgentLibraryRow | undefined; roleKey: string }) {
  const label = props.agent?.default_name ?? props.roleKey
  const src = props.agent?.image_url
  return (
    <div
      className="mission-mock-assignee-wrap"
      title={label}
      style={{ width: 22, height: 22, borderRadius: 9999, overflow: 'hidden', flexShrink: 0 }}
    >
      {!src ? (
        <div
          className="mission-assignee-orb text-micro-avatar text-app-foreground flex h-full w-full items-center justify-center bg-white/10"
          style={{ fontSize: 9, fontWeight: 700 }}
        >
          {label.slice(0, 1).toUpperCase()}
        </div>
      ) : (
        <img
          src={src}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          decoding="async"
        />
      )}
    </div>
  )
}

function ActivityFace(props: { src: string; name: string }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <span
        className="mission-mock-activity-wrap"
        style={{ width: 14, height: 14, borderRadius: 9999, overflow: 'hidden', flexShrink: 0 }}
      >
        <img
          src={props.src}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          decoding="async"
        />
      </span>
      <span className="text-app-muted" style={{ fontSize: 10 }}>
        {props.name}
      </span>
    </div>
  )
}

/**
 * Visual preview components — render like the actual artifact output, not as code.
 * Content sourced from real DB rows (see marketing-deliverable-db-excerpts.ts).
 * In the real app these render via SandpackPreview / TsxMiniIframe; here we
 * recreate the visual result as static HTML miniatures.
 */

function FunnelRegisterPagePreview() {
  const checklist = [
    '2 full days of live tactical training',
    'Access to all sessions, workshops, and panels',
    'Sponsored lunch both days',
    'Vendor expo & sponsor showcase',
    'Networking with 200+ founders & operators',
  ]
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: '#0D0D0D',
        fontFamily: '"Source Sans 3", system-ui, sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: '400%',
          height: '400%',
          transform: 'scale(0.25)',
          transformOrigin: 'top left',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 420px',
            gap: 60,
            padding: '60px 40px 40px',
            alignItems: 'start',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                border: '1px solid rgba(200,16,46,0.4)',
                background: 'rgba(200,16,46,0.08)',
                padding: '4px 12px',
                marginBottom: 20,
              }}
            >
              <span style={{ width: 5, height: 5, background: '#C8102E', borderRadius: '50%' }} />
              <span
                style={{
                  fontSize: 10,
                  color: '#C8102E',
                  letterSpacing: '0.25em',
                  textTransform: 'uppercase',
                }}
              >
                June 12-13, 2026 · Austin, TX
              </span>
            </div>
            <h1
              style={{
                fontFamily: '"Bebas Neue", sans-serif',
                fontSize: 64,
                lineHeight: 0.95,
                letterSpacing: '0.04em',
                color: '#F5F5F5',
                marginBottom: 14,
              }}
            >
              CLAIM YOUR
              <br />
              SEAT AT
              <br />
              <span style={{ color: '#C8102E' }}>SCALE SUMMIT 2026</span>
            </h1>
            <p
              style={{
                fontSize: 15,
                color: 'rgba(245,245,245,0.55)',
                lineHeight: 1.65,
                marginBottom: 30,
                maxWidth: 440,
              }}
            >
              Two days. Hundreds of founders. The exact systems to generate more leads, close more
              sales, and scale with real profit.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {checklist.map((item) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      background: 'rgba(200,16,46,0.15)',
                      border: '1px solid rgba(200,16,46,0.4)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ color: '#C8102E', fontSize: 10, fontWeight: 700 }}>✓</span>
                  </span>
                  <span style={{ color: 'rgba(245,245,245,0.65)', fontSize: 13 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div
            style={{
              background: '#111',
              border: '1px solid #2E2E2E',
              padding: 32,
              position: 'sticky',
              top: 60,
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 22 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  border: '1px solid rgba(200,16,46,0.4)',
                  background: 'rgba(200,16,46,0.08)',
                  padding: '4px 10px',
                  marginBottom: 10,
                }}
              >
                <span style={{ width: 4, height: 4, background: '#C8102E', borderRadius: '50%' }} />
                <span
                  style={{
                    color: '#C8102E',
                    fontSize: 9,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                  }}
                >
                  Limited Seats Available
                </span>
              </div>
              <h2
                style={{
                  fontFamily: '"Bebas Neue", sans-serif',
                  fontSize: 34,
                  color: '#F5F5F5',
                  letterSpacing: '0.08em',
                  marginBottom: 4,
                }}
              >
                CLAIM YOUR SEAT
              </h2>
              <p style={{ color: 'rgba(245,245,245,0.4)', fontSize: 12 }}>
                Scale Summit 2026 — Austin, TX
              </p>
            </div>
            {['Full Name', 'Email Address', 'Phone Number', 'Trade / Industry'].map((label) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <div
                  style={{
                    fontSize: 10,
                    color: 'rgba(245,245,245,0.35)',
                    marginBottom: 4,
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    height: 36,
                    background: '#1A1A1A',
                    border: '1px solid #2E2E2E',
                    borderRadius: 4,
                  }}
                />
              </div>
            ))}
            <div
              style={{
                marginTop: 16,
                background: '#C8102E',
                color: '#fff',
                textAlign: 'center',
                padding: '12px 0',
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}
            >
              REGISTER NOW →
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SequenceEmailPreview() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: '#fff',
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: '400%',
          height: '400%',
          transform: 'scale(0.25)',
          transformOrigin: 'top left',
        }}
      >
        <div style={{ maxWidth: 580, margin: '0 auto', padding: '40px 24px' }}>
          <div style={{ borderBottom: '1px solid #e5e5e5', paddingBottom: 16, marginBottom: 24 }}>
            <div
              style={{
                fontSize: 10,
                color: '#999',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 6,
              }}
            >
              Subject
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a' }}>
              Last email. One question.
            </div>
          </div>
          <div style={{ fontSize: 15, color: '#333', lineHeight: 1.8 }}>
            <p>{'{{first_name}}'},</p>
            <p style={{ marginTop: 16 }}>This is the last email in this series.</p>
            <p style={{ marginTop: 16 }}>
              I&apos;m not going to hit you with another story or another strategy breakdown.
            </p>
            <p style={{ marginTop: 16 }}>Just one question:</p>
            <p style={{ marginTop: 16, fontWeight: 700, fontSize: 17, color: '#1a1a1a' }}>
              A year from now, what do you want your coaching business to look like?
            </p>
            <p style={{ marginTop: 16 }}>
              Not what you think is realistic. What you actually want.
            </p>
            <p style={{ marginTop: 20 }}>
              Alex wanted to stop trading time for money. He&apos;s at <strong>$67K/month</strong>.
            </p>
            <p style={{ marginTop: 8 }}>
              Maya wanted to break through the $10K ceiling. She&apos;s at <strong>$92K</strong>.
            </p>
            <p style={{ marginTop: 8 }}>
              Jordan and Sam wanted a real business, not a hustle. They&apos;re at{' '}
              <strong>$40-$50K a month</strong>, consistently.
            </p>
            <p style={{ marginTop: 20 }}>
              None of them had a secret. None of them had a massive advantage you don&apos;t have.
            </p>
            <p style={{ marginTop: 16, fontWeight: 600, color: '#1a1a1a' }}>
              They just got in the right room and did the work.
            </p>
            <p style={{ marginTop: 20 }}>If you want to be in that room, the door is open.</p>
            <p style={{ marginTop: 16 }}>
              DM me &apos;SCALE&apos; on Instagram{' '}
              <span style={{ color: '#2563eb' }}>@vibaborhq</span>.
            </p>
            <p style={{ marginTop: 24, color: '#666', fontSize: 14 }}>
              Talk soon.
              <br />
              <br />
              — The ROAS Team
              <br />
              <span style={{ fontSize: 13, color: '#999' }}>ROAS · AI-powered marketing</span>
            </p>
            <p
              style={{
                marginTop: 20,
                fontStyle: 'italic',
                color: '#555',
                fontSize: 14,
                borderLeft: '3px solid #e5e5e5',
                paddingLeft: 14,
              }}
            >
              P.S. If you&apos;ve been meaning to reach out and keep putting it off — that pattern
              is exactly what&apos;s keeping you stuck. DM me today.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function PresentationDeckPreview() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: '#0D0D0D',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: '400%',
          height: '400%',
          transform: 'scale(0.25)',
          transformOrigin: 'top left',
        }}
      >
        <div
          style={{
            minHeight: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            position: 'relative',
            padding: 48,
            background:
              'radial-gradient(ellipse 80% 70% at 50% 40%, rgba(232,50,10,0.15) 0%, transparent 70%), #0D0D0D',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(232,50,10,0.15)',
              color: '#FF6B2B',
              border: '1px solid rgba(232,50,10,0.3)',
              padding: '6px 16px',
              marginBottom: 28,
              fontSize: 11,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            META AD STRATEGY
          </div>
          <h1
            style={{
              fontSize: 56,
              fontWeight: 800,
              color: '#F5F5F5',
              lineHeight: 1.05,
              marginBottom: 20,
              letterSpacing: '-0.01em',
            }}
          >
            Scale Engine
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg, #E8320A, #FF6B2B)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Ad Copy Deck
            </span>
          </h1>
          <p style={{ fontSize: 16, color: '#999', marginBottom: 36, lineHeight: 1.6 }}>
            3 Facebook + Instagram ad concepts for the
            <br />
            <strong style={{ color: '#F5F5F5' }}>Founder Growth Playbook</strong> campaign
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 36 }}>
            {[
              { num: '3', label: 'Ad Concepts' },
              { num: '$50/day', label: 'Starting Budget' },
              { num: '2', label: 'Formats' },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontSize: 26,
                    fontWeight: 700,
                    color: '#E8320A',
                  }}
                >
                  {s.num}
                </div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 28,
              fontSize: 11,
              color: '#444',
              letterSpacing: '1px',
            }}
          >
            PREPARED BY PIXEL · SCALE ENGINE
          </div>
        </div>
      </div>
    </div>
  )
}

function SocialPostPreview() {
  return (
    <img
      src="/marketing/social-post-carousel-cover.png"
      alt="Instagram carousel cover"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
    />
  )
}

export function DeliverableVisualPreview({ type }: { type: MarketingSampleDeliverable['type'] }) {
  switch (type) {
    case 'funnel':
      return <FunnelRegisterPagePreview />
    case 'sequence':
      return <SequenceEmailPreview />
    case 'presentation':
      return <PresentationDeckPreview />
    case 'social_post':
      return <SocialPostPreview />
  }
}

const MOCK_DELIVERABLES: { type: MarketingSampleDeliverable['type']; title: string }[] = [
  { type: 'funnel', title: 'Event website' },
  { type: 'social_post', title: 'Launch thread' },
  { type: 'presentation', title: 'Ad copy deck' },
  { type: 'sequence', title: 'Nurture emails' },
]

function MockCoreDeliverableCard(props: {
  title: string
  type: MarketingSampleDeliverable['type']
}) {
  const badgeClass = DELIVERABLE_TYPE_BADGE[props.type]
  const label = DELIVERABLE_TYPE_LABEL[props.type]

  return (
    <div className="card-glass h-spacing-60 w-spacing-60 rounded-spacing-2 flex shrink-0 flex-col overflow-hidden">
      <div className="bg-muted-20 relative min-h-0 flex-[8] overflow-hidden">
        <DeliverableVisualPreview type={props.type} />
      </div>
      <div className="px-spacing-2 py-spacing-1 gap-spacing-1 flex flex-[2] items-center justify-between overflow-hidden">
        <span className="body-3 truncate font-medium text-[var(--color-foreground)]">
          {props.title}
        </span>
        <span className={`shrink-0 ${badgeClass} typo-caption font-medium`}>{label}</span>
      </div>
    </div>
  )
}

export function MarketingMissionDetailModalMockup(props?: {
  libraryAgents?: PublicAgentLibraryRow[]
  vibeyPortraitUrl?: string
}) {
  const byRole = buildAgentByRole(props?.libraryAgents)
  const vibeyPortrait = resolveVibeyPortrait(props?.vibeyPortraitUrl)
  const doneSubtasks = SUBTASKS.filter((s) => s.status === 'done').length
  const expandedId = '2'
  const deliverablesCarouselRef = useRef<HTMLDivElement>(null)
  const scrollDeliverablesBy = useCallback((delta: number) => {
    const el = deliverablesCarouselRef.current
    if (!el) return
    el.scrollBy({ left: delta, behavior: 'smooth' })
  }, [])
  const deliverablesTotalCount = MOCK_DELIVERABLES.length + MOCK_EXTRA_DOCUMENTS_COUNT

  const pm = byRole.get('pm_marketing')
  const copywriter = byRole.get('copywriter')

  const mobileScrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = mobileScrollRef.current
    if (!el) return
    const mq = window.matchMedia('(max-width: 767px)')
    if (!mq.matches) return

    let cancelled = false
    const timers: number[] = []
    const INITIAL_DELAY = 1400
    const STEP_PAUSE = 900

    const run = () => {
      const steps = el.querySelectorAll<HTMLElement>('[data-mstep]')
      if (steps.length === 0) return
      let t = INITIAL_DELAY
      steps.forEach((step) => {
        const id = window.setTimeout(() => {
          if (cancelled) return
          step.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }, t)
        timers.push(id)
        t += STEP_PAUSE
      })
    }
    run()
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [])

  const mobileLayout = (
    <div
      ref={mobileScrollRef}
      className="mission-detail-mockup-compact surface-card rounded-spacing-4 border-border relative flex h-full min-h-0 w-full flex-col overflow-y-auto overflow-x-hidden border shadow-xl [-webkit-overflow-scrolling:touch] md:hidden"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2.5">
        <h2 className="text-app-foreground min-w-0 truncate font-semibold" style={{ fontSize: 16 }}>
          Q2 founder nurture sequence
        </h2>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className="btn-icon-glass-yellow flex items-center justify-center rounded"
            style={{ width: 24, height: 24 }}
          >
            <Archive style={{ width: 12, height: 12 }} />
          </span>
          <span
            className="btn-icon-glass-destructive flex items-center justify-center rounded"
            style={{ width: 24, height: 24 }}
          >
            <Trash2 style={{ width: 12, height: 12 }} />
          </span>
          <span
            className="btn-icon-glass flex items-center justify-center rounded"
            style={{ width: 24, height: 24 }}
          >
            <X style={{ width: 12, height: 12 }} />
          </span>
        </div>
      </div>

      <div className="flex-none px-3 py-3">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-app-muted" style={{ width: 60, fontSize: 10, flexShrink: 0 }}>
              Status
            </span>
            <div className="text-status-amber flex items-center gap-1.5" style={{ fontSize: 10 }}>
              <Clock style={{ width: 11, height: 11 }} />
              <span className="font-medium">In progress</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-app-muted" style={{ width: 60, fontSize: 10, flexShrink: 0 }}>
              Priority
            </span>
            <div className="text-priority-high flex items-center gap-1.5" style={{ fontSize: 10 }}>
              <Flag style={{ width: 11, height: 11 }} />
              <span className="font-medium">High</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-app-muted" style={{ width: 60, fontSize: 10, flexShrink: 0 }}>
              Created
            </span>
            <span className="text-app-foreground font-medium" style={{ fontSize: 10 }}>
              Mar 28, 2026
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-app-muted" style={{ width: 60, fontSize: 10, flexShrink: 0 }}>
              Completed
            </span>
            <span className="text-app-muted" style={{ fontSize: 10 }}>
              —
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-app-muted" style={{ width: 60, fontSize: 10, flexShrink: 0 }}>
              Assignees
            </span>
            <div className="flex items-center">
              {ASSIGNEE_ROLE_ORDER.map((roleKey, i) => {
                const agent = byRole.get(roleKey)
                return (
                  <div
                    key={roleKey}
                    style={{
                      marginLeft: i > 0 ? -6 : 0,
                      zIndex: 10 - i,
                      border: '2px solid var(--bg-card)',
                      borderRadius: 9999,
                    }}
                  >
                    <MetaAssigneeFace agent={agent} roleKey={roleKey} />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div data-mstep="subtasks" className="border-border flex-none border-t px-3 py-3">
        <div className="mb-2 flex items-center justify-between">
          <h3
            className="text-app-muted font-semibold"
            style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            Subtasks ({doneSubtasks}/{SUBTASKS.length})
          </h3>
          <div
            className="text-app-muted flex cursor-default items-center gap-1"
            style={{ fontSize: 10 }}
          >
            <span>Details</span>
            <ChevronRight style={{ width: 10, height: 10 }} />
          </div>
        </div>
        <div className="space-y-1">
          {SUBTASKS.map((subtask) => {
            const isExpanded = subtask.id === expandedId
            const assigneeAgent = byRole.get(subtask.assignee)
            const assigneeLabel = assigneeAgent?.default_name ?? subtask.assignee
            const statusColor =
              subtask.status === 'done'
                ? 'text-status-emerald'
                : subtask.status === 'in_progress'
                  ? 'text-status-amber'
                  : 'text-subtask-pending-icon'
            const StatusIcon =
              subtask.status === 'done'
                ? CheckCircle2
                : subtask.status === 'in_progress'
                  ? Clock
                  : Circle
            return (
              <div key={subtask.id}>
                <div
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${isExpanded ? 'bg-white/[0.04]' : ''}`}
                >
                  <StatusIcon
                    className={statusColor}
                    style={{ width: 13, height: 13, flexShrink: 0 }}
                  />
                  <span
                    className="text-app-foreground min-w-0 flex-1 truncate"
                    style={{ fontSize: 11, fontWeight: isExpanded ? 500 : 400 }}
                  >
                    {subtask.title}
                  </span>
                  <span
                    className="text-app-muted shrink-0 truncate rounded-full bg-white/[0.03] px-1.5 py-0.5"
                    style={{ fontSize: 8, maxWidth: 60 }}
                  >
                    {assigneeLabel}
                  </span>
                </div>
                {isExpanded && (
                  <div className="ml-5 space-y-1 border-l-2 border-white/[0.03] py-1 pl-2.5 pr-1">
                    <div className="flex min-w-0 gap-1.5">
                      <span
                        className="text-app-foreground font-semibold"
                        style={{ fontSize: 9, width: 38, flexShrink: 0 }}
                      >
                        Goal
                      </span>
                      <span
                        className="text-app-muted-soft min-w-0 break-words"
                        style={{ fontSize: 9, lineHeight: 1.35 }}
                      >
                        Each email removes one core objection. Founders need proof before booking.
                      </span>
                    </div>
                    <div className="flex min-w-0 gap-1.5">
                      <span
                        className="text-app-foreground font-semibold"
                        style={{ fontSize: 9, width: 38, flexShrink: 0 }}
                      >
                        Output
                      </span>
                      <span
                        className="text-app-muted-soft min-w-0 break-words"
                        style={{ fontSize: 9, lineHeight: 1.35 }}
                      >
                        Three tight emails + one landing path that feels bespoke, not batch.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div
        data-mstep="deliverables-heading"
        className="border-border flex-none border-t px-3 pb-1 pt-3"
      >
        <h3 className="body-2 font-semibold text-[var(--color-muted-foreground)]">
          Deliverables ({deliverablesTotalCount})
        </h3>
      </div>
      <div className="flex flex-none flex-col gap-2.5 px-3 pb-4">
        {MOCK_DELIVERABLES.map((d, i) => (
          <div key={d.type} data-mstep={`del-${i}`} className="w-full">
            <div className="card-glass rounded-spacing-2 flex h-36 w-full flex-col overflow-hidden">
              <div className="bg-muted-20 relative min-h-0 flex-[8] overflow-hidden">
                <DeliverableVisualPreview type={d.type} />
              </div>
              <div className="gap-spacing-1 px-spacing-2 py-spacing-1 flex flex-[2] items-center justify-between overflow-hidden">
                <span className="body-3 min-w-0 truncate font-medium text-[var(--color-foreground)]">
                  {d.title}
                </span>
                <span
                  className={`shrink-0 ${DELIVERABLE_TYPE_BADGE[d.type]} typo-caption font-medium`}
                >
                  {DELIVERABLE_TYPE_LABEL[d.type]}
                </span>
              </div>
            </div>
          </div>
        ))}
        <div
          data-mstep="del-docs"
          className="card-glass gap-spacing-2 rounded-spacing-2 flex min-h-[100px] w-full flex-col items-center justify-center"
        >
          <div className="bg-muted-20 flex h-10 w-10 items-center justify-center rounded-full">
            <FileText className="icon-md text-[var(--color-muted-foreground)]" />
          </div>
          <span className="body-3 font-medium text-[var(--color-foreground)]">
            Documents ({MOCK_EXTRA_DOCUMENTS_COUNT})
          </span>
          <span className="typo-caption text-[var(--color-muted-foreground)]">Click to view</span>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {mobileLayout}
      <div className="mission-detail-mockup-compact surface-card rounded-spacing-4 border-border relative hidden h-full min-h-0 w-full flex-1 flex-col overflow-hidden border shadow-xl md:flex">
        {/* Header Bar — apps/web MissionDetailHeader: no divider under title row */}
        <div className="flex shrink-0 items-center justify-between px-4 py-2.5">
          <h2 className="text-app-foreground truncate font-semibold" style={{ fontSize: 16 }}>
            Q2 founder nurture sequence
          </h2>
          <div className="flex shrink-0 items-center gap-1.5">
            <span
              className="btn-icon-glass-yellow flex items-center justify-center rounded"
              style={{ width: 24, height: 24 }}
            >
              <Archive style={{ width: 12, height: 12 }} />
            </span>
            <span
              className="btn-icon-glass-destructive flex items-center justify-center rounded"
              style={{ width: 24, height: 24 }}
            >
              <Trash2 style={{ width: 12, height: 12 }} />
            </span>
            <span
              className="btn-icon-glass flex items-center justify-center rounded"
              style={{ width: 24, height: 24 }}
            >
              <X style={{ width: 12, height: 12 }} />
            </span>
          </div>
        </div>

        {/* Content Grid */}
        <div className="gap-spacing-4 flex min-h-0 flex-1 overflow-hidden">
          {/* Main Content Area — same surface as desktop MissionDetailModal left column */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-4">
              {/* Meta Rows */}
              <div className="mb-6 grid shrink-0 grid-cols-2 gap-x-10 gap-y-3">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <span
                      className="text-app-muted"
                      style={{ width: 60, fontSize: 10, flexShrink: 0 }}
                    >
                      Status
                    </span>
                    <div
                      className="text-status-amber flex items-center gap-1.5"
                      style={{ fontSize: 10 }}
                    >
                      <Clock style={{ width: 11, height: 11 }} />
                      <span className="font-medium">In progress</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-app-muted"
                      style={{ width: 60, fontSize: 10, flexShrink: 0 }}
                    >
                      Priority
                    </span>
                    <div
                      className="text-priority-high flex items-center gap-1.5"
                      style={{ fontSize: 10 }}
                    >
                      <Flag style={{ width: 11, height: 11 }} />
                      <span className="font-medium">High</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <span
                      className="text-app-muted"
                      style={{ width: 60, fontSize: 10, flexShrink: 0 }}
                    >
                      Created
                    </span>
                    <span className="text-app-foreground font-medium" style={{ fontSize: 10 }}>
                      Mar 28, 2026
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-app-muted"
                      style={{ width: 60, fontSize: 10, flexShrink: 0 }}
                    >
                      Completed
                    </span>
                    <span className="text-app-muted" style={{ fontSize: 10 }}>
                      —
                    </span>
                  </div>
                </div>
                <div className="col-span-2 flex items-center gap-3">
                  <span
                    className="text-app-muted"
                    style={{ width: 60, fontSize: 10, flexShrink: 0 }}
                  >
                    Assignees
                  </span>
                  <div className="flex items-center">
                    {ASSIGNEE_ROLE_ORDER.map((roleKey, i) => {
                      const agent = byRole.get(roleKey)
                      return (
                        <div
                          key={roleKey}
                          style={{
                            marginLeft: i > 0 ? -6 : 0,
                            zIndex: 10 - i,
                            border: '2px solid var(--bg-card)',
                            borderRadius: 9999,
                          }}
                        >
                          <MetaAssigneeFace agent={agent} roleKey={roleKey} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Subtasks List */}
              <div className="border-border flex min-h-0 flex-1 flex-col overflow-hidden border-t pt-4">
                <div className="mb-3 flex shrink-0 items-center justify-between">
                  <h3
                    className="text-app-muted font-semibold"
                    style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  >
                    Subtasks ({doneSubtasks}/{SUBTASKS.length})
                  </h3>
                  <div
                    className="text-app-muted hover:text-app-foreground flex cursor-default items-center gap-1 transition-colors"
                    style={{ fontSize: 10 }}
                  >
                    <span>Details</span>
                    <ChevronRight style={{ width: 10, height: 10 }} />
                  </div>
                </div>
                <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto">
                  <div className="space-y-1">
                    {SUBTASKS.map((subtask) => {
                      const isExpanded = subtask.id === expandedId
                      const assigneeAgent = byRole.get(subtask.assignee)
                      const assigneeLabel = assigneeAgent?.default_name ?? subtask.assignee
                      const statusColor =
                        subtask.status === 'done'
                          ? 'text-status-emerald'
                          : subtask.status === 'in_progress'
                            ? 'text-status-amber'
                            : 'text-subtask-pending-icon'
                      const StatusIcon =
                        subtask.status === 'done'
                          ? CheckCircle2
                          : subtask.status === 'in_progress'
                            ? Clock
                            : Circle
                      return (
                        <div key={subtask.id} className="group">
                          <div
                            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${
                              isExpanded ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                            }`}
                          >
                            <StatusIcon
                              className={statusColor}
                              style={{ width: 13, height: 13, flexShrink: 0 }}
                            />
                            <span
                              className="text-app-foreground flex-1 truncate"
                              style={{ fontSize: 11, fontWeight: isExpanded ? 500 : 400 }}
                            >
                              {subtask.title}
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className="text-app-muted truncate rounded-full bg-white/[0.03] px-2 py-0.5"
                                style={{ fontSize: 9, maxWidth: 70, border: '1px solid white/5' }}
                              >
                                {assigneeLabel}
                              </span>
                              <ChevronDown
                                className="text-app-muted-dim group-hover:text-app-muted transition-all"
                                style={{
                                  width: 11,
                                  height: 11,
                                  transform: isExpanded ? 'rotate(180deg)' : 'none',
                                }}
                              />
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="ml-8 space-y-3 pb-4 pr-4 pt-1">
                              <div className="space-y-1.5 border-l-2 border-white/[0.03] py-0.5 pl-3">
                                <div className="flex gap-2">
                                  <span
                                    className="text-app-foreground font-semibold"
                                    style={{ fontSize: 10, width: 50, flexShrink: 0 }}
                                  >
                                    Goal
                                  </span>
                                  <span
                                    className="text-app-muted-soft"
                                    style={{ fontSize: 10, lineHeight: 1.4 }}
                                  >
                                    Each email removes one core objection. Founders need proof
                                    before booking.
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <span
                                    className="text-app-foreground font-semibold"
                                    style={{ fontSize: 10, width: 50, flexShrink: 0 }}
                                  >
                                    Output
                                  </span>
                                  <span
                                    className="text-app-muted-soft"
                                    style={{ fontSize: 10, lineHeight: 1.4 }}
                                  >
                                    Three tight emails + one landing path that feels bespoke, not
                                    batch.
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Deliverables — apps/web DeliverablesCarousel + CoreDeliverableCard */}
            <div className="border-border py-spacing-4 shrink-0 border-t px-5">
              <div className="mb-2 flex w-full items-center justify-between">
                <h3 className="body-2 font-semibold text-[var(--color-muted-foreground)]">
                  Deliverables ({deliverablesTotalCount})
                </h3>
                <div className="gap-spacing-2 flex items-center">
                  <button
                    type="button"
                    onClick={() => scrollDeliverablesBy(-160)}
                    className="btn-icon-glass btn-icon-glass-sm"
                    aria-label="Scroll deliverables left"
                  >
                    <ChevronLeft className="icon-sm" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollDeliverablesBy(160)}
                    className="btn-icon-glass btn-icon-glass-sm"
                    aria-label="Scroll deliverables right"
                  >
                    <ChevronRight className="icon-sm" />
                  </button>
                </div>
              </div>
              <div
                ref={deliverablesCarouselRef}
                className="scrollbar-hide gap-spacing-4 flex flex-nowrap overflow-x-auto pb-1"
                style={{ scrollbarWidth: 'none' }}
              >
                {MOCK_DELIVERABLES.map((d) => (
                  <MockCoreDeliverableCard key={d.type} title={d.title} type={d.type} />
                ))}
                <div className="card-glass h-spacing-60 w-spacing-60 rounded-spacing-2 gap-spacing-2 flex shrink-0 flex-col items-center justify-center">
                  <div className="bg-muted-20 flex h-10 w-10 items-center justify-center rounded-full">
                    <FileText className="icon-md text-[var(--color-muted-foreground)]" />
                  </div>
                  <span className="body-3 font-medium text-[var(--color-foreground)]">
                    Documents ({MOCK_EXTRA_DOCUMENTS_COUNT})
                  </span>
                  <span className="typo-caption text-[var(--color-muted-foreground)]">
                    Click to view
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Activity — apps/web ActivityTimeline card-glass column */}
          <div className="flex min-h-0 shrink-0 flex-col self-stretch" style={{ width: 280 }}>
            <div className="card-glass rounded-spacing-2 flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="px-spacing-6 py-spacing-3 flex-shrink-0">
                <h3
                  className="text-color-primary font-semibold"
                  style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  Activity
                </h3>
              </div>
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="scrollbar-hide px-spacing-6 py-spacing-3 min-h-0 flex-1 overflow-y-auto">
                  <div className="relative">
                    <div className="bg-app-border absolute bottom-2 left-[5px] top-2 w-px" />
                    <div className="space-y-6">
                      {/* Item 1 */}
                      <div className="relative pl-6">
                        <div className="absolute left-[5px] top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-emerald-500/40 bg-emerald-500/20" />
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-emerald-400" style={{ fontSize: 10 }}>
                              Plan approved
                            </span>
                            <ActivityFace src={vibeyPortrait} name="Pixel" />
                          </div>
                          <p className="text-app-muted-dim" style={{ fontSize: 9 }}>
                            3h ago
                          </p>
                        </div>
                      </div>

                      {/* Item 2 */}
                      <div className="relative pl-6">
                        <div className="absolute left-[5px] top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-blue-500/40 bg-blue-500/20" />
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="text-color-secondary font-bold"
                              style={{ fontSize: 10 }}
                            >
                              Execution started
                            </span>
                            {pm && <ActivityFace src={pm.image_url} name={pm.default_name} />}
                          </div>
                          <p className="text-app-muted-dim" style={{ fontSize: 9 }}>
                            2h ago
                          </p>
                        </div>
                      </div>

                      {/* Item 3 */}
                      <div className="relative pl-6">
                        <div className="absolute left-[5px] top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-blue-500/40 bg-blue-500/20" />
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-app-muted leading-relaxed" style={{ fontSize: 10 }}>
                              Executing subtask{' '}
                              <strong className="text-app-foreground">Research ICP</strong>
                            </p>
                            {copywriter && (
                              <ActivityFace
                                src={copywriter.image_url}
                                name={copywriter.default_name}
                              />
                            )}
                          </div>
                          <p className="text-app-muted-dim" style={{ fontSize: 9 }}>
                            1h ago
                          </p>
                        </div>
                      </div>

                      {/* Item 4 - Comment */}
                      <div className="relative pl-6">
                        <div className="absolute left-[5px] top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-white/10 bg-white/5" />
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="text-color-secondary font-bold"
                              style={{ fontSize: 10 }}
                            >
                              User comment
                            </span>
                            <span className="text-app-muted-dim" style={{ fontSize: 9 }}>
                              45m ago
                            </span>
                          </div>
                          <div className="card-glass rounded-spacing-3 p-spacing-3 mt-1">
                            <p
                              className="text-color-secondary italic leading-snug"
                              style={{ fontSize: 10 }}
                            >
                              "Lead with the ROI headline in email 1 — mirror the landing proof
                              strip."
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Composer — apps/web ActivityTimeline input-glass */}
                <div className="px-spacing-4 py-spacing-3 relative flex-shrink-0">
                  <div className="input-glass relative flex flex-col overflow-hidden rounded-xl">
                    <textarea
                      readOnly
                      rows={1}
                      placeholder="Send a message..."
                      className="text-color-primary placeholder:text-color-muted w-full resize-none bg-transparent px-3 pt-2 outline-none"
                      style={{ fontSize: 11, minHeight: 32 }}
                    />
                    <div className="flex items-center justify-between px-2 py-1.5">
                      <button
                        type="button"
                        className="button-glass-neutral flex h-7 w-7 cursor-default items-center justify-center rounded-full transition-all disabled:opacity-30"
                        disabled
                        aria-hidden
                        tabIndex={-1}
                      >
                        <Plus style={{ width: 14, height: 14 }} className="text-color-muted" />
                      </button>
                      <button
                        type="button"
                        className="button-glass-neutral flex h-7 w-7 cursor-default items-center justify-center rounded-full transition-all disabled:opacity-30"
                        disabled
                        aria-hidden
                        tabIndex={-1}
                      >
                        <Send style={{ width: 14, height: 14 }} className="text-color-muted" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
