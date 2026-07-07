import type { Metadata } from 'next'

// External/public shared space pages are paused while sharing is being re-scoped
// to internal team/workspace access only.
// See `.documentation/sharing/external-sharing-paused.md`.
// import { SharedSpaceItemsView } from '@/features/spaces/components/shared/SharedSpaceItemsView'

export const metadata: Metadata = {
  title: 'Shared Space | Vibey',
}

export default async function SharedSpacePage({
  params: _params,
}: {
  params: Promise<{ token: string }>
}) {
  // const { token } = await params
  // return <SharedSpaceItemsView token={token} />
  return (
    <main className="px-spacing-6 py-spacing-10 mx-auto w-full max-w-2xl">
      <div className="p-spacing-6 rounded-xl border border-[var(--color-border)]">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
          SHARING PAUSED
        </p>
        <h1 className="mt-spacing-2 text-xl font-semibold text-[var(--foreground)]">
          Public space links are paused
        </h1>
        <p className="body-3 mt-spacing-2 text-[var(--color-muted-foreground)]">
          Vibey is moving sharing to internal team access first.
        </p>
      </div>
    </main>
  )
}
