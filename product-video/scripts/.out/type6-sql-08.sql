INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_49$references/type6-components/MarketingSkillsHeroMockup.md$body_fp_49$, $body_c_49$# MarketingSkillsHeroMockup

> Hero / above-the-fold block; use as a cover slide or section opener.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/MarketingSkillsHeroMockup.tsx`
- Website source: `apps/website/src/components/marketing/MarketingSkillsHeroMockup.tsx`
- Import alias: `@/components/marketing/MarketingSkillsHeroMockup`

## Props

_No explicit Props interface — see the source signature below._

## Usage (slide body)

```tsx
// Inside a SocialCreative slide the component is embedded at the canvas scale.
// Keep the component's own sizing and wrap it in a container that matches the
// carousel canvas (1080 x 1350 for type 6).
export function SocialCreative({ width, height }) {
  return (
    <div style={{ width, height, background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: width * 0.92 }}>
        {/* Paste the component JSX here, 1:1 from the source below. */}
      </div>
    </div>
  );
}
```


## Source

```tsx
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

      {/* Right: Built by Vibey */}
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
          Built by Vibey Skills
        </span>
      </div>

    </div>
  )
}

```
$body_c_49$, $body_ct_49$text/markdown$body_ct_49$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_50$references/type6-components/MarketingSkillStackMockup.md$body_fp_50$, $body_c_50$# MarketingSkillStackMockup

> Product UI mockup block; use when a slide needs to look like the real app.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/MarketingSkillStackMockup.tsx`
- Website source: `apps/website/src/components/marketing/MarketingSkillStackMockup.tsx`
- Import alias: `@/components/marketing/MarketingSkillStackMockup`

## Props

_No explicit Props interface — see the source signature below._

## Usage (slide body)

```tsx
// Inside a SocialCreative slide the component is embedded at the canvas scale.
// Keep the component's own sizing and wrap it in a container that matches the
// carousel canvas (1080 x 1350 for type 6).
export function SocialCreative({ width, height }) {
  return (
    <div style={{ width, height, background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: width * 0.92 }}>
        {/* Paste the component JSX here, 1:1 from the source below. */}
      </div>
    </div>
  );
}
```

## Non-Tailwind classes referenced

These must exist in the final stylesheet or be replaced with inline styles when rendering inside a carousel slide:

- `!h-[480px]`
- `glass-card`
- `shrink-0`
- `truncate`

## Source

