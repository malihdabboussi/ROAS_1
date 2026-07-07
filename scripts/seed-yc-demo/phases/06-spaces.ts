/**
 * P6 — Spaces.
 *
 * Per campaign, 1-2 spaces created via direct service-role INSERTs with
 * hand-authored schema (fields + views[]). Direct INSERT (not SpacesService)
 * because:
 *   - We need deterministic `id` (so re-runs / downstream phases can compute it).
 *   - We need backdated `created_at` (the service uses now()).
 *   - We pass `campaign_id` explicitly so the
 *     `trg_spaces_default_campaign` trigger (defaults missing campaign_id to
 *     "General") never overrides our wiring.
 *
 * For each space we also seed space_items so the kanban/docs/list views look
 * populated. Tasks are regular space_items (no `_view_type`); docs carry
 * `custom_data._view_type = 'doc'` so the doc views can render them.
 *
 * For client workspaces + ops + pipeline + wiki, we also INSERT an in-space
 * channels row with `metadata.space_id` set so P8 can backfill messages.
 *
 * Wave 4b-3.
 */
import type { ClientPersona } from '../content/_types'
import { CLIENTS } from '../content/clients'
import { AGENCY_FOUNDED_AT, dateInWeek } from '../content/timeline'
import { after, seededRandom } from '../lib/timeline'
import { startResult, type PhaseContext, type PhaseHandler, type PhaseState } from './_context'

const PHASE_ID = '06-spaces'

// ─── Schema types (mirror apps/api SpaceSchemaDtoSchema + SpaceViewDefSchema) ──

type SchemaFieldType = 'text' | 'select' | 'multi_select' | 'date' | 'assignee'

interface SchemaFieldOption {
  id: string
  label: string
  color?: string
  group?: 'not_started' | 'active' | 'closed'
}

interface SchemaField {
  id: string
  name: string
  type: SchemaFieldType
  system?: boolean
  required?: boolean
  options?: SchemaFieldOption[]
}

type SchemaViewType =
  | 'list'
  | 'table'
  | 'kanban'
  | 'missions'
  | 'docs'
  | 'calendar'
  | 'channel'
  | 'channels'
  | 'presentations'
  | 'funnels'
  | 'instagram_research'
  | 'youtube_research'
  | 'twitter_research'

interface SchemaView {
  id: string
  type: SchemaViewType
  name: string
  icon?: string
  group_by?: string
  visible_fields?: string[]
  date_field?: string
  pinned_to_start?: boolean
  channel_config?: { channel_id: string }
  channels_config?: { channel_ids: string[]; active_channel_id?: string }
  presentations_config?: Record<string, unknown>
  funnels_config?: Record<string, unknown>
  ig_research_config?: Record<string, unknown>
  youtube_research_config?: Record<string, unknown>
  twitter_research_config?: Record<string, unknown>
}

interface SpaceSchema {
  version: number
  icon?: string
  fields: SchemaField[]
  views: SchemaView[]
}

// ─── Per-space definition ──────────────────────────────────────────────────

interface SpaceItemSeed {
  /** Status ids whose tasks should appear on the kanban (in display order). */
  kanbanColumns: string[]
  /** How many task rows per kanban column. 0 = no tasks. */
  perColumnTaskCount: number
  /** How many doc-shaped items to seed (custom_data._view_type = 'doc'). */
  docCount: number
  /** Extra tasks attached to no specific kanban status (for list-only spaces). */
  extraListTaskCount?: number
  /** Pool of task titles. Distributed round-robin across statuses. */
  taskTitles: string[]
  /** Pool of doc titles. Cycled to fill docCount. */
  docTitles: string[]
}

interface SpaceDefInline {
  slug: string
  name: string
  description: string
  campaignSlug: string
  visibility: 'private' | 'team'
  /** Whether to ALSO create an in-space channels row. */
  hasChannel: boolean
  /** Channel display name (only used when hasChannel=true). */
  channelName: string
  createdAt: Date
  schema: SpaceSchema
  itemSeed: SpaceItemSeed
}

// ─── Field/view builders ───────────────────────────────────────────────────

function statusField(opts: SchemaFieldOption[]): SchemaField {
  return {
    id: 'status',
    name: 'Status',
    type: 'select',
    system: true,
    required: true,
    options: opts,
  }
}

const PRIORITY_FIELD: SchemaField = {
  id: 'priority',
  name: 'Priority',
  type: 'select',
  system: true,
  required: true,
  options: [
    { id: 'low', label: 'Low', color: 'slate' },
    { id: 'medium', label: 'Medium', color: 'blue' },
    { id: 'high', label: 'High', color: 'orange' },
    { id: 'urgent', label: 'Urgent', color: 'red' },
  ],
}

const ASSIGNEE_FIELD: SchemaField = {
  id: 'assignee',
  name: 'Assignee',
  type: 'assignee',
  system: true,
}

const DUE_DATE_FIELD: SchemaField = {
  id: 'due_date',
  name: 'Due Date',
  type: 'date',
  system: true,
}

const TITLE_FIELD: SchemaField = {
  id: 'title',
  name: 'Name',
  type: 'text',
  system: true,
  required: true,
}

function taskFields(statusOptions: SchemaFieldOption[]): SchemaField[] {
  return [TITLE_FIELD, statusField(statusOptions), PRIORITY_FIELD, ASSIGNEE_FIELD, DUE_DATE_FIELD]
}

function viewList(name = 'List'): SchemaView {
  return {
    id: 'list',
    type: 'list',
    name,
    visible_fields: ['title', 'status', 'priority', 'assignee', 'due_date'],
  }
}

function viewKanban(name = 'Board'): SchemaView {
  return {
    id: 'board',
    type: 'kanban',
    name,
    group_by: 'status',
    visible_fields: ['title', 'priority', 'assignee', 'due_date'],
  }
}

function viewDocs(name = 'Docs'): SchemaView {
  return { id: 'docs', type: 'docs', name }
}

function viewMissions(name = 'Missions'): SchemaView {
  return { id: 'missions', type: 'missions', name }
}

function viewCalendar(name = 'Calendar'): SchemaView {
  return {
    id: 'calendar',
    type: 'calendar',
    name,
    date_field: 'due_date',
  }
}

