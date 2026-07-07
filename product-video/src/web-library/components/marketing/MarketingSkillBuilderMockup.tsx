'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flag, FolderOpen, Mic, Paperclip, Save } from 'lucide-react'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'

// ── VS Code syntax colors (matches skills hero) ───────────────────────────────
const C = {
  h1:     '#4fc1ff',
  h2:     '#4ec9b0',
  h3:     '#9cdcfe',
  bold:   '#dcdcaa',
  text:   '#d4d4d4',
  dim:    '#5a5a5a',
  green:  '#6a9955',
  orange: '#ce9178',
  lineNum:'#4d4d4d',
}

// ── Skill markdown — each line has raw text + syntax-highlighted node ────────
// null node = blank line (rendered as empty row)
type SkillLine = { raw: string; node: React.ReactNode | null }

const SKILL_LINES: SkillLine[] = [
  { raw: '# Cold Email Outreach',            node: <><span style={{color:C.dim}}># </span><span style={{color:C.h1,fontWeight:700}}>Cold Email Outreach</span></> },
  { raw: '',                                  node: null },
  { raw: '## Objective',                      node: <><span style={{color:C.dim}}>## </span><span style={{color:C.h2,fontWeight:600}}>Objective</span></> },
  { raw: 'Systematic outreach sequence that', node: <span style={{color:C.text}}>Systematic outreach sequence that</span> },
  { raw: 'books calls with B2B prospects.',   node: <span style={{color:C.text}}>books calls with B2B prospects.</span> },
  { raw: '',                                  node: null },
  { raw: '## Inputs',                         node: <><span style={{color:C.dim}}>## </span><span style={{color:C.h2,fontWeight:600}}>Inputs</span></> },
  { raw: '- **offer** — one-liner value prop',node: <><span style={{color:C.dim}}>- </span><span style={{color:C.bold}}>**offer**</span><span style={{color:C.text}}> — one-liner value prop</span></> },
  { raw: '- **audience** — ICP + company size',node:<><span style={{color:C.dim}}>- </span><span style={{color:C.bold}}>**audience**</span><span style={{color:C.text}}> — ICP + company size</span></> },
  { raw: '- **goal** — booked calls / week',  node: <><span style={{color:C.dim}}>- </span><span style={{color:C.bold}}>**goal**</span><span style={{color:C.text}}> — booked calls / week</span></> },
  { raw: '',                                  node: null },
  { raw: '## Artifact Blueprint',             node: <><span style={{color:C.dim}}>## </span><span style={{color:C.h2,fontWeight:600}}>Artifact Blueprint</span></> },
  { raw: '',                                  node: null },
  { raw: '### 1. Email Sequence (3 emails)',  node: <><span style={{color:C.dim}}>### </span><span style={{color:C.h3}}>1. Email Sequence (3 emails)</span></> },
  { raw: '  - Email 1 · Pattern interrupt',  node: <><span style={{color:C.dim}}>  - </span><span style={{color:C.text}}>Email 1 </span><span style={{color:C.dim}}>·</span><span style={{color:C.text}}> Pattern interrupt</span></> },
  { raw: '  - Email 2 · Case study proof',   node: <><span style={{color:C.dim}}>  - </span><span style={{color:C.text}}>Email 2 </span><span style={{color:C.dim}}>·</span><span style={{color:C.text}}> Case study proof</span></> },
  { raw: '  - Email 3 · Final ask + reply',  node: <><span style={{color:C.dim}}>  - </span><span style={{color:C.text}}>Email 3 </span><span style={{color:C.dim}}>·</span><span style={{color:C.text}}> Final ask + reply</span></> },
  { raw: '',                                  node: null },
  { raw: '## Brain Context',                  node: <><span style={{color:C.dim}}>## </span><span style={{color:C.h2,fontWeight:600}}>Brain Context</span></> },
  { raw: '',                                  node: null },
  { raw: 'Reads: icp_profile, brand_voice',  node: <><span style={{color:C.green}}>Reads: </span><span style={{color:C.orange}}>icp_profile</span><span style={{color:C.text}}>, </span><span style={{color:C.orange}}>brand_voice</span></> },
  { raw: 'Writes: outreach_learnings',        node: <><span style={{color:C.green}}>Writes: </span><span style={{color:C.orange}}>outreach_learnings</span></> },
]

const FULL_BRIEF = 'Create a skill for cold email outreach'
const BRIEF_CHAR_MS  = 38
const SKILL_CHAR_MS  = 22
const LINE_PAUSE_MS  = 55
const DONE_HOLD_MS   = 3200

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// ── Input chrome — matches MissionQuickCaptureChrome exactly ─────────────────
function SkillInput({ briefText, submitted }: { briefText: string; submitted: boolean }) {
  return (
    <div className="input-glass rounded-spacing-3 relative flex flex-col">
      <div className="flex-1 px-4 pt-3">
        <textarea
          value={briefText}
          readOnly
          tabIndex={-1}
          rows={1}
          placeholder="Tell Vibey what skill to create..."
          className="body-2 placeholder-muted max-h-[120px] min-h-[44px] w-full resize-none bg-transparent outline-none focus:outline-none"
          style={{ color: submitted ? 'rgba(255,255,255,0.45)' : '#fff' }}
        />
      </div>
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1">
          <button type="button" tabIndex={-1} className="button-glass-neutral flex h-8 w-8 cursor-default items-center justify-center rounded-full" aria-hidden>
            <Paperclip className="h-3.5 w-3.5" />
          </button>
          <button type="button" tabIndex={-1} className="button-glass-neutral flex h-8 cursor-default items-center gap-1.5 rounded-full px-2.5 text-white" aria-hidden>
            <FolderOpen className="h-3.5 w-3.5 shrink-0" />
            <span className="typo-caption max-w-[100px] truncate font-medium">Skills Library</span>
          </button>
          <button type="button" tabIndex={-1} className="button-glass-neutral flex h-8 w-8 cursor-default items-center justify-center rounded-full" aria-hidden>
            <Flag className="h-3.5 w-3.5 text-amber-400" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" tabIndex={-1} className="button-glass-neutral flex h-8 w-8 cursor-default items-center justify-center rounded-full" aria-hidden>
            <Mic className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            disabled={!briefText.trim() || submitted}
            className="button-glass-neutral flex h-8 w-8 cursor-default items-center justify-center rounded-full disabled:opacity-30"
            aria-hidden
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export function MarketingSkillBuilderMockup() {
  const [briefText, setBriefText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  // completedLines = lines fully typed; currentChars = chars typed on the current line
  const [completedLines, setCompletedLines] = useState(-1) // -1 = nothing shown yet
  const [currentChars, setCurrentChars] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function runCycle() {
      if (cancelled) return

      // Reset
      setBriefText('')
      setSubmitted(false)
      setCompletedLines(-1)
      setCurrentChars(0)
      setDone(false)

      await sleep(600)

      // Phase 1: type the brief
      for (let i = 0; i <= FULL_BRIEF.length; i++) {
        if (cancelled) return
        setBriefText(FULL_BRIEF.slice(0, i))
        await sleep(BRIEF_CHAR_MS)
      }

      await sleep(500)
      if (cancelled) return
      setSubmitted(true)

      await sleep(400)

      // Phase 2: type skill lines one by one
      for (let lineIdx = 0; lineIdx < SKILL_LINES.length; lineIdx++) {
        if (cancelled) return
        setCompletedLines(lineIdx - 1) // reveal up to lineIdx-1 as highlighted
        setCurrentChars(0)

        const line = SKILL_LINES[lineIdx]!

        if (line.raw === '') {
          // Blank line — reveal instantly as a completed line
          setCompletedLines(lineIdx)
          await sleep(LINE_PAUSE_MS)
          continue
        }

        // Type each character
        for (let c = 1; c <= line.raw.length; c++) {
          if (cancelled) return
          setCurrentChars(c)
          await sleep(SKILL_CHAR_MS)
        }

        // Mark this line complete (use highlighted node)
        setCompletedLines(lineIdx)
        setCurrentChars(0)
        await sleep(LINE_PAUSE_MS)
      }

      // Phase 3: done
      if (cancelled) return
      setDone(true)
      await sleep(DONE_HOLD_MS)
      if (!cancelled) runCycle()
    }

    runCycle()
    return () => { cancelled = true }
  }, [])

  // Lines to render:
  // - indices 0..completedLines → highlighted node
  // - index completedLines+1 → raw text being typed (with cursor)
  const totalRenderedLines = completedLines + 2 // +1 for the typing line
  const visibleLines = SKILL_LINES.slice(0, Math.max(0, totalRenderedLines))
  const typingLineIdx = completedLines + 1

  return (
    <FeatureFloatingMockShell className="!h-[480px] flex-col overflow-hidden">
      <div className="relative z-[1] flex h-full min-h-0 w-full flex-col">

        {/* ── Skill file area — scrollable, never pushes input up ── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2 pt-5" style={{ scrollbarWidth: 'none' }}>
          <AnimatePresence>
            {submitted && completedLines >= -1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {/* Markdown lines with line numbers */}
                <div
                  className="relative overflow-hidden rounded-xl p-3"
                  style={{
                    background: 'rgba(30,30,30,0.7)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                  }}
                >
                  {/* Saved badge — top-right corner inside the block */}
                  <AnimatePresence>
                    {done && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute right-3 top-2.5 flex items-center gap-1.5 rounded-full px-2.5 py-0.5"
                        style={{ background: 'rgb(52 211 153 / 0.12)', border: '1px solid rgb(52 211 153 / 0.25)' }}
                      >
                        <Save size={9} style={{ color: 'rgb(52 211 153)' }} />
                        <span className="text-[8.5px] font-bold" style={{ color: 'rgb(52 211 153)' }}>Skill saved</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {visibleLines.map((line, i) => {
                    const isTyping = i === typingLineIdx && !done

                    return (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          gap: 10,
                          height: 17,
                          lineHeight: '17px',
                          fontSize: 11,
                        }}
                      >
                        {/* Line number */}
                        <span
                          style={{
                            width: 20,
                            textAlign: 'right',
                            flexShrink: 0,
                            color: C.lineNum,
                            userSelect: 'none',
                            fontSize: 10,
                          }}
                        >
                          {i + 1}
                        </span>

                        {/* Content */}
                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'visible' }}>
                          {isTyping ? (
                            // Currently being typed: show raw chars in dim color + blinking cursor
                            <>
                              <span style={{ color: C.text }}>{line.raw.slice(0, currentChars)}</span>
                              <span
                                style={{
                                  display: 'inline-block',
                                  width: 1.5,
                                  height: '0.85em',
                                  background: 'rgb(52 211 153)',
                                  marginLeft: 1,
                                  verticalAlign: 'text-bottom',
                                  animation: 'pulse 1s infinite',
                                }}
                              />
                            </>
                          ) : (
                            // Completed line: show highlighted node (or empty for blank lines)
                            line.node ?? <span style={{ color: 'transparent' }}>_</span>
                          )}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Input chrome ── */}
        <div className="shrink-0 px-5 pb-5 pt-2">
          <SkillInput briefText={briefText} submitted={submitted} />
        </div>

      </div>
    </FeatureFloatingMockShell>
  )
}
