import type { CSSProperties, ReactNode } from 'react'

/**
 * Design exception: these are fixed screenshot-style miniatures, not live app chrome.
 * Inline dimensions and fixed colors keep the tiny thumbnail drawings stable at 80x56px.
 */
export const MOCKUP_COLORS = {
  deep: '#161616',
  surface: '#202020',
  subtle: 'rgba(255,255,255,0.03)',
  glass: 'rgba(255,255,255,0.08)',
  glassBright: 'rgba(255,255,255,0.1)',
  textPri: '#f5f5f5',
  textMut: '#a3a3a3',
  textDim: '#555',
  em: 'rgb(52,211,153)',
  pu: 'rgb(147,51,234)',
  puL: 'rgb(199,126,255)',
  bl: '#3b82f6',
  dotR: '#ff5f57',
  dotY: '#febc2e',
  dotG: '#10b981',
} as const

export const mockupShellStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  borderRadius: 'inherit',
  border: `1px solid ${MOCKUP_COLORS.glassBright}`,
  background: MOCKUP_COLORS.deep,
  display: 'flex',
  flexDirection: 'column',
  fontSize: 0,
}

export function MockupChrome({ url }: { url: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        background: MOCKUP_COLORS.surface,
        borderBottom: `1px solid ${MOCKUP_COLORS.glass}`,
        padding: '2px 4px',
      }}
    >
      <div style={{ display: 'flex', gap: 1.5 }}>
        {[MOCKUP_COLORS.dotR, MOCKUP_COLORS.dotY, MOCKUP_COLORS.dotG].map((c) => (
          <span key={c} style={{ height: 3, width: 3, borderRadius: '50%', background: c }} />
        ))}
      </div>
      <div
        style={{
          flex: 1,
          borderRadius: 2,
          background: 'rgba(255,255,255,0.06)',
          padding: '1px 3px',
          textAlign: 'center',
          fontSize: 4,
          fontWeight: 500,
          color: MOCKUP_COLORS.textDim,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        {url}
      </div>
    </div>
  )
}

export function MockupRow({
  icon,
  label,
  accent,
  badge,
}: {
  icon: ReactNode
  label: string
  accent?: string
  badge?: string
}) {
  const badgeColor = accent ?? MOCKUP_COLORS.em

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        borderRadius: 3,
        border: `0.5px solid ${MOCKUP_COLORS.glass}`,
        background: MOCKUP_COLORS.subtle,
        padding: '2px 3px',
      }}
    >
      {icon}
      <span
        style={{
          flex: 1,
          fontSize: 4.5,
          fontWeight: 500,
          color: MOCKUP_COLORS.textPri,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      {badge && (
        <span
          style={{
            fontSize: 3.5,
            fontWeight: 700,
            color: badgeColor,
            background: `${badgeColor}1a`,
            borderRadius: 99,
            padding: '0.5px 2px',
            border: `0.5px solid ${badgeColor}44`,
          }}
        >
          {badge}
        </span>
      )}
    </div>
  )
}

export function MockupDot({ color, size = 4 }: { color: string; size?: number }) {
  return (
    <span
      style={{ width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0 }}
    />
  )
}

export function MockupIcon({ d, color, size = 6 }: { d: string; color: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  )
}

export const MOCKUP_ICONS = {
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  zap: 'M13 2L3 14h9l-1 10 10-12h-9l1-10z',
  brain:
    'M12 2a5 5 0 0 1 5 5c0 .5-.1 1-.2 1.4A5 5 0 0 1 19 13a5 5 0 0 1-3.5 4.8V22h-7v-4.2A5 5 0 0 1 5 13a5 5 0 0 1 2.2-4.6A5 5 0 0 1 7 7a5 5 0 0 1 5-5z',
  building: 'M6 22V2h12v20M6 12H2v10h4M18 12h4v10h-4M10 6h4M10 10h4M10 14h4M10 18h4',
  target:
    'M12 12m-10 0a10 10 0 1 0 20 0 10 10 0 1 0-20 0M12 12m-6 0a6 6 0 1 0 12 0 6 6 0 1 0-12 0M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0',
  layers: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
}
