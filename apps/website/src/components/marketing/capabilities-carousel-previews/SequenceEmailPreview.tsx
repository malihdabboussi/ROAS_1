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
                    ROAS Team
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
                — The ROAS Team
                <br />
                <span style={{ fontSize: 11, color: '#999' }}>ROAS · AI-powered marketing</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
