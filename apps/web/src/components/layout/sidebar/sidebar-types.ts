import type { ReactNode } from 'react'
import type { ProjectRepo } from '@/features/projects/types'

export type ConversationTypeFilter = 'all' | 'non-campaign' | 'favorites' | 'current-campaign'

export interface SidebarProps {
  userName?: string
  email?: string
  avatarUrl?: string | null
}

export type ManagePanelId = 'home' | 'projects' | 'spaces' | 'team2' | 'brain' | 'favorites'

export type ManageRailItem = {
  id: string
  label: string
  icon: ReactNode
} & (
  | { type: 'link'; href: string }
  | {
      type: 'panel'
      panelId: ManagePanelId
      href?: string
    }
  | { type: 'mode-switch' }
  | { type: 'delegation'; id: string; label: string }
)

export interface SidebarCampaignRow {
  id: string
  name: string
  icon: string
  isPinned: boolean
  isSystemGeneral: boolean
  isSystemPersonal: boolean
  isFavorite: boolean
  isHidden: boolean
  program_id: string | null
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
