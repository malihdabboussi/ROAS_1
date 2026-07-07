import { describe, expect, it, vi } from 'vitest'
import { ArtifactLegacyMediaGenerateService } from './artifact-legacy-media-generate.service'

function makeSupabase() {
  const avatarUpdate = vi.fn()
  const supabase = {
    avatarUpdate,
    from: vi.fn((table: string) => {
      let updatePayload: Record<string, unknown> | undefined
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        update: vi.fn((payload: Record<string, unknown>) => {
          updatePayload = payload
          avatarUpdate(payload)
          return chain
        }),
        maybeSingle: vi.fn(async () => {
          if (table === 'avatars') {
            if (updatePayload) {
              return {
                data: { id: 'avatar-1', campaign_id: 'campaign-avatar', ...updatePayload },
                error: null,
              }
            }
            return {
              data: {
                id: 'avatar-1',
                campaign_id: 'campaign-avatar',
                persona_data: { existing_field: 'keep me' },
              },
              error: null,
            }
          }
          if (table === 'ads') return { data: { ad_set_id: 'ad-set-1' }, error: null }
          if (table === 'ad_sets') {
            return { data: { ad_campaign_id: 'ad-campaign-1' }, error: null }
          }
          if (table === 'ad_campaigns') {
            return { data: { campaign_id: 'campaign-1' }, error: null }
          }
          if (table === 'campaigns') {
            return {
              data: { config: { agent_settings: { theme_id: 'theme-1' } } },
              error: null,
            }
          }
          if (table === 'branding_themes') {
            return { data: { image_style_prompt: 'Use warm editorial lighting.' }, error: null }
          }
          return { data: null, error: null }
        }),
      }
      return chain
    }),
  }
  return supabase
}

function makeTarget(supabase: unknown) {
  return {
    OPENROUTER_IMAGE_MODEL: 'openrouter-image',
    credits: {
      getUnitCost: vi.fn(async () => 0.03),
      processFixedCostUsage: vi.fn(async () => undefined),
    },
    geminiApiKey: 'gemini-key',
    getUserClient: vi.fn(async () => supabase),
    isMediaGenerationEnabled: vi.fn(async () => true),
    isMissionSessionKey: vi.fn(() => false),
    logger: { debug: vi.fn(), error: vi.fn(), log: vi.fn(), warn: vi.fn() },
    openRouterApiKey: '',
    parseAgentIdFromSessionKey: vi.fn(() => 'vibey'),
    parseConversationId: vi.fn(() => 'conversation-1'),
    requestContext: { get: vi.fn(() => ({ spaceId: 'space-1' })) },
    resolveCampaignId: vi.fn(async () => null),
    resolveOrgId: vi.fn(() => null),
    resolveUserId: vi.fn(() => 'user-1'),
  }
}

