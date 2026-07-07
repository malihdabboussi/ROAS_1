/**
 * Customer Brain UI/domain contracts.
 */

/**
 * Customer avatar - a bottom-up worldview cluster emergent from a customer brain's
 * memories, beliefs, and perspectives. Distinct from the declared `avatars` table
 * (which holds top-down marketing personas linked to offers).
 */
export interface CustomerAvatar {
  id: string
  brain_id: string
  name: string
  summary?: string | null
  narrative_md?: string | null
  status: 'emerging' | 'active' | 'shifting' | 'transformed'
  strength?: number | null
  confidence?: number | null
  member_customer_unit_ids?: string[] | null
  member_contact_ids?: string[] | null
  member_strength?: Record<string, number> | null
  dominant_perspective_ids?: string[] | null
  dominant_belief_ids?: string[] | null
  dominant_pain_points?: string[] | null
  emotional_signature?: Record<string, unknown> | null
  blind_spots?: string | null
  discriminator_profile?: Record<string, number> | null
  needs_profile?: Record<string, { score: number; rank: 'primary' | 'secondary' | null }> | null
  evidence_distribution?: { stated?: number; revealed?: number; behavioral?: number } | null
  contrast_profile?: Record<string, string> | null
  discriminator_questions?: string[] | null
  lineage?: {
    perspective_ids?: string[]
    belief_ids?: string[]
    key_memory_ids?: string[]
    key_customer_ids?: string[]
  } | null
  offer_ids?: string[] | null
  declared_avatar_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface CustomerBrainUnit {
  id: string
  brain_id: string
  entity_key: string
  entity_type: 'contact' | 'account' | 'source_identity' | 'anonymous' | 'synthetic' | string
  display_name: string | null
  primary_contact_id: string | null
  status: string
  confidence: number | null
  memory_count: number
  last_memory_at: string | null
  first_seen_at: string | null
  last_seen_at: string | null
  metadata: Record<string, unknown> | null
}

export interface CustomerSourceIdentity {
  id: string
  brain_id: string
  customer_entity_id: string | null
  contact_id: string | null
  source_type: string
  source_id: string
  identity_kind: string
  source_label: string | null
  confidence: number | null
  metadata: Record<string, unknown> | null
  first_seen_at: string | null
  last_seen_at: string | null
  created_at: string
  updated_at: string
}

export interface CustomerMemoryIdentity {
  memory_id: string
  brain_id: string
  content: string
  memory_type: string
  contact_id: string | null
  customer_entity_id: string | null
  customer_source_identity_id: string | null
  customer_resolution_status: 'linked_contact' | 'linked_entity' | 'unlinked_source' | 'unresolved' | string
  customer_unit_key: string
  customer_unit_type: string | null
  customer_unit_name: string | null
  identity_kind: string | null
  source_type: string | null
  source_id: string | null
  source_title: string | null
  created_at: string
}

export interface CustomerBrainView {
  success: boolean
  brain_id: string
  units: CustomerBrainUnit[]
  source_identities: CustomerSourceIdentity[]
  unlinked_memories: CustomerMemoryIdentity[]
  stats: {
    customer_units: number
    source_identities: number
    unlinked_memories: number
    linked_contact_memories: number
  }
}
