'use client'

import React from 'react'

// ── Full-size funnel landing page — renders at natural size in the right panel ──
// The DeliverableVisualPreview 400%/scale(0.25) thumbnail trick was designed
// for the ~240px wide card in MissionDetailModal. At hero-panel widths (~600px+)
// its fixed 420px column collapses to ~105px visually, breaking proportions.
// This component renders at true pixel sizes, proportioned for 560–700px panels.
const CHECKLIST = [
  '2 full days of live tactical training',
  'Access to all sessions & workshops',
  'Vendor expo & sponsor showcase',
  'Networking with 200+ founders',
]

const FIELDS = ['Full Name', 'Email Address', 'Phone Number', 'Trade / Industry']

function FullFunnelPreview() {
  return (
    <div
      style={{
        height: '100%',
        fontFamily: '"Source Sans 3", system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Background image with dark overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/marketing/scale-summit-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
          zIndex: 0,
        }}
      />
      {/* Dark overlay so text stays readable */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(0,0,0,0.82) 0%, rgba(10,0,0,0.72) 100%)',
          zIndex: 1,
        }}
      />

      {/* All content above the background */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Nav */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <span
            style={{
              fontFamily: '"Bebas Neue", "Arial Black", sans-serif',
              fontSize: 15,
              letterSpacing: '0.1em',
              color: '#F5F5F5',
            }}
          >
            SCALE SUMMIT
          </span>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {['Schedule', 'Speakers', 'FAQ'].map((l) => (
              <span key={l} style={{ fontSize: 11, color: 'rgba(245,245,245,0.45)', cursor: 'default' }}>
                {l}
              </span>
            ))}
            <div
              style={{
                background: '#C8102E',
                padding: '5px 12px',
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'default',
              }}
            >
              Register →
            </div>
          </div>
        </div>

        {/* Hero body — two columns, vertically centered to fill space */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '1fr 190px',
            gap: 24,
            padding: '0 20px',
            alignItems: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Left: content */}
          <div>
            {/* Date kicker */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                border: '1px solid rgba(200,16,46,0.5)',
                background: 'rgba(200,16,46,0.12)',
                borderRadius: 4,
                padding: '3px 10px',
                marginBottom: 14,
              }}
            >
              <span
                style={{ width: 4, height: 4, background: '#C8102E', borderRadius: '50%', flexShrink: 0 }}
              />
              <span
                style={{
                  fontSize: 9,
                  color: '#C8102E',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                }}
              >
                June 12–13, 2026 · Austin, TX
              </span>
            </div>

            {/* H1 */}
            <h1
              style={{
                fontFamily: '"Bebas Neue", "Arial Black", sans-serif',
                fontSize: 38,
                lineHeight: 0.95,
                letterSpacing: '0.04em',
                color: '#F5F5F5',
                marginBottom: 12,
              }}
            >
              CLAIM YOUR
              <br />
              SEAT AT
              <br />
              <span style={{ color: '#C8102E' }}>SCALE SUMMIT 2026</span>
            </h1>

            {/* Subheadline */}
            <p
              style={{
                fontSize: 12,
                color: 'rgba(245,245,245,0.6)',
                lineHeight: 1.6,
                marginBottom: 18,
                maxWidth: 300,
              }}
            >
              Two days. Hundreds of founders. The exact systems to generate more leads, close more sales, and scale with real profit.
            </p>

            {/* Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {CHECKLIST.map((item) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 15,
                      height: 15,
                      background: 'rgba(200,16,46,0.15)',
                      border: '1px solid rgba(200,16,46,0.45)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ color: '#C8102E', fontSize: 8, fontWeight: 700 }}>✓</span>
                  </span>
                  <span style={{ color: 'rgba(245,245,245,0.7)', fontSize: 11 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: registration form */}
          <div
            style={{
              background: 'rgba(10,10,10,0.85)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              padding: '18px 16px',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  border: '1px solid rgba(200,16,46,0.4)',
                  background: 'rgba(200,16,46,0.1)',
                  borderRadius: 20,
                  padding: '3px 8px',
                  marginBottom: 8,
                }}
              >
                <span
                  style={{ width: 3, height: 3, background: '#C8102E', borderRadius: '50%' }}
                />
                <span
                  style={{
                    color: '#C8102E',
                    fontSize: 7.5,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                  }}
                >
                  Limited Seats
                </span>
              </div>
              <h2
                style={{
                  fontFamily: '"Bebas Neue", "Arial Black", sans-serif',
                  fontSize: 18,
                  color: '#F5F5F5',
                  letterSpacing: '0.08em',
                  marginBottom: 2,
                }}
              >
                CLAIM YOUR SEAT
              </h2>
              <p style={{ color: 'rgba(245,245,245,0.3)', fontSize: 9 }}>
                Scale Summit 2026 — Austin, TX
              </p>
            </div>

            {FIELDS.map((label) => (
              <div key={label} style={{ marginBottom: 9 }}>
                <div
                  style={{
                    fontSize: 7.5,
                    color: 'rgba(245,245,245,0.35)',
                    marginBottom: 3,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    height: 28,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 6,
                  }}
                />
              </div>
            ))}

            <div
              style={{
                marginTop: 14,
                background: '#C8102E',
                color: '#fff',
                textAlign: 'center',
                padding: '9px 0',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                cursor: 'default',
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

// ── VS Code dark+ theme palette ──────────────────────────────────────────────
const C = {
  editorBg:  '#1e1e1e',
  tabBg:     '#252526',
  lineNum:   '#4d4d4d',
  h1:        '#4fc1ff',
  h2:        '#4ec9b0',
  h3:        '#9cdcfe',
  bold:      '#dcdcaa',
  text:      '#d4d4d4',
  dim:       '#606060',
  green:     '#6a9955',
  orange:    '#ce9178',
  statusBg:  '#007acc',
}

// ── Markdown line data ────────────────────────────────────────────────────────
// Each entry is the JSX for that line; null = blank line
const LINES: (React.ReactNode | null)[] = [
  // 1
  <><span style={{ color: C.dim }}># </span><span style={{ color: C.h1, fontWeight: 700 }}>Lead Magnet Funnel</span></>,
  // 2
  null,
  // 3
  <><span style={{ color: C.dim }}>## </span><span style={{ color: C.h2, fontWeight: 600 }}>Objective</span></>,
  // 4
  <span style={{ color: C.text }}>Capture qualified leads by delivering a</span>,
  // 5
  <span style={{ color: C.text }}>high-value asset in exchange for an email.</span>,
  // 6
  null,
  // 7
  <><span style={{ color: C.dim }}>## </span><span style={{ color: C.h2, fontWeight: 600 }}>Inputs</span></>,
  // 8
  null,
  // 9
  <><span style={{ color: C.dim }}>- </span><span style={{ color: C.bold }}>**offer**</span><span style={{ color: C.text }}> — title + one-line value prop</span></>,
  // 10
  <><span style={{ color: C.dim }}>- </span><span style={{ color: C.bold }}>**audience**</span><span style={{ color: C.text }}> — ICP in plain language</span></>,
  // 11
  <><span style={{ color: C.dim }}>- </span><span style={{ color: C.bold }}>**goal**</span><span style={{ color: C.text }}> — conversion target</span></>,
  // 12
  null,
  // 13
  <><span style={{ color: C.dim }}>## </span><span style={{ color: C.h2, fontWeight: 600 }}>Artifact Blueprint</span></>,
  // 14
  null,
  // 15
  <><span style={{ color: C.dim }}>### </span><span style={{ color: C.h3 }}>1. Landing Page</span></>,
  // 16
  <span style={{ color: C.text }}>Headline mirrors the #1 pain point.</span>,
  // 17
  <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>Above-the-fold lead capture form</span></>,
  // 18
  <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>3–5 outcome-focused bullet points</span></>,
  // 19
  <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>Social proof strip (logos or stats)</span></>,
  // 20
  null,
  // 21
  <><span style={{ color: C.dim }}>### </span><span style={{ color: C.h3 }}>2. Thank You Page</span></>,
  // 22
  <span style={{ color: C.text }}>Confirm delivery. Bridge to next step.</span>,
  // 23
  null,
  // 24
  <><span style={{ color: C.dim }}>### </span><span style={{ color: C.h3 }}>3. Email Sequence (5 emails)</span></>,
  // 25
  <><span style={{ color: C.dim }}>  - </span><span style={{ color: C.text }}>Email 1 </span><span style={{ color: C.dim }}>·</span><span style={{ color: C.text }}> Welcome + deliver asset</span></>,
  // 26
  <><span style={{ color: C.dim }}>  - </span><span style={{ color: C.text }}>Email 2 </span><span style={{ color: C.dim }}>·</span><span style={{ color: C.text }}> Quick win from asset</span></>,
  // 27
  <><span style={{ color: C.dim }}>  - </span><span style={{ color: C.text }}>Email 3 </span><span style={{ color: C.dim }}>·</span><span style={{ color: C.text }}> Case study proof</span></>,
  // 28
  <><span style={{ color: C.dim }}>  - </span><span style={{ color: C.text }}>Email 4 </span><span style={{ color: C.dim }}>·</span><span style={{ color: C.text }}> Handle top objection</span></>,
  // 29
  <><span style={{ color: C.dim }}>  - </span><span style={{ color: C.text }}>Email 5 </span><span style={{ color: C.dim }}>·</span><span style={{ color: C.text }}> Core offer introduction</span></>,
  // 30
  null,
  // 31
  <><span style={{ color: C.dim }}>## </span><span style={{ color: C.h2, fontWeight: 600 }}>Brain Context</span></>,
  // 32
  null,
  // 33
  <><span style={{ color: C.green }}>Reads: </span><span style={{ color: C.orange }}>brand_voice</span><span style={{ color: C.text }}>, </span><span style={{ color: C.orange }}>icp_profile</span></>,
  // 34
  <><span style={{ color: C.text }}>       </span><span style={{ color: C.orange }}>offer_data</span></>,
  // 35
  <><span style={{ color: C.green }}>Writes: </span><span style={{ color: C.orange }}>conversion_learnings</span></>,
  // 36
  null,
]

// ── VS Code editor shell ──────────────────────────────────────────────────────
function VSCodeEditor() {
  return (
    <div
      style={{
        height: '100%',
        background: C.editorBg,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace",
        overflow: 'hidden',
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          height: 34,
          background: C.tabBg,
          display: 'flex',
          alignItems: 'stretch',
          flexShrink: 0,
          borderBottom: '1px solid rgba(0,0,0,0.3)',
        }}
      >
        {/* Active tab */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            paddingLeft: 14,
            paddingRight: 12,
            background: C.editorBg,
            borderRight: '1px solid rgba(0,0,0,0.3)',
            borderTop: '1px solid #007acc',
          }}
        >
          {/* Markdown icon dot */}
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#519aba', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: '#cccccc', whiteSpace: 'nowrap' }}>
            lead-magnet-funnel.md
          </span>
          <span style={{ fontSize: 10, color: '#6c6c6c', marginLeft: 4, cursor: 'default' }}>×</span>
        </div>
        {/* Inactive tab */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            paddingLeft: 14,
            paddingRight: 12,
            borderRight: '1px solid rgba(0,0,0,0.2)',
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4d4d4d', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: '#6c6c6c', whiteSpace: 'nowrap' }}>webinar-reg.md</span>
        </div>
      </div>

      {/* Editor area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', paddingTop: 6 }}>
        {/* Gutter: line numbers */}
        <div
          style={{
            width: 38,
            flexShrink: 0,
            paddingRight: 8,
            textAlign: 'right',
            userSelect: 'none',
          }}
        >
          {LINES.map((_, i) => (
            <div
              key={i}
              style={{
                height: 18,
                fontSize: 11,
                lineHeight: '18px',
                color: C.lineNum,
              }}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code content */}
        <div style={{ flex: 1, paddingLeft: 6, overflow: 'hidden' }}>
          {LINES.map((line, i) => (
            <div
              key={i}
              style={{
                height: 18,
                fontSize: 11.5,
                lineHeight: '18px',
                whiteSpace: 'nowrap',
                overflow: 'visible',
              }}
            >
              {line ?? <span style={{ color: 'transparent' }}>_</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Status bar */}
      <div
        style={{
          height: 20,
          background: C.statusBg,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 10,
          gap: 12,
          flexShrink: 0,
        }}
      >
        {['main', 'Markdown', 'UTF-8', 'Ln 1, Col 1'].map((t) => (
          <span key={t} style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.8)' }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export function MarketingSkillsHeroMockup() {
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      style={{ minHeight: 400, height: '100%', background: C.editorBg }}
    >

      {/* ── LAYER 1: VS Code editor, full width, masked on right edge ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          maskImage: 'linear-gradient(to right, black 38%, transparent 78%)',
          WebkitMaskImage: 'linear-gradient(to right, black 38%, transparent 78%)',
        }}
      >
        <VSCodeEditor />
      </div>

      {/* ── LAYER 2: Blur overlay in the transition zone ────────────── */}
      {/* backdrop-filter blurs whatever is on z=1 (the editor) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '20%',
          right: '20%',
          height: '100%',
          zIndex: 2,
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          maskImage: 'linear-gradient(to right, transparent 0%, black 22%, black 78%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 22%, black 78%, transparent 100%)',
          pointerEvents: 'none',
        }}
        aria-hidden
      />

      {/* ── LAYER 3: Funnel preview, right ~60%, masked on left edge ── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '62%',
          height: '100%',
          zIndex: 3,
          overflow: 'hidden',
          maskImage: 'linear-gradient(to right, transparent 0%, black 32%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 32%)',
        }}
      >
        <FullFunnelPreview />
      </div>

      {/* ── LAYER 4: Bottom badge overlays ─────────────────────────── */}
      {/* Left: skill name */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: 12,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(30,30,30,0.85)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20,
          padding: '3px 10px',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <span
          style={{ width: 5, height: 5, borderRadius: '50%', background: C.statusBg, display: 'inline-block' }}
        />
        <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.07em', fontFamily: 'system-ui, sans-serif' }}>
          lead-magnet-funnel.md
        </span>
      </div>

      {/* Right: Built by ROAS */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          right: 12,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          background: 'rgba(0,0,0,0.55)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20,
          padding: '3px 10px',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <span
          style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgb(52 211 153)', display: 'inline-block' }}
        />
        <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.07em', fontFamily: 'system-ui, sans-serif' }}>
          Built by ROAS Skills
        </span>
      </div>

    </div>
  )
}
