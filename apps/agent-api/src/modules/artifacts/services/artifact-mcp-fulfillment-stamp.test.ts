import { describe, expect, it, vi } from 'vitest'
import {
  extractFulfillmentDraftId,
  formatMcpToolCallFailure,
  isFulfillmentCreateTool,
  isPortalCampaignDraftTool,
  mcpToolFailureResult,
  stampConversationIntoFulfillmentArgs,
  stampDraftConversationViaApi,
} from './artifact-mcp-fulfillment-stamp'

const CONV = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const DRAFT = '11111111-1111-4111-8111-111111111111'

describe('artifact-mcp-fulfillment-stamp', () => {
  it('detects Page Grader fulfillment create tools', () => {
    expect(isFulfillmentCreateTool('page_grader_create_fulfillment_request')).toBe(true)
    expect(isFulfillmentCreateTool('create_fulfillment_request')).toBe(true)
    expect(isFulfillmentCreateTool('page_grader_create_campaign_draft')).toBe(true)
    expect(isFulfillmentCreateTool('create_portal_campaign')).toBe(true)
    expect(isFulfillmentCreateTool('page_grader_list_clients')).toBe(false)
    expect(isFulfillmentCreateTool('page_grader_list_campaigns')).toBe(false)
  })

  it('detects portal campaign-draft writes separately from fulfillment', () => {
    expect(isPortalCampaignDraftTool('page_grader_create_campaign_draft')).toBe(true)
    expect(isPortalCampaignDraftTool('create_portal_campaign')).toBe(true)
    expect(isPortalCampaignDraftTool('page_grader_create_fulfillment_request')).toBe(false)
  })

  it('tells Pixel to native-create when a campaign-draft MCP write fails without a reason', () => {
    expect(
      formatMcpToolCallFailure({
        toolName: 'page_grader_create_campaign_draft',
        serverName: 'Page Grader',
      }),
    ).toMatch(/native create_campaign/)
    expect(
      formatMcpToolCallFailure({
        toolName: 'page_grader_create_fulfillment_request',
        serverName: 'Page Grader',
      }),
    ).not.toMatch(/native create_campaign/)
  })

  it('returns a fixable campaign-draft contract instead of an unclassified reject', () => {
    const result = mcpToolFailureResult({
      toolName: 'page_grader_create_campaign_draft',
      serverName: 'Page Grader',
    })
    expect(result).toMatchObject({
      success: false,
      error_code: 'ARTIFACT_MCP_TOOL_FAILED',
      error_class: 'validation',
      effect_state: 'failed_before_effect',
    })
    expect(result.agent_instruction).toMatch(/native create_campaign/)
    expect(result.correction).toMatchObject({
      next_tool_preference: ['list_mcp_tools', 'create_campaign', 'create_task'],
    })
  })

  it('injects conversation_id into top-level and source_context without clobbering', () => {
    const stamped = stampConversationIntoFulfillmentArgs(
      {
        client_ref: 'client-1',
        source_context: {
          channel_id: 'C123',
          conversation_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        },
      },
      CONV,
    )
    expect(stamped.conversation_id).toBe(CONV)
    expect(stamped.source_context).toEqual({
      channel_id: 'C123',
      conversation_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    })
  })

  it('fills missing source_context conversation from the session', () => {
    const stamped = stampConversationIntoFulfillmentArgs(
      { title: 'Funnel', source_context: { channel_id: 'C9' } },
      CONV,
    )
    expect(stamped).toEqual({
      title: 'Funnel',
      conversation_id: CONV,
      source_context: { channel_id: 'C9', conversation_id: CONV },
    })
  })

  it('extracts draft ids from nested MCP result shapes', () => {
    expect(extractFulfillmentDraftId({ draft_id: DRAFT })).toBe(DRAFT)
    expect(extractFulfillmentDraftId({ draft: { draft_id: DRAFT } })).toBe(DRAFT)
    expect(extractFulfillmentDraftId({ result: { draft: { id: DRAFT } } })).toBe(DRAFT)
    expect(extractFulfillmentDraftId({ ok: true })).toBeNull()
  })

  it('posts a stamp to the main API when configured', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    process.env.MAIN_API_URL = 'https://api.example.com'
    process.env.INTERNAL_API_TOKEN = 'secret'
    await expect(
      stampDraftConversationViaApi({
        draftId: DRAFT,
        conversationId: CONV,
        fetchImpl: fetchImpl as never,
      }),
    ).resolves.toEqual({ ok: true, status: 200 })
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/api/internal/work-requests/stamp-conversation',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer secret' }),
      }),
    )
  })
})
