import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: 'var(--background)' }}
    >
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-bold" style={{ color: 'var(--foreground)' }}>
          404
        </h1>
        <p className="text-lg" style={{ color: 'var(--muted-foreground)' }}>
          Hmm, couldn't find that page. Let me help you get back on track.
        </p>
        <Link
          href="/getting-started/what-is-vibey"
          className="nav-item-active mt-4 inline-block rounded-lg px-6 py-2.5 text-[14px] font-medium no-underline"
        >
          Back to docs
        </Link>
      </div>
    </div>
  )
}
