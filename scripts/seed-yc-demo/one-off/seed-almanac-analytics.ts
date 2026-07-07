#!/usr/bin/env tsx
/**
 * One-off: Almanac Learning campaign analytics demo data + Analytics layout.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { ids } from '../lib/ids'

const ORG_ID = '9fb9a0c1-7ce1-4d1a-9b4d-e68817e8f800'
const USER_ID = 'ea216be9-d4c1-501a-b74e-4daf55e8d2ff'
const CAMPAIGN_ID = '655f8f5b-041b-5abc-94a2-0c9952652fe8'
const FUNNEL_ID = '7039a580-e382-58ed-a71b-d49f6a6a7ec4'
const FUNNEL_PAGE_ID = '23748a79-6778-5d76-9c48-7a2b9cb0d40e'
const SEQUENCE_ID = 'bbf7116f-e310-5fda-9c39-07cd40bf001e'
const VIEW_OVERRIDE_ID = 'a333cebc-141c-40c3-9a47-f48fc34e8229'
const AD_CAMPAIGN_ID = '37c386e8-24aa-5bbc-9049-66b23cf434f6'

const VISITOR_COUNT = 583
const LEAD_COUNT = 48
const AD_LEAD_COUNT = 14

const FIRST_NAMES = [
  'Mira',
  'Jonah',
  'Priya',
  'Elliot',
  'Sofia',
  'Noah',
  'Leah',
  'Omar',
  'Clara',
  'Theo',
  'Nina',
  'Ezra',
  'Hana',
  'Felix',
  'Rosa',
  'Ivan',
  'Zoe',
  'Miles',
  'Ava',
  'Leo',
  'Iris',
  'Caleb',
  'Maya',
  'Ren',
]

const LAST_NAMES = [
  'Nguyen',
  'Patel',
  'Brooks',
  'Kim',
  'Santos',
  'Reed',
  'Okafor',
  'Lindstrom',
  'Morales',
  'Chen',
  'Walsh',
  'Park',
  'Diaz',
  'Fischer',
  'Grant',
  'Ali',
  'Torres',
  'Shah',
  'Bauer',
  'Cole',
  'Hayes',
  'Moss',
  'Vega',
  'Stone',
]

function loadDotEnv(): void {
  const envPath = resolve(process.cwd(), 'apps/api/.env')
  const raw = readFileSync(envPath, 'utf8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

function daysAgo(n: number, hour = 12): Date {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  d.setUTCHours(hour, 0, 0, 0)
  return d
}

function iso(d: Date): string {
  return d.toISOString()
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

const REPORTING_CONFIG = {
  chart_type: 'area',
  time_range: '30d',
  visible_kpis: [
    'ovcw_h_almanac_snap',
    'kpi_visitors',
    'kpi_leads',
    'kpi_conversion',
    'kpi_email_open',
    'ovcw_h_almanac_channels',
    'card_funnels',
    'card_emails',
    'card_ads',
    'card_social',
    'ovcw_h_almanac_trends',
    'card_unified_trend',
    'card_contribution',
    'ovcw_h_almanac_funnel',
    'card_top_funnels',
    'card_funnel_dropoff',
    'ovcw_h_almanac_audience',
    'kpi_new_contacts',
    'kpi_lead_customer',
    'card_customer_journey',
    'ovcw_h_almanac_delivery',
    'card_mission_status',
    'kpi_missions_active',
    'kpi_mission_completion',
    'kpi_missions_blocked',
    'ovcw_h_almanac_alerts',
    'card_alerts',
  ],
  overview_custom_widgets: [
    {
      id: 'ovcw_h_almanac_snap',
      kind: 'heading',
      title: 'Writing cohort — last 30 days',
      subtitle: 'Enrollment checkout · mentor nurture · applied-AI cohort landing',
    },
    {
      id: 'ovcw_h_almanac_channels',
      kind: 'heading',
      title: 'By channel',
      subtitle: 'Where enrollments and opens are coming from',
    },
    {
      id: 'ovcw_h_almanac_trends',
      kind: 'heading',
      title: 'Trends',
      subtitle: 'Daily visitors, leads, and email opens',
    },
    {
      id: 'ovcw_h_almanac_funnel',
      kind: 'heading',
      title: 'Funnel performance',
      subtitle: 'Checkout page and drop-off',
    },
    {
      id: 'ovcw_h_almanac_audience',
      kind: 'heading',
      title: 'Audience',
      subtitle: 'Contacts entering the cohort pipeline',
    },
    {
      id: 'ovcw_h_almanac_delivery',
      kind: 'heading',
      title: 'Delivery',
      subtitle: 'Active missions on this retainer',
    },
    {
      id: 'ovcw_h_almanac_alerts',
      kind: 'heading',
      title: 'Alerts',
      subtitle: 'Thresholds worth a second look',
    },
  ],
  overview_dashboard_layout: [
    { i: 'ovcw_h_almanac_snap', x: 0, y: 0, w: 12, h: 4 },
    { i: 'kpi_visitors', x: 0, y: 5, w: 3, h: 14 },
    { i: 'kpi_leads', x: 3, y: 5, w: 3, h: 14 },
    { i: 'kpi_conversion', x: 6, y: 5, w: 3, h: 14 },
    { i: 'kpi_email_open', x: 9, y: 5, w: 3, h: 14 },
    { i: 'ovcw_h_almanac_channels', x: 0, y: 20, w: 12, h: 4 },
    { i: 'card_funnels', x: 0, y: 25, w: 3, h: 22 },
    { i: 'card_emails', x: 3, y: 25, w: 3, h: 22 },
    { i: 'card_ads', x: 6, y: 25, w: 3, h: 22 },
    { i: 'card_social', x: 9, y: 25, w: 3, h: 22 },
    { i: 'ovcw_h_almanac_trends', x: 0, y: 48, w: 12, h: 4 },
    { i: 'card_unified_trend', x: 0, y: 53, w: 8, h: 36 },
    { i: 'card_contribution', x: 8, y: 53, w: 4, h: 36 },
    { i: 'ovcw_h_almanac_funnel', x: 0, y: 90, w: 12, h: 4 },
    { i: 'card_top_funnels', x: 0, y: 95, w: 6, h: 40 },
    { i: 'card_funnel_dropoff', x: 6, y: 95, w: 6, h: 40 },
    { i: 'ovcw_h_almanac_audience', x: 0, y: 136, w: 12, h: 4 },
    { i: 'kpi_new_contacts', x: 0, y: 141, w: 3, h: 14 },
    { i: 'kpi_lead_customer', x: 3, y: 141, w: 3, h: 14 },
    { i: 'card_customer_journey', x: 6, y: 141, w: 6, h: 32 },
    { i: 'ovcw_h_almanac_delivery', x: 0, y: 174, w: 12, h: 4 },
    { i: 'card_mission_status', x: 0, y: 179, w: 12, h: 16 },
    { i: 'kpi_missions_active', x: 0, y: 196, w: 3, h: 14 },
    { i: 'kpi_mission_completion', x: 3, y: 196, w: 3, h: 14 },
    { i: 'kpi_missions_blocked', x: 6, y: 196, w: 3, h: 14 },
    { i: 'ovcw_h_almanac_alerts', x: 0, y: 211, w: 12, h: 4 },
    { i: 'card_alerts', x: 0, y: 216, w: 12, h: 20 },
  ],
}

async function main(): Promise<void> {
  loadDotEnv()
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

  const supabase = createClient(url, key, { auth: { persistSession: false } })

  const demoLeadIds = Array.from({ length: LEAD_COUNT }, (_, i) =>
    ids.id('lead', ORG_ID, 'almanac-cohort', String(i)),
  )
  const demoContactIds = Array.from({ length: LEAD_COUNT }, (_, i) =>
    ids.id('contact', ORG_ID, 'almanac-cohort', String(i)),
  )
  const demoMembershipIds = Array.from({ length: LEAD_COUNT }, (_, i) =>
    ids.id('contact-campaign', ORG_ID, 'almanac-cohort', String(i)),
  )
  const demoPageViewIds = Array.from({ length: VISITOR_COUNT }, (_, i) =>
    ids.id('visitor-page-view', ORG_ID, 'almanac', String(i)),
  )
  const demoEmailSendIds: string[] = []
  for (let i = 0; i < LEAD_COUNT; i++) {
    demoEmailSendIds.push(ids.id('email-send', ORG_ID, 'almanac-cohort', String(i), '0'))
    if (i < 28)
      demoEmailSendIds.push(ids.id('email-send', ORG_ID, 'almanac-cohort', String(i), '1'))
  }

  await supabase.from('email_sends').delete().in('id', demoEmailSendIds)
  await supabase.from('contact_campaign_memberships').delete().in('id', demoMembershipIds)
  await supabase.from('leads').delete().in('id', demoLeadIds)
  await supabase
    .from('contacts')
    .delete()
    .eq('user_id', USER_ID)
    .like('email', '%@demo.almanaclearning.test')
  await supabase.from('contacts').delete().in('id', demoContactIds)
  for (const batch of chunk(demoPageViewIds, 100)) {
    await supabase.from('visitors_page_views').delete().in('id', batch)
  }

  const { data: overrideRow, error: overrideFetchErr } = await supabase
    .from('space_view_overrides')
    .select('overrides')
    .eq('id', VIEW_OVERRIDE_ID)
    .single()
  if (overrideFetchErr) throw overrideFetchErr

  const prevOverrides =
    overrideRow?.overrides && typeof overrideRow.overrides === 'object'
      ? (overrideRow.overrides as Record<string, unknown>)
      : {}

  const { error: overrideErr } = await supabase
    .from('space_view_overrides')
    .update({
      overrides: {
        ...prevOverrides,
        name: 'Analytics',
        reporting_config: REPORTING_CONFIG,
      },
    })
    .eq('id', VIEW_OVERRIDE_ID)
  if (overrideErr) throw overrideErr

  const pageViews: Record<string, unknown>[] = []
  for (let i = 0; i < VISITOR_COUNT; i++) {
    const dayOffset = i % 30
    const isAd = i < Math.floor(VISITOR_COUNT * 0.38)
    const viewedAt = daysAgo(dayOffset, 8 + (i % 12))
    pageViews.push({
      id: ids.id('visitor-page-view', ORG_ID, 'almanac', String(i)),
      user_id: USER_ID,
      campaign_id: CAMPAIGN_ID,
      funnel_id: FUNNEL_ID,
      funnel_page_id: FUNNEL_PAGE_ID,
      page_type: 'opt-in',
      visitor_hash: `almanac-demo-vh-${String(i).padStart(4, '0')}`,
      utm_source: isAd ? 'facebook' : i % 3 === 0 ? 'newsletter' : 'organic',
      utm_medium: isAd ? 'paid' : 'referral',
      utm_campaign: 'writing-cohort-spring',
      utm_content: isAd ? 'carousel-mentor-quote' : null,
      viewed_at: iso(viewedAt),
      created_at: iso(viewedAt),
    })
  }

  for (const batch of chunk(pageViews, 100)) {
    const { error } = await supabase.from('visitors_page_views').upsert(batch, { onConflict: 'id' })
    if (error) throw new Error(`visitors_page_views: ${error.message}`)
  }

  const leads: Record<string, unknown>[] = []
  const leadEmails: string[] = []
  const emailSends: Record<string, unknown>[] = []

  for (let i = 0; i < LEAD_COUNT; i++) {
    const dayOffset = 2 + (i % 26)
    const createdAt = daysAgo(dayOffset, 10 + (i % 8))
    const first = FIRST_NAMES[i % FIRST_NAMES.length]!
    const last = LAST_NAMES[i % LAST_NAMES.length]!
    const email = `cohort.enrollee+${String(i + 1).padStart(2, '0')}@demo.almanaclearning.test`
    const visitorHash = `almanac-demo-vh-${String(500 + i).padStart(4, '0')}`
    const isAdLead = i < AD_LEAD_COUNT

    const leadId = ids.id('lead', ORG_ID, 'almanac-cohort', String(i))
    leadEmails.push(email)

    leads.push({
      id: leadId,
      user_id: USER_ID,
      org_id: ORG_ID,
      funnel_id: FUNNEL_ID,
      campaign_id: CAMPAIGN_ID,
      email,
      name: `${first} ${last}`,
      visitor_id: visitorHash,
      source_domain: 'almanaclearning.org',
      page_slug: '/',
      utm: {
        utm_source: isAdLead ? 'facebook' : 'newsletter',
        utm_medium: isAdLead ? 'paid' : 'email',
        utm_campaign: 'writing-cohort-spring',
      },
      ad_campaign_id: isAdLead ? AD_CAMPAIGN_ID : null,
      ad_id: null,
      created_at: iso(createdAt),
      updated_at: iso(createdAt),
    })

    const sendAt = new Date(createdAt.getTime() + 2 * 60 * 60 * 1000)
    const opened = i % 5 !== 0
    const clicked = opened && i % 3 === 0
    emailSends.push({
      id: ids.id('email-send', ORG_ID, 'almanac-cohort', String(i), '0'),
      user_id: USER_ID,
      org_id: ORG_ID,
      lead_id: leadId,
      sequence_id: SEQUENCE_ID,
      from_email: 'cohort@almanaclearning.org',
      subject: 'Your writing cohort starts soon — mentor match in progress',
      status: 'delivered',
      sent_at: iso(sendAt),
      delivered_at: iso(sendAt),
      opened_at: opened ? iso(new Date(sendAt.getTime() + 6 * 60 * 60 * 1000)) : null,
      clicked_at: clicked ? iso(new Date(sendAt.getTime() + 8 * 60 * 60 * 1000)) : null,
      created_at: iso(sendAt),
      updated_at: iso(sendAt),
    })

    if (i < 28) {
      const secondSend = new Date(sendAt.getTime() + 72 * 60 * 60 * 1000)
      emailSends.push({
        id: ids.id('email-send', ORG_ID, 'almanac-cohort', String(i), '1'),
        user_id: USER_ID,
        org_id: ORG_ID,
        lead_id: leadId,
        sequence_id: SEQUENCE_ID,
        from_email: 'cohort@almanaclearning.org',
        subject: 'Meet Elena — your mentor for this cohort',
        status: 'delivered',
        sent_at: iso(secondSend),
        delivered_at: iso(secondSend),
        opened_at: i % 4 !== 0 ? iso(new Date(secondSend.getTime() + 4 * 60 * 60 * 1000)) : null,
        clicked_at: null,
        created_at: iso(secondSend),
        updated_at: iso(secondSend),
      })
    }
  }

  for (const batch of chunk(leads, 50)) {
    const { error } = await supabase.from('leads').upsert(batch, { onConflict: 'id' })
    if (error) throw new Error(`leads: ${error.message}`)
  }

  const { data: contactRows, error: contactLookupErr } = await supabase
    .from('contacts')
    .select('id, email')
    .eq('user_id', USER_ID)
    .in('email', leadEmails)
  if (contactLookupErr) throw contactLookupErr
  const contactIdByEmail = new Map(
    (contactRows ?? []).map((r) => [r.email as string, r.id as string]),
  )

  const contactUpdates: Record<string, unknown>[] = []
  const funnelMemberships: Record<string, unknown>[] = []
  for (let i = 0; i < LEAD_COUNT; i++) {
    const email = leadEmails[i]!
    const contactId = contactIdByEmail.get(email)
    if (!contactId) throw new Error(`contact not found for ${email}`)
    const leadRow = leads[i] as {
      name: string
      created_at: string
      utm?: { utm_source?: string }
    }
    const [first, ...rest] = leadRow.name.split(' ')
    const last = rest.join(' ') || 'Enrollee'
    const isAd = i < AD_LEAD_COUNT
    const createdAt = leadRow.created_at
    contactUpdates.push({
      id: contactId,
      user_id: USER_ID,
      org_id: ORG_ID,
      first_name: first,
      last_name: last,
      contact_type: 'lead',
      contact_source: isAd ? 'paid_social' : 'funnel',
      tags: ['writing-cohort', 'yc-demo', 'almanac-cohort'],
      custom_fields: {
        demo: true,
        cohort: 'writing-spring',
        funnel_slug: 'zeta-writing-cohort-checkout',
      },
      updated_at: createdAt,
    })
    funnelMemberships.push({
      id: ids.id('contact-funnel', ORG_ID, 'almanac-cohort', String(i)),
      user_id: USER_ID,
      contact_id: contactId,
      funnel_id: FUNNEL_ID,
      first_seen_at: createdAt,
      last_seen_at: createdAt,
      metadata: { demo: true },
      created_at: createdAt,
      updated_at: createdAt,
    })
  }

  for (const batch of chunk(contactUpdates, 50)) {
    const { error } = await supabase.from('contacts').upsert(batch, { onConflict: 'id' })
    if (error) throw new Error(`contacts org sync: ${error.message}`)
  }

  for (const batch of chunk(funnelMemberships, 50)) {
    const { error } = await supabase
      .from('contact_funnel_memberships')
      .upsert(batch, { onConflict: 'id' })
    if (error) throw new Error(`contact_funnel_memberships: ${error.message}`)
  }

  const memberships: Record<string, unknown>[] = []
  for (let i = 0; i < LEAD_COUNT; i++) {
    const email = leadEmails[i]!
    const contactId = contactIdByEmail.get(email)
    if (!contactId) throw new Error(`contact not found for ${email}`)
    const createdAt = daysAgo(2 + (i % 26), 10 + (i % 8))
    memberships.push({
      id: ids.id('contact-campaign', ORG_ID, 'almanac-cohort', String(i)),
      user_id: USER_ID,
      contact_id: contactId,
      campaign_id: CAMPAIGN_ID,
      source_funnel_id: FUNNEL_ID,
      first_seen_at: iso(createdAt),
      last_seen_at: iso(createdAt),
      last_source_domain: 'almanaclearning.org',
      last_page_slug: '/',
      metadata: { demo: true, cohort: 'writing-spring' },
      created_at: iso(createdAt),
      updated_at: iso(createdAt),
    })
  }

  for (const batch of chunk(memberships, 50)) {
    const { error } = await supabase
      .from('contact_campaign_memberships')
      .upsert(batch, { onConflict: 'id' })
    if (error) throw new Error(`contact_campaign_memberships: ${error.message}`)
  }

  for (const batch of chunk(emailSends, 50)) {
    const { error } = await supabase.from('email_sends').upsert(batch, { onConflict: 'id' })
    if (error) throw new Error(`email_sends: ${error.message}`)
  }

  const { data: analytics } = await supabase.rpc('get_campaign_analytics', {
    p_campaign_id: CAMPAIGN_ID,
    p_start_date: iso(daysAgo(30)),
    p_end_date: iso(new Date()),
  })

  console.log(
    JSON.stringify(
      {
        layout: 'updated',
        visitors_page_views: VISITOR_COUNT,
        leads: LEAD_COUNT,
        contacts: contactRows?.length ?? 0,
        memberships: LEAD_COUNT,
        email_sends: emailSends.length,
        analytics,
      },
      null,
      2,
    ),
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
