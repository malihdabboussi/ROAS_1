'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlignLeft,
  Bold,
  Bookmark,
  BookOpen,
  Briefcase,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Gift,
  Globe,
  Heart,
  Instagram,
  Italic,
  LayoutTemplate,
  Link2,
  List,
  ListOrdered,
  Mail,
  Megaphone,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Send,
  Share2,
  ThumbsUp,
  Underline,
} from 'lucide-react'
import { FunnelHeroPageTwoWebGl } from '@/components/feature-pages/FunnelHeroPageTwoWebGl'
import { FUNNEL_HERO_STACK_CARDS } from '@/components/feature-pages/FunnelStackBrowserCard'
import { MockAdFeedCreative } from '@/components/mockup-studio/MockAdFeedCreative'
import { MockInstagramFeedCreative } from '@/components/mockup-studio/MockInstagramFeedCreative'
import { MockPresentationCoverCreative } from '@/components/mockup-studio/MockPresentationCoverCreative'
import { MockupOfferPreview } from '@/components/mockup-studio/MockupOfferPreview'

/** Funnels `/features/funnels` hero peel #2 (`FunnelHeroPageTwoWebGl` + `FUNNEL_HERO_STACK_CARDS[0]`). */
const STUDIO_FUNNEL_LANDING_PREVIEW = FUNNEL_HERO_STACK_CARDS[0]

const SLIDE_MS = 3000
const FADE_S = 0.35

const EMAIL_LINES = [
  { text: 'Hi {{first_name}},', style: 'foreground' as const },
  {
    text: "You asked for a faster way to fill pipeline without adding headcount. Inside this sequence you'll get the landing template, the presentation, and the follow-ups we use with SaaS founders.",
    style: 'muted' as const,
  },
  { text: 'Open the playbook →', style: 'cta' as const },
]
const TYPING_SPEED_MS = 12

