'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { fetchSharedSpace, type SharedSpaceResponse } from '../../services/spaces.service'
import type { SpaceItem } from '../../types'
import { formatSpaceTaskStatusLabel } from '../space-item-values'

function formatDate(value: string | null): string {
  if (!value) return '—'
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return '—'
  }
}

function isDocItem(item: SpaceItem): boolean {
  return (item.custom_data as Record<string, unknown> | undefined)?._view_type === 'doc'
}

export function SharedSpaceView({ token }: { token: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<SharedSpaceResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchSharedSpace(token)
        if (!cancelled) setPayload(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Invalid link')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [token])

  const tasks = useMemo(
    () => (payload?.items ?? []).filter((item) => !isDocItem(item)),
    [payload?.items],
  )
  const docs = useMemo(
    () => (payload?.items ?? []).filter((item) => isDocItem(item)),
    [payload?.items],
  )

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--color-border)] px-4 py-3">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <span className="text-sm font-semibold tracking-wide">VIBEY</span>
          <Link
            href="/login"
            className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        {loading ? (
          <div className="py-spacing-12 flex flex-col items-center justify-center">
            <VibeyLoadingOrb text="Loading shared space…" state="processing" size="lg" />
          </div>
        ) : error || !payload ? (
          <div className="rounded-lg border border-[var(--color-border)] p-4">
            <h1 className="text-lg font-semibold uppercase tracking-wide">Link unavailable</h1>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              This link is invalid or has expired.
            </p>
          </div>
        ) : (
          <section className="space-y-8">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
                Shared space
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">{payload.space.title}</h1>
              <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                {tasks.length} task{tasks.length === 1 ? '' : 's'} · {docs.length} doc
                {docs.length === 1 ? '' : 's'}
              </p>
            </div>

            {tasks.length > 0 && (
              <div>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                  Tasks
                </h2>
                <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
                  <div className="grid grid-cols-[1.6fr_0.7fr_1fr] border-b border-[var(--color-border)] bg-[var(--color-secondary)] px-4 py-2 text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
                    <span>Title</span>
                    <span>Status</span>
                    <span>Due</span>
                  </div>
                  <div className="divide-y divide-[var(--color-border)]">
                    {tasks.map((item) => {
                      const itemTitle = item.title || 'Untitled'
                      const hasPublicItemLink = Boolean(item.share_link_enabled && item.share_token)
                      return (
                        <div
                          key={item.id}
                          className="grid grid-cols-[1.6fr_0.7fr_1fr] items-center px-4 py-2.5 text-sm"
                        >
                          <span className="truncate">
                            {hasPublicItemLink ? (
                              <Link
                                href={`/shared/item/${item.share_token}`}
                                className="hover:underline"
                              >
                                {itemTitle}
                              </Link>
                            ) : (
                              itemTitle
                            )}
                          </span>
                          <span>
                            <span className="inline-flex rounded-full bg-[var(--color-secondary)] px-2 py-0.5 text-xs text-[var(--color-muted-foreground)]">
                              {formatSpaceTaskStatusLabel(item.status)}
                            </span>
                          </span>
                          <span className="text-[var(--color-muted-foreground)]">
                            {formatDate(item.due_date)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {docs.length > 0 && (
              <div>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                  Docs
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {docs.map((item) => {
                    const docTitle = item.title || 'Untitled'
                    const hasPublicItemLink = Boolean(item.share_link_enabled && item.share_token)
                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-[var(--color-border)] p-4 transition-colors hover:bg-[var(--color-hover-subtle)]"
                      >
                        <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
                          Doc
                        </p>
                        <p className="mt-1 truncate text-sm font-medium">
                          {hasPublicItemLink ? (
                            <Link
                              href={`/shared/item/${item.share_token}`}
                              className="hover:underline"
                            >
                              {docTitle}
                            </Link>
                          ) : (
                            docTitle
                          )}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {tasks.length === 0 && docs.length === 0 && (
              <div className="rounded-xl border border-[var(--color-border)] p-6 text-sm text-[var(--color-muted-foreground)]">
                Nothing has been shared in this space yet.
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
