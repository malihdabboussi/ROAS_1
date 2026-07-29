'use client'

import { SiteLogo } from '@/components/SiteLogo'

const APP_LOGIN_URL = 'https://app.vibey.im/login'

export function WaitlistJoinForm({
  onDone,
}: {
  initialNotes?: string
  onDone?: () => void
}) {
  return (
    <div className="text-center">
      <div className="mb-6">
        <SiteLogo forceDark className="mx-auto mb-3 !h-12" />
      </div>

      <h3 className="h4 mb-2 text-white">Get Early Access</h3>
      <p className="body-2 mb-1 text-white/60">
        Full platform access &middot; 19,400 credits/mo
      </p>
      <p className="body-3 mb-6 text-white/40">Cancel anytime. Billed monthly via Stripe.</p>

      <a
        href={APP_LOGIN_URL}
        className="body-3 mb-4 inline-block w-full rounded-xl px-4 py-3 font-semibold transition-opacity hover:opacity-90"
        style={{
          background:
            'linear-gradient(135deg, rgb(var(--accent-emerald-rgb) / 0.15) 0%, rgb(var(--accent-emerald-mid-rgb) / 0.22) 50%, rgb(var(--accent-emerald-rgb) / 0.12) 100%)',
          border: '1px solid rgb(var(--accent-emerald-rgb) / 0.25)',
          color: 'var(--text-primary)',
          fontWeight: 600,
        }}
      >
        Get Early Access — $97/mo
      </a>

      {onDone && (
        <button
          type="button"
          onClick={() => onDone()}
          className="body-3 w-full rounded-xl px-4 py-3 font-semibold text-white/50 transition-opacity hover:text-white/80"
        >
          Close
        </button>
      )}
    </div>
  )
}
