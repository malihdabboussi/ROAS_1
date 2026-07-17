'use client'

import { cn } from '@/lib/utils/cn'
import { AvatarDropdown } from '../AvatarDropdown'
import type { SidebarControllerReturn } from './useSidebarController'

export function SidebarHqShellFooter({
  c,
  expanded,
  featureUpdates,
}: {
  c: SidebarControllerReturn
  expanded: boolean
  pathname: string
  featureUpdates?: { hasUnread: boolean; onOpen: (anchor: HTMLElement) => void }
  onChatNavigate?: () => void
  onChatHover?: () => void
}) {
  return (
    <div
      className={cn(
        'hub-sidebar-shell-footer shrink-0',
        expanded ? 'px-0 pt-2' : 'flex flex-col items-center gap-0.5 px-1 py-2',
      )}
    >
      <div
        className={cn(
          'flex gap-2',
          expanded ? 'items-center px-1 py-1' : 'flex-col items-center px-1 py-2',
        )}
      >
        <AvatarDropdown
          displayName={c.displayName}
          email={c.email ?? ''}
          avatarUrl={c.avatarUrl ?? null}
          initials={c.initials}
          sidebarCollapsed={!expanded}
          featureUpdates={featureUpdates}
        />
        {expanded ? (
          <div className="min-w-0 flex-1">
            <p className="body-3 truncate font-medium">{c.displayName}</p>
            <p className="body-4 text-tertiary truncate">
              {c.isFreePlan ? 'Free plan' : 'Pro plan'}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
