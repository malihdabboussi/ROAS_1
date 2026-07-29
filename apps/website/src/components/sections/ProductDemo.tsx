'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ── Demo Data ──────────────────────────────────────────────────────────
const USER_MESSAGE =
  'Build me a lead generation funnel for my SaaS product. Target startup founders who need to automate their sales pipeline.'

const VIBEY_RESPONSE_LINES = [
  "On it. I'll build a complete lead gen funnel targeting startup founders.",
  'Analyzing your ICP... SaaS founders, Series A-B, 10-50 employees.',
  "Here's what I'm generating:",
]

const VIBEY_CHECKLIST = [
  { label: 'Landing page with founder-specific messaging', delay: 0 },
  { label: 'Presentation: "The Founder\'s Sales Automation Playbook"', delay: 300 },
  { label: '5-email nurture sequence with case studies', delay: 600 },
  { label: 'Retargeting ad copy for LinkedIn & Meta', delay: 900 },
]

const ARTIFACTS = [
  {
    type: 'Funnel',
    name: 'SaaS Founder Lead Gen',
    icon: '⚡',
    color: 'var(--accent-secondary)',
    progress: 100,
    stats: '4 stages · 12 touchpoints',
  },
  {
    type: 'Presentation',
    name: "Founder's Sales Automation Playbook",
    icon: '📄',
    color: 'var(--accent-secondary)',
    progress: 100,
    stats: '18 pages · PDF',
  },
  {
    type: 'Email Sequence',
    name: '5-Part Founder Nurture',
    icon: '✉️',
    color: 'var(--accent-emerald)',
    progress: 100,
    stats: '5 emails · 7-day drip',
  },
  {
    type: 'Ad Copy',
    name: 'LinkedIn + Meta Retargeting',
    icon: '📢',
    color: 'var(--accent-emerald)',
    progress: 100,
    stats: '6 variants · 2 platforms',
  },
]

// ── Typing Hook ────────────────────────────────────────────────────────
function useTypingAnimation(text: string, speed: number, shouldStart: boolean) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!shouldStart) return
    setDisplayed('')
    setDone(false)
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(interval)
        setDone(true)
      }
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed, shouldStart])

  return { displayed, done }
}

