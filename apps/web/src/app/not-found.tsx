import type { Metadata } from 'next'
import { Compass } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Page not found | ROAS' }

/**
 * Branded 404. Without this file Next renders its default black "404 | This page could
 * not be found." screen, which ignores the app theme and offers no way back.
 */
export default function NotFound() {
  return (
    <main className="bg-background flex min-h-dvh items-center justify-center p-spacing-6">
      <div className="max-w-md text-center">
        <div className="border-border bg-muted mx-auto mb-spacing-6 flex h-spacing-14 w-spacing-14 items-center justify-center rounded-full border">
          <Compass aria-hidden="true" className="icon-md text-muted-foreground" />
        </div>
        <h1 className="title-h3 text-foreground font-semibold">PAGE NOT FOUND</h1>
        <p className="body-2 text-muted-foreground mt-spacing-2">
          That link doesn&apos;t go anywhere anymore. It may have moved, or you may not have
          access to it.
        </p>
        <div className="mt-spacing-6 flex flex-col gap-spacing-3 sm:flex-row sm:justify-center">
          <Link href="/home" className="button-default button-glass-primary">
            <span className="relative z-10">Go home</span>
          </Link>
          <Link href="/home/meetings" className="button-default button-glass-neutral">
            <span className="relative z-10">Open Meetings</span>
          </Link>
        </div>
      </div>
    </main>
  )
}
