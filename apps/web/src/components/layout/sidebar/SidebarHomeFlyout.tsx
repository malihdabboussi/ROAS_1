'use client'

import Link from 'next/link'
import {
  CalendarDays,
  CheckSquare,
  House,
  Inbox,
  LayoutGrid,
  SendHorizontal,
  Star,
} from 'lucide-react'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import type { Space } from '@/features/spaces/types'
import type { SidebarCampaignRow } from './sidebar-types'

const HOME_LINKS = [
  { href: '/home', label: 'Home', icon: House },
  { href: '/home/inbox', label: 'Inbox', icon: Inbox },
  { href: '/home/meetings', label: 'Meetings', icon: CalendarDays },
  { href: '/home/my-tasks', label: 'My Tasks', icon: CheckSquare },
  { href: '/home/delegation-desk', label: 'Delegation Desk', icon: SendHorizontal },
] as const

export function SidebarHomeFlyout({
  pathname,
  favoriteCampaigns = [],
  favoriteSpaces = [],
}: {
  pathname: string
  favoriteCampaigns?: SidebarCampaignRow[]
  favoriteSpaces?: Space[]
}) {
  const favorites = [
    ...favoriteCampaigns.map((campaign) => ({
      id: `campaign-${campaign.id}`,
      label: campaign.name,
      href: `/campaigns/${campaign.id}`,
      icon: Star,
      onClick: undefined,
    })),
    ...favoriteSpaces.map((space) => ({
      id: `space-${space.id}`,
      label: space.title,
      href: '/spaces',
      icon: LayoutGrid,
      onClick: () => {
        useSpacesStore.getState().setActiveSpace(space.id)
        useGlobalChatStore.getState().setCollapsed(true)
      },
    })),
  ].slice(0, 8)

  return (
    <nav>
      {HOME_LINKS.map((item) => {
        const Icon = item.icon
        const active = item.href === '/home' ? pathname === '/home' : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            data-hub-dock-navigate
            className={`hub-dock-flyout-row ${active ? 'hub-dock-flyout-row-active' : ''}`}
          >
            <Icon aria-hidden />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
          </Link>
        )
      })}
      {favorites.length > 0 ? (
        <>
          <div className="hub-dock-flyout-divider" />
          <p className="hub-dock-flyout-caption">Favorites</p>
          {favorites.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={item.onClick}
                data-hub-dock-navigate
                className="hub-dock-flyout-row"
              >
                <Icon aria-hidden />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </Link>
            )
          })}
        </>
      ) : null}
    </nav>
  )
}