```tsx
'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'

// ── VS Code syntax colors ─────────────────────────────────────────────────────
const C = {
  h1: '#4fc1ff',
  h2: '#4ec9b0',
  bold: '#dcdcaa',
  text: '#d4d4d4',
  dim: '#5a5a5a',
  green: '#6a9955',
  orange: '#ce9178',
  lineNum: '#3d3d3d',
}

const STAGGER_S = 0.4

// ── Skill card data ───────────────────────────────────────────────────────────
type SkillCardDef = {
  name: string
  lines: Array<{ raw: string; node: React.ReactNode }>
  badges: Array<{ label: string; color: string; bg: string; border: string }>
  accentColor: string
}

const SKILLS: SkillCardDef[] = [
  {
    name: 'Lead Magnet Funnel',
    accentColor: 'rgb(52 211 153)',
    lines: [
      { raw: '# Lead Magnet Funnel', node: <><span style={{ color: C.dim }}># </span><span style={{ color: C.h1, fontWeight: 700 }}>Lead Magnet Funnel</span></> },
      { raw: '## Inputs', node: <><span style={{ color: C.dim }}>## </span><span style={{ color: C.h2, fontWeight: 600 }}>Inputs</span></> },
      { raw: '- **offer** — value prop', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.bold }}>**offer**</span><span style={{ color: C.text }}> — value prop</span></> },
      { raw: '- **audience** — ICP', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.bold }}>**audience**</span><span style={{ color: C.text }}> — ICP</span></> },
      { raw: '- **goal** — subscribers/wk', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.bold }}>**goal**</span><span style={{ color: C.text }}> — subscribers/wk</span></> },
      { raw: 'Reads: Notion brief, GDrive pdf', node: <><span style={{ color: C.green }}>Reads: </span><span style={{ color: C.orange }}>notion_brief</span><span style={{ color: C.text }}>, </span><span style={{ color: C.orange }}>gdrive_asset</span></> },
    ],
    badges: [
      { label: 'Landing Page', color: 'rgb(96 165 250)', bg: 'rgb(96 165 250 / 0.1)', border: 'rgb(96 165 250 / 0.2)' },
      { label: 'Email', color: 'rgb(251 146 60)', bg: 'rgb(251 146 60 / 0.1)', border: 'rgb(251 146 60 / 0.2)' },
      { label: 'Google', color: 'rgb(52 211 153)', bg: 'rgb(52 211 153 / 0.1)', border: 'rgb(52 211 153 / 0.2)' },
    ],
  },
  {
    name: 'Webinar Registration',
    accentColor: 'rgb(251 146 60)',
    lines: [
      { raw: '# Webinar Registration', node: <><span style={{ color: C.dim }}># </span><span style={{ color: C.h1, fontWeight: 700 }}>Webinar Registration</span></> },
      { raw: '## Structure', node: <><span style={{ color: C.dim }}>## </span><span style={{ color: C.h2, fontWeight: 600 }}>Structure</span></> },
      { raw: '- **goal** — seat registrations', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.bold }}>**goal**</span><span style={{ color: C.text }}> — seat registrations</span></> },
      { raw: '- Registration + confirm page', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>Registration + confirm page</span></> },
      { raw: '- Reminder email sequence', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>Reminder email sequence</span></> },
      { raw: 'Reads: HubSpot lists, brand_voice', node: <><span style={{ color: C.green }}>Reads: </span><span style={{ color: C.orange }}>hubspot_segments</span><span style={{ color: C.text }}>, </span><span style={{ color: C.orange }}>brand_voice</span></> },
    ],
    badges: [
      { label: 'HubSpot', color: 'rgb(249 115 22)', bg: 'rgb(249 115 22 / 0.1)', border: 'rgb(249 115 22 / 0.2)' },
      { label: 'Landing', color: 'rgb(96 165 250)', bg: 'rgb(96 165 250 / 0.1)', border: 'rgb(96 165 250 / 0.2)' },
      { label: 'Email', color: 'rgb(251 146 60)', bg: 'rgb(251 146 60 / 0.1)', border: 'rgb(251 146 60 / 0.2)' },
    ],
  },
  {
    name: 'Product Launch',
    accentColor: 'rgb(192 132 252)',
    lines: [
      { raw: '# Product Launch', node: <><span style={{ color: C.dim }}># </span><span style={{ color: C.h1, fontWeight: 700 }}>Product Launch</span></> },
      { raw: '## Structure', node: <><span style={{ color: C.dim }}>## </span><span style={{ color: C.h2, fontWeight: 600 }}>Structure</span></> },
      { raw: '- Pre-launch tease sequence', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>Pre-launch tease sequence</span></> },
      { raw: '- Launch day email + page', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>Launch day email + page</span></> },
      { raw: '- Post-launch follow-up', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>Post-launch follow-up</span></> },
      { raw: 'Writes: Zapier webhook → CRM', node: <><span style={{ color: C.green }}>Writes: </span><span style={{ color: C.orange }}>zapier_hook</span><span style={{ color: C.text }}> → lists</span></> },
    ],
    badges: [
      { label: 'Zapier', color: 'rgb(255 100 50)', bg: 'rgb(255 100 50 / 0.12)', border: 'rgb(255 100 50 / 0.25)' },
      { label: 'Funnel', color: 'rgb(96 165 250)', bg: 'rgb(96 165 250 / 0.1)', border: 'rgb(96 165 250 / 0.2)' },
      { label: 'Social', color: 'rgb(192 132 252)', bg: 'rgb(192 132 252 / 0.1)', border: 'rgb(192 132 252 / 0.2)' },
    ],
  },
  {
    name: 'CRM Pipeline Nurture',
    accentColor: 'rgb(249 115 22)',
    lines: [
      { raw: '# CRM Pipeline Nurture', node: <><span style={{ color: C.dim }}># </span><span style={{ color: C.h1, fontWeight: 700 }}>CRM Pipeline Nurture</span></> },
      { raw: '## Triggers', node: <><span style={{ color: C.dim }}>## </span><span style={{ color: C.h2, fontWeight: 600 }}>Triggers</span></> },
      { raw: '- Stage = MQL → **content** drip', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>Stage = MQL → </span><span style={{ color: C.bold }}>**content**</span><span style={{ color: C.text }}> drip</span></> },
      { raw: '- Owner handoff note to AE', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>Owner handoff note to AE</span></> },
      { raw: '- Airtable cohort tags sync', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>Airtable cohort tags sync</span></> },
      { raw: 'Reads: HubSpot deals, contacts', node: <><span style={{ color: C.green }}>Reads: </span><span style={{ color: C.orange }}>hubspot_deals</span><span style={{ color: C.text }}>, </span><span style={{ color: C.orange }}>contacts</span></> },
    ],
    badges: [
      { label: 'HubSpot', color: 'rgb(249 115 22)', bg: 'rgb(249 115 22 / 0.1)', border: 'rgb(249 115 22 / 0.2)' },
      { label: 'Airtable', color: 'rgb(253 171 91)', bg: 'rgb(253 171 91 / 0.12)', border: 'rgb(253 171 91 / 0.25)' },
      { label: 'Analysis', color: 'rgb(167 139 250)', bg: 'rgb(167 139 250 / 0.1)', border: 'rgb(167 139 250 / 0.2)' },
    ],
  },
  {
    name: 'Paid Media Push',
    accentColor: 'rgb(96 165 250)',
    lines: [
      { raw: '# Paid Media Push', node: <><span style={{ color: C.dim }}># </span><span style={{ color: C.h1, fontWeight: 700 }}>Paid Media Push</span></> },
      { raw: '## Outputs', node: <><span style={{ color: C.dim }}>## </span><span style={{ color: C.h2, fontWeight: 600 }}>Outputs</span></> },
      { raw: '- Meta + Google creative variants', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>Meta + Google creative variants</span></> },
      { raw: '- Audience seed from Interest graph', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>Audience seed from Interest graph</span></> },
      { raw: '- UTMs + naming for tracking', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>UTMs + naming for tracking</span></> },
      { raw: 'Writes: Meta Ads, Google Ads', node: <><span style={{ color: C.green }}>Writes: </span><span style={{ color: C.orange }}>meta_ads</span><span style={{ color: C.text }}>, </span><span style={{ color: C.orange }}>google_ads</span></> },
    ],
    badges: [
      { label: 'Meta', color: 'rgb(24 119 242)', bg: 'rgb(24 119 242 / 0.12)', border: 'rgb(24 119 242 / 0.22)' },
      { label: 'Google Ads', color: 'rgb(52 168 83)', bg: 'rgb(52 168 83 / 0.12)', border: 'rgb(52 168 83 / 0.22)' },
      { label: 'Ads', color: 'rgb(96 165 250)', bg: 'rgb(96 165 250 / 0.1)', border: 'rgb(96 165 250 / 0.2)' },
    ],
  },
  {
    name: 'Checkout & Revenue',
    accentColor: 'rgb(52 211 153)',
    lines: [
      { raw: '# Checkout & Revenue', node: <><span style={{ color: C.dim }}># </span><span style={{ color: C.h1, fontWeight: 700 }}>Checkout & Revenue</span></> },
      { raw: '## Flow', node: <><span style={{ color: C.dim }}>## </span><span style={{ color: C.h2, fontWeight: 600 }}>Flow</span></> },
      { raw: '- Stripe + PayPal offer pages', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>Stripe + PayPal offer pages</span></> },
      { raw: '- Receipt + dunning copy pack', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>Receipt + dunning copy pack</span></> },
      { raw: '- Finance rollup: net vs gross', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>Finance rollup: net vs gross</span></> },
      { raw: 'Reads: stripe_charges, paypal_txn', node: <><span style={{ color: C.green }}>Reads: </span><span style={{ color: C.orange }}>stripe_charges</span><span style={{ color: C.text }}>, </span><span style={{ color: C.orange }}>paypal_txn</span></> },
    ],
    badges: [
      { label: 'Stripe', color: 'rgb(99 91 255)', bg: 'rgb(99 91 255 / 0.12)', border: 'rgb(99 91 255 / 0.22)' },
      { label: 'PayPal', color: 'rgb(0 112 186)', bg: 'rgb(0 112 186 / 0.12)', border: 'rgb(0 112 186 / 0.22)' },
      { label: 'Finance', color: 'rgb(52 211 153)', bg: 'rgb(52 211 153 / 0.1)', border: 'rgb(52 211 153 / 0.2)' },
    ],
  },
  {
    name: 'Ops Command Digest',
    accentColor: 'rgb(244 114 182)',
    lines: [
      { raw: '# Ops Command Digest', node: <><span style={{ color: C.dim }}># </span><span style={{ color: C.h1, fontWeight: 700 }}>Ops Command Digest</span></> },
      { raw: '## Cadence', node: <><span style={{ color: C.dim }}>## </span><span style={{ color: C.h2, fontWeight: 600 }}>Cadence</span></> },
      { raw: '- Daily: missions blocked + owners', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>Daily: missions blocked + owners</span></> },
      { raw: '- Slack recap with deep links', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>Slack recap with deep links</span></> },
      { raw: '- FanBasis drops → notify channel', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>FanBasis drops → notify channel</span></> },
      { raw: 'Writes: slack_channel posts', node: <><span style={{ color: C.green }}>Writes: </span><span style={{ color: C.orange }}>slack_channel</span><span style={{ color: C.text }}> posts</span></> },
    ],
    badges: [
      { label: 'Slack', color: 'rgb(74 21 75)', bg: 'rgb(224 178 208 / 0.15)', border: 'rgb(244 114 182 / 0.35)' },
      { label: 'FanBasis', color: 'rgb(251 113 133)', bg: 'rgb(251 113 133 / 0.12)', border: 'rgb(251 113 133 / 0.25)' },
      { label: 'Ops', color: 'rgb(244 114 182)', bg: 'rgb(244 114 182 / 0.1)', border: 'rgb(244 114 182 / 0.2)' },
    ],
  },
  {
    name: 'Executive Report Pack',
    accentColor: 'rgb(129 140 248)',
    lines: [
      { raw: '# Executive Report Pack', node: <><span style={{ color: C.dim }}># </span><span style={{ color: C.h1, fontWeight: 700 }}>Executive Report Pack</span></> },
      { raw: '## Metrics', node: <><span style={{ color: C.dim }}>## </span><span style={{ color: C.h2, fontWeight: 600 }}>Metrics</span></> },
      { raw: '- Google Analytics + Ads ROAS blend', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>Google Analytics + Ads ROAS blend</span></> },
      { raw: '- Cohort curves + CAC snapshot', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>Cohort curves + CAC snapshot</span></> },
      { raw: '- Notion exec summary page', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>Notion exec summary page</span></> },
      { raw: 'Reads: ga4_export, ad_accounts', node: <><span style={{ color: C.green }}>Reads: </span><span style={{ color: C.orange }}>ga4_export</span><span style={{ color: C.text }}>, </span><span style={{ color: C.orange }}>ad_accounts</span></> },
    ],
    badges: [
      { label: 'Google', color: 'rgb(66 133 244)', bg: 'rgb(66 133 244 / 0.12)', border: 'rgb(66 133 244 / 0.22)' },
      { label: 'Notion', color: 'rgb(235 235 235)', bg: 'rgb(255 255 255 / 0.08)', border: 'rgb(255 255 255 / 0.15)' },
      { label: 'Reports', color: 'rgb(129 140 248)', bg: 'rgb(129 140 248 / 0.1)', border: 'rgb(129 140 248 / 0.2)' },
    ],
  },
  {
    name: 'LinkedIn ABM Touches',
    accentColor: 'rgb(59 130 246)',
    lines: [
      { raw: '# LinkedIn ABM Touches', node: <><span style={{ color: C.dim }}># </span><span style={{ color: C.h1, fontWeight: 700 }}>LinkedIn ABM Touches</span></> },
      { raw: '## Sequence', node: <><span style={{ color: C.dim }}>## </span><span style={{ color: C.h2, fontWeight: 600 }}>Sequence</span></> },
      { raw: '- Account list from **ICP** tier', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>Account list from </span><span style={{ color: C.bold }}>**ICP**</span><span style={{ color: C.text }}> tier</span></> },
      { raw: '- InMail + connection templates', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>InMail + connection templates</span></> },
      { raw: '- Sync replies → HubSpot tasks', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>Sync replies → HubSpot tasks</span></> },
      { raw: 'Writes: linkedin_sponsored, tasks', node: <><span style={{ color: C.green }}>Writes: </span><span style={{ color: C.orange }}>linkedin_sponsored</span><span style={{ color: C.text }}>, tasks</span></> },
    ],
    badges: [
      { label: 'LinkedIn', color: 'rgb(10 102 194)', bg: 'rgb(10 102 194 / 0.14)', border: 'rgb(10 102 194 / 0.28)' },
      { label: 'HubSpot', color: 'rgb(249 115 22)', bg: 'rgb(249 115 22 / 0.1)', border: 'rgb(249 115 22 / 0.2)' },
      { label: 'B2B', color: 'rgb(59 130 246)', bg: 'rgb(59 130 246 / 0.1)', border: 'rgb(59 130 246 / 0.2)' },
    ],
  },
  {
    name: 'Winback & Dunning',
    accentColor: 'rgb(248 113 113)',
    lines: [
      { raw: '# Winback & Dunning', node: <><span style={{ color: C.dim }}># </span><span style={{ color: C.h1, fontWeight: 700 }}>Winback & Dunning</span></> },
      { raw: '## Signals', node: <><span style={{ color: C.dim }}>## </span><span style={{ color: C.h2, fontWeight: 600 }}>Signals</span></> },
      { raw: '- Failed renewal / card decline', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>Failed renewal / card decline</span></> },
      { raw: '- 3-step save + clear next step', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>3-step save + clear next step</span></> },
      { raw: '- Finance note → refund policy', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>Finance note → refund policy</span></> },
      { raw: 'Reads: stripe_invoices', node: <><span style={{ color: C.green }}>Reads: </span><span style={{ color: C.orange }}>stripe_invoices</span><span style={{ color: C.text }}>, churn_risk</span></> },
    ],
    badges: [
      { label: 'Stripe', color: 'rgb(99 91 255)', bg: 'rgb(99 91 255 / 0.12)', border: 'rgb(99 91 255 / 0.22)' },
      { label: 'Email', color: 'rgb(251 146 60)', bg: 'rgb(251 146 60 / 0.1)', border: 'rgb(251 146 60 / 0.2)' },
      { label: 'Finance', color: 'rgb(248 113 113)', bg: 'rgb(248 113 113 / 0.1)', border: 'rgb(248 113 113 / 0.2)' },
    ],
  },
  {
    name: 'Competitive Brief',
    accentColor: 'rgb(34 211 238)',
    lines: [
      { raw: '# Competitive Brief', node: <><span style={{ color: C.dim }}># </span><span style={{ color: C.h1, fontWeight: 700 }}>Competitive Brief</span></> },
      { raw: '## Sources', node: <><span style={{ color: C.dim }}>## </span><span style={{ color: C.h2, fontWeight: 600 }}>Sources</span></> },
      { raw: '- Pricing + positioning scrape', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>Pricing + positioning scrape</span></> },
      { raw: '- Battlecard one-pager', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>Battlecard one-pager</span></> },
      { raw: '- Notion page + Slack ping', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>Notion page + Slack ping</span></> },
      { raw: 'Writes: notion_page', node: <><span style={{ color: C.green }}>Writes: </span><span style={{ color: C.orange }}>notion_page</span><span style={{ color: C.text }}>, slack_thread</span></> },
    ],
    badges: [
      { label: 'Notion', color: 'rgb(235 235 235)', bg: 'rgb(255 255 255 / 0.08)', border: 'rgb(255 255 255 / 0.15)' },
      { label: 'Slack', color: 'rgb(244 114 182)', bg: 'rgb(244 114 182 / 0.1)', border: 'rgb(244 114 182 / 0.25)' },
      { label: 'Analysis', color: 'rgb(34 211 238)', bg: 'rgb(34 211 238 / 0.1)', border: 'rgb(34 211 238 / 0.2)' },
    ],
  },
  {
    name: 'SEO Content Cluster',
    accentColor: 'rgb(163 230 53)',
    lines: [
      { raw: '# SEO Content Cluster', node: <><span style={{ color: C.dim }}># </span><span style={{ color: C.h1, fontWeight: 700 }}>SEO Content Cluster</span></> },
      { raw: '## Pillar plan', node: <><span style={{ color: C.dim }}>## </span><span style={{ color: C.h2, fontWeight: 600 }}>Pillar plan</span></> },
      { raw: '- Pillar + 6 spoke briefs', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>Pillar + 6 spoke briefs</span></> },
      { raw: '- Internal link map + schema', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>Internal link map + schema</span></> },
      { raw: '- GSC queries → outline order', node: <><span style={{ color: C.dim }}>- </span><span style={{ color: C.text }}>GSC queries → outline order</span></> },
      { raw: 'Reads: ga4_landing, gsc_queries', node: <><span style={{ color: C.green }}>Reads: </span><span style={{ color: C.orange }}>search_console</span><span style={{ color: C.text }}>, </span><span style={{ color: C.orange }}>brain_topics</span></> },
    ],
    badges: [
      { label: 'Google', color: 'rgb(66 133 244)', bg: 'rgb(66 133 244 / 0.12)', border: 'rgb(66 133 244 / 0.22)' },
      { label: 'Content', color: 'rgb(163 230 53)', bg: 'rgb(163 230 53 / 0.12)', border: 'rgb(163 230 53 / 0.25)' },
      { label: 'SEO', color: 'rgb(134 239 172)', bg: 'rgb(134 239 172 / 0.1)', border: 'rgb(134 239 172 / 0.22)' },
    ],
  },
]

// Scattered layout — full 480px shell; mix of `top` + `bottom` anchors so the lower band isn’t empty
const CARD_LAYOUT = [
  { zIndex: 10, style: { left: '1%', top: '2%', transform: 'rotate(-2.6deg)' } },
  { zIndex: 20, style: { left: '50%', top: '0%', transform: 'rotate(3.1deg)' } },
  { zIndex: 30, style: { left: '62%', top: '11%', transform: 'rotate(-1.4deg)' } },
  { zIndex: 40, style: { left: '7%', top: '20%', transform: 'rotate(2.3deg)' } },
  { zIndex: 50, style: { left: '38%', top: '15%', transform: 'rotate(-2.9deg)' } },
  { zIndex: 60, style: { left: '0%', top: '32%', transform: 'rotate(1.1deg)' } },
  { zIndex: 70, style: { left: '54%', top: '28%', transform: 'rotate(-0.9deg)' } },
  { zIndex: 80, style: { left: '67%', top: '38%', transform: 'rotate(2.7deg)' } },
  { zIndex: 90, style: { left: '11%', top: '44%', transform: 'rotate(-2.1deg)' } },
  { zIndex: 100, style: { left: '41%', top: '40%', transform: 'rotate(1.6deg)' } },
  { zIndex: 110, style: { left: '3%', bottom: '3%', transform: 'rotate(-1.2deg)' } },
  { zIndex: 120, style: { left: '46%', bottom: '2%', transform: 'rotate(2.2deg)' } },
] as const

function SkillMiniCard({
  skill,
  layout,
  delay,
}: {
  skill: SkillCardDef
  layout: (typeof CARD_LAYOUT)[number]
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card absolute w-[260px] overflow-hidden"
      style={{
        ...layout.style,
        zIndex: layout.zIndex,
        border: '1px solid rgba(255,255,255,0.09)',
      }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span
          className="h-5 w-0.5 shrink-0 rounded-full"
          style={{ background: skill.accentColor }}
          aria-hidden
        />
        <span className="min-w-0 truncate text-[10px] font-semibold text-white/70">{skill.name}</span>
      </div>

      <div
        className="px-3 py-2.5"
        style={{ fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace" }}
      >
        {skill.lines.map((line, i) => (
          <div
            key={line.raw}
            style={{ display: 'flex', gap: 8, height: 16, lineHeight: '16px', fontSize: 10 }}
          >
            <span style={{ width: 14, textAlign: 'right', flexShrink: 0, color: C.lineNum, fontSize: 9 }}>
              {i + 1}
            </span>
            <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{line.node}</span>
          </div>
        ))}
      </div>

      <div
        className="flex flex-wrap gap-1 px-3 pb-2.5"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 7 }}
      >
        {skill.badges.map(({ label, color, bg, border }) => (
          <span
            key={label}
            className="rounded px-1.5 py-0.5 text-[8px] font-semibold"
            style={{ color, background: bg, border: `1px solid ${border}` }}
          >
            {label}
          </span>
        ))}
      </div>
    </motion.div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export function MarketingSkillStackMockup() {
  return (
    <FeatureFloatingMockShell className="!h-[480px] overflow-hidden">
      <div className="relative h-full w-full">
        {SKILLS.map((skill, i) => (
          <SkillMiniCard
            key={skill.name}
            skill={skill}
            layout={CARD_LAYOUT[i]!}
            delay={i * STAGGER_S}
          />
        ))}
      </div>
    </FeatureFloatingMockShell>
  )
}

```
$body_c_50$, $body_ct_50$text/markdown$body_ct_50$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_51$references/type6-components/MetaAdsInstagramFeedPreview.md$body_fp_51$, $body_c_51$# MetaAdsInstagramFeedPreview

