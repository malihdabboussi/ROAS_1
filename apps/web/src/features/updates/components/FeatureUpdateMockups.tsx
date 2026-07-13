'use client'

/**
 * Miniature mockup thumbnails for the Feature Updates panel (80×56px).
 * Uses fixed screenshot-style miniature drawing primitives for thumbnail stability.
 * Each mockup is a tiny browser-frame style illustration matching the website's dark/glass language.
 */
import { ORG_PUBLIC_URL_PREFIX } from '@/lib/org/org-public-url'
import {
  MOCKUP_COLORS as C,
  MockupChrome as Chrome,
  MockupDot as Dot,
  MockupIcon as Icon,
  MOCKUP_ICONS as ICONS,
  MockupRow as Row,
  mockupShellStyle as shell,
} from './feature-update-mockups/feature-update-mockup-primitives'

export function FeatureUpdateMockup({ title }: { title: string }) {
  const key = title.toLowerCase()

  if (key.includes('team')) return <TeamMockup />
  if (key.includes('skill')) return <SkillsMockup />
  if (key.includes('brain') || key.includes('knowledge')) return <BrainMockup />
  if (key.includes('organization')) return <OrgMockup />
  if (key.includes('campaign')) return <CampaignsMockup />
  if (key.includes('mission')) return <MissionControlMockup />

  return <GenericMockup />
}

/* ── Team ─────────────────────────────────────────────────────────── */
function TeamMockup() {
  return (
    <div style={shell}>
      <Chrome url="roas.io/team" />
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, padding: 2 }}>
        {[
          { l: 'Strategist', c: C.em },
          { l: 'Funnel', c: C.puL },
          { l: 'Copy', c: C.bl },
          { l: 'Ads', c: C.em },
        ].map((a) => (
          <div
            key={a.l}
            style={{
              borderRadius: 3,
              border: `0.5px solid ${C.glass}`,
              background: C.subtle,
              padding: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <Dot color={a.c} size={5} />
            <span style={{ fontSize: 4, fontWeight: 600, color: C.textPri }}>{a.l}</span>
            <span style={{ fontSize: 3, color: C.textDim }}>Active</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Skills ───────────────────────────────────────────────────────── */
function SkillsMockup() {
  return (
    <div style={shell}>
      <Chrome url="roas.io/skills" />
      <div
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '2px 3px' }}
      >
        <Row
          icon={<Icon d={ICONS.zap} color={C.em} size={5} />}
          label="Website Builder"
          badge="Active"
          accent={C.em}
        />
        <Row
          icon={<Icon d={ICONS.zap} color={C.bl} size={5} />}
          label="Email Sequence"
          badge="Active"
          accent={C.bl}
        />
        <Row
          icon={<Icon d={ICONS.zap} color={C.puL} size={5} />}
          label="Ad Copy"
          badge="Draft"
          accent={C.textDim}
        />
      </div>
    </div>
  )
}

/* ── Brain ─────────────────────────────────────────────────────────── */
function BrainMockup() {
  return (
    <div style={shell}>
      <Chrome url="roas.io/brain" />
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <svg width="56" height="36" viewBox="0 0 56 36">
          <defs>
            <radialGradient id="fub-g">
              <stop offset="0%" stopColor={`${C.pu}55`} />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          <circle cx="28" cy="18" r="16" fill="url(#fub-g)" />
          {[
            { x: 10, y: 8, c: C.em },
            { x: 22, y: 4, c: C.puL },
            { x: 38, y: 6, c: C.bl },
            { x: 46, y: 14, c: C.em },
            { x: 42, y: 28, c: C.puL },
            { x: 28, y: 32, c: C.bl },
            { x: 14, y: 26, c: C.em },
            { x: 6, y: 18, c: C.puL },
            { x: 28, y: 18, c: '#fff' },
          ].map((n, i) => (
            <g key={i}>
              <line
                x1="28"
                y1="18"
                x2={n.x}
                y2={n.y}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="0.4"
              />
              <circle
                cx={n.x}
                cy={n.y}
                r={i === 8 ? 2 : 1.2}
                fill={n.c}
                opacity={i === 8 ? 1 : 0.65}
              />
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

/* ── Organizations ────────────────────────────────────────────────── */
function OrgMockup() {
  return (
    <div style={shell}>
      <Chrome url={ORG_PUBLIC_URL_PREFIX} />
      <div style={{ flex: 1, display: 'flex', gap: 1, padding: 2 }}>
        <div
          style={{
            width: '28%',
            borderRadius: 3,
            border: `0.5px solid ${C.glass}`,
            background: 'rgba(255,255,255,0.02)',
            padding: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          {['Growth', 'Product'].map((w) => (
            <span key={w} style={{ fontSize: 3.5, color: C.textMut }}>
              {w}
            </span>
          ))}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {['Q1 Launch', 'Webinar', 'Partner'].map((c) => (
            <div
              key={c}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderRadius: 3,
                border: `0.5px solid ${C.glass}`,
                background: C.subtle,
                padding: '1.5px 3px',
              }}
            >
              <span style={{ fontSize: 4, color: C.textPri }}>{c}</span>
              <span style={{ fontSize: 3, color: C.em, fontWeight: 600 }}>Live</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Campaigns ────────────────────────────────────────────────────── */
function CampaignsMockup() {
  return (
    <div style={shell}>
      <Chrome url="roas.io/campaigns" />
      <div
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '2px 3px' }}
      >
        <Row icon={<Dot color={C.em} size={4} />} label="SaaS Launch" badge="Live" accent={C.em} />
        <Row
          icon={<Dot color={C.bl} size={4} />}
          label="Welcome Nurture"
          badge="Live"
          accent={C.bl}
        />
        <Row
          icon={<Dot color={C.puL} size={4} />}
          label="Partner Co-mktg"
          badge="Draft"
          accent={C.textDim}
        />
      </div>
    </div>
  )
}

/* ── Mission Control ──────────────────────────────────────────────── */
function MissionControlMockup() {
  return (
    <div style={shell}>
      <Chrome url="roas.io/missions" />
      <div
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '2px 3px' }}
      >
        {[
          { l: 'Q2 Landing', p: 85, c: C.em },
          { l: 'Research', p: 60, c: C.puL },
          { l: 'Ad Draft', p: 30, c: C.bl },
        ].map((m) => (
          <div
            key={m.l}
            style={{
              borderRadius: 3,
              border: `0.5px solid ${C.glass}`,
              background: C.subtle,
              padding: '2px 3px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
              <span style={{ fontSize: 4, fontWeight: 600, color: C.textPri }}>{m.l}</span>
              <span style={{ fontSize: 3.5, color: m.c, fontWeight: 600 }}>{m.p}%</span>
            </div>
            <div style={{ height: 1.5, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }}>
              <div
                style={{
                  height: '100%',
                  width: `${m.p}%`,
                  borderRadius: 99,
                  background: m.c,
                  opacity: 0.6,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Fallback ─────────────────────────────────────────────────────── */
function GenericMockup() {
  return (
    <div style={shell}>
      <Chrome url="roas.io" />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon d={ICONS.zap} color={C.em} size={10} />
      </div>
    </div>
  )
}
