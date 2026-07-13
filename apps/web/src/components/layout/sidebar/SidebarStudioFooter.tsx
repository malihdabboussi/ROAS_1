'use client'

import { AvatarDropdown } from '../AvatarDropdown'
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

      <div
        className={`border-t border-[var(--color-border)] ${
          c.collapsed ? 'flex flex-col items-center gap-1 py-2' : 'flex items-center px-3 py-2.5'
        }`}
      >
        <div className={`flex h-9 shrink-0 items-center ${c.collapsed ? 'justify-center' : ''}`}>
          <AvatarDropdown
            displayName={c.displayName}
            email={c.email ?? ''}
            avatarUrl={c.avatarUrl ?? null}
            initials={c.initials}
            sidebarCollapsed={c.collapsed}
            featureUpdates={featureUpdates}
          />
        </div>
      </div>
    </>
  )
}
