'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'

// ── VS Code syntax colors ─────────────────────────────────────────────────────
const C = {
  h1: '#4fc1ff',
  h2: '#4ec9b0',
  bold: '#dcdcaa',
  text: '#d4d4d4',
  dim: '#5a5a5a',
  green: '#6a9955',
  orange: '#ce9178',
  lineNum: '#3d3d3d',
}

const STAGGER_S = 0.4

// ── Skill card data ───────────────────────────────────────────────────────────
type SkillCardDef = {
  name: string
  lines: Array<{ raw: string; node: React.ReactNode }>
  badges: Array<{ label: string; color: string; bg: string; border: string }>
  accentColor: string
}

const SKILLS: SkillCardDef[] = [
  {
    name: 'Lead Magnet Funnel',
    accentColor: 'rgb(52 211 153)',
    lines: [
      {
        raw: '# Lead Magnet Funnel',
        node: (
          <>
            <span style={{ color: C.dim }}># </span>
            <span style={{ color: C.h1, fontWeight: 700 }}>Lead Magnet Funnel</span>
          </>
        ),
      },
      {
        raw: '## Inputs',
        node: (
          <>
            <span style={{ color: C.dim }}>## </span>
            <span style={{ color: C.h2, fontWeight: 600 }}>Inputs</span>
          </>
        ),
      },
      {
        raw: '- **offer** — value prop',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.bold }}>**offer**</span>
            <span style={{ color: C.text }}> — value prop</span>
          </>
        ),
      },
      {
        raw: '- **audience** — ICP',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.bold }}>**audience**</span>
            <span style={{ color: C.text }}> — ICP</span>
          </>
        ),
      },
      {
        raw: '- **goal** — subscribers/wk',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.bold }}>**goal**</span>
            <span style={{ color: C.text }}> — subscribers/wk</span>
          </>
        ),
      },
      {
        raw: 'Reads: Notion brief, GDrive pdf',
        node: (
          <>
            <span style={{ color: C.green }}>Reads: </span>
            <span style={{ color: C.orange }}>notion_brief</span>
            <span style={{ color: C.text }}>, </span>
            <span style={{ color: C.orange }}>gdrive_asset</span>
          </>
        ),
      },
    ],
    badges: [
      {
        label: 'Landing Page',
        color: 'rgb(96 165 250)',
        bg: 'rgb(96 165 250 / 0.1)',
        border: 'rgb(96 165 250 / 0.2)',
      },
      {
        label: 'Email',
        color: 'rgb(251 146 60)',
        bg: 'rgb(251 146 60 / 0.1)',
        border: 'rgb(251 146 60 / 0.2)',
      },
      {
        label: 'Google',
        color: 'rgb(52 211 153)',
        bg: 'rgb(52 211 153 / 0.1)',
        border: 'rgb(52 211 153 / 0.2)',
      },
    ],
  },
  {
    name: 'Webinar Registration',
    accentColor: 'rgb(251 146 60)',
    lines: [
      {
        raw: '# Webinar Registration',
        node: (
          <>
            <span style={{ color: C.dim }}># </span>
            <span style={{ color: C.h1, fontWeight: 700 }}>Webinar Registration</span>
          </>
        ),
      },
      {
        raw: '## Structure',
        node: (
          <>
            <span style={{ color: C.dim }}>## </span>
            <span style={{ color: C.h2, fontWeight: 600 }}>Structure</span>
          </>
        ),
      },
      {
        raw: '- **goal** — seat registrations',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.bold }}>**goal**</span>
            <span style={{ color: C.text }}> — seat registrations</span>
          </>
        ),
      },
      {
        raw: '- Registration + confirm page',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>Registration + confirm page</span>
          </>
        ),
      },
      {
        raw: '- Reminder email sequence',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>Reminder email sequence</span>
          </>
        ),
      },
      {
        raw: 'Reads: HubSpot lists, brand_voice',
        node: (
          <>
            <span style={{ color: C.green }}>Reads: </span>
            <span style={{ color: C.orange }}>hubspot_segments</span>
            <span style={{ color: C.text }}>, </span>
            <span style={{ color: C.orange }}>brand_voice</span>
          </>
        ),
      },
    ],
    badges: [
      {
        label: 'HubSpot',
        color: 'rgb(249 115 22)',
        bg: 'rgb(249 115 22 / 0.1)',
        border: 'rgb(249 115 22 / 0.2)',
      },
      {
        label: 'Landing',
        color: 'rgb(96 165 250)',
        bg: 'rgb(96 165 250 / 0.1)',
        border: 'rgb(96 165 250 / 0.2)',
      },
      {
        label: 'Email',
        color: 'rgb(251 146 60)',
        bg: 'rgb(251 146 60 / 0.1)',
        border: 'rgb(251 146 60 / 0.2)',
      },
    ],
  },
  {
    name: 'Product Launch',
    accentColor: 'rgb(192 132 252)',
    lines: [
      {
        raw: '# Product Launch',
        node: (
          <>
            <span style={{ color: C.dim }}># </span>
            <span style={{ color: C.h1, fontWeight: 700 }}>Product Launch</span>
          </>
        ),
      },
      {
        raw: '## Structure',
        node: (
          <>
            <span style={{ color: C.dim }}>## </span>
            <span style={{ color: C.h2, fontWeight: 600 }}>Structure</span>
          </>
        ),
      },
      {
        raw: '- Pre-launch tease sequence',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>Pre-launch tease sequence</span>
          </>
        ),
      },
      {
        raw: '- Launch day email + page',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>Launch day email + page</span>
          </>
        ),
      },
      {
        raw: '- Post-launch follow-up',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>Post-launch follow-up</span>
          </>
        ),
      },
      {
        raw: 'Writes: Zapier webhook → CRM',
        node: (
          <>
            <span style={{ color: C.green }}>Writes: </span>
            <span style={{ color: C.orange }}>zapier_hook</span>
            <span style={{ color: C.text }}> → lists</span>
          </>
        ),
      },
    ],
    badges: [
      {
        label: 'Zapier',
        color: 'rgb(255 100 50)',
        bg: 'rgb(255 100 50 / 0.12)',
        border: 'rgb(255 100 50 / 0.25)',
      },
      {
        label: 'Funnel',
        color: 'rgb(96 165 250)',
        bg: 'rgb(96 165 250 / 0.1)',
        border: 'rgb(96 165 250 / 0.2)',
      },
      {
        label: 'Social',
        color: 'rgb(192 132 252)',
        bg: 'rgb(192 132 252 / 0.1)',
        border: 'rgb(192 132 252 / 0.2)',
      },
    ],
  },
  {
    name: 'CRM Pipeline Nurture',
    accentColor: 'rgb(249 115 22)',
    lines: [
      {
        raw: '# CRM Pipeline Nurture',
        node: (
          <>
            <span style={{ color: C.dim }}># </span>
            <span style={{ color: C.h1, fontWeight: 700 }}>CRM Pipeline Nurture</span>
          </>
        ),
      },
      {
        raw: '## Triggers',
        node: (
          <>
            <span style={{ color: C.dim }}>## </span>
            <span style={{ color: C.h2, fontWeight: 600 }}>Triggers</span>
          </>
        ),
      },
      {
        raw: '- Stage = MQL → **content** drip',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>Stage = MQL → </span>
            <span style={{ color: C.bold }}>**content**</span>
            <span style={{ color: C.text }}> drip</span>
          </>
        ),
      },
      {
        raw: '- Owner handoff note to AE',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>Owner handoff note to AE</span>
          </>
        ),
      },
      {
        raw: '- Airtable cohort tags sync',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>Airtable cohort tags sync</span>
          </>
        ),
      },
      {
        raw: 'Reads: HubSpot deals, contacts',
        node: (
          <>
            <span style={{ color: C.green }}>Reads: </span>
            <span style={{ color: C.orange }}>hubspot_deals</span>
            <span style={{ color: C.text }}>, </span>
            <span style={{ color: C.orange }}>contacts</span>
          </>
        ),
      },
    ],
    badges: [
      {
        label: 'HubSpot',
        color: 'rgb(249 115 22)',
        bg: 'rgb(249 115 22 / 0.1)',
        border: 'rgb(249 115 22 / 0.2)',
      },
      {
        label: 'Airtable',
        color: 'rgb(253 171 91)',
        bg: 'rgb(253 171 91 / 0.12)',
        border: 'rgb(253 171 91 / 0.25)',
      },
      {
        label: 'Analysis',
        color: 'rgb(167 139 250)',
        bg: 'rgb(167 139 250 / 0.1)',
        border: 'rgb(167 139 250 / 0.2)',
      },
    ],
  },
  {
    name: 'Paid Media Push',
    accentColor: 'rgb(96 165 250)',
    lines: [
      {
        raw: '# Paid Media Push',
        node: (
          <>
            <span style={{ color: C.dim }}># </span>
            <span style={{ color: C.h1, fontWeight: 700 }}>Paid Media Push</span>
          </>
        ),
      },
      {
        raw: '## Outputs',
        node: (
          <>
            <span style={{ color: C.dim }}>## </span>
            <span style={{ color: C.h2, fontWeight: 600 }}>Outputs</span>
          </>
        ),
      },
      {
        raw: '- Meta + Google creative variants',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>Meta + Google creative variants</span>
          </>
        ),
      },
      {
        raw: '- Audience seed from Interest graph',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>Audience seed from Interest graph</span>
          </>
        ),
      },
      {
        raw: '- UTMs + naming for tracking',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>UTMs + naming for tracking</span>
          </>
        ),
      },
      {
        raw: 'Writes: Meta Ads, Google Ads',
        node: (
          <>
            <span style={{ color: C.green }}>Writes: </span>
            <span style={{ color: C.orange }}>meta_ads</span>
            <span style={{ color: C.text }}>, </span>
            <span style={{ color: C.orange }}>google_ads</span>
          </>
        ),
      },
    ],
    badges: [
      {
        label: 'Meta',
        color: 'rgb(24 119 242)',
        bg: 'rgb(24 119 242 / 0.12)',
        border: 'rgb(24 119 242 / 0.22)',
      },
      {
        label: 'Google Ads',
        color: 'rgb(52 168 83)',
        bg: 'rgb(52 168 83 / 0.12)',
        border: 'rgb(52 168 83 / 0.22)',
      },
      {
        label: 'Ads',
        color: 'rgb(96 165 250)',
        bg: 'rgb(96 165 250 / 0.1)',
        border: 'rgb(96 165 250 / 0.2)',
      },
    ],
  },
  {
    name: 'Checkout & Revenue',
    accentColor: 'rgb(52 211 153)',
    lines: [
      {
        raw: '# Checkout & Revenue',
        node: (
          <>
            <span style={{ color: C.dim }}># </span>
            <span style={{ color: C.h1, fontWeight: 700 }}>Checkout & Revenue</span>
          </>
        ),
      },
      {
        raw: '## Flow',
        node: (
          <>
            <span style={{ color: C.dim }}>## </span>
            <span style={{ color: C.h2, fontWeight: 600 }}>Flow</span>
          </>
        ),
      },
      {
        raw: '- Stripe + PayPal offer pages',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>Stripe + PayPal offer pages</span>
          </>
        ),
      },
      {
        raw: '- Receipt + dunning copy pack',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>Receipt + dunning copy pack</span>
          </>
        ),
      },
      {
        raw: '- Finance rollup: net vs gross',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>Finance rollup: net vs gross</span>
          </>
        ),
      },
      {
        raw: 'Reads: stripe_charges, paypal_txn',
        node: (
          <>
            <span style={{ color: C.green }}>Reads: </span>
            <span style={{ color: C.orange }}>stripe_charges</span>
            <span style={{ color: C.text }}>, </span>
            <span style={{ color: C.orange }}>paypal_txn</span>
          </>
        ),
      },
    ],
    badges: [
      {
        label: 'Stripe',
        color: 'rgb(99 91 255)',
        bg: 'rgb(99 91 255 / 0.12)',
        border: 'rgb(99 91 255 / 0.22)',
      },
      {
        label: 'PayPal',
        color: 'rgb(0 112 186)',
        bg: 'rgb(0 112 186 / 0.12)',
        border: 'rgb(0 112 186 / 0.22)',
      },
      {
        label: 'Finance',
        color: 'rgb(52 211 153)',
        bg: 'rgb(52 211 153 / 0.1)',
        border: 'rgb(52 211 153 / 0.2)',
      },
    ],
  },
  {
    name: 'Ops Command Digest',
    accentColor: 'rgb(244 114 182)',
    lines: [
      {
        raw: '# Ops Command Digest',
        node: (
          <>
            <span style={{ color: C.dim }}># </span>
            <span style={{ color: C.h1, fontWeight: 700 }}>Ops Command Digest</span>
          </>
        ),
      },
      {
        raw: '## Cadence',
        node: (
          <>
            <span style={{ color: C.dim }}>## </span>
            <span style={{ color: C.h2, fontWeight: 600 }}>Cadence</span>
          </>
        ),
      },
      {
        raw: '- Daily: missions blocked + owners',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>Daily: missions blocked + owners</span>
          </>
        ),
      },
      {
        raw: '- Slack recap with deep links',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>Slack recap with deep links</span>
          </>
        ),
      },
      {
        raw: '- FanBasis drops → notify channel',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>FanBasis drops → notify channel</span>
          </>
        ),
      },
      {
        raw: 'Writes: slack_channel posts',
        node: (
          <>
            <span style={{ color: C.green }}>Writes: </span>
            <span style={{ color: C.orange }}>slack_channel</span>
            <span style={{ color: C.text }}> posts</span>
          </>
        ),
      },
    ],
    badges: [
      {
        label: 'Slack',
        color: 'rgb(74 21 75)',
        bg: 'rgb(224 178 208 / 0.15)',
        border: 'rgb(244 114 182 / 0.35)',
      },
      {
        label: 'FanBasis',
        color: 'rgb(251 113 133)',
        bg: 'rgb(251 113 133 / 0.12)',
        border: 'rgb(251 113 133 / 0.25)',
      },
      {
        label: 'Ops',
        color: 'rgb(244 114 182)',
        bg: 'rgb(244 114 182 / 0.1)',
        border: 'rgb(244 114 182 / 0.2)',
      },
    ],
  },
  {
    name: 'Executive Report Pack',
    accentColor: 'rgb(129 140 248)',
    lines: [
      {
        raw: '# Executive Report Pack',
        node: (
          <>
            <span style={{ color: C.dim }}># </span>
            <span style={{ color: C.h1, fontWeight: 700 }}>Executive Report Pack</span>
          </>
        ),
      },
      {
        raw: '## Metrics',
        node: (
          <>
            <span style={{ color: C.dim }}>## </span>
            <span style={{ color: C.h2, fontWeight: 600 }}>Metrics</span>
          </>
        ),
      },
      {
        raw: '- Google Analytics + Ads ROAS blend',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>Google Analytics + Ads ROAS blend</span>
          </>
        ),
      },
      {
        raw: '- Cohort curves + CAC snapshot',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>Cohort curves + CAC snapshot</span>
          </>
        ),
      },
      {
        raw: '- Notion exec summary page',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>Notion exec summary page</span>
          </>
        ),
      },
      {
        raw: 'Reads: ga4_export, ad_accounts',
        node: (
          <>
            <span style={{ color: C.green }}>Reads: </span>
            <span style={{ color: C.orange }}>ga4_export</span>
            <span style={{ color: C.text }}>, </span>
            <span style={{ color: C.orange }}>ad_accounts</span>
          </>
        ),
      },
    ],
    badges: [
      {
        label: 'Google',
        color: 'rgb(66 133 244)',
        bg: 'rgb(66 133 244 / 0.12)',
        border: 'rgb(66 133 244 / 0.22)',
      },
      {
        label: 'Notion',
        color: 'rgb(235 235 235)',
        bg: 'rgb(255 255 255 / 0.08)',
        border: 'rgb(255 255 255 / 0.15)',
      },
      {
        label: 'Reports',
        color: 'rgb(129 140 248)',
        bg: 'rgb(129 140 248 / 0.1)',
        border: 'rgb(129 140 248 / 0.2)',
      },
    ],
  },
  {
    name: 'LinkedIn ABM Touches',
    accentColor: 'rgb(59 130 246)',
    lines: [
      {
        raw: '# LinkedIn ABM Touches',
        node: (
          <>
            <span style={{ color: C.dim }}># </span>
            <span style={{ color: C.h1, fontWeight: 700 }}>LinkedIn ABM Touches</span>
          </>
        ),
      },
      {
        raw: '## Sequence',
        node: (
          <>
            <span style={{ color: C.dim }}>## </span>
            <span style={{ color: C.h2, fontWeight: 600 }}>Sequence</span>
          </>
        ),
      },
      {
        raw: '- Account list from **ICP** tier',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>Account list from </span>
            <span style={{ color: C.bold }}>**ICP**</span>
            <span style={{ color: C.text }}> tier</span>
          </>
        ),
      },
      {
        raw: '- InMail + connection templates',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>InMail + connection templates</span>
          </>
        ),
      },
      {
        raw: '- Sync replies → HubSpot tasks',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>Sync replies → HubSpot tasks</span>
          </>
        ),
      },
      {
        raw: 'Writes: linkedin_sponsored, tasks',
        node: (
          <>
            <span style={{ color: C.green }}>Writes: </span>
            <span style={{ color: C.orange }}>linkedin_sponsored</span>
            <span style={{ color: C.text }}>, tasks</span>
          </>
        ),
      },
    ],
    badges: [
      {
        label: 'LinkedIn',
        color: 'rgb(10 102 194)',
        bg: 'rgb(10 102 194 / 0.14)',
        border: 'rgb(10 102 194 / 0.28)',
      },
      {
        label: 'HubSpot',
        color: 'rgb(249 115 22)',
        bg: 'rgb(249 115 22 / 0.1)',
        border: 'rgb(249 115 22 / 0.2)',
      },
      {
        label: 'B2B',
        color: 'rgb(59 130 246)',
        bg: 'rgb(59 130 246 / 0.1)',
        border: 'rgb(59 130 246 / 0.2)',
      },
    ],
  },
  {
    name: 'Winback & Dunning',
    accentColor: 'rgb(248 113 113)',
    lines: [
      {
        raw: '# Winback & Dunning',
        node: (
          <>
            <span style={{ color: C.dim }}># </span>
            <span style={{ color: C.h1, fontWeight: 700 }}>Winback & Dunning</span>
          </>
        ),
      },
      {
        raw: '## Signals',
        node: (
          <>
            <span style={{ color: C.dim }}>## </span>
            <span style={{ color: C.h2, fontWeight: 600 }}>Signals</span>
          </>
        ),
      },
      {
        raw: '- Failed renewal / card decline',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>Failed renewal / card decline</span>
          </>
        ),
      },
      {
        raw: '- 3-step save + clear next step',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>3-step save + clear next step</span>
          </>
        ),
      },
      {
        raw: '- Finance note → refund policy',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>Finance note → refund policy</span>
          </>
        ),
      },
      {
        raw: 'Reads: stripe_invoices',
        node: (
          <>
            <span style={{ color: C.green }}>Reads: </span>
            <span style={{ color: C.orange }}>stripe_invoices</span>
            <span style={{ color: C.text }}>, churn_risk</span>
          </>
        ),
      },
    ],
    badges: [
      {
        label: 'Stripe',
        color: 'rgb(99 91 255)',
        bg: 'rgb(99 91 255 / 0.12)',
        border: 'rgb(99 91 255 / 0.22)',
      },
      {
        label: 'Email',
        color: 'rgb(251 146 60)',
        bg: 'rgb(251 146 60 / 0.1)',
        border: 'rgb(251 146 60 / 0.2)',
      },
      {
        label: 'Finance',
        color: 'rgb(248 113 113)',
        bg: 'rgb(248 113 113 / 0.1)',
        border: 'rgb(248 113 113 / 0.2)',
      },
    ],
  },
  {
    name: 'Competitive Brief',
    accentColor: 'rgb(34 211 238)',
    lines: [
      {
        raw: '# Competitive Brief',
        node: (
          <>
            <span style={{ color: C.dim }}># </span>
            <span style={{ color: C.h1, fontWeight: 700 }}>Competitive Brief</span>
          </>
        ),
      },
      {
        raw: '## Sources',
        node: (
          <>
            <span style={{ color: C.dim }}>## </span>
            <span style={{ color: C.h2, fontWeight: 600 }}>Sources</span>
          </>
        ),
      },
      {
        raw: '- Pricing + positioning scrape',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>Pricing + positioning scrape</span>
          </>
        ),
      },
      {
        raw: '- Battlecard one-pager',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>Battlecard one-pager</span>
          </>
        ),
      },
      {
        raw: '- Notion page + Slack ping',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>Notion page + Slack ping</span>
          </>
        ),
      },
      {
        raw: 'Writes: notion_page',
        node: (
          <>
            <span style={{ color: C.green }}>Writes: </span>
            <span style={{ color: C.orange }}>notion_page</span>
            <span style={{ color: C.text }}>, slack_thread</span>
          </>
        ),
      },
    ],
    badges: [
      {
        label: 'Notion',
        color: 'rgb(235 235 235)',
        bg: 'rgb(255 255 255 / 0.08)',
        border: 'rgb(255 255 255 / 0.15)',
      },
      {
        label: 'Slack',
        color: 'rgb(244 114 182)',
        bg: 'rgb(244 114 182 / 0.1)',
        border: 'rgb(244 114 182 / 0.25)',
      },
      {
        label: 'Analysis',
        color: 'rgb(34 211 238)',
        bg: 'rgb(34 211 238 / 0.1)',
        border: 'rgb(34 211 238 / 0.2)',
      },
    ],
  },
  {
    name: 'SEO Content Cluster',
    accentColor: 'rgb(163 230 53)',
    lines: [
      {
        raw: '# SEO Content Cluster',
        node: (
          <>
            <span style={{ color: C.dim }}># </span>
            <span style={{ color: C.h1, fontWeight: 700 }}>SEO Content Cluster</span>
          </>
        ),
      },
      {
        raw: '## Pillar plan',
        node: (
          <>
            <span style={{ color: C.dim }}>## </span>
            <span style={{ color: C.h2, fontWeight: 600 }}>Pillar plan</span>
          </>
        ),
      },
      {
        raw: '- Pillar + 6 spoke briefs',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>Pillar + 6 spoke briefs</span>
          </>
        ),
      },
      {
        raw: '- Internal link map + schema',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>Internal link map + schema</span>
          </>
        ),
      },
      {
        raw: '- GSC queries → outline order',
        node: (
          <>
            <span style={{ color: C.dim }}>- </span>
            <span style={{ color: C.text }}>GSC queries → outline order</span>
          </>
        ),
      },
      {
        raw: 'Reads: ga4_landing, gsc_queries',
        node: (
          <>
            <span style={{ color: C.green }}>Reads: </span>
            <span style={{ color: C.orange }}>search_console</span>
            <span style={{ color: C.text }}>, </span>
            <span style={{ color: C.orange }}>brain_topics</span>
          </>
        ),
      },
    ],
    badges: [
      {
        label: 'Google',
        color: 'rgb(66 133 244)',
        bg: 'rgb(66 133 244 / 0.12)',
        border: 'rgb(66 133 244 / 0.22)',
      },
      {
        label: 'Content',
        color: 'rgb(163 230 53)',
        bg: 'rgb(163 230 53 / 0.12)',
        border: 'rgb(163 230 53 / 0.25)',
      },
      {
        label: 'SEO',
        color: 'rgb(134 239 172)',
        bg: 'rgb(134 239 172 / 0.1)',
        border: 'rgb(134 239 172 / 0.22)',
      },
    ],
  },
]

