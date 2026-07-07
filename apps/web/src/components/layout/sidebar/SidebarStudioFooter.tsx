'use client'

import { Rocket } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { AvatarDropdown } from '../AvatarDropdown'
import { SidebarCreditsHover } from '../SidebarCreditsHover'
import type { SidebarControllerReturn } from './useSidebarController'

export function SidebarStudioFooter({
  c,
  featureUpdates,
}: {
  c: Pick<
    SidebarControllerReturn,
    | 'isFreePlan'
    | 'collapsed'
    | 'mobileDrawerOpen'
    | 'displayName'
    | 'email'
    | 'avatarUrl'
    | 'initials'
  >
  featureUpdates?: { hasUnread: boolean; onOpen: (anchor: HTMLElement) => void }
}) {
  return (
    <>
      {c.isFreePlan && !c.collapsed && (
        <div className="px-3 pb-2">
          <button
            onClick={() => {
              const event = new CustomEvent('open-account-settings', { detail: 'billing' })
              window.dispatchEvent(event)
            }}
            className="chip-glass-blue flex w-full items-center justify-center rounded-lg py-1.5 transition-all hover:opacity-90"
          >
            <span className="body-2 font-medium">Upgrade</span>
          </button>
        </div>
      )}

      {c.mobileDrawerOpen && (
        <div className="chip-glass-blue mx-3 mb-2 rounded-lg px-3 py-2.5 text-center">
          <span className="body-3 font-medium">
            For the full experience, hop on desktop.{' '}
            <span className="font-bold">It hits different</span>
          </span>
        </div>
      )}

      {featureUpdates && (
        <div className={c.collapsed ? 'flex justify-center px-3 pb-2' : 'px-3 pb-2'}>
          {c.collapsed ? (
            <Tooltip label="What's New" side="right">
              <button
                type="button"
                onClick={(e) => featureUpdates.onOpen(e.currentTarget)}
                className="nav-glass-hover-purple relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-muted-foreground)] transition-all hover:text-[var(--color-foreground)]"
                aria-label="What's New"
              >
                <Rocket className="icon-md shrink-0" />
                {featureUpdates.hasUnread && (
                  <span className="bg-primary absolute right-1 top-1 h-2 w-2 rounded-full ring-2 ring-[var(--color-card)]" />
                )}
              </button>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={(e) => featureUpdates.onOpen(e.currentTarget)}
              className="nav-glass-hover-purple gap-spacing-2 relative flex w-full items-center rounded-lg px-3 py-2 text-left transition-all"
            >
              <Rocket className="icon-md shrink-0 text-[var(--color-muted-foreground)]" />
              <span className="body-2 font-medium text-[var(--color-foreground)]">
                What&apos;s New
              </span>
              {featureUpdates.hasUnread && (
                <span className="bg-primary ml-auto h-2 w-2 shrink-0 rounded-full" />
              )}
            </button>
          )}
        </div>
      )}

      <div
        className={`border-t border-[var(--color-border)] ${
          c.collapsed
            ? 'flex flex-col items-center gap-1 py-2'
            : 'gap-spacing-2 flex items-center justify-between px-3 py-2.5'
        }`}
      >
        {!c.collapsed && (
          <>
            <div className="flex h-9 shrink-0 items-center">
              <AvatarDropdown
                displayName={c.displayName}
                email={c.email ?? ''}
                avatarUrl={c.avatarUrl ?? null}
                initials={c.initials}
                sidebarCollapsed={c.collapsed}
              />
            </div>
            <SidebarCreditsHover variant="studio" collapsed={false} compactStudioTrigger />
          </>
        )}
        {c.collapsed && (
          <>
            <SidebarCreditsHover variant="studio" collapsed />
            <div className="flex justify-center">
              <AvatarDropdown
                displayName={c.displayName}
                email={c.email ?? ''}
                avatarUrl={c.avatarUrl ?? null}
                initials={c.initials}
                sidebarCollapsed={c.collapsed}
              />
            </div>
          </>
        )}
      </div>
    </>
  )
}
