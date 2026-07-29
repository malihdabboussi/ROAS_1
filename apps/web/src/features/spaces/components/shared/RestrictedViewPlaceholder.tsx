import Link from 'next/link'

export function RestrictedViewPlaceholder(props: { viewLabel?: string }) {
  const label = props.viewLabel?.trim() ? props.viewLabel.trim() : 'This view'
  return (
    <div className="gap-spacing-4 px-spacing-6 py-spacing-10 flex min-h-[320px] flex-col items-center justify-center">
      <div className="card-glass px-spacing-6 py-spacing-8 max-w-md rounded-xl border border-[var(--color-border)] text-center">
        <p className="body-3 text-[var(--foreground)]">
          {label} is available after you sign in to ROAS.
        </p>
        <div className="mt-spacing-6 gap-spacing-2 flex flex-wrap items-center justify-center">
          <Link
            href="/login"
            className="button-glass-primary body-3 px-spacing-4 py-spacing-2 rounded-md"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
