import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DURABLE_ARTIFACT_OUTPUT_DEFINITIONS,
  resolveUiBlocksFromToolResult,
} from './ui-block-extractor'

describe('resolveUiBlocksFromToolResult integration repair blocks', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('emits a repair action card when a connection check fails', () => {
    vi.spyOn(Date, 'now').mockReturnValue(123)

    const blocks = resolveUiBlocksFromToolResult({
      name: 'vibey_backend',
      action: 'check_integration_connection',
      toolArgs: { data: { integration_id: 'google_drive' } },
      result: { success: true, connected: false, status: 'disconnected' },
      status: 'completed',
      cachedMetaAdAccounts: [],
      cachedMetaPages: [],
    })

    expect(blocks).toEqual([
      expect.objectContaining({
        type: 'integration_connect',
        id: 'integration-connect-google_drive-123',
        provider: 'google_drive',
        title: 'Connect Google Drive',
        status: 'disconnected',
        problem: 'Google Drive needs attention. Current status: disconnected.',
        primaryAction: {
          type: 'connect',
          provider: 'google_drive',
          label: 'Connect Google Drive',
        },
        secondaryActions: [
          {
            type: 'open_settings',
            provider: 'google_drive',
            label: 'Open settings',
          },
        ],
      }),
    ])
  })

  it('uses backend-provided fallback approval actions when available', () => {
    vi.spyOn(Date, 'now').mockReturnValue(456)

    const blocks = resolveUiBlocksFromToolResult({
      name: 'vibey_backend',
      action: 'check_integration_connection',
      toolArgs: { data: { integration_id: 'google_drive' } },
      result: {
        success: true,
        connected: false,
        status: 'fallback_available',
        repair: {
          title: 'Use personal Google Drive?',
          description: 'Google Drive needs approval for this task.',
          status: 'fallback_available',
          problem: 'Your personal Google Drive is connected.',
          doctor: {
            status: 'fallback_available',
            summary: 'Your personal Google Drive is connected.',
            checks: [
              {
                label: 'Personal connection',
                status: 'pass',
                detail: 'Ready.',
              },
            ],
          },
          primaryAction: {
            type: 'use_connection',
            provider: 'google_drive',
            label: 'Use personal Google Drive',
            connectionId: 'personal-connection',
            message: 'Retry with integration_connection_id "personal-connection".',
          },
          secondaryActions: [
            {
              type: 'open_settings',
              provider: 'google_drive',
              label: 'Open settings',
            },
          ],
        },
      },
      status: 'completed',
      cachedMetaAdAccounts: [],
      cachedMetaPages: [],
    })

    expect(blocks).toEqual([
      expect.objectContaining({
        type: 'integration_connect',
        id: 'integration-connect-google_drive-456',
        provider: 'google_drive',
        title: 'Use personal Google Drive?',
        status: 'fallback_available',
        problem: 'Your personal Google Drive is connected.',
        primaryAction: expect.objectContaining({
          type: 'use_connection',
          connectionId: 'personal-connection',
        }),
        doctor: expect.objectContaining({
          status: 'fallback_available',
          checks: [
            {
              label: 'Personal connection',
              status: 'pass',
              detail: 'Ready.',
            },
          ],
        }),
      }),
    ])
  })

  it('emits media asset blocks for generated images', () => {
    vi.spyOn(Date, 'now').mockReturnValue(789)
    const assetId = '2bbdc0be-a8bc-49ce-bc4c-91e18cc00e4f'
    const spaceId = 'c0a6bc09-9502-4b0e-9438-302ed1482531'

    const blocks = resolveUiBlocksFromToolResult({
      name: 'vibey_backend',
      action: 'generate_image',
      toolArgs: { data: { prompt: 'A product shot', space_id: spaceId } },
      result: {
        success: true,
        image_url: 'https://cdn.vibey.ai/image.png',
        image_asset_id: assetId,
        mime_type: 'image/png',
        space_id: spaceId,
      },
      status: 'completed',
      cachedMetaAdAccounts: [],
      cachedMetaPages: [],
    })

    expect(blocks).toEqual([
      expect.objectContaining({
        type: 'media_asset',
        id: `media-${assetId}`,
        mediaAssetId: assetId,
        spaceId,
        url: 'https://cdn.vibey.ai/image.png',
        title: 'Generated image',
        kind: 'image',
        mimeType: 'image/png',
        prompt: 'A product shot',
      }),
    ])
  })

  it('keeps explicit progress blocks and appends the durable artifact receipt', () => {
    const blocks = resolveUiBlocksFromToolResult({
      name: 'vibey_backend',
      action: 'create_offer',
      toolArgs: { data: { name: 'Growth Offer' } },
      result: {
        success: true,
        offer_id: 'offer-1',
        ui_blocks: [{ type: 'tool_progress', id: 'progress-1', label: 'Offer saved' }],
      },
      status: 'completed',
      cachedMetaAdAccounts: [],
      cachedMetaPages: [],
    })

    expect(blocks).toEqual([
      { type: 'tool_progress', id: 'progress-1', label: 'Offer saved' },
      expect.objectContaining({
        type: 'artifact_preview',
        artifactType: 'offer',
        artifactId: 'offer-1',
        name: 'Growth Offer',
        status: 'created',
      }),
    ])
  })

  it('does not duplicate an explicit durable output receipt', () => {
    const blocks = resolveUiBlocksFromToolResult({
      name: 'vibey_backend',
      action: 'generate_image',
      toolArgs: { data: { prompt: 'A product shot' } },
      result: {
        success: true,
        image_url: 'https://cdn.vibey.ai/image.png',
        ui_blocks: [
          {
            type: 'media_asset',
            id: 'media-explicit',
            url: 'https://cdn.vibey.ai/image.png',
            kind: 'image',
          },
        ],
      },
      status: 'completed',
      cachedMetaAdAccounts: [],
      cachedMetaPages: [],
    })

    expect(blocks).toEqual([
      {
        type: 'media_asset',
        id: 'media-explicit',
        url: 'https://cdn.vibey.ai/image.png',
        kind: 'image',
      },
    ])
  })

  it('appends a generated-file receipt when explicit progress blocks are present', () => {
    vi.spyOn(Date, 'now').mockReturnValue(790)
    const blocks = resolveUiBlocksFromToolResult({
      name: 'vibey_backend',
      action: 'create_pdf',
      toolArgs: { data: {} },
      result: {
        success: true,
        file_url: 'https://cdn.vibey.ai/strategy.pdf',
        file_name: 'strategy.pdf',
        ui_blocks: [{ type: 'tool_progress', id: 'progress-pdf', label: 'PDF ready' }],
      },
      status: 'completed',
      cachedMetaAdAccounts: [],
      cachedMetaPages: [],
    })

    expect(blocks).toEqual([
      { type: 'tool_progress', id: 'progress-pdf', label: 'PDF ready' },
      {
        type: 'pdf_file',
        id: 'pdf-file-790',
        url: 'https://cdn.vibey.ai/strategy.pdf',
        label: 'strategy.pdf',
      },
    ])
  })

  it('appends a browser screenshot receipt when explicit progress blocks are present', () => {
    vi.spyOn(Date, 'now').mockReturnValue(791)
    const blocks = resolveUiBlocksFromToolResult({
      name: 'browser',
      result: {
        path: '/tmp/screenshots/client-home.png',
        url: 'https://client.example/home',
        ui_blocks: [{ type: 'tool_progress', id: 'progress-browser', label: 'Page captured' }],
      },
      status: 'completed',
      cachedMetaAdAccounts: [],
      cachedMetaPages: [],
    })

    expect(blocks).toEqual([
      { type: 'tool_progress', id: 'progress-browser', label: 'Page captured' },
      {
        type: 'browser_screenshot',
        id: 'browser-screenshot-791',
        imageUrl: '/api/chat/browser-media/client-home.png',
        pageUrl: 'https://client.example/home',
      },
    ])
  })

  it('emits media asset blocks for edited images', () => {
    const assetId = '3482342b-d575-4346-8276-29cedbcd9b9b'
    const spaceId = 'c0a6bc09-9502-4b0e-9438-302ed1482531'

    const blocks = resolveUiBlocksFromToolResult({
      name: 'vibey_backend',
      action: 'edit_image',
      toolArgs: {
        data: {
          prompt: 'Make it 1:1',
          parent_image_asset_id: '8c116148-62aa-4109-bf19-18e2bad38cf1',
          space_id: spaceId,
        },
      },
      result: {
        success: true,
        image_url: 'https://cdn.vibey.ai/edited.png',
        image_asset_id: assetId,
        space_id: spaceId,
      },
      status: 'completed',
      cachedMetaAdAccounts: [],
      cachedMetaPages: [],
    })

    expect(blocks).toEqual([
      expect.objectContaining({
        type: 'media_asset',
        mediaAssetId: assetId,
        spaceId,
        url: 'https://cdn.vibey.ai/edited.png',
        title: 'Edited image',
        kind: 'image',
      }),
    ])
  })

  it('synthesizes a funnel preview when a transport omits backend ui blocks', () => {
    const blocks = resolveUiBlocksFromToolResult({
      name: 'vibey_backend',
      action: 'create_funnel',
      toolArgs: { data: { name: 'Lead Magnet Funnel', space_id: 'space-1' } },
      result: {
        success: true,
        id: 'funnel-1',
        name: 'Lead Magnet Funnel',
        status: 'draft',
        space_id: 'space-1',
      },
      status: 'completed',
      cachedMetaAdAccounts: [],
      cachedMetaPages: [],
    })

    expect(blocks).toEqual([
      expect.objectContaining({
        type: 'artifact_preview',
        artifactType: 'funnel',
        artifactId: 'funnel-1',
        name: 'Lead Magnet Funnel',
        status: 'draft',
        spaceId: 'space-1',
      }),
    ])
  })

  it('emits a saved video block after video generation polling succeeds', () => {
    const assetId = '565c9d8e-a74f-456a-90bf-8eb98d4e26a3'
    const spaceId = 'c0a6bc09-9502-4b0e-9438-302ed1482531'

    const blocks = resolveUiBlocksFromToolResult({
      name: 'vibey_backend',
      action: 'get_video_status',
      toolArgs: { data: { job_id: 'video-job-1' } },
      result: {
        success: true,
        job_id: 'video-job-1',
        status: 'succeeded',
        url: 'https://cdn.vibey.ai/video.mp4',
        media_asset_id: assetId,
        space_id: spaceId,
        prompt: 'A cinematic product launch',
      },
      status: 'completed',
      cachedMetaAdAccounts: [],
      cachedMetaPages: [],
    })

    expect(blocks).toEqual([
      expect.objectContaining({
        type: 'media_asset',
        mediaAssetId: assetId,
        spaceId,
        url: 'https://cdn.vibey.ai/video.mp4',
        title: 'Generated video',
        kind: 'video',
        prompt: 'A cinematic product launch',
      }),
    ])
  })

  it('synthesizes form preview blocks from text-envelope tool results', () => {
    const blocks = resolveUiBlocksFromToolResult({
      name: 'vibey_backend',
      action: 'create_form',
      toolArgs: { data: { space_id: 'space-1' } },
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              form: { id: 'form-1', name: 'Lead Capture', space_id: 'space-1' },
            }),
          },
        ],
      },
      status: 'completed',
      cachedMetaAdAccounts: [],
      cachedMetaPages: [],
    })

    expect(blocks).toEqual([
      expect.objectContaining({
        type: 'artifact_preview',
        artifactType: 'form',
        artifactId: 'form-1',
        name: 'Lead Capture',
        spaceId: 'space-1',
      }),
    ])
  })

  it('synthesizes task preview blocks from plain tool result records', () => {
    const blocks = resolveUiBlocksFromToolResult({
      name: 'vibey_backend',
      action: 'create_task',
      toolArgs: { data: {} },
      result: {
        success: true,
        task: { id: 'task-1', title: 'Follow up', space_id: 'space-1' },
      },
      status: 'completed',
      cachedMetaAdAccounts: [],
      cachedMetaPages: [],
    })

    expect(blocks).toEqual([
      expect.objectContaining({
        type: 'artifact_preview',
        artifactType: 'task',
        artifactId: 'task-1',
        name: 'Follow up',
        spaceId: 'space-1',
      }),
    ])
  })

  it('emits media asset blocks for processed media results', () => {
    vi.spyOn(Date, 'now').mockReturnValue(987)
    const assetId = '11111111-1111-4111-8111-111111111111'

    const blocks = resolveUiBlocksFromToolResult({
      name: 'vibey_backend',
      action: 'process_media',
      toolArgs: { data: { operation: 'extract_audio' } },
      result: {
        success: true,
        url: 'https://cdn.vibey.ai/audio.mp3',
        media_asset_id: assetId,
        file_name: 'audio.mp3',
      },
      status: 'completed',
      cachedMetaAdAccounts: [],
      cachedMetaPages: [],
    })

    expect(blocks).toEqual([
      expect.objectContaining({
        type: 'media_asset',
        id: `media-${assetId}`,
        mediaAssetId: assetId,
        url: 'https://cdn.vibey.ai/audio.mp3',
        title: 'audio.mp3',
        kind: 'audio',
        fileName: 'audio.mp3',
      }),
    ])
  })

  it('emits a clarification block from the plugin text-envelope result shape', () => {
    vi.spyOn(Date, 'now').mockReturnValue(321)

    const blocks = resolveUiBlocksFromToolResult({
      name: 'vibey_backend',
      action: 'ask_clarification',
      toolArgs: { data: {} },
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              clarification: {
                title: 'Choose a direction',
                introMessage: 'Pick one before I start.',
                questions: [
                  {
                    id: 'direction',
                    text: 'Which direction should I take?',
                    type: 'single_choice',
                    options: [
                      { id: 'option_a', label: 'Option A', description: 'Why this fits' },
                      { id: 'option_b', label: 'Option B' },
                    ],
                    required: true,
                  },
                ],
              },
            }),
          },
        ],
      },
      status: 'completed',
      cachedMetaAdAccounts: [],
      cachedMetaPages: [],
    })

    expect(blocks).toEqual([
      {
        type: 'clarification',
        id: 'clarification-321',
        source: 'ask_clarification',
        title: 'Choose a direction',
        introMessage: 'Pick one before I start.',
        questions: [
          {
            id: 'direction',
            text: 'Which direction should I take?',
            type: 'single_choice',
            options: [
              { id: 'option_a', label: 'Option A', description: 'Why this fits' },
              { id: 'option_b', label: 'Option B' },
            ],
            required: true,
          },
        ],
        status: 'pending',
      },
    ])
  })

  it('emits a clarification block from a plain clarification record result', () => {
    const blocks = resolveUiBlocksFromToolResult({
      name: 'vibey_backend',
      action: 'ask_clarification',
      toolArgs: { data: {} },
      result: {
        success: true,
        clarification: {
          title: 'Quick question',
          questions: [
            {
              id: 'q1',
              text: 'Pick one',
              type: 'multiple_choice',
              options: [
                { id: 'a', label: 'A' },
                { id: 'b', label: 'B' },
              ],
              required: false,
            },
          ],
        },
      },
      status: 'completed',
      cachedMetaAdAccounts: [],
      cachedMetaPages: [],
    })

    expect(blocks).toEqual([
      expect.objectContaining({
        type: 'clarification',
        source: 'ask_clarification',
        title: 'Quick question',
        status: 'pending',
      }),
    ])
  })

  it('suppresses inline cards for flow clarifications rendered in the Flows tab', () => {
    const blocks = resolveUiBlocksFromToolResult({
      name: 'vibey_backend',
      action: 'create_flow_clarification',
      toolArgs: { data: {} },
      result: {
        success: true,
        render_mode: 'tab',
        clarification: {
          title: 'Flow choices',
          questions: [
            {
              id: 'q1',
              text: 'Pick one',
              type: 'single_choice',
              options: [{ id: 'a', label: 'A' }],
              required: true,
            },
          ],
        },
      },
      status: 'completed',
      cachedMetaAdAccounts: [],
      cachedMetaPages: [],
    })

    expect(blocks).toEqual([])
  })

  it('emits every registered image from a batch media result', () => {
    const firstId = '11111111-1111-4111-8111-111111111111'
    const secondId = '22222222-2222-4222-8222-222222222222'

    const blocks = resolveUiBlocksFromToolResult({
      name: 'vibey_backend',
      action: 'process_media',
      toolArgs: {
        data: {
          operation: 'render_validate_messaging',
          space_id: '33333333-3333-4333-8333-333333333333',
          inputs: [
            { name: 'Static 1 — Light', source_prompt: "If you're ready to scale." },
            { name: 'Static 1 — Dark', source_prompt: "If you're ready to scale." },
          ],
        },
      },
      result: {
        success: true,
        operation: 'render_validate_messaging',
        media_assets: [
          { media_asset_id: firstId, name: 'Static 1 — Light', url: 'https://cdn/light.png' },
          { media_asset_id: secondId, name: 'Static 1 — Dark', url: 'https://cdn/dark.png' },
        ],
      },
      status: 'completed',
      cachedMetaAdAccounts: [],
      cachedMetaPages: [],
    })

    expect(blocks).toEqual([
      expect.objectContaining({
        mediaAssetId: firstId,
        title: 'Static 1 — Light',
        prompt: "If you're ready to scale.",
      }),
      expect.objectContaining({
        mediaAssetId: secondId,
        title: 'Static 1 — Dark',
        prompt: "If you're ready to scale.",
      }),
    ])
  })

  it('emits a work_request chat resume block from Portal fulfillment drafts', () => {
    const blocks = resolveUiBlocksFromToolResult({
      name: 'vibey_backend',
      action: 'use_mcp_tool',
      toolArgs: {
        data: {
          tool_name: 'page_grader_create_fulfillment_request',
        },
      },
      result: {
        success: true,
        draft: {
          draft_id: 'draft-abc',
          title: 'Launch funnel brief',
          review_url: 'https://app.roas.io/request-review/token-abc',
          expires_at: '2026-08-17T00:00:00.000Z',
          status: 'draft',
        },
      },
      status: 'completed',
      cachedMetaAdAccounts: [],
      cachedMetaPages: [],
    })

    expect(blocks).toEqual([
      {
        type: 'work_request',
        id: 'work-request-draft-abc',
        title: 'Launch funnel brief',
        reviewUrl: 'https://app.roas.io/request-review/token-abc',
        draftId: 'draft-abc',
        status: 'pending',
      },
    ])
  })

  it('emits a work_request block from nested MCP text envelopes', () => {
    const blocks = resolveUiBlocksFromToolResult({
      name: 'campaign_capability',
      action: 'use_mcp_tool',
      toolArgs: {
        data: {
          tool: 'page_grader_create_fulfillment_request',
          server_name: 'Page Grader',
        },
      },
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              tool_name: 'page_grader_create_fulfillment_request',
              result: {
                draft: {
                  id: 'f40af402-af02-47b8-a6b8-026db3f909a4',
                  title: 'Redesign testimonial-rich replay sales page',
                  review_url:
                    'https://app.roas.io/request-review/2RDu_FR_fTbQhuRfPv9S3zJ7XW0jEE2WzNOLEcSOvBY',
                },
              },
            }),
          },
        ],
      },
      status: 'completed',
      cachedMetaAdAccounts: [],
      cachedMetaPages: [],
    })

    expect(blocks).toEqual([
      expect.objectContaining({
        type: 'work_request',
        title: 'Redesign testimonial-rich replay sales page',
        reviewUrl: 'https://app.roas.io/request-review/2RDu_FR_fTbQhuRfPv9S3zJ7XW0jEE2WzNOLEcSOvBY',
        draftId: 'f40af402-af02-47b8-a6b8-026db3f909a4',
      }),
    ])
  })

  it('emits a work_request chat resume block from Portal campaign drafts', () => {
    const blocks = resolveUiBlocksFromToolResult({
      name: 'vibey_backend',
      action: 'use_mcp_tool',
      toolArgs: {
        data: {
          tool_name: 'page_grader_create_campaign_draft',
        },
      },
      result: {
        success: true,
        draft: {
          draft_id: 'campaign-draft-1',
          title: 'Master Your Kraft | VSL Retargeting',
          review_url: 'https://app.roas.io/request-review/campaign-token-abc',
          status: 'draft',
        },
      },
      status: 'completed',
      cachedMetaAdAccounts: [],
      cachedMetaPages: [],
    })

    expect(blocks).toEqual([
      {
        type: 'work_request',
        id: 'work-request-campaign-draft-1',
        title: 'Master Your Kraft | VSL Retargeting',
        reviewUrl: 'https://app.roas.io/request-review/campaign-token-abc',
        draftId: 'campaign-draft-1',
        status: 'pending',
      },
    ])
  })

  it('emits a campaign preview with the portal url after create_campaign', () => {
    const blocks = resolveUiBlocksFromToolResult({
      name: 'vibey_backend',
      action: 'create_campaign',
      result: {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Master Your Kraft | VSL Retargeting',
        status: 'draft',
        url: 'https://app.roas.io/campaigns/11111111-1111-4111-8111-111111111111',
      },
      status: 'completed',
      cachedMetaAdAccounts: [],
      cachedMetaPages: [],
    })

    expect(blocks).toEqual([
      expect.objectContaining({
        type: 'artifact_preview',
        artifactType: 'campaign',
        artifactId: '11111111-1111-4111-8111-111111111111',
        name: 'Master Your Kraft | VSL Retargeting',
        status: 'draft',
      }),
    ])
  })

  it('covers every supported artifact preview family with a durable receipt definition', () => {
    expect(
      new Set([
        ...DURABLE_ARTIFACT_OUTPUT_DEFINITIONS.map((definition) => definition.artifactType),
        'canvas',
      ]),
    ).toEqual(
      new Set([
        'campaign',
        'canvas',
        'offer',
        'funnel',
        'avatar',
        'sequence',
        'presentation',
        'ad',
        'ad-set',
        'ad-campaign',
        'social-post',
        'blog-post',
        'email',
        'visual-doc',
        'form',
        'task',
        'mission',
        'flow',
        'website',
        'theme',
        'custom-object',
      ]),
    )
  })

  it.each(
    DURABLE_ARTIFACT_OUTPUT_DEFINITIONS.flatMap((definition) =>
      definition.actions.map((action) => ({
        action,
        artifactType: definition.artifactType,
        idKey: definition.idKeys[0]!,
      })),
    ),
  )('synthesizes a stable $artifactType receipt after $action', ({ action, artifactType, idKey }) => {
    const artifactId = `${artifactType}-stable-id`
    const createsResource = /^(create|generate|define|extract)_/.test(action)
    const blocks = resolveUiBlocksFromToolResult({
      name: 'vibey_backend',
      action,
      toolArgs: {
        data: createsResource
          ? { name: `${artifactType} output` }
          : { [idKey]: artifactId, name: `${artifactType} output` },
      },
      result: createsResource
        ? { success: true, [idKey]: artifactId, name: `${artifactType} output` }
        : { success: true, id: 'nested-child-id' },
      status: 'completed',
      cachedMetaAdAccounts: [],
      cachedMetaPages: [],
    })

    expect(blocks).toEqual([
      expect.objectContaining({
        type: 'artifact_preview',
        id: `artifact-${artifactType}-${artifactId}`,
        artifactType,
        artifactId,
        name: `${artifactType} output`,
        status:
          action === 'create_campaign' ? 'draft' : createsResource ? 'created' : 'updated',
      }),
    ])
  })

  it.each([
    'create_project',
    'create_file',
    'update_file',
    'patch_file',
    'update_project_deps',
    'import_github_repo',
  ])('keeps the project output linked after %s', (action) => {
    const blocks = resolveUiBlocksFromToolResult({
      name: 'vibey_backend',
      action,
      toolArgs: { data: { project_id: 'project-1', name: 'Client app' } },
      result: { success: true },
      status: 'completed',
      cachedMetaAdAccounts: [],
      cachedMetaPages: [],
    })

    expect(blocks).toEqual([
      expect.objectContaining({
        type: 'project_preview',
        id: 'project-project-1',
        project_id: 'project-1',
        name: 'Client app',
      }),
    ])
  })

  it.each(['save_document', 'update_document'])(
    'keeps the document output linked after %s',
    (action) => {
      const blocks = resolveUiBlocksFromToolResult({
        name: 'vibey_backend',
        action,
        toolArgs: {
          data: { document_id: 'document-1', title: 'Strategy brief', space_id: 'space-1' },
        },
        result: { success: true },
        status: 'completed',
        cachedMetaAdAccounts: [],
        cachedMetaPages: [],
      })

      expect(blocks).toEqual([
        expect.objectContaining({
          type: 'document_card',
          id: 'document-document-1',
          documentId: 'document-1',
          title: 'Strategy brief',
          spaceId: 'space-1',
        }),
      ])
    },
  )

  it.each([
    ['build_campaign_blueprint', 'Client webinar Canvas', 'Campaign blueprint updated'],
    ['apply_canvas_operations', 'Campaign Canvas', 'Canvas updated'],
    ['complete_canvas_placeholder', 'Campaign Canvas', 'Canvas asset updated'],
  ])('emits a linked durable Canvas output after %s', (action, name, subtitle) => {
    const blocks = resolveUiBlocksFromToolResult({
      name: 'vibey_backend',
      action,
      toolArgs: { data: {} },
      result: {
        success: true,
        board_id: 'board-1',
        campaign_id: 'campaign-1',
        campaign_label: action === 'build_campaign_blueprint' ? 'Client webinar' : undefined,
      },
      status: 'completed',
      cachedMetaAdAccounts: [],
      cachedMetaPages: [],
    })

    expect(blocks).toEqual([
      {
        type: 'artifact_preview',
        id: 'artifact-canvas-board-1',
        artifactType: 'canvas',
        artifactId: 'board-1',
        campaignId: 'campaign-1',
        internalUrl: '/campaigns/campaign-1?view=canvas',
        name,
        subtitle,
        status: 'updated',
      },
    ])
  })
})
