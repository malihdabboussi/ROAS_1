/**
 * Phase registry — single source of truth for the execution order.
 *
 * The order here IS the runtime order. The split P3 / P7.5 ordering is
 * encoded by the position of these entries (see plan section 7).
 */
import type { PhaseDefinition } from './_context'
import { runP01Account } from './01-account'
import { runP02BrainsSkeleton } from './02-brains-skeleton'
import { runP03aAnchors } from './03a-anchors'
import { runP03b1PreArtifacts } from './03b1-pre-artifacts'
import { runP03b2Cortex } from './03b2-cortex'
import { runP04Team } from './04-team'
import { runP05Campaigns } from './05-campaigns'
import { runP06Spaces } from './06-spaces'
import { runP07_5aAdleyExtract } from './07_5a-adley-extract'
import { runP07_5bReskin } from './07_5b-reskin'
import { runP07_5cAvatars } from './07_5c-avatars'
import { runP07_5dCuratedShowcase } from './07_5d-curated-showcase'
import { runP07Missions } from './07-missions'
import { runP08Channels } from './08-channels'
import { runP09Integrations } from './09-integrations'
import { runP10Polish } from './10-polish'
import { runP10cAgentConversations } from './10c-agent-conversations'
import { runP10dPlinthworksWebinarSequence } from './10d-plinthworks-webinar-sequence'
import { runP10eClientDemoSequences } from './10e-client-demo-sequences'
import { runP10fIgResearch } from './10f-ig-research'
import { runP11AtlasFresh } from './11-atlas-fresh'
import { runP12Verify } from './12-verify'

export const PHASE_REGISTRY: readonly PhaseDefinition[] = [
  {
    id: '01-account',
    name: 'Accounts + Org + Credits',
    description: '3 humans (founder + Nico + Jules), org, 50k credits',
    handler: runP01Account,
  },
  {
    id: '02-brains-skeleton',
    name: 'Brains skeleton',
    description: 'cortex_max ON, company brain, customer brain',
    handler: runP02BrainsSkeleton,
  },
  {
    id: '04-team',
    name: 'Team hires',
    description:
      '7 named agent hires + agent_teams + grants (must precede 03a-anchors since SK entries need agent brains)',
    handler: runP04Team,
  },
  {
    id: '03a-anchors',
    name: 'Anchor brain content',
    description:
      '~130 user memories, ~40 snapshots, contacts, cortex object anchors, SK entries, narrative pages',
    handler: runP03aAnchors,
  },
  {
    id: '05-campaigns',
    name: 'Campaigns',
    description: '9 campaigns + campaign_nodes + campaign_agents',
    handler: runP05Campaigns,
  },
  {
    id: '06-spaces',
    name: 'Spaces',
    description: 'Per-campaign spaces with hand-authored schema + space_items',
    handler: runP06Spaces,
  },
  {
    id: '07-missions',
    name: 'Missions',
    description: '~30 missions + subtasks + deliverables across timeline',
    handler: runP07Missions,
  },
  {
    id: '03b1-pre-artifacts',
    name: 'Pre-artifact derivation',
    description:
      'Ambient memories, edges, beliefs, perspectives, 7 customer_avatars, narrative_links, sessions, sk_evolution',
    handler: runP03b1PreArtifacts,
  },
  {
    id: '07_5a-adley-extract',
    name: 'Adley template extraction',
    description: 'READ-ONLY dump from prod → .cache/adley-prod-dump.json',
    handler: runP07_5aAdleyExtract,
  },
  {
    id: '07_5b-reskin',
    name: 'Reskin templates for 6 fictional clients',
    description:
      'Clone Adley templates per client with copy substitutions; scrub identifying tokens',
    handler: runP07_5bReskin,
  },
  {
    id: '07_5c-avatars',
    name: 'Brain-derived marketing avatars + deliverable backfill',
    description:
      'Marketing avatars derived from customer_avatars; mission_deliverables ↔ artifact FKs',
    handler: runP07_5cAvatars,
  },
  {
    id: '07_5d-curated-showcase',
    name: 'Curated showcase artifacts',
    description:
      'Reskin 6 hand-picked Adley presentations/funnels into Foundry demo clients (standalone)',
    handler: runP07_5dCuratedShowcase,
  },
  {
    id: '08-channels',
    name: 'Channels + 90 days of messages',
    description: 'Per-space channels + memberships + threaded messages referencing artifacts',
    handler: runP08Channels,
  },
  {
    id: '03b2-cortex',
    name: 'Post-channel cortex derivation',
    description:
      '~90 dream runs, ~280 signals citing channel_messages, cortex log, pending_captures, lived-in counters',
    handler: runP03b2Cortex,
  },
  {
    id: '09-integrations',
    name: 'Integrations façade',
    description: 'user_integrations + agent_channels for Slack/Telegram/Notion/Linear/X',
    handler: runP09Integrations,
  },
  {
    id: '10-polish',
    name: 'Polish',
    description: 'Profile + avatar + space_item_activity backfill',
    handler: runP10Polish,
  },
  {
    id: '10c-agent-conversations',
    name: 'Agent conversations',
    description: 'Titled 1:1 agent chats + messages for Recent Conversations',
    handler: runP10cAgentConversations,
  },
  {
    id: '10d-plinthworks-webinar-sequence',
    name: 'Plinthworks webinar sequence',
    description: '5-email on-call webinar reminder + funnel conversion workflow link',
    handler: runP10dPlinthworksWebinarSequence,
  },
  {
    id: '10e-client-demo-sequences',
    name: 'Client demo sequences',
    description:
      'Almanac mentor matching, Saltline pantry welcome, Cloverkin onboarding, Throughput COO outbound',
    handler: runP10eClientDemoSequences,
  },
  {
    id: '10f-ig-research',
    name: 'IG Research demo views',
    description:
      'Instagram Research views + tracked competitor accounts on Saltline, Almanac, Plinthworks, Cloverkin spaces',
    handler: runP10fIgResearch,
  },
  {
    id: '11-atlas-fresh',
    name: 'Atlas freshness (optional)',
    description:
      'Enqueue fresh dream + pattern_analysis + avatar_synthesis (requires mission-worker)',
    handler: runP11AtlasFresh,
  },
  {
    id: '12-verify',
    name: 'Verify + credentials',
    description: 'Assert 19 connectivity invariants + print credentials block',
    handler: runP12Verify,
  },
]

export const OPTIONAL_PHASE_IDS = ['07_5d-curated-showcase', '09-integrations', '11-atlas-fresh']

export const DEFAULT_PHASE_IDS = PHASE_REGISTRY.map((p) => p.id).filter(
  (id) => !OPTIONAL_PHASE_IDS.includes(id),
)