> Artifact preview (ad / funnel / email); use as slide body.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/capabilities-carousel-previews/MetaAdsInstagramFeedPreview.tsx`
- Website source: `apps/website/src/components/marketing/capabilities-carousel-previews/MetaAdsInstagramFeedPreview.tsx`
- Import alias: `@/components/marketing/capabilities-carousel-previews/MetaAdsInstagramFeedPreview`

## Props

_No explicit Props interface — see the source signature below._

## Usage (slide body)

```tsx
// Inside a SocialCreative slide the component is embedded at the canvas scale.
// Keep the component's own sizing and wrap it in a container that matches the
// carousel canvas (1080 x 1350 for type 6).
export function SocialCreative({ width, height }) {
  return (
    <div style={{ width, height, background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: width * 0.92 }}>
        {/* Paste the component JSX here, 1:1 from the source below. */}
      </div>
    </div>
  );
}
```


## Source

```tsx
import { CAPABILITIES_META_AD_CREATIVE_SRC } from './constants'

/**
 * Instagram feed sponsored post — full-bleed inside the capabilities carousel slot (same pattern as other
 * previews). Mirrors Studio `AdPreview` `IgFeed`. Square creative matches Missions social deliverable asset.
 */
export function MetaAdsInstagramFeedPreview() {
  const username = 'vibey.im'
  const primaryText =
    "Stop bleeding leads on cold traffic. Book a 15-min pipeline audit — we'll map the exact funnel gaps costing you revenue every month."

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch',
        boxSizing: 'border-box',
        background: '#fff',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            padding: 2,
            background:
              'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
            flexShrink: 0,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'linear-gradient(145deg, #10B981 0%, #047857 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            V
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#262626' }}>{username}</span>
            <span
              style={{
                display: 'flex',
                width: 16,
                height: 16,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                background: '#0095f6',
                color: '#fff',
                flexShrink: 0,
              }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                aria-hidden
              >
                <path d="M5 12l5 5L19 7" />
              </svg>
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#8e8e8e' }}>Sponsored</div>
        </div>
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="#262626"
          aria-hidden
          style={{ flexShrink: 0 }}
        >
          <circle cx="12" cy="6" r="1.75" />
          <circle cx="12" cy="12" r="1.75" />
          <circle cx="12" cy="18" r="1.75" />
        </svg>
      </div>

      <div
        style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', background: '#000' }}
      >
        <img
          src={CAPABILITIES_META_AD_CREATIVE_SRC}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          decoding="async"
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fff',
            padding: '10px 14px',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0095f6' }}>Learn more</span>
          <span style={{ fontSize: 18, fontWeight: 400, color: '#0095f6', lineHeight: 1 }}>
            {'\u203a'}
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#262626"
            strokeWidth="1.5"
            aria-hidden
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#262626"
            strokeWidth="1.5"
            aria-hidden
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#262626"
            strokeWidth="1.5"
            aria-hidden
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </div>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#262626"
          strokeWidth="1.5"
          aria-hidden
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </div>

      <div style={{ padding: '0 12px 6px', fontSize: 14, fontWeight: 600, color: '#262626' }}>
        1,515 likes
      </div>

      <div style={{ padding: '0 12px 14px', fontSize: 14, lineHeight: 1.38, color: '#262626' }}>
        <span style={{ fontWeight: 600 }}>{username}</span> {primaryText}
      </div>
    </div>
  )
}