function viewChannel(name = 'Channel'): SchemaView {
  return { id: 'channel', type: 'channel', name }
}

function viewPresentations(name = 'Presentations'): SchemaView {
  return {
    id: 'presentations',
    type: 'presentations',
    name,
    icon: 'presentation',
    presentations_config: {
      display_mode: 'grid',
      time_range: 'all',
      sort_by: 'created_at',
      sort_dir: 'desc',
    },
  }
}

function viewFunnels(name = 'Funnels'): SchemaView {
  return {
    id: 'funnels',
    type: 'funnels',
    name,
    icon: 'git-branch',
    funnels_config: {
      display_mode: 'grid',
      time_range: 'all',
      sort_by: 'created_at',
      sort_dir: 'desc',
    },
  }
}

function viewIgResearch(name = 'IG Research'): SchemaView {
  return {
    id: 'ig-research',
    type: 'instagram_research',
    name,
    icon: 'instagram',
    ig_research_config: {
      tracked_accounts: [],
      sort_by: 'outlier_score',
      sort_dir: 'desc',
      media_filter: 'all',
      time_range: '30d',
      display_mode: 'grid',
    },
  }
}

function viewYoutubeResearch(name = 'YouTube Research'): SchemaView {
  return {
    id: 'youtube-research',
    type: 'youtube_research',
    name,
    icon: 'youtube',
    youtube_research_config: {
      tracked_accounts: [],
      sort_by: 'outlier_score',
      sort_dir: 'desc',
      media_filter: 'all',
      time_range: '30d',
      display_mode: 'grid',
    },
  }
}

function viewTwitterResearch(name = 'X Research'): SchemaView {
  return {
    id: 'twitter-research',
    type: 'twitter_research',
    name,
    icon: 'twitter',
    twitter_research_config: {
      tracked_accounts: [],
      sort_by: 'outlier_score',
      sort_dir: 'desc',
      media_filter: 'all',
      time_range: '30d',
      display_mode: 'grid',
    },
  }
}

/** Pin the in-space channel on every `channel` / `channels` view tab. */
function wireSpaceChannelViews(schema: SpaceSchema, channelId: string): SpaceSchema {
  return {
    ...schema,
    views: schema.views.map((view) => {
      if (view.type === 'channel') {
        return { ...view, channel_config: { channel_id: channelId }, channels_config: undefined }
      }
      if (view.type === 'channels') {
        const ids = view.channels_config?.channel_ids ?? []
        const nextIds = ids.includes(channelId) ? ids : [channelId, ...ids]
        const active = view.channels_config?.active_channel_id
        return {
          ...view,
          channels_config: {
            ...view.channels_config,
            channel_ids: nextIds,
            active_channel_id: active && nextIds.includes(active) ? active : channelId,
          },
          channel_config: undefined,
        }
      }
      return view
    }),
  }
}

function clientPersona(slug: string): ClientPersona {
  const c = CLIENTS.find((x) => x.slug === slug)
  if (!c) throw new Error(`P6: unknown client slug "${slug}"`)
  return c
}

// ─── Status option presets ─────────────────────────────────────────────────

const ENGINEERING_STATUSES: SchemaFieldOption[] = [
  { id: 'backlog', label: 'Backlog', color: 'slate', group: 'not_started' },
  { id: 'designing', label: 'Designing', color: 'violet', group: 'active' },
  { id: 'writing', label: 'Writing', color: 'amber', group: 'active' },
  { id: 'reviewing', label: 'Reviewing', color: 'cyan', group: 'active' },
  { id: 'shipped', label: 'Shipped', color: 'emerald', group: 'closed' },
]

const PRODUCTION_STATUSES: SchemaFieldOption[] = [
  { id: 'briefed', label: 'Briefed', color: 'slate', group: 'not_started' },
  { id: 'in_production', label: 'In Production', color: 'amber', group: 'active' },
  { id: 'shot', label: 'Shot', color: 'violet', group: 'active' },
  { id: 'edited', label: 'Edited', color: 'cyan', group: 'active' },
  { id: 'live', label: 'Live', color: 'emerald', group: 'closed' },
]

const FINTECH_STATUSES: SchemaFieldOption[] = [
  { id: 'position', label: 'Position', color: 'slate', group: 'not_started' },
  { id: 'draft', label: 'Draft', color: 'amber', group: 'active' },
  { id: 'review', label: 'Review', color: 'violet', group: 'active' },
  { id: 'compliance', label: 'Compliance', color: 'orange', group: 'active' },
  { id: 'live', label: 'Live', color: 'emerald', group: 'closed' },
]

const HEALTHTECH_STATUSES: SchemaFieldOption[] = [
  { id: 'briefed', label: 'Briefed', color: 'slate', group: 'not_started' },
  { id: 'drafted', label: 'Drafted', color: 'amber', group: 'active' },
  { id: 'clinical_review', label: 'Clinical Review', color: 'orange', group: 'active' },
  { id: 'approved', label: 'Approved', color: 'cyan', group: 'active' },
  { id: 'live', label: 'Live', color: 'emerald', group: 'closed' },
]

const SERVICES_STATUSES: SchemaFieldOption[] = [
  { id: 'discovery', label: 'Discovery', color: 'slate', group: 'not_started' },
  { id: 'proposal', label: 'Proposal', color: 'amber', group: 'active' },
  { id: 'in_flight', label: 'In Flight', color: 'violet', group: 'active' },
  { id: 'qa', label: 'QA', color: 'cyan', group: 'active' },
  { id: 'delivered', label: 'Delivered', color: 'emerald', group: 'closed' },
]

const EDUCATION_STATUSES: SchemaFieldOption[] = [
  { id: 'outlined', label: 'Outlined', color: 'slate', group: 'not_started' },
  { id: 'drafting', label: 'Drafting', color: 'amber', group: 'active' },
  { id: 'pilot', label: 'Pilot', color: 'violet', group: 'active' },
  { id: 'iterating', label: 'Iterating', color: 'cyan', group: 'active' },
  { id: 'shipped', label: 'Shipped', color: 'emerald', group: 'closed' },
]

const OPS_STATUSES: SchemaFieldOption[] = [
  { id: 'active', label: 'Active', color: 'amber', group: 'active' },
  { id: 'blocked', label: 'Blocked', color: 'red', group: 'active' },
  { id: 'done', label: 'Done', color: 'emerald', group: 'closed' },
]

