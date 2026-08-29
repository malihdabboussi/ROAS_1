import { describe, expect, it, vi } from 'vitest'
import {
  makeChatStreamExecutionInput as makeRunInput,
  makeChatStreamExecutionService as makeService,
} from './chat-stream-execution.service.test-helpers'

describe('campaign intelligence execution', () => {
  it('deterministically combines live reporting, Brain context, and campaign tasks', async () => {
    const progressiveSend = vi.fn(async () => undefined)
    const executeAction = vi.fn(async (action: string) => {
      if (action === 'get_campaign_main_dashboard') {
        return {
          fetched_at: '2026-08-29T12:00:00.000Z',
          canonical_source: { system: 'campaign_reporting', owner: 'main_dashboard' },
          as_of: '2026-08-29T12:00:00.000Z',
          overview: { leads: 18, visitors: 240, conversion_rate: 7.5 },
          sources: {
            funnels: { visitors: 240, leads: 18 },
            emails: { sent: 100, opened: 40, clicked: 8 },
            ads: { total_ads: 3, ad_visitors: 120, ad_leads: 9 },
            social: { reach: 4000, post_count: 5 },
          },
        }
      }
      if (action === 'search_campaign_brain') {
        return { results: [{ content: 'Approved budget is $30k.' }], context_sufficient: true }
      }
      return { tasks: [{ id: 'task-1', title: 'Refresh creative' }], total_count: 1 }
    })
    const streamCompletion = vi.fn()
    const resolveCampaignIdByNameForContext = vi.fn(async () => 'campaign-1')
    const service = makeService({
      executeAction,
      resolveCampaignIdByNameForContext,
      streamCompletion,
    })

    const result = await service.run(
      makeRunInput({
        campaignId: 'campaign-1',
        progressiveSend,
        selectedModelInput: 'auto',
        userContent: 'What is the current status of this live campaign?',
      }),
    )

    expect(executeAction).toHaveBeenCalledTimes(3)
    expect(resolveCampaignIdByNameForContext).toHaveBeenCalledWith(
      'user-1',
      'What is the current status of this live campaign?',
      undefined,
    )
    expect(executeAction).toHaveBeenCalledWith(
      'get_campaign_main_dashboard',
      { campaign_id: 'campaign-1', refresh: true },
      'session-1',
    )
    expect(executeAction).toHaveBeenCalledWith(
      'search_campaign_brain',
      expect.objectContaining({ campaign_id: 'campaign-1' }),
      'session-1',
    )
    expect(executeAction).toHaveBeenCalledWith(
      'list_tasks',
      { campaign_id: 'campaign-1', include_closed: false, include_count: true },
      'session-1',
    )
    expect(streamCompletion).not.toHaveBeenCalled()
    expect(result.content).toContain('| Leads | 18 |')
    expect(result.content).toContain('campaign_reporting / main_dashboard')
    expect(result.content).toContain('Reporting as of: 2026-08-29T12:00:00.000Z')
    expect(result.content).toContain('Campaign Brain: 1 relevant context')
    expect(result.content).toContain('Open campaign tasks: 1 open tasks')
    expect(progressiveSend).toHaveBeenCalledWith(
      'content_delta',
      expect.objectContaining({ content: expect.stringContaining('**Evidence**') }),
    )
  })

  it('resolves a named client campaign instead of reading the General campaign', async () => {
    const resolveCampaignIdByNameForContext = vi.fn(async () => 'campaign-multifamily')
    const executeAction = vi.fn(async (action: string) => {
      if (action === 'search_campaign_brain') return { results: [], count: 0 }
      if (action === 'get_campaign_main_dashboard') {
        return {
          canonical_source: { system: 'campaign_reporting', owner: 'main_dashboard' },
          as_of: '2026-08-29T12:00:00.000Z',
          overview: { leads: 4 },
          sources: {},
        }
      }
      return { tasks: [], total_count: 0 }
    })
    const service = makeService({ executeAction, resolveCampaignIdByNameForContext })
    const prompt =
      "What's the current status of the VSL - MultiFamily Strategy - Ongoing VSL & Call Booking campaign?"

    const result = await service.run(
      makeRunInput({
        campaignId: 'general-campaign',
        selectedModelInput: 'auto',
        userContent: prompt,
      }),
    )

    expect(resolveCampaignIdByNameForContext).toHaveBeenCalledWith('user-1', prompt, undefined)
    for (const [, data] of executeAction.mock.calls) {
      expect(data).toEqual(expect.objectContaining({ campaign_id: 'campaign-multifamily' }))
    }
    expect(result.content).toContain('| Leads | 4 |')
  })

  it('keeps live reporting and tasks when Campaign Brain retrieval fails', async () => {
    const resolveCampaignIdByNameForContext = vi.fn(async () => 'campaign-multifamily')
    const executeAction = vi.fn(async (action: string) => {
      if (action === 'search_campaign_brain') {
        return { success: false, error: 'Campaign Brain unavailable' }
      }
      if (action === 'get_campaign_main_dashboard') {
        return {
          canonical_source: { system: 'campaign_reporting', owner: 'main_dashboard' },
          as_of: '2026-08-29T12:00:00.000Z',
          overview: { leads: 7 },
          sources: {},
        }
      }
      return { tasks: [{ id: 'task-1', title: 'Review performance' }], total_count: 1 }
    })
    const service = makeService({ executeAction, resolveCampaignIdByNameForContext })

    const result = await service.run(
      makeRunInput({
        campaignId: 'general-campaign',
        orgId: 'org-1',
        selectedModelInput: 'auto',
        userContent:
          "What's the current status of the VSL - MultiFamily Strategy - Ongoing VSL & Call Booking campaign?",
      }),
    )

    expect(resolveCampaignIdByNameForContext).toHaveBeenCalledWith(
      'user-1',
      expect.stringContaining('MultiFamily Strategy'),
      'org-1',
    )
    expect(executeAction).toHaveBeenCalledTimes(3)
    for (const [, data] of executeAction.mock.calls) {
      expect(data).toEqual(expect.objectContaining({ campaign_id: 'campaign-multifamily' }))
    }
    expect(result.content).toContain('| Leads | 7 |')
    expect(result.content).toContain('Campaign Brain: unavailable')
    expect(result.content).toContain('Open campaign tasks: 1 open tasks')
  })

  it('keeps the campaign evidence receipt without invoking a writer', async () => {
    const executeAction = vi.fn(async (action: string) =>
      action === 'get_campaign_main_dashboard'
        ? {
            canonical_source: { system: 'campaign_reporting', owner: 'main_dashboard' },
            as_of: '2026-08-29T12:00:00.000Z',
          }
        : action === 'search_campaign_brain'
          ? { results: [] }
          : { tasks: [], total_count: 0 },
    )
    const streamCompletion = vi.fn()
    const service = makeService({ executeAction, streamCompletion })

    const result = await service.run(
      makeRunInput({
        campaignId: 'campaign-1',
        selectedModelInput: 'auto',
        userContent: 'What is the current status of this live campaign?',
      }),
    )

    expect(result.failed).toBeUndefined()
    expect(streamCompletion).not.toHaveBeenCalled()
    expect(result.content).toContain('## Campaign status')
    expect(result.content).toContain('campaign_reporting / main_dashboard')
    expect(result.content).toContain('Reporting as of: 2026-08-29T12:00:00.000Z')
  })

  it('fails closed when a campaign status question has no resolved client campaign', async () => {
    const executeAction = vi.fn()
    const streamCompletion = vi.fn()
    const progressiveSend = vi.fn(async () => undefined)
    const service = makeService({ executeAction, streamCompletion })

    const result = await service.run(
      makeRunInput({
        selectedModelInput: 'auto',
        progressiveSend,
        userContent: 'What is the current campaign status?',
      }),
    )

    expect(result.failed).toBeUndefined()
    expect(result.content).toContain('specific client campaign')
    expect(executeAction).not.toHaveBeenCalled()
    expect(streamCompletion).not.toHaveBeenCalled()
    expect(progressiveSend).toHaveBeenCalledWith(
      'content_delta',
      expect.objectContaining({ content: expect.stringContaining('specific client campaign') }),
    )
  })
})
