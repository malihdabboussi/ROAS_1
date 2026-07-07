import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConflictException, NotFoundException } from '@nestjs/common'
import { TableSupabaseHarness } from '../../../../test/utils/table-supabase-harness'
import type { LeadsRepository } from '../../repositories/leads.repository'
import { LeadsService } from '../leads.service'

// Mock createClient for ingestLead
const createClientMock = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: any[]) => createClientMock(...args),
}))

describe('LeadsService', () => {
  let service: LeadsService
  let mockRepo: Record<string, ReturnType<typeof vi.fn>>
  let mockContactIdentifier: Record<string, ReturnType<typeof vi.fn>>
  const mockSupabase = {} as any

  beforeEach(() => {
    vi.clearAllMocks()
    mockRepo = {
      findByFunnelId: vi.fn(),
      findByCampaignId: vi.fn(),
      findContacts: vi.fn(),
      findCrmContacts: vi.fn(),
      createLeadSecure: vi.fn(),
    }
    mockContactIdentifier = {
      findOrCreateContact: vi.fn().mockResolvedValue({
        id: 'contact-1',
        user_id: 'user-1',
        org_id: 'org-1',
        email: 'lead@test.com',
        contact_type: 'unknown',
      }),
      attachIdentifier: vi.fn().mockResolvedValue(undefined),
    }
    service = new LeadsService(
      mockRepo as unknown as LeadsRepository,
      {} as any,
      {
        newSendCorrelationId: vi.fn(() => '00000000-0000-4000-8000-000000000001'),
        shouldHideBranding: vi.fn().mockResolvedValue(false),
        buildUnsubscribeUrl: vi.fn().mockReturnValue('https://app.test/unsubscribe/t'),
        appendSignatureAndFooter: vi.fn().mockReturnValue({ html: '<p>x</p>', text: 'x' }),
      } as any,
      mockContactIdentifier as any,
    )
  })

  describe('getLeadsByFunnel', () => {
    it('should delegate to repository', async () => {
      const leads = [{ id: '1', email: 'a@b.com' }]
      mockRepo.findByFunnelId.mockResolvedValue(leads)
      const result = await service.getLeadsByFunnel(mockSupabase, 'funnel-1')
      expect(result).toEqual(leads)
      expect(mockRepo.findByFunnelId).toHaveBeenCalledWith(mockSupabase, 'funnel-1', undefined)
    })
  })

  describe('getLeadsByCampaign', () => {
    it('should delegate to repository', async () => {
      mockRepo.findByCampaignId.mockResolvedValue([])
      const result = await service.getLeadsByCampaign(mockSupabase, 'campaign-1')
      expect(result).toEqual([])
      expect(mockRepo.findByCampaignId).toHaveBeenCalledWith(mockSupabase, 'campaign-1', undefined)
    })
  })

  describe('getContacts', () => {
    it('should pass options to repository', async () => {
      mockRepo.findContacts.mockResolvedValue({ data: [], count: 0 })
      await service.getContacts(mockSupabase, { search: 'test', limit: 10 })
      expect(mockRepo.findContacts).toHaveBeenCalledWith(mockSupabase, {
        search: 'test',
        limit: 10,
      })
    })
  })

  describe('getCrmContacts', () => {
    it('loads segment filters and passes derived funnel/date constraints to the repository', async () => {
      const db = new TableSupabaseHarness({
        segments: [
          {
            id: 'segment-1',
            org_id: 'org-1',
            filters: {
              campaigns: ['campaign-1'],
              funnels: ['funnel-1', 'funnel-2'],
              date_range: { from: '2026-06-01', to: '2026-06-08' },
            },
          },
        ],
      })
      mockRepo.findCrmContacts.mockResolvedValue({ contacts: [], total: 0, hasMore: false })

      await service.getCrmContacts(db.client, {
        segmentId: 'segment-1',
        campaignId: 'campaign-1',
        orgId: 'org-1',
      })

      expect(mockRepo.findCrmContacts).toHaveBeenCalledWith(
        db.client,
        expect.objectContaining({
          campaignId: 'campaign-1',
          orgId: 'org-1',
          segmentFunnelIds: ['funnel-1', 'funnel-2'],
          segmentDateFrom: '2026-06-01',
          segmentDateTo: '2026-06-08',
        }),
      )
    })

    it('returns an empty page when a segment excludes the requested campaign', async () => {
      const db = new TableSupabaseHarness({
        segments: [
          {
            id: 'segment-1',
            org_id: 'org-1',
            filters: { campaigns: ['campaign-2'] },
          },
        ],
      })

      const result = await service.getCrmContacts(db.client, {
        segmentId: 'segment-1',
        campaignId: 'campaign-1',
        orgId: 'org-1',
      })

      expect(result).toEqual({ contacts: [], total: 0, hasMore: false })
      expect(mockRepo.findCrmContacts).not.toHaveBeenCalled()
    })
  })

  describe('CRM sync jobs', () => {
    it('creates a queued ActiveCampaign sync job after connection validation', async () => {
      const db = new TableSupabaseHarness({
        vault_secrets: [
          {
            id: 'secret-url',
            user_id: 'user-1',
            provider: 'active_campaign',
            label: 'api_url',
          },
          {
            id: 'secret-key',
            user_id: 'user-1',
            provider: 'active_campaign',
            label: 'api_key',
          },
        ],
        crm_sync_jobs: [],
      })
      vi.spyOn(service as never, 'createServiceClient').mockReturnValue(db.client)

      const result = await service.startCrmSync('user-1', 'ActiveCampaign')

      expect(result).toEqual({ jobId: expect.any(String), status: 'queued' })
      expect(db.table('crm_sync_jobs')).toContainEqual(
        expect.objectContaining({
          user_id: 'user-1',
          source: 'activecampaign',
          status: 'queued',
        }),
      )
    })

    it('rejects a sync when another job is already active for the same source', async () => {
      const db = new TableSupabaseHarness({
        vault_secrets: [
          {
            id: 'secret-url',
            user_id: 'user-1',
            provider: 'active_campaign',
            label: 'api_url',
          },
          {
            id: 'secret-key',
            user_id: 'user-1',
            provider: 'active_campaign',
            label: 'api_key',
          },
        ],
        crm_sync_jobs: [
          {
            id: 'job-1',
            user_id: 'user-1',
            source: 'activecampaign',
            status: 'processing',
          },
        ],
      })
      vi.spyOn(service as never, 'createServiceClient').mockReturnValue(db.client)

      await expect(service.startCrmSync('user-1', 'activecampaign')).rejects.toBeInstanceOf(
        ConflictException,
      )
    })

    it('returns a user-scoped CRM sync job or not found', async () => {
      const db = new TableSupabaseHarness({
        crm_sync_jobs: [
          {
            id: 'job-1',
            user_id: 'user-1',
            source: 'gohighlevel',
            status: 'queued',
          },
        ],
      })
      vi.spyOn(service as never, 'createServiceClient').mockReturnValue(db.client)

      await expect(service.getCrmSyncJob('user-1', 'job-1')).resolves.toMatchObject({
        id: 'job-1',
        source: 'gohighlevel',
      })
      await expect(service.getCrmSyncJob('user-2', 'job-1')).rejects.toBeInstanceOf(
        NotFoundException,
      )
    })
  })

  describe('ingestLead', () => {
    it('should create lead via anon client', async () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co'
      process.env.SUPABASE_ANON_KEY = 'anon_key'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_key'
      mockRepo.createLeadSecure.mockResolvedValue({ id: '1' })

      const anonClient = {}

      const funnelsChain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'funnel-1',
            user_id: 'user-1',
            campaign_id: 'campaign-1',
            tag_ids: [],
            org_id: 'org-1',
          },
          error: null,
        }),
      }

      const contactsChain: any = {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'contact-1', tags: [] },
          error: null,
        }),
      }

      const funnelMembershipChain: any = {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }

      const campaignMembershipChain: any = {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }

      const senderIdentityChain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'sender-1', domain_id: 'domain-1' },
          error: null,
        }),
      }

      const workflowEdgesChain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const serviceClient: any = {
        from: vi.fn((table: string) => {
          if (table === 'funnels') return funnelsChain
          if (table === 'email_sender_identities') return senderIdentityChain
          if (table === 'campaign_workflow_edges') return workflowEdgesChain
          if (table === 'contacts') return contactsChain
          if (table === 'contact_funnel_memberships') return funnelMembershipChain
          if (table === 'contact_campaign_memberships') return campaignMembershipChain
          throw new Error(`Unexpected table: ${table}`)
        }),
      }

      createClientMock.mockImplementationOnce(() => anonClient)
      createClientMock.mockImplementationOnce(() => serviceClient)

      const result = await service.ingestLead({
        funnelId: 'funnel-1',
        email: 'lead@test.com',
        name: 'Test Lead',
      })

      expect(mockRepo.createLeadSecure).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          p_funnel_id: 'funnel-1',
          p_email: 'lead@test.com',
          p_name: 'Test Lead',
        }),
      )

      expect(serviceClient.from).toHaveBeenCalledWith('contact_funnel_memberships')
      expect(serviceClient.from).toHaveBeenCalledWith('contact_campaign_memberships')

      expect(result).toBeDefined()
    })

    it('should throw if env vars missing', async () => {
      const origUrl = process.env.SUPABASE_URL
      delete process.env.SUPABASE_URL

      await expect(
        service.ingestLead({
          funnelId: 'f1',
          email: 'a@b.com',
        }),
      ).rejects.toThrow('Missing SUPABASE_URL')

      process.env.SUPABASE_URL = origUrl
    })
  })
})