```
$body_c_51$, $body_ct_51$text/markdown$body_ct_51$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_52$references/type6-components/NavControls.md$body_fp_52$, $body_c_52$# NavControls

> Product component; reuse verbatim in the slide TSX for 1:1 website fidelity.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/brain-app/NavControls.tsx`
- Website source: `apps/website/src/components/marketing/brain-app/NavControls.tsx`
- Import alias: `@/components/marketing/brain-app/NavControls`

## Props

```ts
interface NavControlsProps {
  onCenter: () => void
  onOrganize: () => void
}
```

## Usage (slide body)

```tsx
// Inside a SocialCreative slide the component is embedded at the canvas scale.
// Keep the component's own sizing and wrap it in a container that matches the
// carousel canvas (1080 x 1350 for type 6).
export function SocialCreative({ width, height }) {
  return (
    <div style={{ width, height, background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: width * 0.92 }}>
        {/* Paste the component JSX here, 1:1 from the source below. */}
      </div>
    </div>
  );
}
```

## Non-Tailwind classes referenced

These must exist in the final stylesheet or be replaced with inline styles when rendering inside a carousel slide:

- `icon-xs`
- `surface-card`

## Source

```tsx
'use client'

/**
 * Ported from apps/web NavControls — marketing: no zoom buttons (wheel + center / organize only).
 */

import { Brain, Crosshair } from 'lucide-react'

interface NavControlsProps {
  onCenter: () => void
  onOrganize: () => void
}

export default function NavControls({ onCenter, onOrganize }: NavControlsProps) {
  const btnClass =
    'w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-hover-subtle transition-colors rounded'

  return (
    <div className="bottom-24 left-4 absolute z-50">
      <div className="surface-card border-border flex flex-col overflow-hidden rounded-lg border">
        <button type="button" onClick={onCenter} className={btnClass} title="Center">
          <Crosshair className="icon-xs" />
        </button>

        <div className="border-border border-t" />

        <button type="button" onClick={onOrganize} className={btnClass} title="Organize">
          <Brain className="icon-xs" />
        </button>
      </div>
    </div>
  )
}

```
$body_c_52$, $body_ct_52$text/markdown$body_ct_52$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_53$references/type6-components/PresentationDeckPreview.md$body_fp_53$, $body_c_53$# PresentationDeckPreview