const SALES_STATUSES: SchemaFieldOption[] = [
  { id: 'lead', label: 'Lead', color: 'slate', group: 'not_started' },
  { id: 'discovery', label: 'Discovery', color: 'blue', group: 'active' },
  { id: 'proposal', label: 'Proposal', color: 'amber', group: 'active' },
  { id: 'closing', label: 'Closing', color: 'orange', group: 'active' },
  { id: 'won', label: 'Won', color: 'emerald', group: 'closed' },
  { id: 'lost', label: 'Lost', color: 'red', group: 'closed' },
]

const LAUNCH_STATUSES: SchemaFieldOption[] = [
  { id: 'planned', label: 'Planned', color: 'slate', group: 'not_started' },
  { id: 'in_motion', label: 'In Motion', color: 'amber', group: 'active' },
  { id: 'ready', label: 'Ready', color: 'cyan', group: 'active' },
  { id: 'launched', label: 'Launched', color: 'emerald', group: 'closed' },
  { id: 'reviewed', label: 'Reviewed', color: 'violet', group: 'closed' },
]

/** Status select options for a seeded space slug (used by P7 mission links). */
export function statusOptionsForSpaceSlug(slug: string): SchemaFieldOption[] {
  const def = SPACE_DEFS.find((d) => d.slug === slug)
  if (!def) return OPS_STATUSES
  const field = def.schema.fields.find((f) => f.id === 'status')
  return field?.options ?? OPS_STATUSES
}

// ─── SPACE_DEFS (12 spaces) ───────────────────────────────────────────────

