'use client'

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { SidebarWordmark } from './SidebarWordmark'
import type { SidebarControllerReturn } from './useSidebarController'

export function SidebarStudioHeader({
  c,
}: {
  c: Pick<
    SidebarControllerReturn,
    | 'collapsed'
    | 'setCollapsed'
    | 'mobileDrawerOpen'
    | 'router'
    | 'setActiveConversationId'
    | 'setActiveCampaign'
  >
}) {
  return (
    <>
      {!c.collapsed && (
        <>
          <div className="px-spacing-3 flex h-14 items-center justify-between pt-1">
            <button
              onClick={() => {
                c.setActiveConversationId(null)
                c.setActiveCampaign(null)
                c.router.push('/team')
              }}
              className="cursor-pointer pl-2 transition-opacity hover:opacity-80"
            >
              <SidebarWordmark className="!h-12" />
            </button>
            {!c.mobileDrawerOpen && (
              <Tooltip label="Collapse" side="bottom">
                <button
                  onClick={() => c.setCollapsed(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted-foreground)] transition-all hover:text-[var(--color-foreground)]"
                >
                  <PanelLeftClose className="icon-md shrink-0" />
                </button>
              </Tooltip>
            )}
          </div>
        </>
      )}

      {c.collapsed && (
        <div className="flex h-14 items-center justify-center pt-1">
          <button
            onClick={() => c.setCollapsed(false)}
            className="group flex h-10 w-10 items-center justify-center rounded-lg transition-all"
          >
            <span className="group-hover:hidden">
              <img
                src="/Logos/logov2/icon-white.png"
                alt="Vibey"
                className="hidden h-10 w-10 dark:block"
              />
              <img
                src="/Logos/logov2/icon-black.png"
                alt="Vibey"
                className="h-10 w-10 dark:hidden"
              />
            </span>
            <PanelLeftOpen className="icon-md hidden shrink-0 text-[var(--color-muted-foreground)] group-hover:block" />
          </button>
        </div>
      )}
    </>
  )
}