> Artifact preview (ad / funnel / email); use as slide body.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/capabilities-carousel-previews/PresentationDeckPreview.tsx`
- Website source: `apps/website/src/components/marketing/capabilities-carousel-previews/PresentationDeckPreview.tsx`
- Import alias: `@/components/marketing/capabilities-carousel-previews/PresentationDeckPreview`

## Props

_No explicit Props interface — see the source signature below._

## Usage (slide body)

```tsx
// Inside a SocialCreative slide the component is embedded at the canvas scale.
// Keep the component's own sizing and wrap it in a container that matches the
// carousel canvas (1080 x 1350 for type 6).
export function SocialCreative({ width, height }) {
  return (
    <div style={{ width, height, background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: width * 0.92 }}>
        {/* Paste the component JSX here, 1:1 from the source below. */}
      </div>
    </div>
  );
}
```


## Source

```tsx
/**
 * Presentation / Lead Magnet — cover slide scaled to the preview card (carousel ~400×580).
 * Uses container query units so PIPELINE hero + stat row fit without cropping.
 */
export function PresentationDeckPreview() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: '#030305',
        fontFamily: '"Inter", system-ui, sans-serif',
        containerType: 'inline-size',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          right: '-8%',
          width: '65%',
          height: '55%',
          background: 'radial-gradient(circle, rgba(56,189,248,0.14) 0%, transparent 70%)',
          filter: 'blur(36px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-15%',
          left: '-8%',
          width: '55%',
          height: '50%',
          background: 'radial-gradient(circle, rgba(236,72,153,0.1) 0%, transparent 70%)',
          filter: 'blur(36px)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: 'max(28px, 8cqi) max(28px, 8cqi)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 'max(8px, 5.5cqi)',
          width: 1,
          background: 'rgba(255,255,255,0.08)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 'max(8px, 5.5cqi)',
          width: 1,
          background: 'rgba(255,255,255,0.08)',
        }}
      />

      <div
        style={{
          position: 'relative',
          boxSizing: 'border-box',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 'max(10px, 2.8cqi) max(12px, 3.5cqi) max(12px, 3.2cqi)',
          gap: 'max(8px, 1.8cqi)',
          minHeight: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexShrink: 0,
            alignItems: 'center',
            justifyContent: 'flex-end',
            minWidth: 0,
          }}
        >
          <div
            style={{
              padding: 'max(4px, 0.8cqi) max(8px, 2cqi)',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 999,
              color: '#94A3B8',
              fontSize: 'max(0.58rem, min(1.25cqi + 0.28rem, 0.68rem))',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              backdropFilter: 'blur(10px)',
              flexShrink: 0,
            }}
          >
            Confidential
          </div>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 'max(6px, 1.5cqi)',
          }}
        >
          <div
            style={{
              color: '#38BDF8',
              fontWeight: 800,
              fontSize: 'max(0.6rem, min(1.6cqi + 0.32rem, 0.78rem))',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: 'max(6px, 1.2cqi)',
            }}
          >
            <span
              style={{ width: 'max(20px, 4cqi)', height: 2, background: '#38BDF8', flexShrink: 0 }}
            />
            <span style={{ lineHeight: 1.2 }}>The 2026 Strategy</span>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 'max(1.15rem, min(7.25cqi + 0.35rem, 2.35rem))',
              fontWeight: 900,
              color: '#fff',
              lineHeight: 1.03,
              letterSpacing: '-0.03em',
              textTransform: 'uppercase',
            }}
          >
            PIPELINE
            <br />
            <span style={{ color: 'transparent', WebkitTextStroke: '1px rgba(255,255,255,0.28)' }}>
              ARCHITECTURE
            </span>
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg, #38BDF8, #E879F9)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              BLUEPRINT.
            </span>
          </h1>
        </div>

        <div
          style={{
            flexShrink: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 'max(6px, 1.8cqi)',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 'max(12px, 3cqi)',
            padding: 'max(8px, 2.2cqi) max(8px, 2cqi)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
          }}
        >
          {[
            { metric: '42', label: 'B2B Case Studies', desc: 'Analyzed & Reverse-Engineered' },
            { metric: '06', label: 'Core Frameworks', desc: 'Ready-to-deploy systems' },
            { metric: '15', label: 'Copy Templates', desc: 'Funnels, Emails, Ads' },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                position: 'relative',
                minWidth: 0,
                paddingLeft: i !== 0 ? 'max(6px, 1.8cqi)' : 0,
                borderLeft: i !== 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              }}
            >
              <div
                style={{
                  fontSize: 'max(1rem, min(5.5cqi + 0.2rem, 1.65rem))',
                  fontWeight: 900,
                  color: '#fff',
                  lineHeight: 1,
                  marginBottom: 'max(4px, 0.6cqi)',
                }}
              >
                {item.metric}
              </div>
              <div
                style={{
                  fontSize: 'max(0.58rem, min(1.35cqi + 0.3rem, 0.72rem))',
                  fontWeight: 700,
                  color: '#E2E8F0',
                  marginBottom: 2,
                  lineHeight: 1.25,
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontSize: 'max(0.5rem, min(1.05cqi + 0.26rem, 0.62rem))',
                  color: '#64748B',
                  lineHeight: 1.35,
                }}
              >
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

