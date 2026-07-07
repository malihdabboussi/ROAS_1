import { useState } from 'react'
import { sendExtensionMessage } from '../../shared/chrome-utils'

type Props = {
  onConsented: () => void
  onDismiss: () => void
}

export function ConsentOnboarding({ onConsented, onDismiss }: Props) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const accept = async () => {
    setBusy(true)
    setErr(null)
    const res = await sendExtensionMessage<{ ok: boolean; consent_at?: string; error?: string }>({
      type: 'SET_CONSENT',
    })
    setBusy(false)
    if (!res.ok) {
      setErr(res.error ?? 'Failed to record consent')
      return
    }
    onConsented()
  }

  return (
    <div className="ext-stack">
      <div className="ext-muted-box text-center">
        <h2 className="body-1-medium" style={{ margin: 0 }}>
          Let Vibey stay logged in for you?
        </h2>
        <p className="body-3" style={{ margin: 'var(--spacing-2) 0 0' }}>
          So your agents can work across Instagram, TikTok, X, LinkedIn, YouTube, Facebook and
          Reddit — without you logging in every time.
        </p>
        <p className="body-3" style={{ margin: 'var(--spacing-2) 0 0' }}>
          Everything is encrypted before it leaves your browser. You can turn off any site, or
          wipe it all, anytime from Sessions.{' '}
          <button
            type="button"
            className="ext-link"
            onClick={() =>
              chrome.tabs.create({ url: 'https://docs.vibey.im/vibey-mini/what-it-does' })
            }
          >
            Learn more →
          </button>
        </p>
      </div>

      {err && (
        <div className="ext-muted-box body-3">
          <span className="badge-glass badge-glass-sm badge-glass-red">Error</span>
          <p style={{ margin: 'var(--spacing-3) 0 0' }}>{err}</p>
        </div>
      )}

      <button
        type="button"
        className="button-glass-accent w-full"
        onClick={() => void accept()}
        disabled={busy}
      >
        {busy ? 'Saving…' : 'Enable session saving'}
      </button>
      <button
        type="button"
        className="button-glass-neutral hover-bg-hover-subtle mt-spacing-2 w-full"
        onClick={onDismiss}
        disabled={busy}
      >
        Not now
      </button>
    </div>
  )
}
