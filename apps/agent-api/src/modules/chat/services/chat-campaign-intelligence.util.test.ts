import { describe, expect, it } from 'vitest'
import {
  appendCampaignEvidenceReceipt,
  formatCampaignStatus,
  isCampaignStatusRequest,
} from './chat-campaign-intelligence.util'

describe('campaign intelligence routing', () => {
  it.each([
    'What is the status of this live campaign?',
    'How are the ads performing today?',
    'Show me current ROAS and lead numbers.',
  ])('recognizes a live status question: %s', (text) => {
    expect(isCampaignStatusRequest(text)).toBe(true)
  })

  it.each(['Write a campaign brief', 'Launch the ads', 'What tasks are assigned to me?'])(
    'does not hijack a non-status request: %s',
    (text) => {
      expect(isCampaignStatusRequest(text)).toBe(false)
    },
  )

  it('appends a deterministic source, freshness, Brain, and task receipt', () => {
    const content = appendCampaignEvidenceReceipt('Campaign performance is flat.', [
      {
        name: 'get_campaign_main_dashboard',
        action: 'get_campaign_main_dashboard',
        label: 'dashboard',
        status: 'completed',
        result: {
          canonical_source: {
            system: 'campaign_reporting',
            owner: 'main_dashboard',
          },
          as_of: '2026-08-29T12:00:00.000Z',
        },
      },
      {
        name: 'search_campaign_brain',
        action: 'search_campaign_brain',
        label: 'brain',
        status: 'completed',
        result: { results: [] },
      },
      {
        name: 'list_tasks',
        action: 'list_tasks',
        label: 'tasks',
        status: 'completed',
        result: { tasks: [{ id: 'task-1' }], total_count: 4 },
      },
    ])

    expect(content).toContain('**Evidence**')
    expect(content).toContain('campaign_reporting / main_dashboard')
    expect(content).toContain('2026-08-29T12:00:00.000Z')
    expect(content).toContain('Campaign Brain: 0 relevant context')
    expect(content).toContain('Open campaign tasks: 4 open tasks')
  })

  it('formats campaign status without inferring causes from zero reporting', () => {
    const content = formatCampaignStatus([
      {
        name: 'get_campaign_main_dashboard',
        action: 'get_campaign_main_dashboard',
        label: 'dashboard',
        status: 'completed',
        result: {
          canonical_source: { system: 'campaign_reporting', owner: 'main_dashboard' },
          as_of: '2026-08-29T12:00:00.000Z',
          overview: { leads: 0, visitors: 0, conversion_rate: 0 },
          sources: {
            funnels: { visitors: 0, leads: 0 },
            emails: { sent: 0, opened: 0, clicked: 0 },
            ads: { total_ads: 0, ad_visitors: 0, ad_leads: 0 },
            social: { reach: 0, post_count: 0 },
          },
          alerts: [{ level: 'critical', source: 'cross', message: 'No activity recorded.' }],
          partial: { funnels: true, emails: false },
        },
      },
      {
        name: 'search_campaign_brain',
        action: 'search_campaign_brain',
        label: 'brain',
        status: 'completed',
        result: { results: [] },
      },
      {
        name: 'list_tasks',
        action: 'list_tasks',
        label: 'tasks',
        status: 'completed',
        result: { tasks: [], total_count: 0 },
      },
    ])

    expect(content).toContain('| Leads | 0 |')
    expect(content).toContain('CRITICAL · cross: No activity recorded.')
    expect(content).toContain('Partial reporting: funnels.')
    expect(content).toContain('not treated as proof that campaign assets are inactive')
    expect(content).toContain('campaign_reporting / main_dashboard')
  })
})