const SPACE_DEFS: readonly SpaceDefInline[] = [
  // ─── acme / Plinthworks (2 spaces) ─────────────────────────────────────
  {
    slug: 'plinthworks-workspace',
    name: 'Plinthworks',
    description:
      'Main retainer workspace for Plinthworks — positioning, docs voice, top-of-funnel.',
    campaignSlug: 'acme',
    visibility: 'team',
    hasChannel: true,
    channelName: 'plinthworks',
    createdAt: clientPersona('acme').onboardedAt,
    schema: {
      version: 1,
      icon: 'terminal',
      fields: taskFields(ENGINEERING_STATUSES),
      views: [
        viewMissions(),
        viewKanban('Pipeline'),
        viewDocs(),
        viewCalendar(),
        viewFunnels(),
        viewChannel('#plinthworks'),
      ],
    },
    itemSeed: {
      kanbanColumns: ENGINEERING_STATUSES.map((s) => s.id),
      perColumnTaskCount: 3,
      docCount: 4,
      taskTitles: [
        'Rewrite on-call landing — operator quote on slide one',
        'Pull three customer transcripts before the docs voice pass',
        'Sketch the deflection workflow funnel for Q1 paid test',
        'Audit pipeline-as-noun usage across the docs site',
        'Run brand-voice diff against the staging changelog post',
        'Draft launch post for the rollback-fast release',
        'Tighten the self-serve onboarding email — too many adjectives',
        'Pair with Devon on the incident-graph hero animation',
        'Pull the latest Plinthworks NPS sample for next retro',
        'Rewrite the pricing page headline — name the trade-off',
        'QA the SOC2 changelog post before it goes live',
        'Decide the v2 announcement channel mix with Leo',
        'Plan the post-launch comms cadence for the docs team',
        'Strip "world-class" + "seamless" from the support copy',
        'Write the public RCA template the brand can stand behind',
      ],
      docTitles: [
        'Plinthworks — positioning v3',
        'Plinthworks — docs voice cheatsheet',
        'Plinthworks — Q4 retro notes',
        'Plinthworks — launch post draft v2',
        'Plinthworks — kill-criteria for Q1 paid',
      ],
    },
  },
  {
    slug: 'plinthworks-launch',
    name: 'Plinthworks v2 Launch',
    description: 'Cross-functional launch room for the Plinthworks v2 release.',
    campaignSlug: 'acme',
    visibility: 'team',
    hasChannel: true,
    channelName: 'plinthworks-launch',
    createdAt: dateInWeek(9, 1, 10, 0),
    schema: {
      version: 1,
      icon: 'rocket',
      fields: taskFields(LAUNCH_STATUSES),
      views: [
        viewKanban('Launch Board'),
        viewDocs(),
        viewCalendar(),
        viewIgResearch(),
        viewChannel('#plinthworks-launch'),
      ],
    },
    itemSeed: {
      kanbanColumns: LAUNCH_STATUSES.map((s) => s.id),
      perColumnTaskCount: 2,
      docCount: 3,
      taskTitles: [
        'Lock the v2 narrative — one sentence Garry would say on a podcast',
        'Reskin the launch email sequence in Plinthworks voice',
        'Coordinate launch-day timing with Plinthworks engineering',
        'Brief Casey on the v2 keyart system before lockup',
        'Stage the changelog deep-dive blog post',
        'Pressure-test the launch tweet thread with Sara',
        'Cut the launch demo video to 90 seconds',
        'Confirm pricing-page diff with the founder',
        'Line up three customer quotes for the launch landing',
        'Run pre-launch QA across staging + docs',
      ],
      docTitles: [
        'Plinthworks v2 — launch narrative',
        'Plinthworks v2 — comms calendar',
        'Plinthworks v2 — risks + kill-criteria',
        'Plinthworks v2 — post-mortem template',
      ],
    },
  },

  // ─── beta / Saltline & Co (2 spaces) ───────────────────────────────────
  {
    slug: 'saltline-workspace',
    name: 'Saltline & Co',
    description:
      'End-to-end retainer workspace for Saltline — brand voice, photography, lifecycle.',
    campaignSlug: 'beta',
    visibility: 'team',
    hasChannel: true,
    channelName: 'saltline',
    createdAt: clientPersona('beta').onboardedAt,
    schema: {
      version: 1,
      icon: 'utensils-crossed',
      fields: taskFields(PRODUCTION_STATUSES),
      views: [
        viewMissions(),
        viewKanban('Production Board'),
        viewDocs(),
        viewFunnels(),
        viewIgResearch(),
        viewChannel('#saltline'),
      ],
    },
    itemSeed: {
      kanbanColumns: PRODUCTION_STATUSES.map((s) => s.id),
      perColumnTaskCount: 3,
      docCount: 4,
      taskTitles: [
        'Brief the salt-cured table-still shoot — linen, low light, crumb',
        'Cast the slow-morning lifestyle frames for October',
        'Write the weekday-dinner story for the November pantry drop',
        'Brand-voice audit on the welcome email sequence',
        'Pull three customer review quotes for the home page',
        'Pair Casey + Sara on the recipe-card type scale',
        'Cut the small-batch product film to 45 seconds',
        'Storyboard the kitchen-counter hero series',
        'Update the gifting landing with the new olive-oil drop',
        'Run cadence check on the Saturday-morning newsletter',
        'Reshoot the glassware close-ups for shoulder-season',
        'Edit the "shared table" anthology landing page',
        'Brief the next photographer round with Casey',
        'Score the lifecycle replenishment series for Maya',
        'Draft the holiday-week brand letter',
      ],
      docTitles: [
        'Saltline — brand voice cheatsheet',
        'Saltline — photography direction Q4',
        'Saltline — pantry-drop calendar',
        'Saltline — lifecycle nurture map',
        'Saltline — pricing + bundle hypothesis',
      ],
    },
  },
  {
    slug: 'saltline-q4-launch',
    name: 'Saltline Q4 Launch',
    description:
      'Q4 launch calendar for Saltline — holiday drops, gifting, and the November anthology.',
    campaignSlug: 'beta',
    visibility: 'team',
    hasChannel: true,
    channelName: 'saltline-q4',
    createdAt: dateInWeek(8, 2, 11, 0),
    schema: {
      version: 1,
      icon: 'calendar-range',
      fields: taskFields(LAUNCH_STATUSES),
      views: [
        viewCalendar('Q4 Calendar'),
        viewKanban('Launch Board'),
        viewDocs(),
        viewChannel('#saltline-q4'),
      ],
    },
    itemSeed: {
      kanbanColumns: LAUNCH_STATUSES.map((s) => s.id),
      perColumnTaskCount: 2,
      docCount: 3,
      taskTitles: [
        'Lock the gifting-bundle photography for late October',
        'Approve the holiday landing copy with Sara + Maya',
        'Schedule the November anthology drop sequence',
        'Coordinate paid lift around the Friday small-batch drop',
        'Brief Devon on the gifting checkout flow',
        'Pull Q3 cohort data for the holiday hypothesis',
        'Pre-cut the holiday film into three social slabs',
        'Pre-write the post-launch retro template',
        'Confirm the press list for the November anthology',
        'Stage the late-November replenishment nudges',
      ],
      docTitles: [
        'Saltline Q4 — launch calendar',
        'Saltline Q4 — gifting narrative',
        'Saltline Q4 — paid spend hypothesis',
        'Saltline Q4 — retro template',
      ],
    },
  },

  // ─── gamma / Helmsmark ─────────────────────────────────────────────────
  {
    slug: 'helmsmark-workspace',
    name: 'Helmsmark',
    description:
      'Repositioning Helmsmark from small-business banking into a controllers + CFO product.',
    campaignSlug: 'gamma',
    visibility: 'team',
    hasChannel: true,
    channelName: 'helmsmark',
    createdAt: clientPersona('gamma').onboardedAt,
    schema: {
      version: 1,
      icon: 'landmark',
      fields: taskFields(FINTECH_STATUSES),
      views: [
        viewMissions(),
        viewKanban('Controller Pipeline'),
        viewDocs(),
        viewPresentations(),
        viewChannel('#helmsmark'),
      ],
    },
    itemSeed: {
      kanbanColumns: FINTECH_STATUSES.map((s) => s.id),
      perColumnTaskCount: 3,
      docCount: 4,
      taskTitles: [
        'Lock the controller-first positioning paragraph',
        'Rewrite the homepage hero in CFO language',
        'Sit in on three Helmsmark close-cycle interviews',
        'Draft the controllers landing page copy',
        'Map the audit-trail story for the new site',
        'Build the SOC 2 case study with the customer success lead',
        'Wireframe the variance dashboard reference page',
        'Pressure-test the monthly-close narrative with Nico',
        'Push the new pricing copy through compliance',
        'Audit homepage for SBA-banking-era language to retire',
        'Plan the post-Series-A launch arc with Garry',
        'Brief Devon on the trust-coded type system',
        'Run a voice diff on the help center against the new doc',
        'Outline the reconciliation playbook landing page',
        'Schedule the controller advisory roundtable invites',
      ],
      docTitles: [
        'Helmsmark — controller positioning v2',
        'Helmsmark — site narrative outline',
        'Helmsmark — case study program plan',
        'Helmsmark — post-Series-A launch arc',
        'Helmsmark — compliance review log',
      ],
    },
  },

  // ─── delta / Cloverkin Health ──────────────────────────────────────────
  {
    slug: 'cloverkin-workspace',
    name: 'Cloverkin Health',
    description: 'Brand system + member onboarding for Cloverkin clinic + virtual care launch.',
    campaignSlug: 'delta',
    visibility: 'team',
    hasChannel: true,
    channelName: 'cloverkin',
    createdAt: clientPersona('delta').onboardedAt,
    schema: {
      version: 1,
      icon: 'heart-pulse',
      fields: taskFields(HEALTHTECH_STATUSES),
      views: [
        viewMissions(),
        viewKanban('Care Board'),
        viewDocs(),
        viewPresentations(),
        viewIgResearch(),
        viewChannel('#cloverkin'),
      ],
    },
    itemSeed: {
      kanbanColumns: HEALTHTECH_STATUSES.map((s) => s.id),
      perColumnTaskCount: 3,
      docCount: 4,
      taskTitles: [
        'Draft the member onboarding email sequence (warm + plainspoken)',
        'Audit member-facing copy for revolutionary/disruptive language',
        'Sit in on two new-patient navigator calls',
        'Write the after-hours symptom-check microcopy',
        'Push the consent flow through clinical review',
        'Storyboard the first family-care landing photoshoot',
        'Draft the in-network plan reference page',
        'Pair with Casey on the care-plan visual system',
        'Rewrite the eligibility tool intro screen',
        'Build the first-visit follow-up touchpoint map',
        'Approve the brand voice cheatsheet with the clinical team',
        'Stage three metro launch landing variants',
        'Draft the navigator hand-off message template',
        'QA the new member ID card mock against clinic standards',
        'Plan the next-quarter cohort onboarding cadence',
      ],
      docTitles: [
        'Cloverkin — brand voice + clinical guardrails',
        'Cloverkin — onboarding sequence v1',
        'Cloverkin — metro launch plan',
        'Cloverkin — care-plan visual system',
        'Cloverkin — compliance review notes',
      ],
    },
  },

  // ─── epsilon / Throughput Group ────────────────────────────────────────
  {
    slug: 'throughput-workspace',
    name: 'Throughput Group',
    description: 'Service-line repackaging + outbound program targeting services-firm COOs.',
    campaignSlug: 'epsilon',
    visibility: 'team',
    hasChannel: true,
    channelName: 'throughput',
    createdAt: clientPersona('epsilon').onboardedAt,
    schema: {
      version: 1,
      icon: 'briefcase',
      fields: taskFields(SERVICES_STATUSES),
      views: [
        viewMissions(),
        viewKanban('Delivery Board'),
        viewDocs(),
        viewPresentations(),
        viewChannel('#throughput'),
      ],
    },
    itemSeed: {
      kanbanColumns: SERVICES_STATUSES.map((s) => s.id),
      perColumnTaskCount: 3,
      docCount: 4,
      taskTitles: [
        'Map the six service lines into a tight three-tier hierarchy',
        'Rewrite the proposal kit cover language',
        'Draft the COO outbound sequence v1',
        'Pull utilization + bench data for the case studies',
        'Storyboard the first practice-lead spotlight',
        'Audit the website for thought-leadership filler',
        'Wireframe the new service-line index page',
        'Build the SOW template with operator-direct voice',
        'Brief Leo on the cold-email kill-criteria',
        'Pair with Casey on the proposal type system',
        'Score the call-recording library for outbound proof points',
        'Plan the COO roundtable invite cadence',
        'Stand up the change-order template the founder will sign',
        'Audit the renewal playbook narrative for next quarter',
        'Draft the bench-utilization dashboard reference page',
      ],
      docTitles: [
        'Throughput — service-line repackage v2',
        'Throughput — COO outbound playbook',
        'Throughput — proposal kit narrative',
        'Throughput — case study program plan',
        'Throughput — change-order standard',
      ],
    },
  },

  // ─── zeta / Almanac Learning ───────────────────────────────────────────
  {
    slug: 'almanac-workspace',
    name: 'Almanac Learning',
    description: 'Brand voice + course-page system + lifecycle nurture for Almanac cohorts.',
    campaignSlug: 'zeta',
    visibility: 'team',
    hasChannel: true,
    channelName: 'almanac',
    createdAt: clientPersona('zeta').onboardedAt,
    schema: {
      version: 1,
      icon: 'book-open',
      fields: taskFields(EDUCATION_STATUSES),
      views: [
        viewMissions(),
        viewKanban('Cohort Board'),
        viewDocs(),
        viewFunnels(),
        viewIgResearch(),
        viewChannel('#almanac'),
      ],
    },
    itemSeed: {
      kanbanColumns: EDUCATION_STATUSES.map((s) => s.id),
      perColumnTaskCount: 3,
      docCount: 4,
      taskTitles: [
        'Lock the curious-and-generous voice cheatsheet',
        'Rebuild the course-page system in Sara + Casey hands',
        'Write the public reading-list intro page',
        'Sit in on two Sunday review office hours sessions',
        'Draft the applied-AI cohort landing copy',
        'Storyboard the mentor-spotlight short series',
        'Wireframe the syllabus comparison reference page',
        'Audit copy for "bite-sized" + "unlock potential" filler',
        'Plan the cohort-feedback nurture sequence',
        'Build the rubric reference visual with Casey',
        'Brief the live-session promo cadence for the writing cohort',
        'Stage the project-spotlight social cuts',
        'Score the alumni cohort interviews for proof copy',
        'Draft the post-cohort retro template',
        'Stand up the reading-list inbound capture flow',
      ],
      docTitles: [
        'Almanac — voice + tone guide',
        'Almanac — course-page system v1',
        'Almanac — reading list intro plan',
        'Almanac — cohort lifecycle nurture',
        'Almanac — applied-AI cohort plan',
      ],
    },
  },

  // ─── internal-ops (2 spaces) ────────────────────────────────────────────
  {
    slug: 'operations',
    name: 'Operations',
    description: 'Studio operations — SOPs, utilization, vendor reviews, weekly rhythm.',
    campaignSlug: 'internal-ops',
    visibility: 'team',
    hasChannel: true,
    channelName: 'operations',
    createdAt: AGENCY_FOUNDED_AT,
    schema: {
      version: 1,
      icon: 'settings',
      fields: taskFields(OPS_STATUSES),
      views: [
        viewList('Operations'),
        viewKanban('Status Board'),
        viewDocs(),
        viewChannel('#operations'),
      ],
    },
    itemSeed: {
      kanbanColumns: OPS_STATUSES.map((s) => s.id),
      perColumnTaskCount: 4,
      docCount: 4,
      taskTitles: [
        'Write the kickoff SOP — kickoff doc + cadence + retro template',
        'Audit Q3 utilization across the six retainers',
        'Renegotiate the Figma + Frame.io seats before Nov renewal',
        'Stand up the weekly partner cadence in the calendar',
        'Draft the studio retro template for first-of-month review',
        'Audit retainer-vs-project boundary on Saltline scope',
        'Pull credit-utilization for the YC demo prep',
        'Plan the next vendor audit cycle with Owen',
        'Roll out the new approvals SOP across all six retainers',
        'Standardize the deliverable handoff doc with Jules',
        'Draft the post-launch retro standard',
        'Run the bench-utilization review with Jules',
      ],
      docTitles: [
        'Foundry — kickoff SOP v2',
        'Foundry — weekly cadence playbook',
        'Foundry — vendor + tool registry',
        'Foundry — approvals SOP rewrite',
        'Foundry — retainer scope guardrails',
      ],
    },
  },
  {
    slug: 'pricing-and-margins',
    name: 'Pricing & Margins',
    description: 'Sensitive — retainer math, margin reviews, founder + Owen only.',
    campaignSlug: 'internal-ops',
    visibility: 'private',
    hasChannel: false,
    channelName: 'pricing',
    createdAt: dateInWeek(12, 1, 9, 0),
    schema: {
      version: 1,
      icon: 'banknote',
      fields: taskFields(OPS_STATUSES),
      views: [viewList('Open Items'), viewDocs()],
    },
    itemSeed: {
      kanbanColumns: OPS_STATUSES.map((s) => s.id),
      perColumnTaskCount: 0,
      docCount: 5,
      extraListTaskCount: 5,
      taskTitles: [
        'Rebuild the retainer-pricing model with Owen',
        'Pressure-test the Saltline retainer margin',
        'Decide the standard Q1 rate card with the partners',
        'Score the Throughput retainer for scope-vs-margin tension',
        'Plan the founder-only pricing review for Friday',
      ],
      docTitles: [
        'Foundry — retainer pricing model v2',
        'Foundry — margin review Q3',
        'Foundry — rate card draft Q1',
        'Foundry — pricing tension log',
        'Foundry — partner pricing decisions',
        'Foundry — confidential vendor margins',
      ],
    },
  },

  // ─── sales / Pipeline ─────────────────────────────────────────────────
  {
    slug: 'pipeline',
    name: 'Pipeline',
    description: 'Inbound + outbound sales pipeline across the studio.',
    campaignSlug: 'sales',
    visibility: 'team',
    hasChannel: true,
    channelName: 'pipeline',
    createdAt: AGENCY_FOUNDED_AT,
    schema: {
      version: 1,
      icon: 'trending-up',
      fields: taskFields(SALES_STATUSES),
      views: [
        viewKanban('Deal Stages'),
        viewList('All Deals'),
        viewDocs(),
        viewChannel('#pipeline'),
      ],
    },
    itemSeed: {
      kanbanColumns: SALES_STATUSES.map((s) => s.id),
      perColumnTaskCount: 3,
      docCount: 3,
      taskTitles: [
        'Reply to the inbound from the Brooklyn DTC operator',
        'Discovery call — fintech founder intro from Nico',
        'Send proposal to the climate-SaaS lead from last week',
        'Close the seventh-retainer conversation with Jules',
        'Disqualify the e-commerce lead with the wrong scope',
        'Stage the founder roundtable invite for prospects',
        'Send the case-study followup to the qualified-lost lead',
        'Draft the discovery questionnaire v3',
        'Book the second discovery with the AI-tooling founder',
        'Write the rejection-with-care template',
        'Score the inbound waitlist into discovery vs nurture',
        'Refresh the proposal kit hero quote pool',
        'Update the pipeline metrics dashboard with Owen',
        'Plan the partner-only pipeline review on Friday',
        'Draft the Q1 outbound experiment proposal',
        'Send the proposal-followup checkpoint to two leads',
        'Confirm the won-deal kickoff date with Jules',
        'Run the lost-deal retro with Nico',
      ],
      docTitles: [
        'Foundry — discovery questionnaire v3',
        'Foundry — proposal kit narrative',
        'Foundry — disqualification playbook',
        'Foundry — outbound experiment plan',
      ],
    },
  },

  // ─── wiki / Company Wiki ───────────────────────────────────────────────
  {
    slug: 'company-wiki',
    name: 'Company Wiki',
    description: 'Single source of truth for Foundry standards, decisions, and reference docs.',
    campaignSlug: 'wiki',
    visibility: 'team',
    hasChannel: true,
    channelName: 'wiki',
    createdAt: AGENCY_FOUNDED_AT,
    schema: {
      version: 1,
      icon: 'book',
      fields: taskFields(OPS_STATUSES),
      views: [viewDocs('Wiki'), viewList('Topic Index'), viewChannel('#wiki')],
    },
    itemSeed: {
      kanbanColumns: OPS_STATUSES.map((s) => s.id),
      perColumnTaskCount: 0,
      docCount: 12,
      extraListTaskCount: 10,
      taskTitles: [
        'Audit wiki pages for stale scope language',
        'Refresh the brand voice cheatsheet with Q4 examples',
        'Publish the updated kickoff SOP after retro',
        'Reconcile approvals SOP with the new partner gate',
        'Index the brain-domain map for new hires',
        'Retire three anti-patterns from the public wiki',
        'Draft the Q1 campaign brief template refresh',
        'Align case study standard with Throughput win',
        'Update channel-mix guide after Saltline launch',
        'Schedule the quarterly wiki hygiene review',
      ],
      docTitles: [
        'Foundry — who we are not',
        'Foundry — brand voice cheatsheet',
        'Foundry — kickoff SOP',
        'Foundry — approvals SOP',
        'Foundry — retro standard',
        'Foundry — retainer scope guardrails',
        'Foundry — agent hiring rubric',
        'Foundry — brain-domain map',
        'Foundry — campaign brief template',
        'Foundry — case study standard',
        'Foundry — channel-mix decision guide',
        'Foundry — anti-patterns to retire',
      ],
    },
  },
]

