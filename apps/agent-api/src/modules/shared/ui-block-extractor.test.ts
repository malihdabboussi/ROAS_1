import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveUiBlocksFromToolResult } from './ui-block-extractor'

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

    const blocks = resolveUiBlocksFromToolResult({
      name: 'vibey_backend',
      action: 'generate_image',
      toolArgs: { data: { prompt: 'A product shot' } },
      result: {
        success: true,
        image_url: 'https://cdn.vibey.ai/image.png',
        image_asset_id: 'asset-image-1',
        mime_type: 'image/png',
      },
      status: 'completed',
      cachedMetaAdAccounts: [],
      cachedMetaPages: [],
    })

    expect(blocks).toEqual([
      expect.objectContaining({
        type: 'media_asset',
        id: 'media-asset-image-1',
        mediaAssetId: 'asset-image-1',
        url: 'https://cdn.vibey.ai/image.png',
        title: 'Generated image',
        kind: 'image',
        mimeType: 'image/png',
        prompt: 'A product shot',
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

    const blocks = resolveUiBlocksFromToolResult({
      name: 'vibey_backend',
      action: 'process_media',
      toolArgs: { data: { operation: 'extract_audio' } },
      result: {
        success: true,
        url: 'https://cdn.vibey.ai/audio.mp3',
        media_asset_id: 'media-1',
        file_name: 'audio.mp3',
      },
      status: 'completed',
      cachedMetaAdAccounts: [],
      cachedMetaPages: [],
    })

    expect(blocks).toEqual([
      expect.objectContaining({
        type: 'media_asset',
        id: 'media-media-1',
        mediaAssetId: 'media-1',
        url: 'https://cdn.vibey.ai/audio.mp3',
        title: 'audio.mp3',
        kind: 'audio',
        fileName: 'audio.mp3',
      }),
    ])
  })
})
