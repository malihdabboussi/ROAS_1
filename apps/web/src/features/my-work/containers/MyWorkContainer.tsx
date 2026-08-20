'use client'

import { PageSkeleton } from '@/components/ui/feedback/ListSkeleton'
import { InboxListView } from '@/features/inbox/components/InboxListView'
import { YourTurnSubtaskDrawer } from '@/features/spaces/components/your-turn/YourTurnSubtaskDrawer'
import { useYourTurnFeed } from '@/features/spaces/hooks/use-your-turn-feed'

export function MyWorkContainer() {
  const {
    loading,
    items,
    activeSubtask,
    setActiveSubtask,
    reload,
    openItem,
    acceptSuggestion,
    dismissSuggestion,
  } = useYourTurnFeed()

  if (loading) {
    return (
      <div className="h-full min-h-0">
        <PageSkeleton label="Loading your work…" />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <InboxListView
        items={items}
        onOpen={openItem}
        onAccept={acceptSuggestion}
        onDismiss={dismissSuggestion}
      />
      {activeSubtask && (
        <YourTurnSubtaskDrawer
          item={activeSubtask}
          onClose={() => setActiveSubtask(null)}
          onActionCompleted={() => {
            setActiveSubtask(null)
            void reload()
          }}
        />
      )}
    </div>
  )
}
