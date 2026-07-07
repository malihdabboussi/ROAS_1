/**
 * Shared content types for every module in `content/`.
 *
 * Types are intentionally close to the underlying Postgres column shapes
 * (see supabase/migrations/047_brain_consolidation.sql,
 * 20260406130000_brain_narrative_pages.sql,
 * 20260507142000_customer_brain_infra.sql,
 * 20260518115500_company_cortex_foundation.sql,
 * 20260518124000_company_cortex_objects.sql).
 *
 * Every `*Anchor` type is what a hand-author writes. Phases turn anchors
 * into multiple INSERTs (e.g. one MemoryAnchor expands into 2-3
 * ns_memories rows via templated variations).
 */

// ─── Agency / Humans ─────────────────────────────────────────────────────

export interface AgencyMeta {
  /** Brand-level name of the agency. */
  name: string
  /** One-sentence positioning. */
  tagline: string
  /** Founding story / paragraph that seeds the founder's user-brain narrative pages. */
  story: string
  /** Brand voice cheatsheet other content modules reference. */
  voice: {
    tone: string[]
    do: string[]
    dont: string[]
  }
  /** Founding date — anchors to timeline Week 1 start. */
  foundedAt: Date
}

export interface HumanPartner {
  /** Stable slug — used to derive UUIDs and email aliases. */
  slug: string
  /** Display name shown in profile + UI. */
  displayName: string
  /** Email (must be deliverable-format; admin API bypasses domain check). */
  email: string
  /** Plaintext password — only `founder` gets a known one; others get random. */
  passwordKind: 'known' | 'random'
  role: 'owner' | 'admin'
  /** Short bio for narrative-page content. */
  bio: string
  /** When they joined the org (used to backdate profile + org_member rows). */
  joinedAt: Date
}

// ─── Clients ─────────────────────────────────────────────────────────────

export interface ClientPersona {
  /** Stable slug — used everywhere as the canonical client key. */
  slug: string
  /** Display name of the client company. */
  name: string
  /** Vertical (used to pick which Adley templates apply). */
  vertical:
    | 'saas'
    | 'dtc'
    | 'fintech'
    | 'healthtech'
    | 'b2b-services'
    | 'education'
    | 'content-creator'
  /** Brand voice cheatsheet — drives copy reskins. */
  voice: {
    tone: string[]
    keywords: string[]
    avoid: string[]
  }
  /** Naming pattern for the client's artifacts (e.g. `Acme — {{kind}} v{{n}}`). */
  namingPattern: string
  /** Brand colors for media_assets metadata. */
  brand: {
    primary: string
    secondary: string
    accent: string
  }
  /** When this client became a Foundry retainer (drives campaign created_at). */
  onboardedAt: Date
  /** Retainer scope summary — surfaces in campaign goal/context fields. */
  retainerScope: string
}

// ─── Agent Hires ─────────────────────────────────────────────────────────

export interface AgentHire {
  /** Custom display name (e.g. "Maya"). */
  name: string
  /** Role title in the org chart (e.g. "Head of Brand"). */
  title: string
  /** Closest agent_employee_templates.role_key — feeds AgentOnboardingService.hireReadyEmployee. */
  roleKey: string
  /** Which team they belong to. */
  team: 'brand' | 'growth' | 'delivery' | 'ops'
  /** Brief archetype description for agent_definitions content. */
  archetype: string
  /** Voice cheatsheet — drives this agent's channel messages + brain content. */
  voice: {
    tone: string[]
    catchphrases: string[]
  }
  /** When this agent was hired (anchors to timeline). */
  hiredAt: Date
  /** Whether to seed a deep `ns_sk_*` library for this agent (5 of the 7). */
  deepBrain: boolean
}

// ─── Brain Anchors ───────────────────────────────────────────────────────

export type MemoryType =
  | 'fact'
  | 'insight'
  | 'decision'
  | 'observation'
  | 'reflection'
  | 'principle'

export type MemorySourceType =
  | 'manual'
  | 'meeting'
  | 'email'
  | 'channel'
  | 'voice_memo'
  | 'doc'
  | 'web'

