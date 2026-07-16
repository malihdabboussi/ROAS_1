import type { SpaceTemplateSeed } from './space-template-catalog.types'
import {
  CLIENT_STATUSES,
  docBody,
  taskFields,
  viewCalendar,
  viewChannel,
  viewDocs,
  viewKanban,
  viewMissions,
  welcomeDocBody,
} from './space-template-catalog-builders'

/** Agency webinar client fulfillment — ships with Webinar Fulfillment mission playbook. */
export const AGENCY_CLIENT_WEBINAR_TEMPLATES: SpaceTemplateSeed[] = [
  {
    slug: 'agency-client-webinar',
    title: 'Agency Client (Webinar)',
    description:
      'Fulfill a webinar client end-to-end — Missions playbook, strategy docs, copy package, creative pack, and a private channel.',
    icon: 'megaphone',
    icon_color: 'violet',
    category: 'tier1_universal',
    persona: 'agency',
    badge: 'New',
    featured: true,
    is_new: true,
    sort_order: 21,
    channel_name: 'client-comms',
    channel_description: 'Internal channel for this webinar client.',
    schema: {
      version: 1,
      icon: 'megaphone',
      fields: taskFields(CLIENT_STATUSES),
      views: [
        viewMissions(),
        viewKanban('Deliverables', 'deliverables'),
        viewCalendar(),
        viewDocs(),
        viewChannel('#client-comms'),
      ],
    },
    items: [
      {
        kind: 'doc',
        title: 'Welcome — how to run webinar fulfillment',
        body: welcomeDocBody('Agency Client (Webinar)', [
          '**Missions → Start playbook** — run Webinar Fulfillment (strategy → gate → copy → creative)',
          '**Deliverables (Kanban)** — track brief → paid for client-facing packages',
          '**Docs** — Pre-Call map, Strategy v2, THE PLAN, Copy Package, Creative Pack',
          '**Calendar** — call dates and launch deadlines',
          '**Channel** — internal client comms',
        ]),
        sort_order: 0,
      },
      {
        kind: 'doc',
        title: 'Pre-Call Strategy Map',
        body: docBody([
          '## Pre-Call Strategy Map',
          '',
          'Filled by the Webinar Fulfillment playbook (Phase A / skill 1).',
          '',
          '- Suggested offers',
          '- Suggested avatars',
          '- Confirm-or-correct call agenda',
          '- Portal pre-fill notes',
        ]),
        sort_order: 1,
      },
      {
        kind: 'doc',
        title: 'Strategy v2',
        body: docBody([
          '## Strategy v2',
          '',
          'Post-call corrected strategy (Phase A / skill 2).',
          '',
          '- What changed after the call',
          '- Locked offer + avatar',
          '- Constraints and proof',
        ]),
        sort_order: 2,
      },
      {
        kind: 'doc',
        title: 'THE PLAN — Launch Brief',
        body: docBody([
          '## THE PLAN',
          '',
          'Launch brief for production (Phase A / skill 3).',
          '',
          '- Webinar promise',
          '- Funnel path',
          '- Asset list for copy + creative',
        ]),
        sort_order: 3,
      },
      {
        kind: 'doc',
        title: 'Copy Package',
        body: docBody([
          '## Copy Package',
          '',
          'Phase B (skills TBD) — topics, emails, Meta ads, scripts, landing page copy.',
        ]),
        sort_order: 4,
      },
      {
        kind: 'doc',
        title: 'Creative Pack',
        body: docBody([
          '## Creative Pack',
          '',
          'Phase C (skills TBD) — static ads, theme images, landing visuals, deck.',
        ]),
        sort_order: 5,
      },
      {
        kind: 'task',
        title: 'Start Webinar Fulfillment playbook',
        status: 'brief',
        description: 'Open Missions → Start playbook → Webinar Fulfillment and fill kickoff fields.',
        sort_order: 6,
      },
    ],
    automations: [],
  },
]
