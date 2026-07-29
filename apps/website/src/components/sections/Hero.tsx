'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  ArrowUpRight,
  Brain,
  ChevronDown,
  FolderKanban,
  Mic,
  Paperclip,
  Settings2,
  X,
} from 'lucide-react'

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {}

function ChipIcon({ name, className }: { name: string; className?: string }) {
  const cached = ICON_MAP[name]
  if (cached) {
    const C = cached
    return <C className={className} />
  }
  const componentName = name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  try {
    const mod = require('lucide-react') as Record<string, React.FC<{ className?: string }>>
    const Comp = mod[componentName]
    if (Comp) {
      ICON_MAP[name] = Comp
      return <Comp className={className} />
    }
  } catch {
    /* noop */
  }
  return null
}

const CAPABILITY_CHIPS = [
  {
    id: 'funnel',
    label: 'Build Funnel',
    icon: 'layers',
    suggestions: [
      'Build a presentation funnel to capture emails',
      'Create an opt-in funnel for my free guide',
      'Build a webinar registration funnel',
      'Design a high-converting sales page funnel',
      'Create a tripwire funnel with a low-ticket offer',
    ],
  },
  {
    id: 'offer',
    label: 'Build Offer',
    icon: 'gift',
    suggestions: [
      'Build an irresistible offer for my coaching program',
      'Create a value stack for my online course',
      'Design a limited-time bundle offer',
      'Build a high-ticket consulting offer',
      'Create a free + shipping physical product offer',
    ],
  },
  {
    id: 'ad',
    label: 'Create Ad',
    icon: 'megaphone',
    suggestions: [
      'Create a Facebook ad to promote my presentation',
      'Design a retargeting ad for warm audiences',
      'Build a carousel ad showcasing product features',
      'Create an Instagram story ad for brand awareness',
      'Write ad copy for a Black Friday promo',
    ],
  },
  {
    id: 'theme',
    label: 'Design Theme',
    icon: 'palette',
    suggestions: [
      'Design a modern, minimal brand theme',
      'Create a bold, high-energy visual identity',
      'Build a luxury brand theme with gold accents',
      'Design a clean SaaS-style theme',
      'Create a warm, coaching-brand theme',
    ],
  },
  {
    id: 'email',
    label: 'Email Sequence',
    icon: 'mail',
    suggestions: [
      'Write a 5-email welcome sequence for new leads',
      'Create an abandoned cart email series',
      'Build a launch sequence for my new course',
      'Write a re-engagement sequence for cold leads',
      'Create a post-purchase nurture sequence',
    ],
  },
  {
    id: 'presentation',
    label: 'Presentation',
    icon: 'magnet',
    suggestions: [
      'Create a PDF checklist presentation',
      'Build a free mini-course as a presentation',
      'Design a quiz funnel presentation',
      'Create a swipe file resource for my audience',
      'Build a free template pack presentation',
    ],
  },
  {
    id: 'avatar',
    label: 'Build Avatar',
    icon: 'user-circle',
    suggestions: [
      'Create a detailed buyer avatar for my coaching business',
      'Build an ideal customer profile for my SaaS',
      'Design a persona for course buyers aged 25-40',
      'Map out pain points and desires for my target market',
      'Create an avatar for small business owners',
    ],
  },
  {
    id: 'meta-publish',
    label: 'Publish to Meta',
    icon: 'send',
    suggestions: [
      'Publish my campaign ads to Meta',
      'Push my presentation ads to Facebook',
      'Publish retargeting ads to Instagram',
      'Deploy my ad set to Meta with audience targeting',
      'Publish all pending ads in this campaign',
    ],
  },
] as const

const FEATURE_CARDS: {
  id: 'brain' | 'team' | 'spaces'
  title: string
  subtitle: string
  href: 'the-brain' | 'your-team' | 'spaces'
}[] = [
  {
    id: 'brain',
    title: 'The Brain',
    subtitle:
      'Your company knowledge becomes something your agents can actually operate on, not just search through.',
    href: 'the-brain',
  },
  {
    id: 'team',
    title: 'Agents',
    subtitle:
      'Specialist AI agents that handle execution so the people you hired for judgment can finally use it.',
    href: 'your-team',
  },
  {
    id: 'spaces',
    title: 'Spaces',
    subtitle:
      'Tasks, docs, channels, and flows. One workspace where your team and your agents do the work together.',
    href: 'spaces',
  },
]

