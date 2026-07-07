import React from 'react';

/**
 * A rendered funnel page — styled like a real lead-magnet landing page
 * that Vibey's funnel artifact would generate. Inter font, dark theme.
 */
export const FunnelPage: React.FC = () => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'radial-gradient(1200px 600px at 50% 0%, #1a2e27 0%, #0f1116 60%)',
        color: '#E5E7EB',
        padding: '40px 32px',
        fontFamily: "'Inter', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignSelf: 'flex-start',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          borderRadius: 9999,
          background: 'rgba(16,185,129,0.12)',
          border: '1px solid rgba(16,185,129,0.3)',
          color: '#6EE7B7',
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        FREE COACHING GUIDE
      </div>
      <h1
        style={{
          margin: 0,
          fontSize: 38,
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          color: '#F5F5F5',
        }}
      >
        The 5-Step Framework
        <br />
        To Scale Coaching
      </h1>
      <p
        style={{
          margin: 0,
          fontSize: 15,
          lineHeight: 1.6,
          color: '#A3A3A3',
          maxWidth: 520,
        }}
      >
        The exact system our top clients use to go from 1:1 sessions to
        $20k/month group programs — without burnout.
      </p>
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          marginTop: 8,
          padding: 8,
          borderRadius: 12,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          maxWidth: 480,
        }}
      >
        <div
          style={{
            flex: 1,
            padding: '10px 14px',
            fontSize: 14,
            color: '#6B7280',
          }}
        >
          your@email.com
        </div>
        <div
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: 600,
            boxShadow: '0 4px 16px rgba(16,185,129,0.35)',
          }}
        >
          Get the Guide
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 16,
          marginTop: 8,
          fontSize: 12,
          color: '#6B7280',
        }}
      >
        <span>✓ 28-page PDF</span>
        <span>✓ Instant access</span>
        <span>✓ Free forever</span>
      </div>
    </div>
  );
};