/** Titles of the premade skills shown in the library mockup — use beside the deck for a readable list. */
export const MARKETING_PREMADE_SKILL_LIBRARY_NAMES: readonly string[] = SKILLS.map((s) => s.name)

// Scattered layout — full 480px shell; mix of `top` + `bottom` anchors so the lower band isn’t empty
const CARD_LAYOUT = [
  { zIndex: 10, style: { left: '1%', top: '2%', transform: 'rotate(-2.6deg)' } },
  { zIndex: 20, style: { left: '50%', top: '0%', transform: 'rotate(3.1deg)' } },
  { zIndex: 30, style: { left: '62%', top: '11%', transform: 'rotate(-1.4deg)' } },
  { zIndex: 40, style: { left: '7%', top: '20%', transform: 'rotate(2.3deg)' } },
  { zIndex: 50, style: { left: '38%', top: '15%', transform: 'rotate(-2.9deg)' } },
  { zIndex: 60, style: { left: '0%', top: '32%', transform: 'rotate(1.1deg)' } },
  { zIndex: 70, style: { left: '54%', top: '28%', transform: 'rotate(-0.9deg)' } },
  { zIndex: 80, style: { left: '67%', top: '38%', transform: 'rotate(2.7deg)' } },
  { zIndex: 90, style: { left: '11%', top: '44%', transform: 'rotate(-2.1deg)' } },
  { zIndex: 100, style: { left: '41%', top: '40%', transform: 'rotate(1.6deg)' } },
  { zIndex: 110, style: { left: '3%', bottom: '3%', transform: 'rotate(-1.2deg)' } },
  { zIndex: 120, style: { left: '46%', bottom: '2%', transform: 'rotate(2.2deg)' } },
] as const