// ─── Helpers ───────────────────────────────────────────────────────────────

const KNOWN_CAMPAIGN_SLUGS: readonly string[] = [
  'acme',
  'beta',
  'gamma',
  'delta',
  'epsilon',
  'zeta',
  'internal-ops',
  'sales',
  'wiki',
]

const KNOWN_CONTACT_SLUGS: readonly string[] = [
  'acme-primary',
  'beta-primary',
  'gamma-primary',
  'delta-primary',
  'epsilon-primary',
  'zeta-primary',
]

const KNOWN_HIRED_AGENT_KEYS: readonly string[] = [
  'maya',
  'leo',
  'sara',
  'devon',
  'casey',
  'riley',
  'owen',
]

/**
 * Populate state with the deterministic IDs prior phases would have set, so a
 * single-phase dry run can execute in isolation.
 */
function populateDryRunStateIfEmpty(ctx: PhaseContext): void {
  if (!ctx.dryRun) return

  const state: PhaseState = ctx.state
  const ids = ctx.ids

  if (!state.orgId) state.orgId = ids.id('org', 'foundry-creative')
  if (!state.founderUserId) state.founderUserId = ids.id('user', 'founder')
  if (!state.hiredAgentKeys) state.hiredAgentKeys = [...KNOWN_HIRED_AGENT_KEYS]
  if (!state.contactIds) {
    state.contactIds = Object.fromEntries(
      KNOWN_CONTACT_SLUGS.map((slug) => [slug, ids.id('contact', slug)]),
    )
  }
  if (!state.campaignIds) {
    const orgId = state.orgId
    state.campaignIds = Object.fromEntries(
      KNOWN_CAMPAIGN_SLUGS.map((slug) => [slug, ids.id('campaign', orgId, slug)]),
    )
  }
  if (!state.campaignBrainIds) {
    const orgId = state.orgId
    state.campaignBrainIds = Object.fromEntries(
      KNOWN_CAMPAIGN_SLUGS.map((slug) => [slug, ids.id('ns-brain-campaign', orgId, slug)]),
    )
  }
}