function useTypewriter(lines: typeof EMAIL_LINES, speed: number) {
  const [visibleChars, setVisibleChars] = useState(0)
  const totalChars = lines.reduce((sum, l) => sum + l.text.length, 0)
  const rafRef = useRef(0)
  const startRef = useRef(0)

  useEffect(() => {
    startRef.current = performance.now()
    const tick = (now: number) => {
      const elapsed = now - startRef.current
      const chars = Math.min(Math.floor(elapsed / speed), totalChars)
      setVisibleChars(chars)
      if (chars < totalChars) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [speed, totalChars])

  const result: { text: string; style: (typeof EMAIL_LINES)[number]['style']; done: boolean }[] = []
  let remaining = visibleChars
  for (const line of lines) {
    const show = Math.min(remaining, line.text.length)
    result.push({
      text: line.text.slice(0, show),
      style: line.style,
      done: show === line.text.length,
    })
    remaining -= show
    if (remaining <= 0) break
  }
  return { lines: result, allDone: visibleChars >= totalChars }
}

export type CampaignPreviewGlass = {
  cardGlass: CSSProperties
  chipGlassGreen: CSSProperties
  chipGlassNeutral: CSSProperties
}

type SlideId = 'offer' | 'funnel' | 'email' | 'ads' | 'presentation' | 'instagram'

const ORDER: SlideId[] = ['offer', 'funnel', 'email', 'ads', 'presentation', 'instagram']

function selRow(active: SlideId, id: SlideId) {
  return active === id
}

function rowHighlight(active: boolean, indent: 'ml-4' | 'ml-8' = 'ml-4') {
  const base = `${indent} flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px]`
  if (active) {
    return {
      className: `${base} font-medium`,
      style: {
        background: 'rgb(var(--accent-emerald-rgb) / 0.1)',
        color: 'var(--accent-emerald)',
      } as CSSProperties,
    }
  }
  return {
    className: `${base} text-color-muted`,
    style: undefined as CSSProperties | undefined,
  }
}

function FbGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" width={14} height={14}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function IgGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" width={14} height={14}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}

function ArtifactTree({ active }: { active: SlideId }) {
  const o = selRow(active, 'offer')
  const f = selRow(active, 'funnel')
  const e = selRow(active, 'email')
  const a = selRow(active, 'ads')
  const l = selRow(active, 'presentation')
  const i = selRow(active, 'instagram')

  const rOffer = rowHighlight(o)
  const rLanding = rowHighlight(f)
  const rEmail = rowHighlight(e)
  const rAd = rowHighlight(a)
  const rPresentation = rowHighlight(l)
  const rIg = rowHighlight(i, 'ml-8')

  return (
    <div
      className="hidden w-[220px] flex-shrink-0 flex-col overflow-hidden sm:flex"
      style={{ borderRight: '1px solid var(--border-strong)' }}
    >
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-glass)' }}>
        <span className="text-color-primary text-[12px] font-medium">SaaS Launch Q1</span>
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
        <div className="text-color-muted flex items-center gap-2 rounded-lg px-2 py-1.5">
          <ChevronDown size={12} />
          <Briefcase size={14} />
          <span className="text-[12px]">Offers</span>
          <span className="text-color-dimmer ml-auto text-[10px]">1</span>
        </div>
        <div className={rOffer.className} style={rOffer.style}>
          <FileText size={14} />
          <span>SaaS Launch Offer</span>
        </div>

        <div className="text-color-muted flex items-center gap-2 rounded-lg px-2 py-1.5">
          <ChevronDown size={12} />
          <LayoutTemplate size={14} />
          <span className="text-[12px]">Funnels</span>
          <span className="text-color-dimmer ml-auto text-[10px]">1</span>
        </div>
        <div className={rLanding.className} style={rLanding.style}>
          <FileText size={14} />
          <span>Landing Page</span>
        </div>

        <div className="text-color-muted flex items-center gap-2 rounded-lg px-2 py-1.5">
          <ChevronDown size={12} />
          <Mail size={14} />
          <span className="text-[12px]">Email Sequences</span>
          <span className="text-color-dimmer ml-auto text-[10px]">1</span>
        </div>
        <div className={rEmail.className} style={rEmail.style}>
          <Mail size={14} />
          <span>Welcome · Email 1</span>
        </div>

        <div className="text-color-muted flex items-center gap-2 rounded-lg px-2 py-1.5">
          <ChevronDown size={12} />
          <Megaphone size={14} />
          <span className="text-[12px]">Ads</span>
          <span className="text-color-dimmer ml-auto text-[10px]">1</span>
        </div>
        <div className={rAd.className} style={rAd.style}>
          <Megaphone size={14} />
          <span>Meta · Feed creative</span>
        </div>

        <div className="text-color-muted flex items-center gap-2 rounded-lg px-2 py-1.5">
          <ChevronDown size={12} />
          <Gift size={14} />
          <span className="text-[12px]">Presentations</span>
          <span className="text-color-dimmer ml-auto text-[10px]">1</span>
        </div>
        <div className={rPresentation.className} style={rPresentation.style}>
          <BookOpen size={14} />
          <span>Sales Automation Playbook</span>
        </div>

        <div className="text-color-muted flex items-center gap-2 rounded-lg px-2 py-1.5">
          <ChevronDown size={12} />
          <Share2 size={14} />
          <span className="text-[12px]">Social Content</span>
          <span className="text-color-dimmer ml-auto text-[10px]">1</span>
        </div>
        <div className="text-color-muted ml-4 flex items-center gap-2 rounded-lg px-2 py-1.5">
          <ChevronDown size={12} />
          <Instagram size={14} />
          <span className="text-[12px]">Instagram</span>
          <span className="text-color-dimmer ml-auto text-[10px]">1</span>
        </div>
        <div className={rIg.className} style={rIg.style}>
          <Instagram size={14} />
          <span>Q1 launch carousel</span>
        </div>
      </div>
    </div>
  )
}

function OfferPane() {
  return (
    <div className="studio-app-preview-root h-full min-h-0 overflow-hidden">
      <MockupOfferPreview />
    </div>
  )
}

