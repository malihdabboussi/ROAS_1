'use client'

import {
  BriefcaseBusiness,
  CalendarDays,
  Ellipsis,
  House,
  Inbox,
  ListChecks,
  ListTodo,
  Rocket,
  SendHorizontal,
  Star,
  Users,
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
    id: 'clients',
    label: 'Clients',
    type: 'link',
    href: '/clients',
    icon: <Users className="icon-md" />,
  },
  {
    id: 'client-campaigns',
    label: 'Client Campaigns',
    type: 'link',
    href: '/client-campaigns',
    icon: <BriefcaseBusiness className="icon-md" />,
  },
  {
    id: 'launches',
    label: 'Launches',
    type: 'link',
    href: '/launches',
    icon: <Rocket className="icon-md" />,
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
    id: 'all-tasks',
    label: 'All Tasks',
    type: 'link',
    href: '/all-tasks',
    icon: <ListTodo className="icon-md" />,
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
