import type { ReactNode } from 'react'
import type { ProjectRepo } from '@/features/projects/types'

export type ConversationTypeFilter = 'all' | 'non-campaign' | 'favorites' | 'current-campaign'

export interface SidebarProps {
  userName?: string
  email?: string
  avatarUrl?: string | null
}

export type ManageRailItem = {
  id: string
  label: string
  icon: ReactNode
} & (
  | { type: 'link'; href: string }
  | {
      type: 'panel'
      panelId: 'projects' | 'spaces' | 'team2' | 'brain' | 'more'
      href?: string
    }
  | { type: 'mode-switch' }
)

export interface SidebarCampaignRow {
  id: string
  name: string
  icon: string
  isPinned: boolean
  isSystemGeneral: boolean
  isFavorite: boolean
  isHidden: boolean
  config: Record<string, unknown>
  created_at: string
}

export type SidebarEditingCampaign = {
  id: string
  name: string
  icon: string
  config: Record<string, unknown>
} | null

export type { ProjectRepo }
