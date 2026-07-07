'use client'

import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { YourTurnSubtaskDrawer } from '@/features/spaces/components/your-turn/YourTurnSubtaskDrawer'
import { useYourTurnFeed } from '@/features/spaces/hooks/use-your-turn-feed'
import { InboxListView } from '../components/InboxListView'

export function InboxContainer() {
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
      <div className="flex h-full min-h-0 items-center justify-center">
        <VibeyLoadingOrb state="processing" size="lg" text="Loading inbox…" />
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
