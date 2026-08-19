import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="bg-background gap-spacing-4 flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <p className="title-h2 text-muted-foreground/40 font-semibold">404</p>
      <div className="gap-spacing-1 flex flex-col">
        <h1 className="title-h5 text-foreground">PAGE NOT FOUND</h1>
        <p className="body-2 text-muted-foreground max-w-sm">
          This page doesn&apos;t exist or may have been moved.
        </p>
      </div>
      <Link href="/home" className="button-default button-glass-primary body-3">
        Back to Home
      </Link>
    </main>
  )
}
