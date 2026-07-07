import { BadRequestException, NotFoundException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ArtifactsService } from '../artifacts.service'

function createMockSupabase(returnValue: { data: any; error: any } = { data: null, error: null }) {
  const chain: Record<string, any> = {}
  const methods = ['select', 'eq', 'not', 'order', 'limit', 'single']
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  chain.single.mockResolvedValue(returnValue)
  // Make chain thenable for non-single queries
  Object.assign(chain, {
    then: (resolve: any) => resolve(returnValue),
    catch: () => chain,
  })
  return {
    from: vi.fn().mockReturnValue(chain),
    chain,
    storage: { from: vi.fn().mockReturnValue({ createSignedUrl: vi.fn() }) },
  }
}

function createPresentationCreateSupabase() {
  const presentations: Array<Record<string, any>> = []
  const files: Array<Record<string, any>> = []
  const from = vi.fn((table: string) => {
    if (table === 'presentations') {
      const chain: Record<string, any> = {
        insert: vi.fn((payload: Record<string, any>) => {
          const row = { id: 'presentation-1', ...payload }
          presentations.push(row)
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: row, error: null }),
            }),
          }
        }),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(async () => ({
          data: presentations[0] ?? null,
          error: presentations[0] ? null : { code: 'PGRST116' },
        })),
        update: vi.fn((payload: Record<string, any>) => {
          if (presentations[0]) Object.assign(presentations[0], payload)
          return {
            eq: vi.fn().mockResolvedValue({ error: null }),
          }
        }),
      }
      return chain
    }
    if (table === 'presentation_files') {
      return {
        upsert: vi.fn((payload: Record<string, any>) => {
          files.push(payload)
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: `file-${files.length}`, ...payload },
                error: null,
              }),
            }),
          }
        }),
      }
    }
    return {}
  })
  return { from, presentations, files }
}

