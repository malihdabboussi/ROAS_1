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
