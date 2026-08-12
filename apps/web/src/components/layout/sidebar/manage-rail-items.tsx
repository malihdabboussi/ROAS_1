'use client'

import {
  CalendarDays,
  CheckSquare,
  Ellipsis,
  House,
  Inbox,
  ListChecks,
  SendHorizontal,
  Star,
} from 'lucide-react'
import type { ManageRailItem } from './sidebar-types'

export const manageRailItems: ManageRailItem[] = [
  {
    id: 'home',
    label: 'Home',
    type: 'link',
    href: '/home',
    icon: <House className="icon-md" />,
  },
  {
    id: 'inbox',
    label: 'Inbox',
    type: 'link',
    href: '/home/inbox',
    icon: <Inbox className="icon-md" />,
  },
  {
    id: 'meetings',
    label: 'Meetings',
    type: 'link',
    href: '/home/meetings',
    icon: <CalendarDays className="icon-md" />,
  },
  {
    id: 'my-task',
    label: 'My Tasks',
    type: 'link',
    href: '/home/my-tasks',
    icon: <CheckSquare className="icon-md" />,
  },
  {
    id: 'delegation-desk',
    label: 'Delegation Desk',
    type: 'delegation',
    icon: <SendHorizontal className="icon-md" />,
  },
  {
    id: 'favorites',
    label: 'Favorites',
    type: 'panel',
    panelId: 'favorites',
    icon: <Star className="icon-md" />,
  },
  {
    id: 'spaces',
    label: 'Programs',
    type: 'panel',
    panelId: 'spaces',
    icon: <ListChecks className="icon-md" />,
  },
  {
    id: 'more',
    label: 'More',
    type: 'panel',
    panelId: 'more',
    icon: <Ellipsis className="icon-md" />,
  },
]