describe('ArtifactsService', () => {
  let service: ArtifactsService

  beforeEach(() => {
    service = new ArtifactsService({} as any, {} as any)
  })

  describe('createPresentation', () => {
    it('writes the default index.html for blank presentations', async () => {
      const sb = createPresentationCreateSupabase()

      await service.createPresentation(
        sb as any,
        'user-1',
        'campaign-1',
        'Untitled Presentation',
        'org-1',
        'space-1',
      )

      expect(sb.presentations[0]?.metadata).toMatchObject({
        source_mode: 'html_bundle',
        entry_file: 'index.html',
      })
      expect(sb.files).toHaveLength(1)
      expect(sb.files[0]?.path).toBe('index.html')
      expect(sb.files[0]?.role).toBe('entry')
      expect(sb.files[0]?.content).toContain('<!doctype html>')
    })

    it('writes uploaded HTML as the initial entry file', async () => {
      const sb = createPresentationCreateSupabase()
      const html = '<!doctype html><html><body><section>Uploaded</section></body></html>'

      await service.createPresentation(
        sb as any,
        'user-1',
        'campaign-1',
        'Uploaded Deck',
        'org-1',
        'space-1',
        {
          files: [{ path: 'index.html', content: html, role: 'entry' }],
          entryFile: 'index.html',
        },
      )

      expect(sb.presentations[0]?.metadata).toMatchObject({
        source_mode: 'html_bundle',
        entry_file: 'index.html',
      })
      expect(sb.files).toHaveLength(1)
      expect(sb.files[0]?.path).toBe('index.html')
      expect(sb.files[0]?.content).toBe(html)
      expect(sb.files[0]?.mime_type).toBe('text/html')
    })
  })

  describe('listOffers', () => {
    it('should return offers for a campaign', async () => {
      const offers = [{ id: '1', name: 'Offer 1' }]
      const sb = createMockSupabase({ data: offers, error: null })
      const result = await service.listOffers(sb as any, 'campaign-1')
      expect(result).toEqual(offers)
    })

    it('should throw on error', async () => {
      const sb = createMockSupabase({ data: null, error: { message: 'DB error' } })
      await expect(service.listOffers(sb as any, 'c1')).rejects.toThrow('Failed to list offers')
    })
  })

  describe('getOffer', () => {
    it('should return offer by id', async () => {
      const sb = createMockSupabase({ data: { id: '1', name: 'Test' }, error: null })
      const result = await service.getOffer(sb as any, '1')
      expect(result.name).toBe('Test')
    })

    it('should throw NotFoundException if not found', async () => {
      const sb = createMockSupabase({ data: null, error: { code: 'PGRST116' } })
      await expect(service.getOffer(sb as any, '999')).rejects.toThrow(NotFoundException)
    })
  })

  describe('listSequences', () => {
    it('should return sequences with emails', async () => {
      const sequences = [{ id: '1', sequence_emails: [] }]
      const sb = createMockSupabase({ data: sequences, error: null })
      const result = await service.listSequences(sb as any, 'c1')
      expect(result).toEqual(sequences)
    })
  })

  describe('getSequence', () => {
    it('should sort emails by order_index', async () => {
      const seq = {
        id: '1',
        sequence_emails: [
          { order_index: 2, subject: 'Second' },
          { order_index: 1, subject: 'First' },
        ],
      }
      const sb = createMockSupabase({ data: seq, error: null })
      const result = await service.getSequence(sb as any, '1')
      expect(result.sequence_emails[0].subject).toBe('First')
    })
  })

  describe('getAvatar', () => {
    it('should throw NotFoundException if no avatar', async () => {
      const sb = createMockSupabase({ data: null, error: { code: 'PGRST116' } })
      await expect(service.getAvatar(sb as any, 'offer-1')).rejects.toThrow(NotFoundException)
    })
  })

  describe('Meta live delete guards', () => {
    function createDeleteSupabase(rows: {
      ads?: Record<string, unknown> | null
      ad_sets?: Record<string, unknown> | null
      ad_campaigns?: Record<string, unknown> | null
    }) {
      const from = vi.fn((table: string) => {
        const row =
          table === 'ads' ? rows.ads : table === 'ad_sets' ? rows.ad_sets : rows.ad_campaigns
        const selectChain: Record<string, any> = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi
            .fn()
            .mockResolvedValue({ data: row ?? null, error: row ? null : { code: 'PGRST116' } }),
        }
        const deleteChain: Record<string, any> = {
          eq: vi.fn().mockResolvedValue({ error: null }),
          in: vi.fn().mockResolvedValue({ error: null }),
        }
        const updateChain: Record<string, any> = {
          eq: vi.fn().mockReturnThis(),
          then: (resolve: (v: any) => void) => resolve({ error: null }),
          catch: () => updateChain,
        }
        const adsSelectChain: Record<string, any> = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: (resolve: (v: any) => void) => resolve({ data: [], error: null }),
          catch: () => adsSelectChain,
        }
        const base = {
          ...selectChain,
          delete: vi.fn().mockReturnValue(deleteChain),
        }
        if (table === 'ads') {
          return {
            ...base,
            select: adsSelectChain.select,
            eq: adsSelectChain.eq,
            update: vi.fn().mockReturnValue(updateChain),
          }
        }
        return base
      })
      return { from }
    }

    it('blocks ad deletion when Meta status is ACTIVE', async () => {
      const metaApi = {
        refreshAdHierarchyStatus: vi.fn().mockResolvedValue({ ad_effective_status: 'ACTIVE' }),
      }
      const artifacts = new ArtifactsService(metaApi as any, {} as any)
      const sb = createDeleteSupabase({ ads: { id: 'ad-1', meta_ad_id: 'meta-1', metadata: {} } })
      await expect(artifacts.deleteAd(sb as any, 'user-1', 'ad-1')).rejects.toThrow(
        BadRequestException,
      )
    })

    it('allows ad deletion when not published to Meta', async () => {
      const metaApi = {
        refreshAdHierarchyStatus: vi.fn(),
      }
      const artifacts = new ArtifactsService(metaApi as any, {} as any)
      const sb = createDeleteSupabase({ ads: { id: 'ad-1', meta_ad_id: null, metadata: {} } })
      await expect(artifacts.deleteAd(sb as any, 'user-1', 'ad-1')).resolves.toBeUndefined()
    })

    it('allows ad deletion when Meta status is PAUSED', async () => {
      const metaApi = {
        refreshAdHierarchyStatus: vi.fn().mockResolvedValue({ ad_effective_status: 'PAUSED' }),
      }
      const artifacts = new ArtifactsService(metaApi as any, {} as any)
      const sb = createDeleteSupabase({ ads: { id: 'ad-1', meta_ad_id: 'meta-1', metadata: {} } })
      await expect(artifacts.deleteAd(sb as any, 'user-1', 'ad-1')).resolves.toBeUndefined()
    })

    it('blocks ad set deletion when Meta status is ACTIVE', async () => {
      const metaApi = {
        refreshAdSetStatus: vi.fn().mockResolvedValue({ ad_set_effective_status: 'ACTIVE' }),
      }
      const artifacts = new ArtifactsService(metaApi as any, {} as any)
      const sb = createDeleteSupabase({
        ad_sets: { id: 'adset-1', meta_adset_id: 'meta-1', metadata: {} },
      })
      await expect(artifacts.deleteAdSet(sb as any, 'user-1', 'adset-1')).rejects.toThrow(
        BadRequestException,
      )
    })

    it('allows ad set deletion when Meta status is PAUSED', async () => {
      const metaApi = {
        refreshAdSetStatus: vi.fn().mockResolvedValue({ ad_set_effective_status: 'PAUSED' }),
      }
      const artifacts = new ArtifactsService(metaApi as any, {} as any)
      const sb = createDeleteSupabase({
        ad_sets: { id: 'adset-1', meta_adset_id: 'meta-1', metadata: {} },
      })
      await expect(artifacts.deleteAdSet(sb as any, 'user-1', 'adset-1')).resolves.toBeUndefined()
    })

    it('blocks ad campaign deletion when Meta status is ACTIVE', async () => {
      const metaApi = {
        refreshAdCampaignStatus: vi
          .fn()
          .mockResolvedValue({ ad_campaign_effective_status: 'ACTIVE' }),
      }
      const artifacts = new ArtifactsService(metaApi as any, {} as any)
      const sb = createDeleteSupabase({
        ad_campaigns: { id: 'adcamp-1', meta_campaign_id: 'meta-1', metadata: {} },
      })
      await expect(artifacts.deleteAdCampaign(sb as any, 'user-1', 'adcamp-1')).rejects.toThrow(
        BadRequestException,
      )
    })

    it('allows ad campaign deletion when Meta status is PAUSED', async () => {
      const metaApi = {
        refreshAdCampaignStatus: vi
          .fn()
          .mockResolvedValue({ ad_campaign_effective_status: 'PAUSED' }),
      }
      const artifacts = new ArtifactsService(metaApi as any, {} as any)
      const sb = createDeleteSupabase({
        ad_campaigns: { id: 'adcamp-1', meta_campaign_id: 'meta-1', metadata: {} },
      })
      await expect(
        artifacts.deleteAdCampaign(sb as any, 'user-1', 'adcamp-1'),
      ).resolves.toBeUndefined()
    })

    it('duplicates active ad set as draft', async () => {
      const insertedAdSets: Array<Record<string, unknown>> = []
      const sourceAdSet = {
        id: 'adset-1',
        user_id: 'user-1',
        ad_campaign_id: 'camp-1',
        name: 'Scale Set',
        status: 'active',
        daily_budget: 1000,
        lifetime_budget: null,
        start_time: null,
        end_time: null,
        optimization_goal: 'LINK_CLICKS',
        billing_event: 'IMPRESSIONS',
        targeting: {},
        meta_adset_id: 'meta-as-1',
        meta_effective_status: 'ACTIVE',
        metadata: { meta_adset_id: 'meta-as-1', foo: 'bar' },
      }
      const sb = {
        from: vi.fn((table: string) => {
          if (table === 'ad_sets') {
            const chain: Record<string, any> = {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: sourceAdSet, error: null }),
              insert: vi.fn((payload: Record<string, unknown>) => {
                insertedAdSets.push(payload)
                return {
                  select: vi.fn().mockReturnValue({
                    single: vi
                      .fn()
                      .mockResolvedValue({ data: { id: 'adset-copy-1' }, error: null }),
                  }),
                }
              }),
              then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
                resolve({ data: [], error: null }),
            }
            return chain
          }
          if (table === 'ads') {
            const chain: Record<string, any> = {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
                resolve({ data: [], error: null }),
            }
            return chain
          }
          return {}
        }),
      }
      const metaApi = {
        refreshAdSetStatus: vi.fn().mockResolvedValue({ ad_set_effective_status: 'ACTIVE' }),
      }
      const artifacts = new ArtifactsService(metaApi as any, {} as any)
      await artifacts.duplicateAdSet(sb as any, 'user-1', 'adset-1')

      expect(insertedAdSets).toHaveLength(1)
      expect(insertedAdSets[0]?.status).toBe('draft')
      expect(insertedAdSets[0]?.meta_adset_id).toBeNull()
      expect(insertedAdSets[0]?.meta_effective_status).toBeNull()
    })

    it('duplicates active ad with meta linkage removed', async () => {
      const insertedAds: Array<Record<string, unknown>> = []
      const sourceAd = {
        id: 'ad-1',
        user_id: 'user-1',
        campaign_id: 'camp-1',
        ad_set_id: 'adset-1',
        platform: 'meta',
        placement: 'feed',
        primary_text: 'Text',
        headline: 'Ad Name',
        description: null,
        cta_type: 'LEARN_MORE',
        cta_text: null,
        destination_url: 'https://example.com',
        display_link: null,
        image_url: 'https://example.com/image.png',
        image_asset_id: null,
        generated_tsx: null,
        tracking_url: null,
        meta_ad_id: 'meta-ad-1',
        meta_effective_status: 'ACTIVE',
        metadata: { meta_ad_id: 'meta-ad-1', meta_status: 'ACTIVE', keep: true },
      }
      const sb = {
        from: vi.fn((table: string) => {
          if (table !== 'ads') return {}
          const chain: Record<string, any> = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: sourceAd, error: null }),
            insert: vi.fn((payload: Record<string, unknown>) => {
              insertedAds.push(payload)
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: 'ad-copy-1' }, error: null }),
                }),
              }
            }),
          }
          return chain
        }),
      }
      const metaApi = {
        refreshAdHierarchyStatus: vi.fn().mockResolvedValue({ ad_effective_status: 'ACTIVE' }),
      }
      const artifacts = new ArtifactsService(metaApi as any, {} as any)
      await artifacts.duplicateAd(sb as any, 'user-1', 'ad-1')

      expect(insertedAds).toHaveLength(1)
      expect(insertedAds[0]?.meta_ad_id).toBeNull()
      expect(insertedAds[0]?.meta_effective_status).toBeNull()
      expect(insertedAds[0]?.headline).not.toContain('(Copy)')
      expect(insertedAds[0]?.headline).toBe(sourceAd.headline)
      expect(insertedAds[0]?.metadata).toEqual({ keep: true })
    })
  })
})
