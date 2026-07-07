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
