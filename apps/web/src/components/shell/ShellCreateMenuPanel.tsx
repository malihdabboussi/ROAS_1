'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, MoreHorizontal, Rocket } from 'lucide-react'
import { QUICK_MISSION_PLAYBOOKS } from '@/lib/spaces/quick-missions-catalog'
import { cn } from '@/lib/utils/cn'
import { SHELL_CREATE_MENU_GROUPS, type ShellCreateMenuItem } from './shell-create-menu.config'

type CreateMenuView = 'create' | 'missions' | 'more'

function CreateItemRow({ item, onSelect }: { item: ShellCreateMenuItem; onSelect: () => void }) {
  const Icon = item.icon
  return (
    <button
      type="button"
      disabled={item.comingSoon}
      onClick={() => {
        if (!item.comingSoon) onSelect()
      }}
      className={cn(
        'body-3 px-spacing-3 py-spacing-2 gap-spacing-2 flex w-full items-center text-left transition-colors',
        item.comingSoon
          ? 'text-muted-foreground cursor-default opacity-60'
          : 'text-foreground hover:bg-hover-subtle',
      )}
    >
      <span
        className={cn(
          'p-spacing-1 flex shrink-0 items-center justify-center rounded-md',
          item.glassClass,
        )}
      >
        <Icon className="icon-sm" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.comingSoon ? (
        <span className="body-4 text-muted-foreground shrink-0">Soon</span>
      ) : item.hint ? (
        <span className="body-4 text-muted-foreground shrink-0">{item.hint}</span>
      ) : null}
    </button>
  )
}

function BackRow({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="body-4 text-muted-foreground hover:text-foreground px-spacing-3 py-spacing-1 gap-spacing-1 flex items-center transition-colors"
    >
      <ChevronLeft className="icon-xs" aria-hidden />
      Back
    </button>
  )
}

export function ShellCreateMenuPanel({
  onSelectCreateItem,
  onSelectMissionPlaybook,
  onCloseMenu,
  onBack,
}: {
  onSelectCreateItem: (item: ShellCreateMenuItem) => void
  onSelectMissionPlaybook: (playbookKey: string) => void
  onCloseMenu: () => void
  /** Leaves the create catalog back to whatever hosts it (the work summary). */
  onBack?: () => void
}) {
  const [view, setView] = useState<CreateMenuView>('create')
  const moreGroup = SHELL_CREATE_MENU_GROUPS.find((group) => group.id === 'more')

  if (view === 'missions') {
    return (
      <div>
        <BackRow onClick={() => setView('create')} />
        <p className="typo-caption text-muted-foreground px-spacing-3 pb-spacing-1 pt-spacing-2 font-medium uppercase tracking-wide">
          Missions
        </p>
        {QUICK_MISSION_PLAYBOOKS.map((playbook) => (
          <button
            key={playbook.id}
            type="button"
            onClick={() => {
              onCloseMenu()
              onSelectMissionPlaybook(playbook.key)
            }}
            className="hover:bg-hover-subtle px-spacing-3 py-spacing-2 gap-spacing-2 flex w-full items-start text-left transition-colors"
          >
            <span className="badge-glass-purple p-spacing-1 flex shrink-0 items-center justify-center rounded-md">
              <Rocket className="icon-sm" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="body-3 text-foreground block font-medium">{playbook.name}</span>
              <span className="body-4 text-muted-foreground mt-spacing-1 block">
                {playbook.description}
              </span>
            </span>
          </button>
        ))}
      </div>
    )
  }

  if (view === 'more') {
    return (
      <div>
        <BackRow onClick={() => setView('create')} />
        <p className="typo-caption text-muted-foreground px-spacing-3 pb-spacing-1 pt-spacing-2 font-medium uppercase tracking-wide">
          More
        </p>
        {moreGroup?.items.map((item) => (
          <CreateItemRow
            key={item.id}
            item={item}
            onSelect={() => {
              onCloseMenu()
              onSelectCreateItem(item)
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <>
      {onBack ? <BackRow onClick={onBack} /> : null}
      {SHELL_CREATE_MENU_GROUPS.filter((group) => group.id !== 'more').map((group, groupIndex) => (
        <div key={group.id} className={cn(groupIndex > 0 && 'border-border mt-spacing-1 border-t')}>
          <p className="typo-caption text-muted-foreground px-spacing-3 pb-spacing-1 pt-spacing-2 font-medium uppercase tracking-wide">
            {group.label}
          </p>
          {group.items.map((item) => {
            if (item.action === 'mission') {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setView('missions')}
                  className="body-3 text-foreground hover:bg-hover-subtle px-spacing-3 py-spacing-2 gap-spacing-2 flex w-full items-center text-left transition-colors"
                >
                  <span className="badge-glass-purple p-spacing-1 flex shrink-0 items-center justify-center rounded-md">
                    <Rocket className="icon-sm" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  <span className="body-4 text-muted-foreground shrink-0">
                    {QUICK_MISSION_PLAYBOOKS.length} playbooks
                  </span>
                  <ChevronRight className="icon-xs text-muted-foreground shrink-0" aria-hidden />
                </button>
              )
            }
            return (
              <CreateItemRow
                key={item.id}
                item={item}
                onSelect={() => {
                  onCloseMenu()
                  onSelectCreateItem(item)
                }}
              />
            )
          })}
        </div>
      ))}
      <div className="border-border mt-spacing-1 border-t">
        <button
          type="button"
          onClick={() => setView('more')}
          className="body-3 text-foreground hover:bg-hover-subtle px-spacing-3 py-spacing-2 gap-spacing-2 flex w-full items-center text-left transition-colors"
        >
          <span className="badge-glass-muted p-spacing-1 flex shrink-0 items-center justify-center rounded-md">
            <MoreHorizontal className="icon-sm" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 truncate">More</span>
          <ChevronRight className="icon-xs text-muted-foreground shrink-0" aria-hidden />
        </button>
      </div>
    </>
  )
}
