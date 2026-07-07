/**
 * Beautifully constructed Social Post preview natively matching the 100% viewport.
 * Does not contain the word "funnel" so the user doesn't confuse it with the landing page.
 */
export function SocialPostPreview() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: '#0D0D0D',
        fontFamily: '"Inter", system-ui, sans-serif',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 85% 55% at 18% 12%, rgba(225,48,108,0.35) 0%, transparent 52%), radial-gradient(ellipse 70% 45% at 92% 88%, rgba(99,102,241,0.22) 0%, transparent 48%), radial-gradient(ellipse 60% 40% at 50% 50%, rgba(255,255,255,0.06) 0%, transparent 60%), linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.12) 40%, rgba(0,0,0,0.55) 100%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '32px 24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 32,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background:
                  'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#0D0D0D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ color: '#fff', fontSize: 14, fontWeight: 800 }}>V</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#F5F5F5' }}>vibey.im</div>
              <div style={{ fontSize: 10, color: '#888' }}>Sponsored</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{ width: 4, height: 4, borderRadius: '50%', background: '#888' }}
              />
            ))}
          </div>
        </div>

        <div
          style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
        >
          <h1
            style={{
              fontSize: 32,
              fontWeight: 900,
              color: '#fff',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              marginBottom: 20,
            }}
          >
            <span style={{ color: '#E1306C' }}>3 SECRETS</span> TO SCALING
            <br />
            B2B REVENUE IN 2026
          </h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { num: '01', text: 'Stop selling features. Sell the end state.' },
              { num: '02', text: 'Automate your outbound follow-ups.' },
              { num: '03', text: 'Turn happy customers into your best ads.' },
            ].map((item) => (
              <div key={item.num} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ color: '#E1306C', fontWeight: 800, fontSize: 14, paddingTop: 2 }}>
                  {item.num}
                </div>
                <div
                  style={{
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: 14,
                    fontWeight: 500,
                    lineHeight: 1.4,
                  }}
                >
                  {item.text}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 24 }}>
          <div style={{ width: 24, height: 4, borderRadius: 2, background: '#E1306C' }} />
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                alignSelf: 'center',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