export interface MemoryAnchor {
  /** Stable slug for deterministic UUID generation. */
  slug: string
  content: string
  memoryType: MemoryType
  sourceType: MemorySourceType
  sourceTitle?: string
  /** Who said/wrote this memory (used heavily for customer brain). */
  speaker?: string
  /** When the memory was captured. */
  capturedAt: Date
  /** 0..1 — Atlas uses this to weight cognition. */
  significance: number
  /** 0..1 — confidence in the memory. */
  confidence: number
  /** Tags from the canonical vocabulary (positioning, pricing, acme, hiring, ops, etc.). */
  tags: string[]
  /** Optional emotional valence/intensity. */
  emotion?: {
    label: string
    valence: number
    intensity: number
  }
  /** If this is a customer memory, the contact_slug. */
  contactSlug?: string
}

/** A pre-crystallized snapshot — 4-phase body per CrystallizationService schema. */
export interface SnapshotAnchor {
  slug: string
  /** "Belief", "Method", "Frame", "Principle", etc. */
  type: string
  /** Short, declarative name shown in the UI. */
  name: string
  /** The crystallized core. */
  core: string
  /** One-line distillation. */
  oneLiner: string
  /** Phase 1 — the originating thought. */
  story: string
  /** Phase 2 — the precipitating moment. */
  moment: string
  /** Phase 3 — the operating system / method. */
  method?: string
  steps?: string
  filter?: string
  /** Phase 4 — stress test. */
  challenge?: string
  breakTest?: string
  risks?: string
  proof?: string
  /** Slug of the MemoryAnchor this snapshot crystallized from. */
  sourceMemorySlug: string
  /** When crystallization happened. */
  crystallizedAt: Date
  significanceScore: number
  confidence: number
  tags: string[]
}

/** Cortex Object types per company_cortex_objects.object_type CHECK constraint. */
export type CortexObjectType =
  | 'belief'
  | 'perspective'
  | 'tension'
  | 'standard'
  | 'move'
  | 'anti_pattern'
  | 'protocol'
  | 'decision'
  | 'retrieval_rule'

export interface CortexObjectAnchor {
  slug: string
  objectType: CortexObjectType
  title: string
  /** The durable truth this object encodes. */
  truth: string
  /** Free-text describing the evidence Atlas saw to crystallize this. */
  evidenceNarrative: string
  /** When this object first became active. */
  formedAt: Date
  /** Initial status. */
  status: 'emerging' | 'active' | 'challenged' | 'transforming' | 'retired'
  confidence: number
  /** Optional retrieval_rule shape for the object. */
  retrievalRule?: Record<string, unknown>
}

// ─── Customer Brain ──────────────────────────────────────────────────────

export interface ContactPersona {
  slug: string
  displayName: string
  email: string
  company: string
  title: string
  /** Primary client decision-maker vs secondary stakeholder. */
  tier: 'primary' | 'secondary'
  /** The client this contact belongs to. */
  clientSlug: string
  /** When this contact first appeared in the customer brain. */
  firstSeenAt: Date
  /** Optional canonical contact_type. */
  contactType?: 'customer' | 'prospect' | 'partner' | 'lead'
}

export interface AvatarNarrative {
  slug: string
  /** Cluster name — surfaces on the customer avatar card. */
  name: string
  /** One-paragraph summary. */
  summary: string
  /** Full markdown narrative. */
  narrativeMd: string
  /** Contact slugs that cluster into this avatar (2-4 typical). */
  memberContactSlugs: string[]
  /** Dominant pain points. */
  dominantPainPoints: string[]
  /** Free-text blind spots. */
  blindSpots: string
  /** 7 canonical discriminator axes (id from avatar_discriminator_axes). */
  discriminatorProfile: Record<
    'stakes' | 'horizon' | 'money' | 'reference_frame' | 'identity' | 'pain' | 'risk',
    { value: string; strength: number }
  >
  /** Emotional signature (label → weight). */
  emotionalSignature: Record<string, number>
  /** When the avatar emerged. */
  emergedAt: Date
  status: 'emerging' | 'active' | 'shifting' | 'transformed'
}

// ─── Agent SK Entries ────────────────────────────────────────────────────

