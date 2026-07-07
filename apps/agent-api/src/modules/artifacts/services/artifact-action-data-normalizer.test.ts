import { describe, expect, it } from 'vitest'
import { normalizeArtifactActionData } from './artifact-action-data-normalizer'

describe('normalizeArtifactActionData', () => {
  const vibeyImageRef = {
    kind: 'vibey_asset',
    asset_id: 'asset-1',
    bucket_name: 'media',
    file_path: 'users/user-1/images/logo.png',
    url: 'https://cdn.example.com/logo.png',
    mime_type: 'image/png',
    asset_type: 'image',
    name: 'Logo',
    original_filename: 'logo.png',
    file_size: 42,
  }

  const externalImageRef = {
    kind: 'external_asset',
    provider: 'google_drive',
    external_id: 'drive-image-1',
    url: 'https://drive.example.com/image.png',
    mime_type: 'image/png',
    asset_type: 'image',
    name: 'Reference image',
    original_filename: 'image.png',
    file_size: 42,
  }

  const externalVideoRef = {
    kind: 'external_asset',
    provider: 'google_drive',
    external_id: 'drive-video-1',
    url: 'https://drive.example.com/video.mp4',
    mime_type: 'video/mp4',
    asset_type: 'video',
    name: 'Reference video',
    original_filename: 'video.mp4',
    file_size: 42,
  }

  it('normalizes top-level camelCase and acronym keys to snake_case', () => {
    const result = normalizeArtifactActionData('get_task', {
      spaceId: 'space-1',
      taskID: 'task-1',
    })

    expect(result.data).toEqual({ space_id: 'space-1', task_id: 'task-1' })
    expect(result.conflicts).toEqual([])
    expect(result.normalizedKeys).toEqual([
      { from: 'spaceId', to: 'space_id' },
      { from: 'taskID', to: 'task_id' },
    ])
  })

  it('does not normalize nested params payloads', () => {
    const result = normalizeArtifactActionData('use_integration', {
      service: 'calendar',
      action: 'create_event',
      params: {
        startDate: '2026-05-10',
        attendeeEmail: 'person@example.com',
      },
    })

    expect(result.data).toEqual({
      service: 'calendar',
      integration_action: 'create_event',
      params: {
        startDate: '2026-05-10',
        attendeeEmail: 'person@example.com',
      },
    })
  })

  it('applies safe action-specific aliases', () => {
    expect(
      normalizeArtifactActionData('delegate_to_agent', {
        agent_key: 'copywriter',
        task: 'Write email sequence',
      }).data,
    ).toEqual({
      target_agent_key: 'copywriter',
      task_description: 'Write email sequence',
    })

    expect(
      normalizeArtifactActionData('read_document', {
        documentID: 'asset-1',
      }).data,
    ).toEqual({
      asset_id: 'asset-1',
    })

    expect(
      normalizeArtifactActionData('get_document', {
        assetID: 'doc-1',
      }).data,
    ).toEqual({
      document_id: 'doc-1',
    })

    expect(
      normalizeArtifactActionData('list_documents', {
        query: 'Hadassah Cyprus',
      }).data,
    ).toEqual({
      search: 'Hadassah Cyprus',
    })

    expect(
      normalizeArtifactActionData('analyze_video', {
        videoUrl: 'https://example.com/video.mp4',
      }).data,
    ).toEqual({
      media_url: 'https://example.com/video.mp4',
    })

    expect(
      normalizeArtifactActionData('analyze_video', {
        audio_url: 'https://example.com/audio.mp3',
      }).data,
    ).toEqual({
      media_url: 'https://example.com/audio.mp3',
    })

    expect(
      normalizeArtifactActionData('transcribe_audio', {
        audioUrl: 'https://example.com/audio.ogg',
      }).data,
    ).toEqual({
      media_url: 'https://example.com/audio.ogg',
    })

    expect(
      normalizeArtifactActionData('analyze_image', {
        url: 'https://example.com/photo.jpg',
      }).data,
    ).toEqual({
      image_url: 'https://example.com/photo.jpg',
    })

    expect(
      normalizeArtifactActionData('analyze_image', {
        mediaAssetId: 'asset-1',
      }).data,
    ).toEqual({
      asset_id: 'asset-1',
    })

    expect(
      normalizeArtifactActionData('update_presentation', {
        presentationId: 'deck-1',
        title: 'The Test. The Practice.',
      }).data,
    ).toEqual({
      presentation_id: 'deck-1',
      name: 'The Test. The Practice.',
    })

    expect(
      normalizeArtifactActionData('use_mcp_tool', {
        serverName: 'zuops',
        tool: 'check_credits',
        args: {},
      }).data,
    ).toEqual({
      server_name: 'zuops',
      tool_name: 'check_credits',
      arguments: {},
    })

    expect(
      normalizeArtifactActionData('add_mcp_server', {
        name: 'zuops',
        serverUrl: 'https://api.zuops.com/functions/v1/mcp-server',
      }).data,
    ).toEqual({
      name: 'zuops',
      url: 'https://api.zuops.com/functions/v1/mcp-server',
    })
  })

  it('reports conflicts when canonical and alias values disagree', () => {
    const result = normalizeArtifactActionData('get_task', {
      task_id: 'task-1',
      taskId: 'task-2',
    })

    expect(result.data).toEqual({ task_id: 'task-1' })
    expect(result.conflicts).toEqual([{ from: 'taskId', to: 'task_id' }])
  })

  it('allows duplicate aliases when values match', () => {
    const result = normalizeArtifactActionData('get_task', {
      task_id: 'task-1',
      taskId: 'task-1',
    })

    expect(result.data).toEqual({ task_id: 'task-1' })
    expect(result.conflicts).toEqual([])
  })

  it('derives legacy file fields from a single asset_ref handle', () => {
    expect(normalizeArtifactActionData('read_document', { assetRef: vibeyImageRef }).data).toEqual({
      asset_ref: vibeyImageRef,
      asset_id: 'asset-1',
    })

    expect(normalizeArtifactActionData('analyze_image', { asset_ref: vibeyImageRef }).data).toEqual(
      {
        asset_ref: vibeyImageRef,
        asset_id: 'asset-1',
      },
    )

    expect(
      normalizeArtifactActionData('analyze_image', { asset_ref: externalImageRef }).data,
    ).toEqual({
      asset_ref: externalImageRef,
      image_url: 'https://drive.example.com/image.png',
    })

    expect(
      normalizeArtifactActionData('analyze_video', { asset_ref: externalVideoRef }).data,
    ).toEqual({
      asset_ref: externalVideoRef,
      media_url: 'https://drive.example.com/video.mp4',
    })

    expect(
      normalizeArtifactActionData('transcribe_audio', { asset_ref: externalVideoRef }).data,
    ).toEqual({
      asset_ref: externalVideoRef,
      media_url: 'https://drive.example.com/video.mp4',
    })

    expect(
      normalizeArtifactActionData('process_media', {
        operation: 'probe',
        asset_ref: externalVideoRef,
      }).data,
    ).toEqual({
      operation: 'probe',
      asset_ref: externalVideoRef,
      url: 'https://drive.example.com/video.mp4',
    })

    expect(
      normalizeArtifactActionData('upload_skill_asset', {
        agent_key: 'designer',
        skill_key: 'brand_visual_reference',
        asset_ref: externalImageRef,
      }).data,
    ).toEqual({
      agent_key: 'designer',
      skill_key: 'brand_visual_reference',
      asset_ref: externalImageRef,
      image_url: 'https://drive.example.com/image.png',
    })

    expect(
      normalizeArtifactActionData('attach_funnel_asset', {
        funnel_id: 'funnel-1',
        path: 'assets/logo.png',
        asset_ref: vibeyImageRef,
      }).data,
    ).toEqual({
      funnel_id: 'funnel-1',
      path: 'assets/logo.png',
      asset_ref: vibeyImageRef,
      media_asset_id: 'asset-1',
    })

    expect(
      normalizeArtifactActionData('generate_image', {
        prompt: 'Edit this image',
        asset_ref: externalImageRef,
      }).data,
    ).toEqual({
      prompt: 'Edit this image',
      asset_ref: externalImageRef,
      input_image_url: 'https://drive.example.com/image.png',
    })

    expect(
      normalizeArtifactActionData('edit_image', {
        prompt: 'Make it brighter',
        asset_ref: vibeyImageRef,
      }).data,
    ).toEqual({
      prompt: 'Make it brighter',
      asset_ref: vibeyImageRef,
      parent_image_asset_id: 'asset-1',
    })
  })

  it('derives legacy multi-file fields from asset_refs handles', () => {
    const imageResult = normalizeArtifactActionData('analyze_image', {
      asset_refs: [vibeyImageRef, externalImageRef],
      prompt: 'Rank these images',
    })

    expect(imageResult.data).toEqual({
      asset_refs: [vibeyImageRef, externalImageRef],
      prompt: 'Rank these images',
      asset_ids: ['asset-1'],
      image_urls: ['https://drive.example.com/image.png'],
    })

    const mediaResult = normalizeArtifactActionData('process_media', {
      operation: 'concat',
      asset_refs: [
        externalVideoRef,
        {
          ...externalVideoRef,
          external_id: 'drive-video-2',
          url: 'https://drive.example.com/b.mp4',
        },
      ],
    })

    expect(mediaResult.data).toEqual({
      operation: 'concat',
      asset_refs: [
        externalVideoRef,
        {
          ...externalVideoRef,
          external_id: 'drive-video-2',
          url: 'https://drive.example.com/b.mp4',
        },
      ],
      inputs: [
        { url: 'https://drive.example.com/video.mp4' },
        { url: 'https://drive.example.com/b.mp4' },
      ],
    })

    const imageGenerationResult = normalizeArtifactActionData('generate_image', {
      prompt: 'Combine these references',
      asset_refs: [
        externalImageRef,
        {
          ...externalImageRef,
          external_id: 'drive-image-2',
          url: 'https://drive.example.com/b.png',
        },
      ],
    })

    expect(imageGenerationResult.data).toEqual({
      prompt: 'Combine these references',
      asset_refs: [
        externalImageRef,
        {
          ...externalImageRef,
          external_id: 'drive-image-2',
          url: 'https://drive.example.com/b.png',
        },
      ],
      input_image_urls: ['https://drive.example.com/image.png', 'https://drive.example.com/b.png'],
    })
  })

  it('does not overwrite canonical file fields when asset_ref disagrees', () => {
    const result = normalizeArtifactActionData('analyze_image', {
      image_url: 'https://example.com/original.png',
      asset_ref: externalImageRef,
    })

    expect(result.data).toEqual({
      image_url: 'https://example.com/original.png',
      asset_ref: externalImageRef,
    })
    expect(result.conflicts).toEqual([{ from: 'asset_ref.url', to: 'image_url' }])
  })
})
