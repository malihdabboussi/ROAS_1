'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  CalendarDays,
  CheckSquare,
  House,
  Inbox,
  LayoutGrid,
  SendHorizontal,
  Star,
} from 'lucide-react'
import { toast } from 'sonner'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { DELEGATION_TOAST_MESSAGES } from '@/features/spaces/config/delegation-messages.config'
import {
  ensureDelegationDesk,
  findDelegationDesk,
} from '@/features/spaces/services/delegation-desk.service'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import type { Space } from '@/features/spaces/types'
import type { SidebarCampaignRow } from './sidebar-types'

const HOME_LINKS = [
  { href: '/home', label: 'Home', icon: House },
  { href: '/home/inbox', label: 'Inbox', icon: Inbox },
  { href: '/home/meetings', label: 'Meetings', icon: CalendarDays },
  { href: '/home/my-tasks', label: 'My Tasks', icon: CheckSquare },
] as const

export function SidebarHomeFlyout({
  pathname,
  favoriteCampaigns = [],
  favoriteSpaces = [],
  spaces = [],
}: {
  pathname: string
  favoriteCampaigns?: SidebarCampaignRow[]
  favoriteSpaces?: Space[]
  spaces?: Space[]
}) {
  const router = useRouter()
  const storedSpaces = useSpacesStore((state) => state.spaces)
  const activeSpaceId = useSpacesStore((state) => state.activeSpaceId)
  const [openingDelegationDesk, setOpeningDelegationDesk] = useState(false)
  const knownSpaces = [
    ...spaces,
    ...storedSpaces.filter((stored) => !spaces.some((space) => space.id === stored.id)),
  ]
  const delegationDesk = findDelegationDesk(knownSpaces)
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

  const openDelegationDesk = async () => {
    if (openingDelegationDesk) return
    setOpeningDelegationDesk(true)
    try {
      const { desk } = await ensureDelegationDesk(knownSpaces)
      if (!useSpacesStore.getState().spaces.some((space) => space.id === desk.id)) {
        useSpacesStore.setState((state) => ({ spaces: [desk, ...state.spaces] }))
      }
      useSpacesStore.getState().setActiveSpace(desk.id)
      useGlobalChatStore.getState().setCollapsed(true)
      router.push(`/spaces?space=${encodeURIComponent(desk.id)}`)
    } catch {
      toast.error(DELEGATION_TOAST_MESSAGES.OPEN_FAILED)
    } finally {
      setOpeningDelegationDesk(false)
    }
  }

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
      <button
        type="button"
        onClick={openDelegationDesk}
        disabled={openingDelegationDesk}
        aria-busy={openingDelegationDesk}
        className={`hub-dock-flyout-row text-left ${
          pathname.startsWith('/spaces') && activeSpaceId === delegationDesk?.id
            ? 'hub-dock-flyout-row-active'
            : ''
        }`}
      >
        <SendHorizontal aria-hidden />
        <span className="min-w-0 flex-1 truncate">Delegation Desk</span>
      </button>
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
