import type { PlatformEmailConfig } from '../types/platform-email.types'

export function PlatformEmailStatus({ config }: { config: PlatformEmailConfig | null }) {
  if (!config?.domain && !config?.sender_email) {
    return (
      <p className="body-2 text-muted-foreground">
        Platform email is not configured. Add a sending domain and sender below.
      </p>
    )
  }
  return (
    <div className="gap-spacing-3 flex flex-wrap">
      <span className="px-spacing-3 py-spacing-1 body-3 rounded-full border border-[var(--border)]">
        Domain: <strong>{config.domain ?? '—'}</strong> ({config.domain_status ?? '—'})
      </span>
      <span className="px-spacing-3 py-spacing-1 body-3 rounded-full border border-[var(--border)]">
        Sender: <strong>{config.sender_email ?? '—'}</strong>{' '}
        {config.sender_verified ? '(verified)' : '(pending verification)'}
      </span>
    </div>
  )
}