function FunnelPane({ glass }: { glass: CampaignPreviewGlass }) {
  const c = STUDIO_FUNNEL_LANDING_PREVIEW
  return (
    <div className="studio-app-preview-root flex h-full min-h-0 flex-col overflow-hidden">
      <div className="studio-preview-border-b flex items-center gap-3 px-4 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <LayoutTemplate size={14} style={{ color: 'var(--color-muted-foreground)' }} />
          <span className="truncate text-[11px] font-medium text-[var(--color-foreground)]">
            {c.funnelLabel}
          </span>
          <span className="mockup-badge-emerald inline-flex shrink-0 items-center gap-1 px-2 py-0.5">
            <span className="mockup-dot-active" />
            <span className="text-color-emerald text-[10px]">Live</span>
          </span>
        </div>
        <div
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5"
          style={glass.chipGlassGreen}
        >
          <Globe size={14} />
          <span className="text-[11px] font-medium">Publish</span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <FunnelHeroPageTwoWebGl
          compact
          trustBadge={{ text: c.pill, icons: ['★', '★', '★'] }}
          headline={{ line1: c.headline, line2: c.headlineLine2 ?? '' }}
          subtitle={c.subcopy}
        />
      </div>
    </div>
  )
}

const MOCK_SEQUENCE_EMAILS = 5

function EmailBodyTyped() {
  const { lines, allDone } = useTypewriter(EMAIL_LINES, TYPING_SPEED_MS)
  return (
    <div className="body-2 space-y-3 text-[var(--color-foreground)]">
      {lines.map((l, i) => {
        if (!l.text) return null
        if (l.style === 'cta') {
          return (
            <p key={i}>
              <span className="font-semibold" style={{ color: 'rgb(var(--accent-emerald-rgb))' }}>
                {l.text}
              </span>
            </p>
          )
        }
        return (
          <p key={i} className={l.style === 'muted' ? 'text-[var(--color-muted-foreground)]' : ''}>
            {l.text}
            {!l.done && (
              <span className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-[var(--color-foreground)]" />
            )}
          </p>
        )
      })}
      {allDone && (
        <span className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-[var(--color-foreground)]" />
      )}
    </div>
  )
}

/** Mirrors apps/web `SequencePreview` + `EmailEditorCard`. */
function EmailPane() {
  return (
    <div className="studio-app-preview-root flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="mr-6 min-w-0 truncate text-sm font-semibold text-[var(--color-foreground)]">
          SaaS Founder Nurture
        </h2>
        <div className="hidden md:block">
          <span className="studio-seq-btn-icon-glass inline-flex" aria-hidden>
            <List size={16} strokeWidth={2} />
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-hidden px-3 sm:px-4">
          <div
            className="card-glass flex h-full min-h-0 flex-col overflow-hidden"
            style={{ borderRadius: 'var(--spacing-4)' }}
          >
            <div className="studio-preview-border-b flex items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
                  Your playbook is ready: here&apos;s what&apos;s inside
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--color-muted-foreground)]">Published</span>
                    <div
                      className="switch-glass-primary relative inline-flex h-5 w-9 shrink-0 items-center rounded-full"
                      role="presentation"
                    >
                      <span className="switch-glass-primary-thumb inline-block h-4 w-4 translate-x-4 transform rounded-full" />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="input-glass body-3 flex min-w-[190px] items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-[var(--color-foreground)]"
                    aria-hidden
                  >
                    <span className="truncate">Immediately</span>
                    <ChevronDown
                      size={14}
                      className="shrink-0 text-[var(--color-muted-foreground)]"
                    />
                  </button>
                  <div className="text-xs text-[var(--color-muted-foreground)]">First email</div>
                </div>
              </div>
              <span className="flex shrink-0 items-center gap-1 text-[10px] text-emerald-400">
                <Check size={12} strokeWidth={2.5} className="shrink-0" />
                <span>Saved</span>
              </span>
            </div>

            <div className="min-h-0 flex-1 p-3">
              <div className="studio-seq-email-shell flex h-full min-h-[140px] flex-col overflow-hidden">
                <div className="studio-seq-toolbar">
                  <button type="button" aria-hidden>
                    <Bold size={14} strokeWidth={2} />
                  </button>
                  <button type="button" aria-hidden>
                    <Italic size={14} strokeWidth={2} />
                  </button>
                  <button type="button" aria-hidden>
                    <Underline size={14} strokeWidth={2} />
                  </button>
                  <button type="button" aria-hidden>
                    <List size={14} strokeWidth={2} />
                  </button>
                  <button type="button" aria-hidden>
                    <ListOrdered size={14} strokeWidth={2} />
                  </button>
                  <button type="button" aria-hidden>
                    <AlignLeft size={14} strokeWidth={2} />
                  </button>
                  <button type="button" aria-hidden>
                    <Link2 size={14} strokeWidth={2} />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  <EmailBodyTyped />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="studio-preview-border-t flex items-center justify-center gap-3 px-4 py-3">
          <span className="rounded-md p-1 opacity-30" aria-hidden>
            <ChevronLeft className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          </span>
          <div className="flex items-center gap-2">
            {Array.from({ length: MOCK_SEQUENCE_EMAILS }, (_, idx) => (
              <span
                key={idx}
                className={`rounded-full transition-all ${idx === 0 ? 'studio-seq-indicator-blue h-2.5 w-2.5' : 'h-2 w-2'}`}
                style={idx === 0 ? undefined : { background: 'var(--color-border)' }}
                aria-hidden
              />
            ))}
          </div>
          <span className="rounded-md p-1" aria-hidden>
            <ChevronRight className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          </span>
        </div>
      </div>
    </div>
  )
}