interface RequiredP05State {
  orgId: string
  founderUserId: string
  campaignIds: Record<string, string>
  hiredAgentKeys: string[]
}

function requirePriorState(ctx: PhaseContext): RequiredP05State {
  const orgId = ctx.state.orgId
  const founderUserId = ctx.state.founderUserId
  const campaignIds = ctx.state.campaignIds
  const hiredAgentKeys = ctx.state.hiredAgentKeys ?? []
  if (!orgId) throw new Error(`${PHASE_ID}: missing state.orgId (set by P01).`)
  if (!founderUserId) throw new Error(`${PHASE_ID}: missing state.founderUserId (set by P01).`)
  if (!campaignIds) throw new Error(`${PHASE_ID}: missing state.campaignIds (set by P05).`)
  for (const slug of KNOWN_CAMPAIGN_SLUGS) {
    if (!campaignIds[slug]) {
      throw new Error(`${PHASE_ID}: state.campaignIds is missing "${slug}" (set by P05).`)
    }
  }
  return { orgId, founderUserId, campaignIds, hiredAgentKeys }
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'item'
  )
}

interface BuiltSpaceItem {
  id: string
  space_id: string
  org_id: string
  user_id: string
  title: string
  status: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignee_type: 'human' | 'agent'
  assignee_id: string
  source: 'manual'
  due_date: string | null
  custom_data: Record<string, unknown>
  sort_order: number
  created_at: string
  updated_at: string
}

