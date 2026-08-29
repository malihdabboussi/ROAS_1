import { describe, expect, it } from 'vitest'
import {
  appendCampaignEvidenceReceipt,
  formatCampaignIntelligenceResearch,
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

  it('keeps reporting canonical and Brain contextual in the research contract', () => {
    const content = formatCampaignIntelligenceResearch('campaign-1', [
      {
        name: 'get_campaign_main_dashboard',
        action: 'get_campaign_main_dashboard',
        label: 'dashboard',
        status: 'completed',
        result: { fetched_at: '2026-08-29T12:00:00.000Z', kpis: { roas: 2.4 } },
      },
      {
        name: 'search_campaign_brain',
        action: 'search_campaign_brain',
        label: 'brain',
        status: 'completed',
        result: { results: [{ content: 'Budget was approved.' }] },
      },
    ])

    expect(JSON.parse(content)).toMatchObject({
      routing_contract: {
        canonical_source: 'campaign_reporting',
        as_of: '2026-08-29T12:00:00.000Z',
        brain_context: { results: [{ content: 'Budget was approved.' }] },
      },
      live_campaign_dashboard: { kpis: { roas: 2.4 } },
    })
  })

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
})