// ── Main Component ─────────────────────────────────────────────────────
export function ProductDemo() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<
    'idle' | 'typing-user' | 'thinking' | 'streaming' | 'checklist' | 'artifacts' | 'done'
  >('idle')
  const [streamedLines, setStreamedLines] = useState<string[]>([])
  const [visibleChecks, setVisibleChecks] = useState<number>(0)
  const [visibleArtifacts, setVisibleArtifacts] = useState<number>(0)
  const [artifactProgress, setArtifactProgress] = useState<number[]>([0, 0, 0, 0])
  const hasStarted = useRef(false)
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }, [])

  const addTimeout = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms)
    timeoutsRef.current.push(t)
    return t
  }, [])

  // User typing
  const userTyping = useTypingAnimation(USER_MESSAGE, 25, phase === 'typing-user')

  // When user finishes typing → thinking
  useEffect(() => {
    if (userTyping.done && phase === 'typing-user') {
      addTimeout(() => setPhase('thinking'), 400)
    }
  }, [userTyping.done, phase, addTimeout])

  // Thinking → streaming
  useEffect(() => {
    if (phase !== 'thinking') return
    addTimeout(() => setPhase('streaming'), 1200)
  }, [phase, addTimeout])

  // Stream ROAS response lines
  useEffect(() => {
    if (phase !== 'streaming') return
    setStreamedLines([])
    VIBEY_RESPONSE_LINES.forEach((line, i) => {
      addTimeout(
        () => {
          setStreamedLines((prev: string[]) => [...prev, line])
          if (i === VIBEY_RESPONSE_LINES.length - 1) {
            addTimeout(() => setPhase('checklist'), 500)
          }
        },
        i * 600 + 200,
      )
    })
  }, [phase, addTimeout])

  // Checklist items
  useEffect(() => {
    if (phase !== 'checklist') return
    setVisibleChecks(0)
    VIBEY_CHECKLIST.forEach((_, i) => {
      addTimeout(
        () => {
          setVisibleChecks(i + 1)
          if (i === VIBEY_CHECKLIST.length - 1) {
            addTimeout(() => setPhase('artifacts'), 600)
          }
        },
        i * 400 + 200,
      )
    })
  }, [phase, addTimeout])

  // Artifacts appear one by one with progress fill
  useEffect(() => {
    if (phase !== 'artifacts') return
    setVisibleArtifacts(0)
    setArtifactProgress([0, 0, 0, 0])

    ARTIFACTS.forEach((_, i) => {
      addTimeout(
        () => {
          setVisibleArtifacts(i + 1)
          // Animate progress bar
          const steps = 20
          for (let s = 1; s <= steps; s++) {
            addTimeout(() => {
              setArtifactProgress((prev: number[]) => {
                const next = [...prev]
                next[i] = Math.round((s / steps) * 100)
                return next
              })
            }, s * 30)
          }
          if (i === ARTIFACTS.length - 1) {
            addTimeout(() => setPhase('done'), 1200)
          }
        },
        i * 700 + 100,
      )
    })
  }, [phase, addTimeout])

  // Reset for replay
  const replay = useCallback(() => {
    clearAllTimeouts()
    setPhase('idle')
    setStreamedLines([])
    setVisibleChecks(0)
    setVisibleArtifacts(0)
    setArtifactProgress([0, 0, 0, 0])
    hasStarted.current = false
    // Small delay then restart
    setTimeout(() => {
      hasStarted.current = true
      setPhase('typing-user')
    }, 300)
  }, [clearAllTimeouts])

  // IntersectionObserver for auto-play on scroll
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted.current) {
          hasStarted.current = true
          setPhase('typing-user')
        }
      },
      { threshold: 0.3 },
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  // anime.js entrance
  useEffect(() => {
    const init = async () => {
      try {
        const { animate, onScroll } = await import('animejs')
        if (sectionRef.current) {
          animate(sectionRef.current, {
            opacity: [0, 1],
            translateY: [40, 0],
            duration: 800,
            ease: 'outExpo',
            autoplay: onScroll({ target: sectionRef.current, enter: 'bottom -= 100px' }),
          })
        }
        if (frameRef.current) {
          animate(frameRef.current, {
            opacity: [0, 1],
            translateY: [60, 0],
            scale: [0.96, 1],
            duration: 1000,
            delay: 200,
            ease: 'outExpo',
            autoplay: onScroll({ target: frameRef.current, enter: 'bottom -= 60px' }),
          })
        }
      } catch {
        if (sectionRef.current) sectionRef.current.style.opacity = '1'
        if (frameRef.current) {
          frameRef.current.style.opacity = '1'
          frameRef.current.style.transform = 'none'
        }
      }
    }
    init()
  }, [])

  const isActive = phase !== 'idle' && phase !== 'done'

  return (
    <section id="demo" className="section-padding relative">
      <div className="site-container">
        {/* Header */}
        <div ref={sectionRef} className="mb-16 text-center" style={{ opacity: 0 }}>
          <p className="typo-caption text-secondary mb-4 font-semibold uppercase tracking-widest">
            See it in action
          </p>
          <h2 className="h2 tracking-tight">
            Watch ROAS build a campaign <span className="gradient-text">in under 2 minutes.</span>
          </h2>
          <p className="text-color-muted body-2 mx-auto mt-4 max-w-2xl">
            One prompt. Four production-ready assets. No templates, no drag-and-drop: just describe
            what you need.
          </p>
        </div>

        {/* Demo Frame */}
        <div
          ref={frameRef}
          className="group relative"
          style={{ opacity: 0, transform: 'translateY(60px) scale(0.96)' }}
        >
          {/* Glow */}
          <div
            className="absolute -inset-4 rounded-3xl opacity-40 blur-2xl transition-opacity duration-700 group-hover:opacity-60"
            style={{
              background: isActive
                ? 'linear-gradient(135deg, rgb(var(--accent-secondary-rgb) / 0.25), rgb(var(--accent-emerald-rgb) / 0.15))'
                : 'linear-gradient(135deg, rgb(var(--accent-secondary-rgb) / 0.15), rgb(var(--accent-secondary-rgb) / 0.1))',
            }}
          />

          <div className="glass-card border-section relative overflow-hidden rounded-2xl border">
            {/* Top bar */}
            <div className="border-section flex items-center justify-between border-b px-5 py-2.5">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="bg-traffic-dot h-2.5 w-2.5 rounded-full" />
                  <div className="bg-traffic-dot h-2.5 w-2.5 rounded-full" />
                  <div className="bg-traffic-dot h-2.5 w-2.5 rounded-full" />
                </div>
                <div className="bg-color-deep text-color-dim rounded-md px-3 py-1 font-mono text-[11px]">
                  app.vibey.im/studio
                </div>
              </div>
              {phase === 'done' && (
                <button
                  onClick={replay}
                  className="text-color-muted hover:bg-color-address-well body-4 flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors hover:text-white"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                  Replay
                </button>
              )}
            </div>

            {/* Studio Layout */}
            <div className="bg-color-panel-mid" style={{ minHeight: 420 }}>
              <div className="flex h-full" style={{ minHeight: 420 }}>
                {/* Sidebar icons */}
                <div className="border-r-section bg-color-panel hidden w-14 flex-col items-center gap-3 border-r py-4 sm:flex">
                  {[true, false, false, false].map((active, i) => (
                    <div
                      key={i}
                      className={`h-8 w-8 rounded-lg ${active ? 'product-demo-sidebar-tab-active' : 'bg-color-subtle'}`}
                    />
                  ))}
                </div>

                {/* Chat area */}
                <div className="flex flex-1 flex-col">
                  <div className="flex-1 space-y-4 overflow-hidden p-4 sm:p-6">
                    {/* User message */}
                    {phase !== 'idle' && (
                      <div className="animate-in fade-in slide-in-from-bottom-2 flex justify-end duration-300">
                        <div className="product-demo-user-bubble max-w-[85%] rounded-2xl rounded-br-sm px-4 py-3 sm:max-w-[70%]">
                          <p className="body-3 leading-relaxed text-white">
                            {phase === 'typing-user' ? (
                              <>
                                {userTyping.displayed}
                                <span className="bg-mock-white-70 ml-0.5 inline-block h-4 w-[2px] animate-pulse" />
                              </>
                            ) : (
                              USER_MESSAGE
                            )}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Thinking indicator */}
                    {phase === 'thinking' && (
                      <div className="animate-in fade-in flex justify-start duration-300">
                        <div className="bg-color-subtle-hover flex items-center gap-2 rounded-2xl rounded-bl-sm px-4 py-3">
                          <div className="flex gap-1">
                            <span className="product-demo-secondary-dot h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:0ms]" />
                            <span className="product-demo-secondary-dot h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:150ms]" />
                            <span className="product-demo-secondary-dot h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:300ms]" />
                          </div>
                          <span className="text-color-dim body-4">Pixel is thinking...</span>
                        </div>
                      </div>
                    )}

                    {/* ROAS response */}
                    {(phase === 'streaming' ||
                      phase === 'checklist' ||
                      phase === 'artifacts' ||
                      phase === 'done') && (
                      <div className="animate-in fade-in slide-in-from-bottom-2 flex justify-start duration-300">
                        <div className="bg-color-subtle-hover max-w-[90%] rounded-2xl rounded-bl-sm px-4 py-3 sm:max-w-[80%]">
                          {/* Header */}
                          <div className="mb-2.5 flex items-center gap-2">
                            <div className="bg-gradient-secondary-icon flex h-5 w-5 items-center justify-center rounded-full">
                              <span className="text-[9px] font-bold text-white">V</span>
                            </div>
                            <span className="text-color-muted body-4 font-medium">Pixel</span>
                            {isActive && (
                              <span className="relative flex h-2 w-2">
                                <span className="bg-emerald-accent absolute inline-flex h-full w-full animate-ping opacity-40" />
                                <span className="bg-emerald-accent relative inline-flex h-2 w-2 rounded-full" />
                              </span>
                            )}
                          </div>

                          {/* Streamed lines */}
                          <div className="space-y-1.5">
                            {streamedLines.map((line, i) => (
                              <p
                                key={i}
                                className="animate-in fade-in slide-in-from-left-1 text-color-secondary body-3 leading-relaxed duration-200"
                              >
                                {line}
                              </p>
                            ))}
                          </div>

                          {/* Checklist */}
                          {(phase === 'checklist' || phase === 'artifacts' || phase === 'done') && (
                            <div className="border-section mt-3 space-y-1.5 border-t pt-3">
                              {VIBEY_CHECKLIST.slice(0, visibleChecks).map((item, i) => (
                                <div
                                  key={i}
                                  className="animate-in fade-in slide-in-from-left-2 flex items-start gap-2 duration-200"
                                >
                                  <span className="text-emerald-accent body-4 mt-0.5">✓</span>
                                  <span className="text-emerald-accent-muted font-mono text-xs">
                                    {item.label}
                                  </span>
                                </div>
                              ))}
                              {phase === 'checklist' && visibleChecks < VIBEY_CHECKLIST.length && (
                                <span className="bg-emerald-accent-muted ml-5 inline-block h-3 w-[2px] animate-pulse" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input bar */}
                  <div className="border-section border-t p-3 sm:p-4">
                    <div className="bg-color-subtle flex items-center gap-3 rounded-xl px-4 py-2.5">
                      {isActive ? (
                        <>
                          <span className="relative flex h-2 w-2">
                            <span className="bg-emerald-accent absolute inline-flex h-full w-full animate-ping opacity-40" />
                            <span className="bg-emerald-accent relative inline-flex h-2 w-2 rounded-full" />
                          </span>
                          <span className="text-color-dim body-4">
                            Pixel is building your campaign...
                          </span>
                        </>
                      ) : (
                        <span className="text-color-faint body-4">
                          Describe what you want to build...
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Artifacts Panel (desktop) */}
                <div className="border-l-section bg-color-panel hidden w-72 flex-col border-l p-4 lg:flex xl:w-80">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-color-dim text-[11px] font-semibold uppercase tracking-widest">
                      Live Artifacts
                    </span>
                    {visibleArtifacts > 0 && (
                      <span className="product-demo-artifact-count">
                        {visibleArtifacts}/{ARTIFACTS.length}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 space-y-3">
                    {ARTIFACTS.slice(0, visibleArtifacts).map((artifact, i) => (
                      <div
                        key={i}
                        className="animate-in fade-in slide-in-from-right-3 border-section bg-color-pixel rounded-xl border p-3 duration-300"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="body-3">{artifact.icon}</span>
                            <span className="text-color-muted text-[11px] font-medium">
                              {artifact.type}
                            </span>
                          </div>
                          {artifactProgress[i] >= 100 && (
                            <span className="text-emerald-accent text-[10px]">✓</span>
                          )}
                        </div>
                        <p className="body-3 mb-2 font-medium text-white">{artifact.name}</p>

                        {/* Progress bar */}
                        <div className="bg-color-address-well mb-1.5 h-1 overflow-hidden rounded-full">
                          <div
                            className="h-full rounded-full transition-all duration-100 ease-linear"
                            style={{
                              width: `${artifactProgress[i]}%`,
                              background:
                                artifactProgress[i] >= 100
                                  ? 'var(--accent-emerald)'
                                  : artifact.color,
                            }}
                          />
                        </div>
                        <span className="text-color-dimmer text-[10px]">{artifact.stats}</span>
                      </div>
                    ))}

                    {/* Empty state */}
                    {visibleArtifacts === 0 && (
                      <div className="flex h-48 items-center justify-center">
                        <p className="text-color-faint body-4 text-center">
                          Artifacts will appear here
                          <br />
                          as ROAS builds them
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile artifacts: shown below chat on smaller screens */}
            {visibleArtifacts > 0 && (
              <div className="border-section bg-color-panel border-t p-4 lg:hidden">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-color-dim text-[11px] font-semibold uppercase tracking-widest">
                    Artifacts
                  </span>
                  <span className="product-demo-artifact-count">
                    {visibleArtifacts}/{ARTIFACTS.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ARTIFACTS.slice(0, visibleArtifacts).map((artifact, i) => (
                    <div
                      key={i}
                      className="animate-in fade-in border-section bg-color-pixel rounded-lg border p-2.5 duration-300"
                    >
                      <div className="mb-1 flex items-center gap-1.5">
                        <span className="body-4">{artifact.icon}</span>
                        <span className="text-color-muted text-[10px]">{artifact.type}</span>
                      </div>
                      <p className="body-4 mb-1.5 font-medium text-white">{artifact.name}</p>
                      <div className="bg-color-address-well h-0.5 overflow-hidden rounded-full">
                        <div
                          className="h-full rounded-full transition-all duration-100"
                          style={{
                            width: `${artifactProgress[i]}%`,
                            background:
                              artifactProgress[i] >= 100 ? 'var(--accent-emerald)' : artifact.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