const PRIORITY_CYCLE: readonly ('low' | 'medium' | 'high' | 'urgent')[] = [
  'medium',
  'high',
  'medium',
  'low',
  'urgent',
  'high',
  'medium',
]

function buildSpaceItems(
  ctx: PhaseContext,
  def: SpaceDefInline,
  spaceId: string,
  orgId: string,
  founderUserId: string,
  hiredAgentKeys: string[],
): BuiltSpaceItem[] {
  const { ids, timeline } = ctx
  const { iso, jitterWithin, dayOffset } = timeline
  const out: BuiltSpaceItem[] = []
  const start = def.createdAt
  const end = dayOffset(0, 18, 0)
  const agentPool = hiredAgentKeys.length > 0 ? hiredAgentKeys : ['maya']
  let cursor = 0

  function pickAssignee(idx: number): { type: 'human' | 'agent'; id: string } {
    if (idx % 5 === 0) return { type: 'human', id: founderUserId }
    const agent = agentPool[idx % agentPool.length] ?? agentPool[0]!
    return { type: 'agent', id: agent }
  }

  function pickPriority(idx: number): 'low' | 'medium' | 'high' | 'urgent' {
    return PRIORITY_CYCLE[idx % PRIORITY_CYCLE.length] ?? 'medium'
  }

  function pickDueDateIso(createdAt: Date, seedKey: string): string {
    const daysAhead = Math.floor(seededRandom(`${seedKey}:due`) * 40) - 5
    return iso(after(createdAt, daysAhead, 17, 0))
  }

  function pushTask(title: string, status: string | null): void {
    const seedKey = `${def.slug}:task:${status ?? 'list'}:${cursor}:${title}`
    const itemId = ids.id('space-item', spaceId, slugify(`${status ?? 'list'}-${cursor}-${title}`))
    const at = jitterWithin(start, end, seedKey)
    const atIso = iso(at)
    const assignee = pickAssignee(cursor)
    out.push({
      id: itemId,
      space_id: spaceId,
      org_id: orgId,
      user_id: founderUserId,
      title,
      status,
      priority: pickPriority(cursor),
      assignee_type: assignee.type,
      assignee_id: assignee.id,
      source: 'manual',
      due_date: pickDueDateIso(at, seedKey),
      custom_data: {
        assignee_agent_key: assignee.type === 'agent' ? assignee.id : null,
        tags: [def.campaignSlug],
      },
      sort_order: cursor * 100,
      created_at: atIso,
      updated_at: atIso,
    })
    cursor += 1
  }

  function pushDoc(title: string, idx: number): void {
    const seedKey = `${def.slug}:doc:${idx}:${title}`
    const itemId = ids.id('space-item', spaceId, slugify(`doc-${idx}-${title}`))
    const at = jitterWithin(start, end, seedKey)
    const atIso = iso(at)
    const assignee = pickAssignee(cursor)
    out.push({
      id: itemId,
      space_id: spaceId,
      org_id: orgId,
      user_id: founderUserId,
      title,
      status: 'doc',
      priority: 'medium',
      assignee_type: assignee.type,
      assignee_id: assignee.id,
      source: 'manual',
      due_date: null,
      custom_data: {
        _view_type: 'doc',
        body: `# ${title}\n\nWorking notes — synced from the ${def.name} retainer.`,
        assignee_agent_key: assignee.type === 'agent' ? assignee.id : null,
        tags: [def.campaignSlug, 'doc'],
      },
      sort_order: cursor * 100,
      created_at: atIso,
      updated_at: atIso,
    })
    cursor += 1
  }

  // 1) Kanban tasks distributed across statuses round-robin.
  if (def.itemSeed.perColumnTaskCount > 0 && def.itemSeed.kanbanColumns.length > 0) {
    const titles = def.itemSeed.taskTitles
    const seenTitles = new Set<string>()
    let titleIdx = 0
    for (const status of def.itemSeed.kanbanColumns) {
      for (let i = 0; i < def.itemSeed.perColumnTaskCount; i += 1) {
        const base =
          titles[titleIdx % Math.max(titles.length, 1)] ?? `${def.name} task ${cursor + 1}`
        let title = base
        let suffix = 1
        while (seenTitles.has(title)) {
          suffix += 1
          title = `${base} (${suffix})`
        }
        seenTitles.add(title)
        pushTask(title, status)
        titleIdx += 1
      }
    }
  }

  // 2) Extra list-only tasks (used when the space leans on a list view, e.g. pricing).
  const extra = def.itemSeed.extraListTaskCount ?? 0
  if (extra > 0) {
    const titles = def.itemSeed.taskTitles
    for (let i = 0; i < extra; i += 1) {
      const title = titles[i % Math.max(titles.length, 1)] ?? `${def.name} item ${i + 1}`
      const status =
        def.itemSeed.kanbanColumns[i % Math.max(def.itemSeed.kanbanColumns.length, 1)] ?? null
      pushTask(title, status)
    }
  }

  // 3) Doc-shaped items.
  if (def.itemSeed.docCount > 0) {
    for (let i = 0; i < def.itemSeed.docCount; i += 1) {
      const base =
        def.itemSeed.docTitles[i % Math.max(def.itemSeed.docTitles.length, 1)] ??
        `${def.name} doc ${i + 1}`
      const title = i < def.itemSeed.docTitles.length ? base : `${base} — pass ${i + 1}`
      pushDoc(title, i)
    }
  }

  return out
}

