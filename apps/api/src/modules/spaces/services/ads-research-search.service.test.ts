import { describe, expect, it, vi } from 'vitest'
import type { SearchApiService } from '../../integrations/searchapi/services/searchapi-api.service'
import type { SpacesRepository } from '../repositories/spaces.repository'
import { AdsResearchSearchService } from './ads-research-search.service'

function makeService(searchMock: ReturnType<typeof vi.fn>) {
  const searchApi = { search: searchMock } as unknown as SearchApiService
  const repo = {} as SpacesRepository
  return new AdsResearchSearchService(repo, searchApi)
}

describe('AdsResearchSearchService.searchAds', () => {
  it('rejects topic searches on google (no keyword search upstream)', async () => {
    const service = makeService(vi.fn())
    await expect(
      service.searchAds({ platform: 'google', kind: 'topic', query: 'shoes', advertiser: null }),
    ).rejects.toThrow('Google Ads Transparency has no keyword search')
  })

  it('rejects brand searches without an advertiser', async () => {
    const service = makeService(vi.fn())
    await expect(
      service.searchAds({ platform: 'meta', kind: 'brand', query: '', advertiser: null }),
    ).rejects.toThrow('Brand searches require an advertiser')
  })

  it('maps meta topic searches to meta_ad_library with q', async () => {
    const search = vi.fn().mockResolvedValue({ status: 200, body: { ads: [] } })
    const service = makeService(search)
    await service.searchAds({ platform: 'meta', kind: 'topic', query: 'fitness', advertiser: null })
    expect(search).toHaveBeenCalledWith(
      'meta_ad_library',
      expect.objectContaining({ q: 'fitness', active_status: 'all' }),
    )
  })

  it('quotes multi-word meta topic queries for phrase matching by default', async () => {
    const search = vi.fn().mockResolvedValue({ status: 200, body: { ads: [] } })
    const service = makeService(search)
    await service.searchAds({
      platform: 'meta',
      kind: 'topic',
      query: 'AI Brain',
      advertiser: null,
    })
    expect(search).toHaveBeenCalledWith(
      'meta_ad_library',
      expect.objectContaining({ q: '"AI Brain"' }),
    )
  })

  it('leaves the meta query unquoted when exact_phrase is off', async () => {
    const search = vi.fn().mockResolvedValue({ status: 200, body: { ads: [] } })
    const service = makeService(search)
    await service.searchAds({
      platform: 'meta',
      kind: 'topic',
      query: 'AI Brain',
      advertiser: null,
      filters: { exact_phrase: false },
    })
    expect(search).toHaveBeenCalledWith(
      'meta_ad_library',
      expect.objectContaining({ q: 'AI Brain' }),
    )
  })

  it('passes the country filter (meta country, google region), skipping ALL', async () => {
    const search = vi.fn().mockResolvedValue({ status: 200, body: { ads: [], ad_creatives: [] } })
    const service = makeService(search)
    await service.searchAds({
      platform: 'meta',
      kind: 'topic',
      query: 'fitness',
      advertiser: null,
      filters: { country: 'us' },
    })
    expect(search).toHaveBeenLastCalledWith(
      'meta_ad_library',
      expect.objectContaining({ country: 'US' }),
    )
    await service.searchAds({
      platform: 'meta',
      kind: 'topic',
      query: 'fitness',
      advertiser: null,
      filters: { country: 'ALL' },
    })
    expect(search).toHaveBeenLastCalledWith(
      'meta_ad_library',
      expect.not.objectContaining({ country: expect.anything() }),
    )
    await service.searchAds({
      platform: 'google',
      kind: 'brand',
      query: 'Tesla',
      advertiser: { id: 'AR1', name: 'Tesla', image_url: null, platform_ref: 'AR1' },
      filters: { country: 'US' },
    })
    expect(search).toHaveBeenLastCalledWith(
      'google_ads_transparency_center',
      expect.objectContaining({ region: 'US' }),
    )
  })

  it('always sorts tiktok by reach and forwards the country', async () => {
    const search = vi.fn().mockResolvedValue({ status: 200, body: { ads: [] } })
    const service = makeService(search)
    await service.searchAds({
      platform: 'tiktok',
      kind: 'topic',
      query: 'gym',
      advertiser: null,
      filters: { country: 'GB' },
    })
    expect(search).toHaveBeenCalledWith(
      'tiktok_ads_library',
      expect.objectContaining({ sort_by: 'unique_users_seen_high_to_low', country: 'GB' }),
    )
  })

  it('dedupes meta ads by collation_id and keeps the variant count', async () => {
    const mkAd = (id: string, collation: string, count: number) => ({
      ad_archive_id: id,
      collation_id: collation,
      collation_count: count,
      page_name: 'sintra.ai',
      snapshot: { display_format: 'image', images: [{ original_image_url: 'https://cdn/x.jpg' }] },
    })
    const search = vi.fn().mockResolvedValue({
      status: 200,
      body: { ads: [mkAd('a1', 'c1', 38), mkAd('a2', 'c1', 38), mkAd('a3', 'c2', 2)] },
    })
    const service = makeService(search)
    const page = await service.searchAds({
      platform: 'meta',
      kind: 'topic',
      query: 'ai',
      advertiser: null,
    })
    expect(page.items).toHaveLength(2)
    expect(page.items[0]!.ad_id).toBe('a1')
    expect(page.items[0]!.variant_count).toBe(38)
    expect(page.items[1]!.ad_id).toBe('a3')
  })

  it('maps meta brand searches to page_id', async () => {
    const search = vi.fn().mockResolvedValue({ status: 200, body: { ads: [] } })
    const service = makeService(search)
    await service.searchAds({
      platform: 'meta',
      kind: 'brand',
      query: 'Nike',
      advertiser: { id: '123', name: 'Nike', image_url: null, platform_ref: '123' },
    })
    expect(search).toHaveBeenCalledWith(
      'meta_ad_library',
      expect.objectContaining({ page_id: '123' }),
    )
  })

  it('maps tiktok brand searches to advertiser_token', async () => {
    const search = vi.fn().mockResolvedValue({ status: 200, body: { ads: [] } })
    const service = makeService(search)
    await service.searchAds({
      platform: 'tiktok',
      kind: 'brand',
      query: 'Nike',
      advertiser: { id: 'a1', name: 'Nike', image_url: null, platform_ref: 'tok-a1' },
    })
    expect(search).toHaveBeenCalledWith(
      'tiktok_ads_library',
      expect.objectContaining({ advertiser_token: 'tok-a1' }),
    )
  })

  it('maps google brand searches to advertiser_id', async () => {
    const search = vi.fn().mockResolvedValue({ status: 200, body: { ad_creatives: [] } })
    const service = makeService(search)
    await service.searchAds({
      platform: 'google',
      kind: 'brand',
      query: 'Tesla',
      advertiser: { id: 'AR123', name: 'Tesla', image_url: null, platform_ref: 'AR123' },
    })
    expect(search).toHaveBeenCalledWith(
      'google_ads_transparency_center',
      expect.objectContaining({ advertiser_id: 'AR123' }),
    )
  })

  it('normalizes meta ads from the snapshot payload', async () => {
    const search = vi.fn().mockResolvedValue({
      status: 200,
      body: {
        ads: [
          {
            ad_archive_id: 'ad-1',
            page_id: 'p-1',
            page_name: 'Nike',
            is_active: true,
            start_date: 1717200000,
            snapshot: {
              display_format: 'video',
              body: { text: 'Just do it' },
              link_url: 'https://nike.com',
              videos: [
                {
                  video_hd_url: 'https://cdn/video.mp4',
                  video_preview_image_url: 'https://cdn/preview.jpg',
                },
              ],
            },
          },
        ],
        pagination: { next_page_token: 'tok-2' },
      },
    })
    const service = makeService(search)
    const page = await service.searchAds({
      platform: 'meta',
      kind: 'topic',
      query: 'shoes',
      advertiser: null,
    })
    expect(page.next_page_token).toBe('tok-2')
    expect(page.items).toHaveLength(1)
    const ad = page.items[0]!
    expect(ad.ad_id).toBe('ad-1')
    expect(ad.advertiser_name).toBe('Nike')
    expect(ad.format).toBe('video')
    expect(ad.creative_text).toBe('Just do it')
    expect(ad.video_url).toBe('https://cdn/video.mp4')
    expect(ad.image_url).toBe('https://cdn/preview.jpg')
    expect(ad.is_active).toBe(true)
    expect(ad.days_running).toBeGreaterThan(0)
  })

  it('normalizes tiktok ads with reach estimates', async () => {
    const search = vi.fn().mockResolvedValue({
      status: 200,
      body: {
        ads: [
          {
            id: 'tt-1',
            advertiser: 'Gymshark',
            advertiser_id: 'adv-9',
            first_shown_datetime: '2026-05-01T00:00:00Z',
            last_shown_datetime: '2026-06-01T00:00:00Z',
            video_link: 'https://cdn/tt.mp4',
            cover_image: 'https://cdn/tt.jpg',
            estimated_audience: '10K-100K',
          },
        ],
      },
    })
    const service = makeService(search)
    const page = await service.searchAds({
      platform: 'tiktok',
      kind: 'topic',
      query: 'gym',
      advertiser: null,
    })
    const ad = page.items[0]!
    expect(ad.ad_id).toBe('tt-1')
    expect(ad.reach_estimate).toBe('10K-100K')
    expect(ad.days_running).toBe(31)
    expect(ad.format).toBe('video')
  })

  it('reads the google advertiser object ({ id, name }) from creatives', async () => {
    const search = vi.fn().mockResolvedValue({
      status: 200,
      body: {
        ad_creatives: [
          {
            id: 'CR1',
            format: 'video',
            advertiser: { id: 'AR17828', name: 'Tesla Inc.' },
            first_shown_datetime: '2026-03-27T20:02:35Z',
            last_shown_datetime: '2026-06-11T13:43:47Z',
            total_days_shown: 76,
            details_link: 'https://adstransparency.google.com/x',
          },
        ],
      },
    })
    const service = makeService(search)
    const page = await service.searchAds({
      platform: 'google',
      kind: 'brand',
      query: 'Tesla',
      advertiser: { id: 'AR17828', name: 'Tesla Inc.', image_url: null, platform_ref: 'AR17828' },
    })
    const ad = page.items[0]!
    expect(ad.advertiser_name).toBe('Tesla Inc.')
    expect(ad.advertiser_id).toBe('AR17828')
    expect(ad.days_running).toBe(76)
    expect(ad.image_url).toBeNull()
  })

  it('normalizes google ad creatives with days shown', async () => {
    const search = vi.fn().mockResolvedValue({
      status: 200,
      body: {
        ad_creatives: [
          {
            id: 'g-1',
            advertiser: 'Tesla',
            advertiser_id: 'AR123',
            format: 'image',
            first_shown: '2026-01-01T00:00:00Z',
            last_shown: '2026-03-01T00:00:00Z',
            total_days_shown: 60,
            image: { link: 'https://cdn/g.png' },
            details_link: 'https://adstransparency.google.com/x',
          },
        ],
      },
    })
    const service = makeService(search)
    const page = await service.searchAds({
      platform: 'google',
      kind: 'brand',
      query: 'Tesla',
      advertiser: { id: 'AR123', name: 'Tesla', image_url: null, platform_ref: 'AR123' },
    })
    const ad = page.items[0]!
    expect(ad.ad_id).toBe('g-1')
    expect(ad.format).toBe('image')
    expect(ad.days_running).toBe(60)
    expect(ad.image_url).toBe('https://cdn/g.png')
    expect(ad.details_link).toBe('https://adstransparency.google.com/x')
  })

  it('surfaces upstream errors as BadRequest', async () => {
    const search = vi.fn().mockResolvedValue({ status: 401, body: { error: 'Invalid API key' } })
    const service = makeService(search)
    await expect(
      service.searchAds({ platform: 'meta', kind: 'topic', query: 'x', advertiser: null }),
    ).rejects.toThrow('Ad search failed: Invalid API key')
  })
})