```
$body_c_53$, $body_ct_53$text/markdown$body_ct_53$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_54$references/type6-components/ProofCarousel.md$body_fp_54$, $body_c_54$# ProofCarousel

> Horizontal scroller of product imagery or cards; use for a capability sweep.

## Location

- Web-library path: `product-video/src/web-library/components/feature-pages/ProofCarousel.tsx`
- Website source: `apps/website/src/components/feature-pages/ProofCarousel.tsx`
- Import alias: `@/components/feature-pages/ProofCarousel`

## Props

_No explicit Props interface — see the source signature below._

## Usage (slide body)

```tsx
// Inside a SocialCreative slide the component is embedded at the canvas scale.
// Keep the component's own sizing and wrap it in a container that matches the
// carousel canvas (1080 x 1350 for type 6).
export function SocialCreative({ width, height }) {
  return (
    <div style={{ width, height, background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: width * 0.92 }}>
        {/* Paste the component JSX here, 1:1 from the source below. */}
      </div>
    </div>
  );
}
```

## Non-Tailwind classes referenced

These must exist in the final stylesheet or be replaced with inline styles when rendering inside a carousel slide:

- `[&::-webkit-scrollbar]:hidden`
- `[-ms-overflow-style:none]`
- `[scrollbar-width:none]`
- `body-2`
- `body-3`
- `body-4`
- `glass-card`
- `section-padding`
- `shrink-0`
- `site-container`

## Source

```tsx
'use client'

