'use client'

import { Brain, FolderGit2, House, ListChecks, Users, Workflow } from 'lucide-react'
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
    label: 'Spaces',
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
    id: 'projects',
    label: 'Projects',
    type: 'panel',
    panelId: 'projects',
    icon: <FolderGit2 className="icon-md" />,
  },
  {
    id: 'flows',
    label: 'Flows',
    type: 'link',
    href: '/flows',
    icon: <Workflow className="icon-md" />,
  },
]