function SkillMiniCard({
  skill,
  layout,
  delay,
}: {
  skill: SkillCardDef
  layout: (typeof CARD_LAYOUT)[number]
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card absolute w-[260px] overflow-hidden"
      style={{
        ...layout.style,
        zIndex: layout.zIndex,
        border: '1px solid rgba(255,255,255,0.09)',
      }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span
          className="h-5 w-0.5 shrink-0 rounded-full"
          style={{ background: skill.accentColor }}
          aria-hidden
        />
        <span className="min-w-0 truncate text-[10px] font-semibold text-white/70">
          {skill.name}
        </span>
      </div>

      <div
        className="px-3 py-2.5"
        style={{ fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace" }}
      >
        {skill.lines.map((line, i) => (
          <div
            key={line.raw}
            style={{ display: 'flex', gap: 8, height: 16, lineHeight: '16px', fontSize: 10 }}
          >
            <span
              style={{
                width: 14,
                textAlign: 'right',
                flexShrink: 0,
                color: C.lineNum,
                fontSize: 9,
              }}
            >
              {i + 1}
            </span>
            <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{line.node}</span>
          </div>
        ))}
      </div>

      <div
        className="flex flex-wrap gap-1 px-3 pb-2.5"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 7 }}
      >
        {skill.badges.map(({ label, color, bg, border }) => (
          <span
            key={label}
            className="rounded px-1.5 py-0.5 text-[8px] font-semibold"
            style={{ color, background: bg, border: `1px solid ${border}` }}
          >
            {label}
          </span>
        ))}
      </div>
    </motion.div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export type MarketingSkillStackMockupProps = {
  /** No panel border / brain grid — flush on parent (e.g. pitch deck `#09090b`). */
  embedTransparent?: boolean
}

export function MarketingSkillStackMockup({
  embedTransparent = false,
}: MarketingSkillStackMockupProps = {}) {
  const inner = (
    <div className="relative h-full min-h-[480px] w-full">
      {SKILLS.map((skill, i) => (
        <SkillMiniCard
          key={skill.name}
          skill={skill}
          layout={CARD_LAYOUT[i]!}
          delay={i * STAGGER_S}
        />
      ))}
    </div>
  )

  if (embedTransparent) {
    return <div className="relative w-full overflow-hidden bg-transparent">{inner}</div>
  }

  return (
    <FeatureFloatingMockShell className="!h-[480px] overflow-hidden">
      {inner}
    </FeatureFloatingMockShell>
  )
}
