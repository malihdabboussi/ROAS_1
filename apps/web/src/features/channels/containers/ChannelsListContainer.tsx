'use client'

import { ListSkeleton } from '@/components/ui/feedback/ListSkeleton'
import { useChannels } from '../hooks/use-channels'

export function ChannelsListContainer() {
  const { loading, error } = useChannels()

  return (
    <section className="bg-background flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <div className="p-spacing-6 flex min-h-0 flex-1 items-center justify-center">
        {loading ? (
          <div className="w-full max-w-md">
            <ListSkeleton rows={6} label="Loading…" />
          </div>
        ) : error ? (
          <p className="body-2 text-destructive">{error}</p>
        ) : (
          <p className="body-2 text-muted-foreground max-w-md text-center">
            Open <span className="text-foreground font-medium">Home</span> in the sidebar, then
            choose a channel under <span className="text-foreground font-medium">Channels</span>, or
            create one with the + next to the section title.
          </p>
        )}
      </div>
    </section>
  )
}
