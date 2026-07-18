import { describe, expect, it, vi } from 'vitest'
import { ArtifactThemesService } from './artifact-themes.service'
import { validateActionData } from './artifact-action-schemas'

describe('campaign theme agent contract', () => {
  it('accepts the complete flat campaign brand payload', () => {
    expect(
      validateActionData('create_theme', {
        campaign_id: 'campaign-1',
        name: 'Impact Elite Coaching',
        colors: { primary: '#F5C518' },
        font_heading: 'Poppins',
        font_body: 'Inter',
        logo_asset_id: '11111111-1111-4111-8111-111111111111',
        headshot_images: [],
        product_images: [],
        brand_voice: { tone: 'direct' },
        brand_values: { primary: 'clarity' },
        social_links: { website: 'https://example.com' },
        design_settings: { buttons: { shape: 'rounded' } },
        image_style_prompt: 'Premium editorial photography.',
        status: 'active',
      }),
    ).toBeNull()
    expect(
      validateActionData('extract_website_theme', { url: 'https://example.com' }),
    ).toBeNull()
    expect(validateActionData('extract_website_theme', {})).toMatch(/url.*required/i)
  })

  it('persists every campaign brand field when creating and activating a theme', async () => {
    const createBrandingTheme = vi.fn(async (_supabase, payload) => ({
      data: { id: 'theme-1', ...payload },
      error: null,
    }))
    const updateCampaignConfig = vi.fn(async () => undefined)
    const repository = {
      createBrandingTheme,
      findCampaignConfig: vi.fn(async () => ({ data: { config: {} }, error: null })),
      updateCampaignConfig,
    }
    const target = {
      getThemeTableName: vi.fn(async () => 'branding_themes'),
      getUserClient: vi.fn(async () => ({})),
      resolveCampaignId: vi.fn(async () => 'campaign-1'),
      resolveOrgId: vi.fn(() => 'org-1'),
      resolveUserId: vi.fn(() => 'user-1'),
    }
    const handlers = new ArtifactThemesService(repository as never).getHandlers(target)
    const brandFields = {
      colors: { primary: '#F5C518' },
      font_heading: 'Poppins',
      font_body: 'Inter',
      logo_asset_id: '11111111-1111-4111-8111-111111111111',
      headshot_images: [{ asset_id: '22222222-2222-4222-8222-222222222222' }],
      product_images: [{ asset_id: '33333333-3333-4333-8333-333333333333' }],
      brand_voice: { tone: 'direct' },
      brand_values: { primary: 'clarity' },
      social_links: { website: 'https://example.com' },
      design_settings: { buttons: { shape: 'rounded' } },
      image_style_prompt: 'Premium editorial photography.',
      status: 'active',
    }

    await handlers.create_theme(
      { campaign_id: 'campaign-1', name: 'Impact Elite Coaching', ...brandFields },
      'session',
    )

    expect(createBrandingTheme).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        ...brandFields,
        colors: expect.objectContaining(brandFields.colors),
        name: 'Impact Elite Coaching',
        org_id: 'org-1',
        user_id: 'user-1',
      }),
    )
    expect(updateCampaignConfig).toHaveBeenCalledWith(
      {},
      { campaignId: 'campaign-1', config: { agent_settings: { theme_id: 'theme-1' } } },
    )
  })

  it('uses empty collections instead of null for absent brand media and social fields', async () => {
    const createBrandingTheme = vi.fn(async (_supabase, payload) => ({
      data: { id: 'theme-1', ...payload },
      error: null,
    }))
    const repository = {
      createBrandingTheme,
      findCampaignConfig: vi.fn(async () => ({ data: null, error: null })),
    }
    const target = {
      getThemeTableName: vi.fn(async () => 'branding_themes'),
      getUserClient: vi.fn(async () => ({})),
      resolveCampaignId: vi.fn(async () => null),
      resolveOrgId: vi.fn(() => 'org-1'),
      resolveUserId: vi.fn(() => 'user-1'),
    }

    await new ArtifactThemesService(repository as never)
      .getHandlers(target)
      .create_theme({ name: 'Theme' }, 'session')

    expect(createBrandingTheme).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        colors: expect.objectContaining({ primary: '#6237C8' }),
        headshot_images: [],
        product_images: [],
        social_links: {},
      }),
    )
  })
})
