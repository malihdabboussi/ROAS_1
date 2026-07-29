'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { HomeDashboardV4CustomizePopover } from '@/components/home-dashboard-v4/HomeDashboardV4CustomizePopover'
import { HomeCardRenderer } from '@/features/home/components/cards/HomeCardRenderer'
import { HomeSortableCardsGrid } from '@/features/home/components/HomeSortableCardsGrid'
import { MyTasksPanel } from '@/features/home/components/MyTasksPanel'
import {
  HOME_CARD_DEFINITIONS,
  homeCardDefinition,
  homeCardGridRows,
  homeCardGridSize,
} from '@/features/home/config/home-cards.config'
import { HomeCustomizeProvider } from '@/features/home/context/home-customize-context'
import { useHomeLayout } from '@/features/home/hooks/use-home-layout'
import type { HomeCardId } from '@/features/home/types/home-cards'
import type { HomeFeedScopeState } from '@/features/home/types/home-feed-scope'
import type { UserNotification } from '@/features/mission-control/types'
import { useOrgStore } from '@/features/org/store/use-org-store'
import type { YourTurnItem } from '@/features/spaces/services/your-turn.service'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'
import { cn } from '@/lib/utils/cn'

export function HomeCardsGrid({
  myTasksScope,
  updateMyTasksScope,
  approvalScope,
  updateApprovalScope,
  myTasksLoading,
  approvalLoading,
  myTasksItems,
  approvalItems,
  onOpenItem,
  onOpenMeeting,
  onNotificationClick,
  onMyTasksChanged,
  onAccept,
  onDismiss,
  variant = 'default',
}: {
  myTasksScope: HomeFeedScopeState
  updateMyTasksScope: (patch: Partial<HomeFeedScopeState>) => void
  approvalScope: HomeFeedScopeState
  updateApprovalScope: (patch: Partial<HomeFeedScopeState>) => void
  myTasksLoading: boolean
  approvalLoading: boolean
  myTasksItems: YourTurnItem[]
  approvalItems: YourTurnItem[]
  onOpenItem: (item: YourTurnItem) => void | Promise<void>
  onOpenMeeting?: (event: CalendarAgendaEvent) => void
  onNotificationClick: (notification: UserNotification) => void | Promise<void>
  onMyTasksChanged?: () => void
  onAccept: (item: YourTurnItem) => void | Promise<void>
  onDismiss: (item: YourTurnItem) => void | Promise<void>
  variant?: 'default' | 'v4'
}) {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const {
    layout,
    editing,
    setEditing,
    addCard,
    removeCard,
    reorderCards,
    setCardSize,
    setCardRows,
  } = useHomeLayout()
  const [addOpen, setAddOpen] = useState(false)
  const [myTasksPanelOpen, setMyTasksPanelOpen] = useState(false)

  const visibleCardIds = useMemo(() => {
    return layout.cardIds.filter((id) => {
      const def = homeCardDefinition(id)
      if (def.orgOnly && !activeOrgId) return false
      return true
    })
  }, [layout.cardIds, activeOrgId])

  const availableToAdd = useMemo(() => {
    const visible = new Set(visibleCardIds)
    return HOME_CARD_DEFINITIONS.filter((def) => {
      if (def.orgOnly && !activeOrgId) return false
      return !visible.has(def.id)
    })
  }, [visibleCardIds, activeOrgId])

  const cardRendererProps = {
    myTasksScope,
    updateMyTasksScope,
    approvalScope,
    updateApprovalScope,
    myTasksLoading,
    approvalLoading,
    myTasksItems,
    approvalItems,
    onOpenItem,
    onOpenMeeting,
    onExpandMyTasks: () => setMyTasksPanelOpen(true),
    onNotificationClick,
    onAccept,
    onDismiss,
  }

  const renderCard = (cardId: (typeof visibleCardIds)[number]) => (
    <div className="home-dashboard-card-content">
      <HomeCardRenderer
        cardId={cardId}
        {...cardRendererProps}
        onMyTasksChanged={onMyTasksChanged}
      />
    </div>
  )

  const isV4 = variant === 'v4'

  const toggleCard = (id: HomeCardId) => {
    if (visibleCardIds.includes(id)) {
      removeCard(id)
      return
    }
    addCard(id)
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className={
          isV4 ? 'hd4-dashboard-header' : 'flex flex-wrap items-center justify-between gap-2'
        }
      >
        <p className={isV4 ? 'hd4-dashboard-title' : 'body-3 text-muted-foreground'}>
          Your dashboard
        </p>
        <div className="flex items-center gap-2">
          {isV4 ? (
            <HomeDashboardV4CustomizePopover
              visibleCardIds={visibleCardIds}
              activeOrgId={activeOrgId}
              onToggleCard={toggleCard}
              editing={editing}
              onToggleEditing={() => {
                setEditing(!editing)
                setAddOpen(false)
              }}
            />
          ) : (
            <>
              {editing && availableToAdd.length > 0 ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAddOpen((o) => !o)}
                    className="button-glass-secondary rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 inline-flex items-center gap-1.5 font-medium"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add card
                    <ChevronDown className="h-3 w-3 opacity-70" />
                  </button>
                  {addOpen ? (
                    <>
                      <div className="z-modal-backdrop-inert" onClick={() => setAddOpen(false)} />
                      <div className="dropdown-menu-solid absolute right-0 top-full z-10 mt-1 max-h-[320px] min-w-[240px] overflow-y-auto py-1">
                        {availableToAdd.map((def) => (
                          <button
                            key={def.id}
                            type="button"
                            className="hover:bg-hover-subtle body-3 text-foreground flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors"
                            onClick={() => {
                              addCard(def.id)
                              setAddOpen(false)
                            }}
                          >
                            <span className="font-medium">{def.title}</span>
                            <span className="typo-caption text-muted-foreground">
                              {def.description}
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setEditing(!editing)
                  setAddOpen(false)
                }}
                className={cn(
                  'rounded-spacing-2 px-spacing-3 body-3 font-medium transition-colors',
                  editing
                    ? 'button-glass-accent py-spacing-1'
                    : 'button-glass-secondary py-spacing-2',
                )}
              >
                {editing ? 'Done' : 'Customize'}
              </button>
            </>
          )}
        </div>
      </div>

      {visibleCardIds.length === 0 ? (
        <div className="section-card card-elevated body-3 text-muted-foreground flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <p>No cards on your home yet.</p>
          <button
            type="button"
            onClick={() => {
              setEditing(true)
              setAddOpen(true)
            }}
            className="button-glass-accent rounded-spacing-2 px-spacing-4 py-spacing-2 body-3 font-medium"
          >
            Add a card
          </button>
        </div>
      ) : (
        <HomeCustomizeProvider editing={editing}>
          {editing ? (
            <HomeSortableCardsGrid
              cardIds={visibleCardIds}
              cardSizes={layout.cardSizes}
              cardRows={layout.cardRows}
              onReorder={reorderCards}
              onRemove={removeCard}
              onSetSize={setCardSize}
              onSetRows={setCardRows}
              renderCard={renderCard}
              variant={variant}
            />
          ) : (
            <div className={isV4 ? 'hd4-card-grid' : 'grid grid-cols-1 gap-6 md:grid-cols-2'}>
              {visibleCardIds.map((cardId) => {
                const size = homeCardGridSize(layout, cardId)
                const rows = homeCardGridRows(layout, cardId)
                return (
                  <div
                    key={cardId}
                    className={cn(
                      'relative min-w-0',
                      size === 'full' && 'hd4-card-grid-item-full',
                      rows === 1 && 'hd4-card-grid-item-rows-1',
                      rows === 2 && 'hd4-card-grid-item-rows-2',
                      rows === 3 && 'hd4-card-grid-item-rows-3',
                    )}
                  >
                    {renderCard(cardId)}
                  </div>
                )
              })}
            </div>
          )}
        </HomeCustomizeProvider>
      )}

      <MyTasksPanel
        open={myTasksPanelOpen}
        onOpenChange={setMyTasksPanelOpen}
        scope={myTasksScope}
        updateScope={updateMyTasksScope}
        loading={myTasksLoading}
        items={myTasksItems}
        onOpenItem={onOpenItem}
      />
    </div>
  )
}
