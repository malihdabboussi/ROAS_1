'use client'

import { Brain, Ellipsis, House, ListChecks, Users } from 'lucide-react'
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
    id: 'team',
    label: 'Team',
    type: 'panel',
    panelId: 'team2',
    href: '/team',
    icon: <Users className="icon-md" />,
  },
  {
    id: 'spaces',
    label: 'Programs',
    type: 'panel',
    panelId: 'spaces',
    icon: <ListChecks className="icon-md" />,
  },
  {
    id: 'brain',
    label: 'Brain',
    type: 'panel',
    panelId: 'brain',
    href: '/brain',
    icon: <Brain className="icon-md" />,
  },
  {
    id: 'more',
    label: 'More',
    type: 'panel',
    panelId: 'more',
    icon: <Ellipsis className="icon-md" />,
  },
]
