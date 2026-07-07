'use client'

import { useMemo } from 'react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { YourTurnCard } from '../components/your-turn/YourTurnCard'
import { YourTurnSubtaskDrawer } from '../components/your-turn/YourTurnSubtaskDrawer'
import { useYourTurnFeed } from '../hooks/use-your-turn-feed'

export function YourTurnContainer() {
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

  const empty = useMemo(() => !loading && items.length === 0, [loading, items.length])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb state="processing" size="lg" text="Loading your queue..." />
      </div>
    )
  }

  if (empty) {
    return (
      <div className="section-card p-spacing-6 text-center">
        <p className="body-2 text-foreground font-medium">Nothing waiting on you</p>
        <p className="body-3 text-muted-foreground mt-spacing-1">
          Vibey will ping you here the moment a teammate or mission needs your turn.
        </p>
      </div>
    )
  }

  return (
    <div className="gap-spacing-3 p-spacing-4 flex flex-col">
      {items.map((item) => (
        <YourTurnCard
          key={`${item.kind}:${item.id}`}
          item={item}
          onOpen={() => openItem(item)}
          onActionAccept={() => acceptSuggestion(item)}
          onActionDismiss={() => dismissSuggestion(item)}
        />
      ))}
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
