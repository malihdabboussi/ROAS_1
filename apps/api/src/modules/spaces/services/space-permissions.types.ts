import type { SpaceShareEntityType, SpaceShareLevel } from '../dto'

export type SpaceRow = {
  id: string
  org_id: string | null
  user_id: string
  campaign_id: string | null
  visibility: 'private' | 'team'
  share_link_enabled: boolean
  share_token: string | null
}

export type SpaceItemRow = {
  id: string
  space_id: string
  org_id: string | null
  user_id: string
  parent_item_id: string | null
  is_private: boolean
  share_link_enabled: boolean
  share_token: string | null
}

export type SpaceItemShareRow = {
  id: string
  item_id: string
  space_id: string
  org_id: string | null
  entity_type: SpaceShareEntityType | 'email'
  entity_id: string
  level: SpaceShareLevel
  inherit_to_children: boolean
  created_by: string
  created_at: string
  invite_token?: string | null
  invited_email?: string | null
  invite_expires_at?: string | null
}

export type SpaceShareRow = {
  id: string
  space_id: string
  org_id: string | null
  entity_type: SpaceShareEntityType
  entity_id: string
  level: SpaceShareLevel
  allowed_view_ids: string[] | null
  created_by: string
  created_at: string
}

export type SharedSpaceLite = {
  id: string
  title: string
  visibility: 'private' | 'team'
}

export type SharedItemResolveResult = {
  share_type: 'public' | 'invite'
  access_level: SpaceShareLevel
  space: SharedSpaceLite
  item: Record<string, unknown>
}

export type SharedSpaceRosterEntry = {
  participant_id: string
  kind: 'agent' | 'human'
  display_name: string
  avatar_url: string | null
  user_id: string | null
  agent_key: string | null
}

export type SharedSpaceResolveResult = {
  access_level: 'view'
  space: Record<string, unknown>
  items: Record<string, unknown>[]
  roster: SharedSpaceRosterEntry[]
  campaign: { id: string; name: string } | null
}

export type SpaceShareScope = {
  level: SpaceShareLevel | null
  allowed_view_ids: string[] | null
}
