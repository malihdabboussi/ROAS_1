import { describe, expect, it } from 'vitest'
import { CreateWorkRequestDraftWebhookSchema } from './work-request.dto'

describe('CreateWorkRequestDraftWebhookSchema', () => {
  it('normalizes the deployed Page Grader MCP intake contract', () => {
    expect(
      CreateWorkRequestDraftWebhookSchema.parse({
        page_grader_client_id: '11111111-1111-1111-1111-111111111111',
        page_grader_client_name: 'Example Client',
        page_grader_campaign_id: '22222222-2222-2222-2222-222222222222',
        title: 'Edit the launch VSL',
        body: 'Use the footage and approved offer.',
        task_type: 'video',
        assignee_name: 'Editor',
        due_date: '2026-08-20',
        priority: 'normal',
        source_context: {
          channel_id: 'C123',
          thread_ts: '123.456',
          links: ['https://drive.google.com/file/d/abc'],
          forwarding_user: { id: 'U123', name: 'Dylan' },
        },
        idempotency_key: 'roas-mcp:C123:123.456',
      }),
    ).toMatchObject({
      client_id: '11111111-1111-1111-1111-111111111111',
      client_name: 'Example Client',
      campaign_id: '22222222-2222-2222-2222-222222222222',
      request_type: 'video',
      assignee_name: 'Editor',
      priority: 'medium',
      work_scope: 'campaign',
      provenance: { channel_id: 'C123', thread_ts: '123.456' },
      requester: { external_user_id: 'U123', name: 'Dylan' },
      required_fields: ['title', 'description'],
    })
  })

  it('rejects credential-shaped source context', () => {
    expect(() =>
      CreateWorkRequestDraftWebhookSchema.parse({
        page_grader_client_id: '11111111-1111-1111-1111-111111111111',
        page_grader_client_name: 'Example Client',
        title: 'Unsafe request',
        body: 'Do work',
        task_type: 'general',
        priority: 'normal',
        source_context: { nested: { api_key: 'must-not-cross-boundary' } },
        idempotency_key: 'roas-mcp:unsafe-event',
      }),
    ).toThrow(/Credential fields are not allowed/)
  })
})