export interface SkSourceAnchor {
  slug: string
  /** book, article, course, talk, etc. */
  sourceType: string
  title: string
  author?: string
  url?: string
  domain: string
  /** When this source was ingested. */
  ingestedAt: Date
}

export interface SkEntryAnchor {
  slug: string
  /** Stable slug of the parent SK source. */
  sourceSlug: string
  /** Which agent's brain this entry belongs to (matches AgentHire.name lowercase). */
  agentSlug: string
  /** fact | framework | example | heuristic | principle, etc. */
  entryType: string
  title: string
  content: string
  domain: string
  complexity: 'foundational' | 'intermediate' | 'advanced'
  confidence: number
  mastery: number
  tags: string[]
  capturedAt: Date
}

// ─── Narrative Pages ─────────────────────────────────────────────────────

export interface NarrativePageAnchor {
  slug: string
  /** Which brain this page belongs to: 'user' | 'company' | 'customer' | agent slug. */
  brain: string
  title: string
  /** topic | system | playbook | summary | reference */
  pageType: string
  contentMd: string
  summary: string
  /** Slugs of the anchor memories / snapshots / signals this page synthesizes. */
  sourceSlugs: string[]
  /** When the page was first synthesized. */
  synthesizedAt: Date
  tags: string[]
}

// ─── Campaigns ───────────────────────────────────────────────────────────

export interface CampaignDef {
  slug: string
  name: string
  /** internal | client | sales | wiki */
  campaignType: string
  /** Stable slug of the client (if a client campaign) or null. */
  clientSlug: string | null
  goal: string
  context: string
  /** When this campaign was created in the org. */
  createdAt: Date
  /** queued | active | paused | completed */
  status: string
  /** Which agent hires are assigned to this campaign. */
  agentNames: string[]
}

// ─── Spaces ──────────────────────────────────────────────────────────────

export interface SpaceDef {
  slug: string
  name: string
  /** Which campaign this space belongs to. */
  campaignSlug: string
  /** The full spaces.schema JSONB — fields + views[]. */
  schema: Record<string, unknown>
  visibility: 'private' | 'team' | 'public'
  createdAt: Date
}

// ─── Missions ────────────────────────────────────────────────────────────

export interface MissionBrief {
  slug: string
  title: string
  /** Stable slug of the campaign. */
  campaignSlug: string
  /** Optional space the mission lives in. */
  spaceSlug?: string
  briefText: string
  status: 'queued' | 'in_progress' | 'completed' | 'cancelled'
  queuedAt: Date
  startedAt?: Date
  completedAt?: Date
  /** Subtask titles. */
  subtasks: { title: string; done: boolean }[]
  /** Deliverable types produced (offer, funnel, presentation, etc.). */
  deliverableKinds: string[]
  /** Which agent led the mission. */
  assignedAgentName: string
}

// ─── Docs ────────────────────────────────────────────────────────────────

export interface DocAnchor {
  slug: string
  title: string
  /** brief | sop | positioning | retro | proposal */
  docType: string
  /** Which campaign / space this doc belongs to. */
  campaignSlug?: string
  spaceSlug?: string
  contentMd: string
  authorName: string
  createdAt: Date
}

// ─── Channels ────────────────────────────────────────────────────────────

export interface ChannelMessageAnchor {
  /** Speaker is either an agent name (matching AgentHire.name lowercase) or a human partner slug. */
  speaker: string
  body: string
  /** Offset (in minutes) from the thread's start_at. */
  minuteOffset: number
  /** Optional artifact ref to be resolved by the seeder. */
  mentions?: string[]
}

export interface ChannelThread {
  slug: string
  /** Channel slug — multiple threads can share a channel. */
  channelSlug: string
  /** Optional campaign + space context. */
  campaignSlug?: string
  spaceSlug?: string
  topic: string
  /** When this thread started. */
  startedAt: Date
  messages: ChannelMessageAnchor[]
}

export interface ChannelDef {
  slug: string
  name: string
  /** Optional space scope. */
  spaceSlug?: string
  /** Optional campaign scope. */
  campaignSlug?: string
  /** Members — mix of agent names and partner slugs. */
  members: string[]
}