function AdsPane() {
  return (
    <div className="studio-app-preview-root flex h-full min-h-0 flex-col overflow-hidden">
      <div className="studio-preview-border-b flex flex-wrap items-center justify-end gap-2 px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded-md p-1.5 text-white"
            style={{ background: 'rgb(var(--accent-blue-rgb) / 0.12)' }}
            aria-label="Facebook"
          >
            <FbGlyph className="text-white" />
          </button>
          <button
            type="button"
            className="rounded-md p-1.5 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-secondary)]"
            aria-label="Instagram"
          >
            <IgGlyph />
          </button>
        </div>
        <div
          className="flex items-center gap-0.5 rounded-lg p-0.5"
          style={{ background: 'var(--color-secondary)' }}
        >
          {(['Feed', 'Story', 'Reels'] as const).map((label, idx) => (
            <span
              key={label}
              className={`rounded-md px-2.5 py-1 text-[10px] font-medium ${idx === 0 ? 'bg-white/[0.08] text-[var(--color-foreground)]' : 'text-[var(--color-muted-foreground)]'}`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
        <div className="mx-auto w-full max-w-[500px] overflow-hidden rounded-lg border border-[#ccd0d5] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
          <div className="flex items-center gap-2.5 px-4 py-3">
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
              style={{
                background: 'linear-gradient(135deg, rgb(var(--accent-blue-rgb)) 0%, #1d4ed8 100%)',
              }}
            >
              V
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[14px] font-semibold text-[#050505]">Vibey</span>
              <div className="flex items-center gap-1">
                <span className="text-[12px] text-[#65676b]">Sponsored</span>
                <span className="text-[12px] text-[#65676b]">·</span>
                <Globe className="h-3 w-3 text-[#65676b]" />
              </div>
            </div>
            <MoreHorizontal className="h-6 w-6 shrink-0 text-[#65676b]" />
          </div>
          <div className="px-4 pb-3">
            <p className="whitespace-pre-line text-[14px] leading-[18px] text-[#050505]">
              Stop bleeding leads on cold traffic. Map the funnel gaps costing you revenue-free
              15-min audit.
            </p>
          </div>
          <MockAdFeedCreative />
          <div className="flex items-center justify-between bg-[#f0f2f5] px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase text-[#65676b]">GOVIBEY.COM</p>
              <p className="truncate text-[14px] font-semibold text-[#050505]">
                Book your pipeline audit
              </p>
              <p className="truncate text-[12px] text-[#65676b]">
                See exactly where leads drop before they ever book.
              </p>
            </div>
          </div>
          <div className="border-t border-[#dadde1] px-4 py-2">
            <div className="flex items-center justify-around py-1 text-[#65676b]">
              <span className="flex items-center gap-1.5 text-[14px] font-semibold">
                <ThumbsUp className="h-5 w-5" />
                Like
              </span>
              <span className="flex items-center gap-1.5 text-[14px] font-semibold">
                <MessageSquare className="h-5 w-5" />
                Comment
              </span>
              <span className="flex items-center gap-1.5 text-[14px] font-semibold">
                <Share2 className="h-5 w-5" />
                Share
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PresentationPane({ glass }: { glass: CampaignPreviewGlass }) {
  return (
    <div className="studio-app-preview-root flex h-full min-h-0 flex-col overflow-hidden">
      <div className="studio-preview-border-b flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-[var(--color-muted-foreground)]" />
          <span className="text-[11px] font-medium text-[var(--color-foreground)]">
            Sales Automation Playbook
          </span>
        </div>
        <span
          className="rounded-md px-2 py-1 text-[9px] font-medium uppercase text-[var(--color-muted-foreground)]"
          style={glass.chipGlassNeutral}
        >
          PDF
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <MockPresentationCoverCreative />
      </div>
    </div>
  )
}

function InstagramPane() {
  return (
    <div className="studio-app-preview-root flex h-full min-h-0 flex-col overflow-hidden">
      <div className="studio-preview-border-b flex w-full items-center justify-center px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Instagram size={14} className="text-[var(--color-muted-foreground)]" />
          <span className="text-[11px] font-medium text-[var(--color-foreground)]">
            Instagram · Feed
          </span>
        </div>
      </div>
      <div className="min-h-0 w-full flex-1 overflow-y-auto p-4">
        <div className="mx-auto w-full max-w-[390px] overflow-hidden rounded-lg bg-[#121212] text-white shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600" />
            <div className="min-w-0 flex-1 text-[13px] font-semibold">Vibey.im</div>
            <MoreHorizontal className="h-5 w-5 shrink-0 opacity-80" />
          </div>
          <div className="relative w-full overflow-hidden rounded-lg px-0.5">
            <MockInstagramFeedCreative />
          </div>
          <div className="flex items-center gap-4 px-3 pb-1 pt-2.5">
            <Heart className="h-6 w-6" strokeWidth={1.5} />
            <MessageCircle className="h-6 w-6" strokeWidth={1.5} />
            <Send className="h-6 w-6" strokeWidth={1.5} />
            <div className="flex-1" />
            <Bookmark className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <div className="px-3 pb-3 pt-1">
            <p className="text-[13px]">
              <span className="font-semibold">Vibey.im</span>{' '}
              <span className="text-white/90">
                Q1 launch is live: funnel + emails + ads in one workspace. Link in bio.
              </span>
            </p>
            <p className="mt-1 text-[11px] text-white/50">View all 24 comments</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewBody({ id, glass }: { id: SlideId; glass: CampaignPreviewGlass }) {
  switch (id) {
    case 'offer':
      return <OfferPane />
    case 'funnel':
      return <FunnelPane glass={glass} />
    case 'email':
      return <EmailPane />
    case 'ads':
      return <AdsPane />
    case 'presentation':
      return <PresentationPane glass={glass} />
    case 'instagram':
      return <InstagramPane />
  }
}

export function AppMockupCampaignPreviewRotator({ glass, hideTree }: { glass: CampaignPreviewGlass; hideTree?: boolean }) {
  const [index, setIndex] = useState(0)
  const active = ORDER[index % ORDER.length]

  useEffect(() => {
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % ORDER.length)
    }, SLIDE_MS)
    return () => window.clearInterval(t)
  }, [])

  return (
    <div
      className="flex min-h-0 flex-1 overflow-hidden rounded-2xl"
      style={{ ...glass.cardGlass, borderRadius: '16px' }}
    >
      {!hideTree && <ArtifactTree active={active} />}
      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={active}
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: FADE_S, ease: 'easeInOut' }}
            className="absolute inset-0 flex min-h-0 flex-col"
          >
            <PreviewBody id={active} glass={glass} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