describe('AdsResearchSearchService.getAdDetails', () => {
  it('prefers the meta ad_details_token over ad_archive_id', async () => {
    const search = vi.fn().mockResolvedValue({ status: 200, body: {} })
    const service = makeService(search)
    await service.getAdDetails({ platform: 'meta', adId: 'ad-1', detailsToken: 'tok-9' })
    expect(search).toHaveBeenCalledWith('meta_ad_library_ad_details', {
      ad_details_token: 'tok-9',
    })
  })

  it('falls back to ad_archive_id when no meta token is present', async () => {
    const search = vi.fn().mockResolvedValue({ status: 200, body: {} })
    const service = makeService(search)
    await service.getAdDetails({ platform: 'meta', adId: 'ad-1' })
    expect(search).toHaveBeenCalledWith('meta_ad_library_ad_details', { ad_archive_id: 'ad-1' })
  })

  it('maps tiktok details to ad_id', async () => {
    const search = vi.fn().mockResolvedValue({ status: 200, body: { ad: {} } })
    const service = makeService(search)
    await service.getAdDetails({ platform: 'tiktok', adId: 'tt-1' })
    expect(search).toHaveBeenCalledWith('tiktok_ads_library_ad_details', { ad_id: 'tt-1' })
  })

  it('requires the advertiser id for google details', async () => {
    const service = makeService(vi.fn())
    await expect(service.getAdDetails({ platform: 'google', adId: 'CR1' })).rejects.toThrow(
      'Google ad details require the advertiser id',
    )
  })

  it('normalizes google details with regions, audience signals, and variations', async () => {
    const search = vi.fn().mockResolvedValue({
      status: 200,
      body: {
        ad_information: {
          format: 'video',
          topic: 'Business & Industrial',
          first_shown_date: '2026-01-01',
          last_shown_datetime: '2026-06-01T00:00:00Z',
          regions: [{ region: 'United States', impressions: '1M-10M' }],
          audience_selection: { demographic: 'Age, Gender', contextual: true },
        },
        variations: [
          {
            title: 'Buy now',
            description: 'Great product',
            thumbnail: 'https://cdn/v.jpg',
            video_link: 'https://youtube.com/watch?v=1',
          },
        ],
      },
    })
    const service = makeService(search)
    const details = await service.getAdDetails({
      platform: 'google',
      adId: 'CR1',
      advertiserId: 'AR123',
    })
    expect(search).toHaveBeenCalledWith('google_ads_transparency_center_ad_details', {
      advertiser_id: 'AR123',
      creative_id: 'CR1',
    })
    expect(details.topic).toBe('Business & Industrial')
    expect(details.targeting?.locations).toEqual([{ name: 'United States', detail: '1M-10M' }])
    expect(details.targeting?.signals).toEqual(['demographic: Age, Gender', 'contextual'])
    expect(details.variations[0]).toMatchObject({
      title: 'Buy now',
      text: 'Great product',
      video_url: 'https://youtube.com/watch?v=1',
    })
    expect(details.last_shown).toBe('2026-06-01T00:00:00.000Z')
  })

  it('normalizes meta details from the real response shape (page info, spend, EU transparency)', async () => {
    const search = vi.fn().mockResolvedValue({
      status: 200,
      body: {
        advertiser: {
          page: { id: 'p1', about: { text: 'your employees, on AI' } },
          ad_library_page_info: {
            page_info: {
              page_name: 'sintra.ai',
              page_category: 'Product/service',
              likes: 170880,
              ig_username: 'sintra.ai',
              ig_followers: 176139,
            },
            page_spend: {
              lifetime_by_disclaimer: [{ disclaimer: 'Paid by Sintra Inc', spend: 6 }],
            },
          },
        },
        transparency_by_location: {
          eu_transparency: {
            targets_eu: true,
            eu_total_reach: 1015002,
            gender_audience: 'All',
            age_audience: { min: 18, max: 65 },
            location_audience: [
              { name: 'Europe', type: 'country_groups', excluded: false },
              { name: 'Lithuania', type: 'countries', excluded: true },
            ],
            age_country_gender_reach_breakdown: [
              {
                country: 'IT',
                age_gender_breakdowns: [{ age_range: '25-34', male: 100000, female: 24295 }],
              },
              {
                country: 'ES',
                age_gender_breakdowns: [{ age_range: '25-34', male: 120100 }],
              },
            ],
          },
        },
      },
    })
    const service = makeService(search)
    const details = await service.getAdDetails({
      platform: 'meta',
      adId: 'ad-1',
      detailsToken: 't',
    })
    expect(details.advertiser_name).toBe('sintra.ai')
    expect(details.advertiser_about).toBe('your employees, on AI')
    expect(details.page_category).toBe('Product/service')
    expect(details.ig_username).toBe('sintra.ai')
    expect(details.ig_followers).toBe(176139)
    expect(details.page_likes).toBe(170880)
    expect(details.payer).toBe('Paid by Sintra Inc')
    expect(details.targeting?.audience_size).toBe('1,015,002 reached (EU)')
    expect(details.targeting?.age_ranges).toEqual(['18–65'])
    expect(details.targeting?.genders).toEqual([])
    expect(details.targeting?.signals).toEqual(['Targets EU'])
    expect(details.targeting?.locations).toEqual([
      { name: 'Europe', detail: 'Targeted' },
      { name: 'Lithuania', detail: 'Excluded' },
      { name: 'IT', detail: '124,295 reached' },
      { name: 'ES', detail: '120,100 reached' },
    ])
  })

  it('normalizes tiktok targeting from the real per-region shape', async () => {
    const search = vi.fn().mockResolvedValue({
      status: 200,
      body: {
        ad: {
          id: 'tt-1',
          advertiser: {
            id: 'adv-1',
            name: 'Gymshark',
            registry_location: 'United Kingdom',
            sponsor: 'Gymshark Ltd',
          },
          first_shown_datetime: '2026-05-01T00:00:00Z',
          last_shown_datetime: '2026-06-01T00:00:00Z',
          video_link: 'https://cdn/tt.mp4',
          cover_image: 'https://cdn/tt.jpg',
          targeting: {
            location: {
              total_region: 2,
              total_impressions: '1M-10M',
              impressions_by_region: [
                { region: 'GB', impressions: '700K', breakdowns: [] },
                { region: 'DE', impressions: '606K', breakdowns: [] },
              ],
            },
            age: [
              { region: 'GB', '13-17': false, '18-24': true, '25-34': true },
              { region: 'DE', '13-17': false, '18-24': true, '35-44': true },
            ],
            gender: [{ region: 'GB', female: true, male: true, unknown: true }],
            target_audience_size: '10M-50M',
            audience_list: 'No',
          },
        },
      },
    })
    const service = makeService(search)
    const details = await service.getAdDetails({ platform: 'tiktok', adId: 'tt-1' })
    expect(details.advertiser_name).toBe('Gymshark')
    expect(details.advertiser_location).toBe('United Kingdom')
    expect(details.payer).toBe('Gymshark Ltd')
    expect(details.targeting?.age_ranges).toEqual(['18-24', '25-34', '35-44'])
    // All three gender flags true = untargeted, shown as no gender chips.
    expect(details.targeting?.genders).toEqual([])
    expect(details.targeting?.audience_size).toBe('10M-50M')
    expect(details.targeting?.locations).toEqual([
      { name: 'GB', detail: '700K' },
      { name: 'DE', detail: '606K' },
    ])
    expect(details.total_impressions).toBe('1M-10M')
    expect(details.targeting?.signals).toEqual([])
  })
})