describe('ArtifactLegacyMediaGenerateService data access behavior', () => {
  it('attaches a generated image to an avatar when avatar_id is provided', async () => {
    const supabase = makeSupabase()
    const target = makeTarget(supabase)
    target.geminiApiKey = ''
    target.openRouterApiKey = 'openrouter-key'
    const service = new ArtifactLegacyMediaGenerateService()
    vi.spyOn((service as any).mediaProvider, 'generateImageViaOpenRouter').mockResolvedValue({
      imageBytesB64: Buffer.from('image').toString('base64'),
      mimeType: 'image/png',
      usage: { input: 10, output: 20 },
    })
    ;(service as any).uploadService = {
      uploadMediaFromBytes: vi.fn(async () => ({
        success: true,
        url: 'https://cdn.example.com/avatar.png',
        asset: { id: 'asset-1', mime_type: 'image/png' },
      })),
    }

    const result = await service.generateImage(
      target,
      {
        prompt: 'Create an avatar portrait',
        avatar_id: 'avatar-1',
        aspect_ratio: '1:1',
      },
      'session-1',
    )

    expect(target.isMediaGenerationEnabled).toHaveBeenCalledWith(supabase, 'campaign-avatar')
    expect((service as any).uploadService.uploadMediaFromBytes).toHaveBeenCalledWith(
      target,
      expect.any(Buffer),
      'image/png',
      'image',
      'user-1',
      'campaign-avatar',
      'Create an avatar portrait',
      'gemini-3.1-flash-image',
      null,
      'space-1',
    )
    expect(supabase.avatarUpdate).toHaveBeenCalledWith({
      persona_data: {
        existing_field: 'keep me',
        avatar_image: 'https://cdn.example.com/avatar.png',
      },
    })
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        image_asset_id: 'asset-1',
        image_url: 'https://cdn.example.com/avatar.png',
        avatar_id: 'avatar-1',
        avatar_image_url: 'https://cdn.example.com/avatar.png',
      }),
    )
  })

  it('defaults image generation to OpenRouter Nano Banana 2', async () => {
    const supabase = makeSupabase()
    const target = makeTarget(supabase)
    target.geminiApiKey = ''
    target.openRouterApiKey = 'openrouter-key'
    const service = new ArtifactLegacyMediaGenerateService()
    const openRouter = vi
      .spyOn((service as any).mediaProvider, 'generateImageViaOpenRouter')
      .mockResolvedValue({
        imageBytesB64: Buffer.from('image').toString('base64'),
        mimeType: 'image/png',
        usage: { input: 10, output: 20 },
      })
    const google = vi.spyOn(service, 'generateGoogleImageViaRest')
    ;(service as any).uploadService = {
      uploadMediaFromBytes: vi.fn(async () => ({
        success: true,
        url: 'https://cdn.example.com/image.png',
        asset: { id: 'asset-1', mime_type: 'image/png' },
      })),
    }

    const result = await service.generateImage(
      target,
      {
        prompt: 'Create an avatar portrait',
        aspect_ratio: '1:1',
      },
      'session-1',
    )

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        image_asset_id: 'asset-1',
        image_url: 'https://cdn.example.com/image.png',
      }),
    )
    expect(openRouter).toHaveBeenCalledWith(
      target,
      'Create an avatar portrait',
      '1:1',
      'google/gemini-3.1-flash-image',
      undefined,
    )
    expect(google).not.toHaveBeenCalled()
    expect((service as any).uploadService.uploadMediaFromBytes).toHaveBeenCalledWith(
      target,
      expect.any(Buffer),
      'image/png',
      'image',
      'user-1',
      null,
      'Create an avatar portrait',
      'gemini-3.1-flash-image',
      null,
      'space-1',
    )
    expect(target.credits.getUnitCost).toHaveBeenCalledWith('gemini-3.1-flash-image', 'images_1')
    expect(target.credits.processFixedCostUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'google',
        modelName: 'gemini-3.1-flash-image',
      }),
    )
  })

  it('resolves campaign from ad_id chain and injects campaign theme style', async () => {
    const supabase = makeSupabase()
    const target = makeTarget(supabase)
    const service = new ArtifactLegacyMediaGenerateService()
    const generateGoogleImageViaRest = vi
      .spyOn(service, 'generateGoogleImageViaRest')
      .mockResolvedValue({
        imageBytesB64: Buffer.from('image').toString('base64'),
        mimeType: 'image/png',
      })
    ;(service as any).uploadService = {
      uploadMediaFromBytes: vi.fn(async () => ({
        success: true,
        url: 'https://cdn.example.com/image.png',
        asset: { id: 'asset-1', mime_type: 'image/png' },
      })),
    }

    const result = await service.generateImage(
      target,
      {
        prompt: 'Create an ad image',
        ad_id: 'ad-1',
        aspect_ratio: '1:1',
        model: 'gemini-3.1-flash',
      },
      'session-1',
    )

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        image_asset_id: 'asset-1',
        image_url: 'https://cdn.example.com/image.png',
      }),
    )
    expect(target.isMediaGenerationEnabled).toHaveBeenCalledWith(supabase, 'campaign-1')
    expect(generateGoogleImageViaRest).toHaveBeenCalledWith(
      target,
      'gemini-3.1-flash-image-preview',
      'Create an ad image\n\nBrand image style: Use warm editorial lighting.',
      '1:1',
      undefined,
    )
    expect((service as any).uploadService.uploadMediaFromBytes).toHaveBeenCalledWith(
      target,
      expect.any(Buffer),
      'image/png',
      'image',
      'user-1',
      'campaign-1',
      'Create an ad image',
      'gemini-3.1-flash-image-preview',
      null,
      'space-1',
    )
  })
})
