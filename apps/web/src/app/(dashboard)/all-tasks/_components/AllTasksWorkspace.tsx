'use client'

import { useState } from 'react'
import { AllTasksBoard } from '@/features/all-tasks/components/AllTasksBoard'
import { HomeTaskDetailHost } from '@/features/home/components/HomeTaskDetailHost'
import { useHomeFeedOpen } from '@/features/home/hooks/use-home-feed-open'
import { taskRollupToYourTurnItem } from '@/lib/tasks'

export function AllTasksWorkspace() {
  const [reloadToken, setReloadToken] = useState(0)
  const { activeYourTurnItem, openYourTurnItem, closeYourTurnItem } = useHomeFeedOpen()

  return (
    <main className="flex min-h-0 flex-1">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <AllTasksBoard
          onOpenItem={(item) => void openYourTurnItem(taskRollupToYourTurnItem(item))}
          reloadToken={reloadToken}
        />
      </div>
      {activeYourTurnItem ? (
        <aside className="border-border min-w-0 flex-1 border-l">
          <HomeTaskDetailHost
            item={activeYourTurnItem}
            presentation="panel"
            onClose={closeYourTurnItem}
            onUpdated={() => setReloadToken((token) => token + 1)}
          />
        </aside>
      ) : null}
    </main>
  )
}
