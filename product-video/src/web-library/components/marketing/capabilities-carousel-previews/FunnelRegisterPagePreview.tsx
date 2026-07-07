/**
 * Funnel — opt-in landing page with hero, checklist, and registration form.
 * Matches funnel-builder skill output: premium TSX, theme-driven, conversion-focused.
 * Designed to fit 100% of the carousel card without downscaling.
 */
export function FunnelRegisterPagePreview() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: '#0A0A0A',
        fontFamily: '"Inter", system-ui, sans-serif',
        containerType: 'inline-size',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 95% 55% at 15% 0%, rgba(16,185,129,0.16) 0%, transparent 55%), radial-gradient(ellipse 70% 45% at 100% 100%, rgba(16,185,129,0.09) 0%, transparent 55%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          background: 'rgba(16,185,129,0.14)',
          borderBottom: '1px solid rgba(16,185,129,0.25)',
          padding: '8px 12px',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <span
          style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', flexShrink: 0 }}
        />
        <span
          style={{
            fontSize: 11,
            color: '#10B981',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          Live Training Event — April 16, 2026
        </span>
      </div>
      <div
        style={{
          position: 'relative',
          boxSizing: 'border-box',
          height: '100%',
          width: '100%',
          padding: 'max(14px, min(3.2cqi, 26px)) max(12px, min(2.8cqi, 22px))',
          paddingTop: 'calc(max(14px, min(3.2cqi, 26px)) + 36px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'max(14px, min(3cqi, 22px))',
          minHeight: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            gap: 'max(10px, min(2.4cqi, 18px))',
            minWidth: 0,
            flexShrink: 0,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 'max(1.65rem, min(8.25cqi + 0.5rem, 2.85rem))',
              fontWeight: 900,
              color: '#F5F5F5',
              lineHeight: 1.06,
              letterSpacing: '-0.03em',
              textTransform: 'uppercase',
            }}
          >
            STOP LOSING LEADS
            <br />
            ON <span style={{ color: '#10B981' }}>COLD TRAFFIC</span>
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 'max(0.875rem, min(2.35cqi + 0.5rem, 1.0625rem))',
              color: 'rgba(245,245,245,0.65)',
              lineHeight: 1.45,
              maxWidth: 'none',
            }}
          >
            The exact funnel system that helped 200+ founders build a self-running pipeline —
            without writing a single line of code.
          </p>
        </div>

        <div style={{ flexShrink: 0, width: '100%', minWidth: 0 }}>
          <div
            style={{
              background:
                'linear-gradient(145deg, rgba(20,20,20,0.95) 0%, rgba(12,12,12,0.98) 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: 'max(14px, min(3cqi, 22px))',
              borderRadius: 18,
              boxShadow: '0 24px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            <h2
              style={{
                fontSize: 'max(0.75rem, min(1.8cqi + 0.45rem, 0.9rem))',
                fontWeight: 800,
                color: '#F5F5F5',
                margin: '0 0 max(10px, min(1.8cqi, 14px))',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              CLAIM YOUR SPOT
            </h2>
            {['Work Email', 'Company'].map((label) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: 'rgba(245,245,245,0.45)',
                    marginBottom: 7,
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    fontWeight: 600,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    height: 48,
                    background: '#141414',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10,
                  }}
                />
              </div>
            ))}
            <div
              style={{
                marginTop: 18,
                background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)',
                color: '#fff',
                textAlign: 'center',
                padding: 'max(12px, min(2cqi, 16px)) 12px',
                fontWeight: 800,
                fontSize: 'max(0.78rem, min(1.5cqi + 0.48rem, 0.88rem))',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                borderRadius: 12,
                boxShadow: '0 8px 24px rgba(16,185,129,0.35)',
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