import { AnimateOnScroll } from '@/components/AnimateOnScroll'

export function ProofCarousel(props: {
  title: string
  quotes: { quote: string; name: string; role: string }[]
}) {
  return (
    <section className="section-padding relative">
      <AnimateOnScroll>
        <div className="site-container">
          <h2 className="h2 mb-8 tracking-tight text-white">{props.title}</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {props.quotes.map((q) => (
              <blockquote
                key={q.name}
                className="glass-card border-section min-w-[280px] max-w-sm shrink-0 rounded-2xl border p-6 md:min-w-[320px]"
              >
                <p className="text-text-muted body-2 mb-4 leading-relaxed">
                  &ldquo;{q.quote}&rdquo;
                </p>
                <footer>
                  <p className="body-3 font-semibold text-white">{q.name}</p>
                  <p className="text-color-dim body-4">{q.role}</p>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </AnimateOnScroll>
    </section>
  )
}

```
$body_c_54$, $body_ct_54$text/markdown$body_ct_54$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_55$references/type6-components/SequenceEmailPreview.md$body_fp_55$, $body_c_55$# SequenceEmailPreview

> Artifact preview (ad / funnel / email); use as slide body.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/capabilities-carousel-previews/SequenceEmailPreview.tsx`
- Website source: `apps/website/src/components/marketing/capabilities-carousel-previews/SequenceEmailPreview.tsx`
- Import alias: `@/components/marketing/capabilities-carousel-previews/SequenceEmailPreview`

## Props

_No explicit Props interface — see the source signature below._

## Usage (slide body)

```tsx
// Inside a SocialCreative slide the component is embedded at the canvas scale.
// Keep the component's own sizing and wrap it in a container that matches the
// carousel canvas (1080 x 1350 for type 6).
export function SocialCreative({ width, height }) {
  return (
    <div style={{ width, height, background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: width * 0.92 }}>
        {/* Paste the component JSX here, 1:1 from the source below. */}
      </div>
    </div>
  );
}
```


## Source

```tsx
export function SequenceEmailPreview() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: '#F6F8FC',
        fontFamily: '"Google Sans", "Roboto", "Arial", sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Gmail top bar */}
        <div
          style={{
            height: 48,
            background: '#F6F8FC',
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            gap: 16,
            borderBottom: '1px solid #E8EAED',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 16 }}>
              <div style={{ height: 2, background: '#5F6368', borderRadius: 1 }} />
              <div style={{ height: 2, background: '#5F6368', borderRadius: 1 }} />
              <div style={{ height: 2, background: '#5F6368', borderRadius: 1 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src="/Integrations/Gmail.png"
                  alt="Gmail"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  decoding="async"
                />
              </div>
              <span style={{ fontSize: 18, color: '#5F6368', fontWeight: 400 }}>Gmail</span>
            </div>
          </div>
          <div style={{ flex: 1, maxWidth: 300, marginLeft: 16 }}>
            <div
              style={{
                background: '#EAF1FB',
                borderRadius: 6,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                gap: 8,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#5F6368">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
              <span style={{ fontSize: 13, color: '#5F6368' }}>Search mail</span>
            </div>
          </div>
        </div>

        {/* Content area */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Sidebar */}
          <div
            style={{ width: 140, padding: '8px', flexShrink: 0 }}
            className="hidden min-[400px]:block"
          >
            <div
              style={{
                background: '#C2E7FF',
                borderRadius: 12,
                padding: '6px 12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#001D35">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#001D35' }}>Compose</span>
            </div>
            {[
              { label: 'Inbox', count: '3', active: true },
              { label: 'Starred', count: '' },
              { label: 'Sent', count: '' },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 12px',
                  height: 28,
                  borderRadius: 14,
                  background: item.active ? '#D3E3FD' : 'transparent',
                  marginBottom: 2,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: item.active ? '#001D35' : '#444746',
                    fontWeight: item.active ? 700 : 400,
                  }}
                >
                  {item.label}
                </span>
                {item.count && (
                  <span
                    style={{
                      fontSize: 11,
                      color: item.active ? '#001D35' : '#444746',
                      fontWeight: 500,
                    }}
                  >
                    {item.count}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Email view */}
          <div
            style={{
              flex: 1,
              background: '#fff',
              borderRadius: '12px 0 0 0',
              padding: '20px 24px',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <h1 style={{ fontSize: 18, fontWeight: 400, color: '#1F1F1F', flex: 1 }}>
                Last email. One question.
              </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#1A73E8',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                V
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1F1F1F' }}>
                    Vibey Team
                  </span>
                  <span style={{ fontSize: 11, color: '#5F6368', marginLeft: 'auto' }}>
                    10:42 AM
                  </span>
                </div>
                <span style={{ fontSize: 11, color: '#5F6368' }}>to me</span>
              </div>
            </div>

            <div style={{ fontSize: 13, color: '#1F1F1F', lineHeight: 1.6 }}>
              <p>Hey Sarah,</p>
              <p style={{ marginTop: 12 }}>This is the last email in this series.</p>
              <p style={{ marginTop: 12 }}>
                I&apos;m not going to hit you with another story or another strategy breakdown. Just
                one question:
              </p>
              <p style={{ marginTop: 12, fontWeight: 700, fontSize: 14 }}>
                A year from now, what do you want your business to look like?
              </p>
              <p style={{ marginTop: 12 }}>
                Alex wanted to stop trading time for money. He&apos;s at <strong>$67K/month</strong>
                .
              </p>
              <p style={{ marginTop: 8 }}>
                Maya wanted to break through the $10K ceiling. She&apos;s at <strong>$92K</strong>.
              </p>
              <p style={{ marginTop: 16 }}>
                None of them had a secret. They just got in the right room and did the work.
              </p>
              <p style={{ marginTop: 16, fontWeight: 600 }}>
                If you want to be in that room, the door is open.
              </p>
              <p style={{ marginTop: 20, color: '#666', fontSize: 12 }}>
                Talk soon,
                <br />
                <br />
                — The Vibey Team
                <br />
                <span style={{ fontSize: 11, color: '#999' }}>Vibey · AI-powered marketing</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

```
$body_c_55$, $body_ct_55$text/markdown$body_ct_55$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
