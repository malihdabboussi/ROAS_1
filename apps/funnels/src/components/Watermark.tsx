import { resolveMarketingSiteUrl } from '@/lib/platform-urls'

export function Watermark() {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 50,
      }}
    >
      <a
        href={resolveMarketingSiteUrl()}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          borderRadius: '9999px',
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #e5e5e5',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          textDecoration: 'none',
          transition: 'all 0.2s',
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 500, color: '#374151' }}>Made with</span>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            background: 'linear-gradient(to right, #9333ea, #ec4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Vibey
        </span>
      </a>
    </div>
  )
}