describe('AdsResearchSearchService.searchAdvertisers', () => {
  it('normalizes meta page search results', async () => {
    const search = vi.fn().mockResolvedValue({
      status: 200,
      body: {
        page_results: [
          {
            name: 'Nike',
            page_id: '15087023444',
            verification: 'VERIFIED',
            likes: 1000,
            image_uri: 'https://cdn/nike.jpg',
          },
        ],
      },
    })
    const service = makeService(search)
    const advertisers = await service.searchAdvertisers({ platform: 'meta', query: 'nike' })
    expect(search).toHaveBeenCalledWith('meta_ad_library_page_search', { q: 'nike' })
    expect(advertisers).toEqual([
      {
        id: '15087023444',
        name: 'Nike',
        image_url: 'https://cdn/nike.jpg',
        platform_ref: '15087023444',
        is_verified: true,
      },
    ])
  })

  it('prefers the advertiser token as tiktok platform_ref', async () => {
    const search = vi.fn().mockResolvedValue({
      status: 200,
      body: { advertisers: [{ id: 'a-1', name: 'Gymshark', token: 'tok-1' }] },
    })
    const service = makeService(search)
    const advertisers = await service.searchAdvertisers({ platform: 'tiktok', query: 'gym' })
    expect(search).toHaveBeenCalledWith('tiktok_ads_library_advertiser_search', { q: 'gym' })
    expect(advertisers[0]!.platform_ref).toBe('tok-1')
  })

  it('normalizes google advertiser search results', async () => {
    const search = vi.fn().mockResolvedValue({
      status: 200,
      body: { advertisers: [{ id: 'AR123', name: 'Tesla', region: 'US', is_verified: true }] },
    })
    const service = makeService(search)
    const advertisers = await service.searchAdvertisers({ platform: 'google', query: 'tesla' })
    expect(search).toHaveBeenCalledWith('google_ads_transparency_center_advertiser_search', {
      q: 'tesla',
    })
    expect(advertisers[0]).toMatchObject({ id: 'AR123', platform_ref: 'AR123', is_verified: true })
  })
})