function FeatureCardVisual({
  id,
  teamAvatars,
}: {
  id: string
  teamAvatars?: { src: string; label: string }[]
}) {
  if (id === 'brain') {
    return (
      <div className="relative ml-8 flex h-20 w-36 items-center justify-center">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 144 80" fill="none">
          <path
            d="M32 28 L72 14"
            stroke="var(--accent-emerald)"
            strokeWidth="1"
            strokeDasharray="3 2"
            opacity="0.3"
          />
          <path
            d="M112 28 L72 14"
            stroke="var(--accent-emerald)"
            strokeWidth="1"
            strokeDasharray="3 2"
            opacity="0.3"
          />
          <path
            d="M32 28 L112 28"
            stroke="var(--accent-emerald)"
            strokeWidth="1"
            strokeDasharray="3 2"
            opacity="0.2"
          />
        </svg>
        <div className="absolute left-0 top-6 flex flex-col items-center">
          <div className="rounded-spacing-1 border-strong bg-color-surface flex h-10 w-10 items-center justify-center border shadow-sm">
            <Brain className="h-4 w-4 text-purple-400/60" />
          </div>
          <span className="text-color-muted mt-1 text-[6px] font-medium">You</span>
        </div>
        <div className="absolute left-1/2 top-0 flex -translate-x-1/2 flex-col items-center">
          <div className="rounded-spacing-1 border-strong bg-color-surface flex h-10 w-10 items-center justify-center border shadow-sm">
            <Brain className="h-4 w-4 text-emerald-400/60" />
          </div>
          <span className="text-color-muted mt-1 text-[6px] font-medium">Agents</span>
        </div>
        <div className="absolute right-0 top-6 flex flex-col items-center">
          <div className="rounded-spacing-1 border-strong bg-color-surface flex h-10 w-10 items-center justify-center border shadow-sm">
            <Brain className="h-4 w-4 text-purple-300/60" />
          </div>
          <span className="text-color-muted mt-1 text-[6px] font-medium">Campaign</span>
        </div>
      </div>
    )
  }
  if (id === 'spaces') {
    return (
      <div className="ml-8 flex h-20 w-36 items-end gap-1.5">
        {[
          { label: 'To Do', color: 'bg-white/40', cards: 2 },
          { label: 'In Progress', color: 'bg-blue-500/60', cards: 3 },
          { label: 'In Review', color: 'bg-purple-500/60', cards: 2 },
          { label: 'Done', color: 'bg-emerald-500/60', cards: 1 },
        ].map((col) => (
          <div key={col.label} className="flex flex-1 flex-col gap-1">
            <div className="flex items-center gap-0.5 px-0.5">
              <div className={`h-1 w-1 rounded-full ${col.color}`} />
              <span className="text-color-muted truncate text-[5px] font-medium">{col.label}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              {Array.from({ length: col.cards }).map((_, i) => (
                <div
                  key={i}
                  className="border-strong bg-color-surface rounded border p-1 shadow-sm"
                >
                  <div className="bg-mock-white-08 mb-0.5 h-0.5 w-full rounded-full" />
                  <div className="bg-mock-white-05 h-0.5 w-3/4 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }
  if (id === 'team') {
    const preview = teamAvatars?.filter((a) => a.src) ?? []
    if (preview.length > 0) {
      return (
        <div className="ml-8 flex h-20 w-36 items-center justify-center gap-3">
          {preview.slice(0, 3).map((agent) => (
            <div key={agent.src + agent.label} className="flex flex-col items-center gap-1">
              <div className="border-strong bg-color-surface h-8 w-8 overflow-hidden rounded-full border shadow-sm">
                <img src={agent.src} alt="" className="h-full w-full object-cover object-top" />
              </div>
              <span className="text-color-muted max-w-[52px] truncate text-center text-[6px] font-medium">
                {agent.label}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return (
      <div className="ml-8 flex h-20 w-36 items-center justify-center gap-3">
        {[
          { label: 'Copywriter', color: 'bg-purple-400/60' },
          { label: 'Analyst', color: 'bg-blue-400/60' },
          { label: 'Designer', color: 'bg-emerald-400/60' },
        ].map((agent) => (
          <div key={agent.label} className="flex flex-col items-center gap-1">
            <div className={`${agent.color} flex h-8 w-8 items-center justify-center rounded-full`}>
              <span className="text-[8px] font-bold text-white">{agent.label[0]}</span>
            </div>
            <span className="text-color-muted text-[6px] font-medium">{agent.label}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export function Hero(props: { teamPreviewAgents?: { imageUrl: string; label: string }[] }) {
  const teamPreviewAgents = props.teamPreviewAgents ?? []
  const [message, setMessage] = useState('')

  const [activeSlide, setActiveSlide] = useState(0)
  const [activeChipId, setActiveChipId] = useState<string | null>(null)
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const insertTextRef = useRef<((text: string) => void) | null>(null)
  const moreDropdownRef = useRef<HTMLDivElement>(null)

  const activeChip = activeChipId ? CAPABILITY_CHIPS.find((c) => c.id === activeChipId) : null

  const insertText = useCallback((text: string) => {
    setMessage((prev) => {
      const sep = prev.length > 0 && !prev.endsWith(' ') ? ' ' : ''
      return prev + sep + text
    })
    requestAnimationFrame(() => textareaRef.current?.focus())
  }, [])

  useEffect(() => {
    insertTextRef.current = insertText
    return () => {
      insertTextRef.current = null
    }
  }, [insertText])

  useEffect(() => {
    const n = FEATURE_CARDS.length
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % n)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(target))
        setMoreDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleChipSelect = useCallback((chipId: string) => {
    setActiveChipId(chipId)
  }, [])

  const handleSuggestionClick = useCallback((prompt: string) => {
    insertTextRef.current?.(prompt)
  }, [])

  const handleSend = useCallback(() => {
    if (!message.trim()) return
    window.location.href = 'https://app.vibey.im/login'
  }, [message])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [])

  return (
    <section className="bg-color-deep relative flex min-h-screen flex-col overflow-x-clip overflow-y-visible">
      <div className="hero-dot-grid pointer-events-none absolute inset-0 z-0" />
      <div className="hero-beam-glow" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div className="studio-home-hero-shell flex min-h-0 flex-1 flex-col">
          <div className="site-container relative z-10 flex flex-1 items-center justify-center">
            <div className="p-spacing-8 mx-auto mt-4 w-full max-w-3xl md:mt-6">
              <Link
                href="/blog/vibey-beta"
                className="pill-announcement mx-auto mb-6 flex w-fit items-center gap-3"
              >
                <span className="badge-glass badge-glass-secondary rounded-full font-semibold">
                  New
                </span>
                <span className="body-3 font-medium text-white">Introducing ROAS</span>
                <ArrowRight size={14} className="text-color-muted" />
              </Link>

              <h1 className="h1 mb-8 text-center uppercase text-white">
                <span className="block md:inline md:whitespace-nowrap">YOUR TEAM</span>{' '}
                <span className="block md:inline">IS READY</span>
              </h1>

              <div className="rounded-spacing-4 bg-color-deep relative z-10 w-full">
                <div className="input-glass rounded-spacing-4 relative flex flex-col overflow-hidden">
                  <div className="flex-1 px-4 pt-3">
                    <textarea
                      ref={textareaRef}
                      value={message}
                      onChange={(e) => {
                        setMessage(e.target.value)
                        autoResize()
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="What are we creating today?"
                      rows={1}
                      className="body-3 placeholder-muted max-h-[200px] min-h-[60px] w-full resize-none bg-transparent text-white caret-[var(--accent-emerald)] outline-none"
                    />
                  </div>

                  {/* Footer: matches ChatInput layout exactly */}
                  <div className="flex items-center justify-between px-3 py-2">
                    {/* Left side: Attach + Integrations + Active chip */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => { window.location.href = 'https://app.vibey.im/login' }}
                        className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full transition-all"
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { window.location.href = 'https://app.vibey.im/login' }}
                        className="button-glass-neutral flex h-8 items-center gap-1 rounded-full px-2 transition-all"
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                      </button>
                      <AnimatePresence mode="popLayout" initial={false}>
                        {activeChip && (
                          <motion.span
                            key={activeChip.label}
                            initial={{ opacity: 0, scale: 0.92, y: 4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: -4 }}
                            transition={{ duration: 0.18, ease: 'easeOut' }}
                            className="chip-glass-secondary body-4 inline-flex h-8 items-center gap-1 rounded-full px-2.5 font-medium"
                          >
                            <ChipIcon name={activeChip.icon} className="h-3 w-3" />
                            <span className="max-w-[130px] truncate">{activeChip.label}</span>
                            <button
                              type="button"
                              onClick={() => setActiveChipId(null)}
                              className="hover-bg-mock-white-20 rounded-full p-0.5 transition-colors"
                              aria-label="Clear selected capability"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Right side: Mic + Send */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => { window.location.href = 'https://app.vibey.im/login' }}
                        className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full transition-all"
                      >
                        <Mic className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={!message.trim()}
                        className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full transition-all disabled:opacity-30"
                        aria-label="Send message"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Campaign toolbar: attached tab underneath ── */}
              <div className="rounded-b-spacing-4 pt-spacing-6 bg-color-surface relative z-0 mx-4 -mt-3 flex items-center justify-between border-t-0 px-4 pb-2.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => { window.location.href = 'https://app.vibey.im/login' }}
                  className="text-color-muted body-4 flex items-center gap-1.5 transition-colors hover:text-white"
                >
                  <FolderKanban className="h-3 w-3" />
                  <span className="font-medium">Select campaign</span>
                  <ChevronDown className="h-2.5 w-2.5" />
                </button>
              </div>

              {/* ── Capability chips / Active chip suggestions ── */}
              <div className="mt-3 h-[210px]">
                <AnimatePresence mode="wait" initial={false}>
                  {!activeChip ? (
                    <motion.div
                      key="chip-row"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="flex flex-wrap items-center justify-center gap-1.5"
                    >
                      {CAPABILITY_CHIPS.slice(0, 4).map((chip) => (
                        <motion.button
                          key={chip.id}
                          type="button"
                          onClick={() => handleChipSelect(chip.id)}
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.98 }}
                          className="body-3 border-strong text-color-muted hover-border-focus flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition-all hover:text-white"
                        >
                          <ChipIcon name={chip.icon} className="h-3 w-3" />
                          {chip.label}
                        </motion.button>
                      ))}
                      <div className="relative" ref={moreDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setMoreDropdownOpen((p) => !p)}
                          className="body-3 border-strong text-color-muted hover-border-focus flex items-center gap-1 rounded-full border px-3 py-1 font-medium transition-all hover:text-white"
                        >
                          More
                          <ChevronDown className="h-2.5 w-2.5" />
                        </button>
                        {moreDropdownOpen && (
                          <div className="border-strong bg-color-surface absolute left-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-lg border shadow-lg">
                            <div className="py-1">
                              {CAPABILITY_CHIPS.slice(4).map((cap) => (
                                <button
                                  key={cap.id}
                                  type="button"
                                  onClick={() => {
                                    handleChipSelect(cap.id)
                                    setMoreDropdownOpen(false)
                                  }}
                                  className="body-3 hover:bg-mock-white-05 flex w-full items-center gap-2 px-3 py-1.5 text-left text-white transition-colors"
                                >
                                  <ChipIcon name={cap.icon} className="h-3 w-3 shrink-0" />
                                  {cap.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="chip-suggestions"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="space-y-2"
                    >
                      <div>
                        {activeChip.suggestions.map((suggestion, idx) => (
                          <motion.button
                            key={suggestion}
                            type="button"
                            onClick={() => handleSuggestionClick(suggestion)}
                            whileHover={{ x: 3 }}
                            whileTap={{ scale: 0.995 }}
                            className={`text-color-muted body-3 hover:bg-mock-white-05 flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:text-white ${idx < activeChip.suggestions.length - 1 ? 'border-strong border-b' : ''}`}
                          >
                            <span>{suggestion}</span>
                            <ArrowUpRight className="text-color-muted h-3.5 w-3.5 shrink-0" />
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* ── Rotating Feature Carousel: bottom of screen ── */}
          <div className="mt-auto flex flex-col items-center justify-center px-4 pb-4">
            {!activeChip ? (
              <>
                <Link
                  href={`/features/${FEATURE_CARDS[activeSlide].href}`}
                  className="input-glass rounded-spacing-3 relative block h-28 w-full max-w-xl cursor-pointer overflow-hidden p-0 no-underline"
                >
                  <div
                    className="absolute inset-0 flex transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
                    style={{ transform: `translateX(-${activeSlide * 100}%)` }}
                  >
                    {FEATURE_CARDS.map((card) => (
                      <div
                        key={card.title}
                        className="relative flex h-full w-full flex-none items-center px-4 sm:px-8"
                      >
                        <div className="flex-1 text-left">
                          <h3 className="h4 font-medium text-white">{card.title}</h3>
                          <p className="body-3 text-color-muted mt-1.5 line-clamp-3">
                            {card.subtitle}
                          </p>
                        </div>
                        <div className="hidden sm:block">
                          <FeatureCardVisual
                            id={card.id}
                            teamAvatars={
                              card.id === 'team'
                                ? teamPreviewAgents.map((a) => ({
                                    src: a.imageUrl,
                                    label: a.label,
                                  }))
                                : undefined
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Link>
                <div className="mt-4 flex gap-1.5">
                  {FEATURE_CARDS.map((card, idx) => (
                    <button
                      key={card.title}
                      type="button"
                      onClick={() => setActiveSlide(idx)}
                      className={`rounded-full transition-all duration-300 ${
                        activeSlide === idx
                          ? 'indicator-dot-glass indicator-dot-glass-emerald h-2 w-4'
                          : 'indicator-dot-glass indicator-dot-glass-muted opacity-40 hover:opacity-70'
                      }`}
                    />
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="h-28 w-full max-w-xl" />
                <div className="mt-4 h-2" />
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