// ─── Phase handler ─────────────────────────────────────────────────────────

export const runP06Spaces: PhaseHandler = async (ctx) => {
  const r = startResult(PHASE_ID)
  ctx.log.step('P6 — spaces + schemas + space_items + in-space channels')

  populateDryRunStateIfEmpty(ctx)
  const { orgId, founderUserId, campaignIds, hiredAgentKeys } = requirePriorState(ctx)

  if (ctx.reset) {
    ctx.log.step('Reset mode: P01 already cascaded teardown of org spaces; proceeding.')
  }

  ctx.state.spaceIds = ctx.state.spaceIds ?? {}
  ctx.state.spaceChannelIds = ctx.state.spaceChannelIds ?? {}

  const rowCounts: Record<string, number> = {
    spaces: 0,
    space_items: 0,
    channels: 0,
  }

  for (const def of SPACE_DEFS) {
    const campaignId = campaignIds[def.campaignSlug]
    if (!campaignId) {
      throw new Error(
        `${PHASE_ID}: missing campaignId for slug "${def.campaignSlug}" (space "${def.slug}").`,
      )
    }
    const spaceId = ctx.ids.id('space', orgId, def.slug)
    ctx.state.spaceIds[def.slug] = spaceId

    const createdAtIso = ctx.timeline.iso(def.createdAt)

    let channelId: string | null = null
    if (def.hasChannel) {
      channelId = ctx.ids.id('channel', orgId, def.slug)
      ctx.state.spaceChannelIds[def.slug] = channelId
    }

    const schemaForInsert =
      channelId != null ? wireSpaceChannelViews(def.schema, channelId) : def.schema

    const spaceRow = {
      id: spaceId,
      org_id: orgId,
      user_id: founderUserId,
      title: def.name,
      description: def.description,
      campaign_id: campaignId,
      is_template: false,
      visibility: def.visibility,
      schema: schemaForInsert as unknown as Record<string, unknown>,
      created_at: createdAtIso,
      updated_at: createdAtIso,
    }

    const items = buildSpaceItems(ctx, def, spaceId, orgId, founderUserId, hiredAgentKeys)

    if (ctx.dryRun) {
      ctx.log.step(
        `  [dry-run] space "${def.slug}" (campaign=${def.campaignSlug}) id=${spaceId} views=${def.schema.views
          .map((v) => v.type)
          .join(',')} items=${items.length} channel=${channelId ?? 'none'}`,
      )
      rowCounts.spaces = (rowCounts.spaces ?? 0) + 1
      rowCounts.space_items = (rowCounts.space_items ?? 0) + items.length
      if (channelId) rowCounts.channels = (rowCounts.channels ?? 0) + 1
      continue
    }

    // 1) Upsert space (deterministic id + explicit campaign_id bypasses the
    //    set_space_campaign_to_general trigger that fires only when null).
    const { error: spaceErr } = await ctx.supabase
      .from('spaces')
      .upsert(spaceRow, { onConflict: 'id', ignoreDuplicates: false })
    if (spaceErr) {
      throw new Error(`${PHASE_ID}: upsert space "${def.slug}" failed: ${spaceErr.message}`)
    }
    rowCounts.spaces = (rowCounts.spaces ?? 0) + 1

    // 2) Upsert space_items in chunks (no per-item activity — P10 backfills it).
    if (items.length > 0) {
      const CHUNK = 100
      for (let i = 0; i < items.length; i += CHUNK) {
        const chunk = items.slice(i, i + CHUNK)
        const { error: itemErr } = await ctx.supabase
          .from('space_items')
          .upsert(chunk, { onConflict: 'id', ignoreDuplicates: false })
        if (itemErr) {
          throw new Error(
            `${PHASE_ID}: upsert space_items for "${def.slug}" failed (chunk ${i}): ${itemErr.message}`,
          )
        }
      }
      rowCounts.space_items = (rowCounts.space_items ?? 0) + items.length
    }

    // 3) Upsert the in-space channel (P8 will append messages).
    if (channelId) {
      const channelRow = {
        id: channelId,
        org_id: orgId,
        user_id: founderUserId,
        name: def.channelName,
        description: `In-space channel for ${def.name}.`,
        is_private: def.visibility === 'private',
        metadata: { space_id: spaceId, source: 'yc-demo-seeder' },
        created_at: createdAtIso,
        updated_at: createdAtIso,
      }
      const { error: chanErr } = await ctx.supabase
        .from('channels')
        .upsert(channelRow, { onConflict: 'id', ignoreDuplicates: false })
      if (chanErr) {
        throw new Error(`${PHASE_ID}: upsert channel "${def.slug}" failed: ${chanErr.message}`)
      }
      rowCounts.channels = (rowCounts.channels ?? 0) + 1
    }
  }

  ctx.log.step(
    `Created ${rowCounts.spaces} spaces, ${rowCounts.space_items} space_items, ${rowCounts.channels} in-space channels`,
  )

  return r.finish(rowCounts)
}
