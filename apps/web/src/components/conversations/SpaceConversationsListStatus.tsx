'use client'

import { MessageSquare } from 'lucide-react'

export function SpaceConversationsListStatus({ loading }: { loading: boolean }) {
  if (loading) {
    return (
      <div
        className="gap-spacing-2 px-spacing-1 py-spacing-2 flex flex-col"
        role="status"
        aria-label="Loading conversations"
      >
        {[82, 64, 91, 73, 58].map((width, index) => (
          <div key={index} className="gap-spacing-2 px-spacing-1 flex items-center">
            <div className="bg-secondary icon-sm shrink-0 animate-pulse rounded-full" />
            <div
              className="bg-secondary h-3 animate-pulse rounded"
              style={{ width: `${width}%`, animationDelay: `${index * 120}ms` }}
            />
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="p-spacing-4 text-center">
      <div className="gap-spacing-1 flex items-center justify-center">
        <MessageSquare className="text-muted-foreground icon-sm shrink-0" aria-hidden />
        <p className="body-4 whitespace-nowrap font-semibold">No conversations yet</p>
      </div>
      <p className="body-4 text-muted-foreground mt-spacing-1">
        Start a chat and it will show up here.
      </p>
    </div>
  )
}
