import { describe, expect, it } from 'vitest'
import { CHILD_TABLES_NO_ORG_ID, CHILD_TABLES_WITH_ORG_ID } from '../transfer.types'
import {
  createMutationQuery,
  createOrgRoleQuery,
  createQueuedQuery,
  createQueuedSupabase,
  createSupabaseWithQueries,
  createTransferService,
} from './transfer-test-helpers'

describe('TransferService campaign transfers', () => {
  it('previews campaign children, active mission warnings, and linked resources', async () => {
    const supabase = createQueuedSupabase({
      campaigns: [
        {
          data: { id: 'campaign-1', name: 'Demo campaign', org_id: null, user_id: 'user-1' },
          error: null,
        },
      ],
      org_members: [{ data: { role: 'creator' }, error: null }],
      offers: [{ count: 2 }],
      avatars: [{ count: 0 }],
      presentations: [{ count: 0 }],
      funnels: [
        { count: 1 },
        { data: [{ id: 'funnel-1', domain_id: 'domain-1', domains: { id: 'domain-1', domain: 'example.com' } }], error: null },
      ],
      sequences: [{ count: 1 }, { data: [{ id: 'sequence-1' }], error: null }],
      conversations: [{ count: 0 }],
      missions: [{ count: 0 }, { count: 2 }],
      social_posts: [{ count: 0 }],
      blog_posts: [{ count: 0 }],
      ad_campaigns: [{ count: 0 }],
      leads: [{ count: 0 }],
      media_assets: [{ count: 0 }],
      campaign_nodes: [{ count: 0 }],
      campaign_edges: [{ count: 0 }],
      campaign_node_sources: [{ count: 0 }],
      campaign_workflows: [{ count: 0 }],
      campaign_workflow_edges: [{ count: 0 }],
      campaign_workflow_layouts: [{ count: 0 }],
      campaign_tasks: [{ count: 0 }],
      campaign_plans: [{ count: 0 }],
      campaign_strategy_nodes: [{ count: 0 }],
      campaign_integration_connections: [{ count: 0 }],
      email_sender_identities: [
        {
          data: [
            {
              id: 'sender-1',
              domain_id: 'email-domain-1',
              email_domains: { id: 'email-domain-1', domain: 'mail.example.com' },
            },
          ],
          error: null,
        },
      ],
      contact_campaign_memberships: [
        { data: [{ contact_id: 'contact-1' }, { contact_id: 'contact-2' }], error: null },
      ],
      contacts: [{ count: 2 }],
    })
    const service = createTransferService(supabase)

    const result = await service.previewCampaign(
      'campaign-1',
      'user-1',
      { org_id: 'org-1' },
      'copy',
    )

    expect(result.children.offers).toBe(2)
    expect(result.children.funnels).toBe(1)
    expect(result.warnings).toContain('2 active mission(s) will be paused during transfer')
    expect(result.warnings).toContain(
      '1 funnel(s) use custom domains that should also be transferred',
    )
    expect(result.warnings).toContain('Campaign has email sequences using 1 email domain(s)')
    expect(result.linked_resources).toEqual({
      domains: [{ id: 'domain-1', domain: 'example.com' }],
      email_domains: [{ id: 'email-domain-1', domain: 'mail.example.com' }],
      contacts: 2,
    })
  })

  it('moves campaign rows and selected linked resources to the target org', async () => {
    const campaignLoadQuery = createQueuedQuery({
      data: { id: 'campaign-1', name: 'Demo campaign', org_id: null },
      error: null,
    })
    const roleQuery = createOrgRoleQuery('admin')
    const pauseMissionsQuery = createMutationQuery()
    const campaignMoveQuery = createMutationQuery()
    const offersMoveQuery = createMutationQuery()
    const offersCountQuery = createQueuedQuery({ count: 3 })
    const domainMoveQuery = createMutationQuery()
    const emailDomainMoveQuery = createMutationQuery()
    const senderIdentityMoveQuery = createMutationQuery()
    const membershipsQuery = createQueuedQuery({
      data: [{ contact_id: 'contact-1' }, { contact_id: 'contact-2' }],
      error: null,
    })
    const contactsMoveQuery = createMutationQuery()
    const usageMoveQuery = createMutationQuery()
    const supabase = createSupabaseWithQueries({
      campaigns: [campaignLoadQuery, campaignMoveQuery],
      org_members: [roleQuery],
      missions: [pauseMissionsQuery],
      offers: [offersMoveQuery, offersCountQuery],
      domains: [domainMoveQuery],
      email_domains: [emailDomainMoveQuery],
      email_sender_identities: [senderIdentityMoveQuery],
      contact_campaign_memberships: [membershipsQuery],
      contacts: [contactsMoveQuery],
      ai_usage_events: [usageMoveQuery],
    })
    const service = createTransferService(supabase)

    const result = await service.executeCampaignTransfer(
      'campaign-1',
      'user-1',
      { org_id: 'org-1' },
      'move',
      {
        exclude_tables: CHILD_TABLES_WITH_ORG_ID.filter((table) => table !== 'offers'),
        include_domains: ['domain-1'],
        include_email_domains: ['email-domain-1'],
        include_contacts: true,
      },
    )

    expect(result).toEqual({
      success: true,
      entity_id: 'campaign-1',
      mode: 'move',
      transferred: {
        campaigns: 1,
        offers: 3,
        domains: 1,
        email_domains: 1,
        contacts: 2,
      },
    })
    expect(pauseMissionsQuery.update).toHaveBeenCalledWith({ status: 'paused' })
    expect(pauseMissionsQuery.in).toHaveBeenCalledWith('status', [
      'queued',
      'in_progress',
      'executing',
    ])
    expect(campaignMoveQuery.update).toHaveBeenCalledWith({ org_id: 'org-1' })
    expect(offersMoveQuery.update).toHaveBeenCalledWith({ org_id: 'org-1' })
    expect(offersCountQuery.eq).toHaveBeenCalledWith('org_id', 'org-1')
    expect(domainMoveQuery.update).toHaveBeenCalledWith({ org_id: 'org-1' })
    expect(emailDomainMoveQuery.update).toHaveBeenCalledWith({ org_id: 'org-1' })
    expect(senderIdentityMoveQuery.update).toHaveBeenCalledWith({ org_id: 'org-1' })
    expect(contactsMoveQuery.update).toHaveBeenCalledWith({ org_id: 'org-1' })
    expect(contactsMoveQuery.in).toHaveBeenCalledWith('id', ['contact-1', 'contact-2'])
    expect(usageMoveQuery.update).toHaveBeenCalledWith({ org_id: 'org-1' })
  })

  it('copies campaign rows with child and config rows into the target org', async () => {
    const campaignLoadQuery = createQueuedQuery({
      data: {
        id: 'campaign-1',
        name: 'Demo campaign',
        org_id: null,
        user_id: 'user-1',
        created_at: 'old-created',
        updated_at: 'old-updated',
        deleted_at: null,
      },
      error: null,
    })
    const roleQuery = createOrgRoleQuery('creator')
    const campaignCopyQuery = createMutationQuery({
      data: { id: 'campaign-copy', name: 'Demo campaign (Copy)', org_id: 'org-1' },
      error: null,
    })
    const offersListQuery = createQueuedQuery({
      data: [
        {
          id: 'offer-1',
          campaign_id: 'campaign-1',
          org_id: null,
          name: 'Offer',
          price: 100,
          created_at: 'old-created',
          updated_at: 'old-updated',
          deleted_at: null,
        },
      ],
      error: null,
    })
    const offerInsertQuery = createMutationQuery({
      data: { id: 'offer-copy' },
      error: null,
    })
    const campaignNodesListQuery = createQueuedQuery({
      data: [
        {
          id: 'node-1',
          campaign_id: 'campaign-1',
          type: 'node',
          position: 1,
          created_at: 'old-created',
          updated_at: 'old-updated',
        },
      ],
      error: null,
    })
    const campaignNodesInsertQuery = createMutationQuery()
    const supabase = createSupabaseWithQueries({
      campaigns: [campaignLoadQuery, campaignCopyQuery],
      org_members: [roleQuery],
      offers: [offersListQuery, offerInsertQuery],
      campaign_nodes: [campaignNodesListQuery, campaignNodesInsertQuery],
    })
    const service = createTransferService(supabase)

    const result = await service.executeCampaignTransfer(
      'campaign-1',
      'user-1',
      { org_id: 'org-1' },
      'copy',
      {
        exclude_tables: [
          ...CHILD_TABLES_WITH_ORG_ID.filter((table) => table !== 'offers'),
          ...CHILD_TABLES_NO_ORG_ID.filter((table) => table !== 'campaign_nodes'),
        ],
      },
    )

    expect(result).toEqual({
      success: true,
      entity_id: 'campaign-copy',
      mode: 'copy',
      transferred: {
        campaigns: 1,
        offers: 1,
        campaign_nodes: 1,
      },
    })
    expect(campaignCopyQuery.insert).toHaveBeenCalledWith({
      name: 'Demo campaign (Copy)',
      org_id: 'org-1',
      user_id: 'user-1',
    })
    expect(offerInsertQuery.insert).toHaveBeenCalledWith({
      campaign_id: 'campaign-copy',
      org_id: 'org-1',
      name: 'Offer',
      price: 100,
    })
    expect(campaignNodesInsertQuery.insert).toHaveBeenCalledWith([
      {
        campaign_id: 'campaign-copy',
        type: 'node',
        position: 1,
      },
    ])
  })

  it('copies campaign funnel, ad, and parent child rows with current remapping', async () => {
    const campaignLoadQuery = createQueuedQuery({
      data: {
        id: 'campaign-1',
        name: 'Demo campaign',
        org_id: null,
        user_id: 'user-1',
        created_at: 'old-created',
        updated_at: 'old-updated',
        deleted_at: null,
      },
      error: null,
    })
    const roleQuery = createOrgRoleQuery('creator')
    const campaignCopyQuery = createMutationQuery({
      data: { id: 'campaign-copy', name: 'Demo campaign (Copy)', org_id: 'org-1' },
      error: null,
    })
    const offersListQuery = createQueuedQuery({
      data: [
        {
          id: 'offer-1',
          campaign_id: 'campaign-1',
          org_id: null,
          name: 'Offer',
          created_at: 'old-created',
          updated_at: 'old-updated',
          deleted_at: null,
        },
      ],
      error: null,
    })
    const offerInsertQuery = createMutationQuery({ data: { id: 'offer-copy' }, error: null })
    const sequencesListQuery = createQueuedQuery({
      data: [
        {
          id: 'sequence-1',
          campaign_id: 'campaign-1',
          org_id: null,
          name: 'Sequence',
          created_at: 'old-created',
          updated_at: 'old-updated',
          deleted_at: null,
        },
      ],
      error: null,
    })
    const sequenceInsertQuery = createMutationQuery({
      data: { id: 'sequence-copy' },
      error: null,
    })
    const funnelsListQuery = createQueuedQuery({
      data: [
        {
          id: 'funnel-1',
          campaign_id: 'campaign-1',
          org_id: null,
          offer_id: 'offer-1',
          name: 'Funnel',
          domain_id: 'domain-1',
          published_url: 'https://example.com',
          home_page_id: 'page-1',
          created_at: 'old-created',
          updated_at: 'old-updated',
        },
      ],
      error: null,
    })
    const funnelInsertQuery = createMutationQuery({ data: { id: 'funnel-copy' }, error: null })
    const funnelPagesListQuery = createQueuedQuery({
      data: [
        {
          id: 'page-1',
          funnel_id: 'funnel-1',
          title: 'Home',
          path: '/',
          created_at: 'old-created',
          updated_at: 'old-updated',
        },
      ],
      error: null,
    })
    const funnelPagesInsertQuery = createMutationQuery()
    const sequenceEmailsListQuery = createQueuedQuery({
      data: [
        {
          id: 'email-1',
          sequence_id: 'sequence-1',
          subject: 'Welcome',
          created_at: 'old-created',
          updated_at: 'old-updated',
        },
      ],
      error: null,
    })
    const sequenceEmailInsertQuery = createMutationQuery()
    const adCampaignsListQuery = createQueuedQuery({
      data: [
        {
          id: 'ad-campaign-1',
          campaign_id: 'campaign-1',
          org_id: null,
          name: 'Ad campaign',
          created_at: 'old-created',
          updated_at: 'old-updated',
          deleted_at: null,
        },
      ],
      error: null,
    })
    const adCampaignInsertQuery = createMutationQuery({
      data: { id: 'ad-campaign-copy' },
      error: null,
    })
    const adSetsListQuery = createQueuedQuery({
      data: [
        {
          id: 'ad-set-1',
          campaign_id: 'campaign-1',
          org_id: null,
          ad_campaign_id: 'ad-campaign-1',
          name: 'Ad set',
          status: 'active',
          external_id: 'external-set',
          meta_set_id: 'meta-set',
          fb_set_id: 'fb-set',
          created_at: 'old-created',
          updated_at: 'old-updated',
        },
      ],
      error: null,
    })
    const adSetInsertQuery = createMutationQuery({ data: { id: 'ad-set-copy' }, error: null })
    const adsListQuery = createQueuedQuery({
      data: [
        {
          id: 'ad-1',
          campaign_id: 'campaign-1',
          ad_set_id: 'ad-set-1',
          name: 'Ad',
          status: 'published',
          external_id: 'external-ad',
          meta_ad_id: 'meta-ad',
          facebook_creative_id: 'creative',
          created_at: 'old-created',
          updated_at: 'old-updated',
        },
      ],
      error: null,
    })
    const adInsertQuery = createMutationQuery({ data: { id: 'ad-copy' }, error: null })
    const supabase = createSupabaseWithQueries({
      campaigns: [campaignLoadQuery, campaignCopyQuery],
      org_members: [roleQuery],
      offers: [offersListQuery, offerInsertQuery],
      sequences: [sequencesListQuery, sequenceInsertQuery],
      funnels: [funnelsListQuery, funnelInsertQuery],
      funnel_pages: [funnelPagesListQuery, funnelPagesInsertQuery],
      sequence_emails: [sequenceEmailsListQuery, sequenceEmailInsertQuery],
      ad_campaigns: [adCampaignsListQuery, adCampaignInsertQuery],
      ad_sets: [adSetsListQuery, adSetInsertQuery],
      ads: [adsListQuery, adInsertQuery],
    })
    const service = createTransferService(supabase)

    const result = await service.executeCampaignTransfer(
      'campaign-1',
      'user-1',
      { org_id: 'org-1' },
      'copy',
      {
        exclude_tables: [
          ...CHILD_TABLES_WITH_ORG_ID.filter(
            (table) => !['offers', 'sequences', 'funnels', 'ad_campaigns'].includes(table),
          ),
          ...CHILD_TABLES_NO_ORG_ID,
        ],
      },
    )

    expect(result).toEqual({
      success: true,
      entity_id: 'campaign-copy',
      mode: 'copy',
      transferred: {
        campaigns: 1,
        offers: 1,
        sequences: 1,
        funnels: 1,
        sequence_emails: 1,
        ad_campaigns: 1,
        ad_sets: 1,
        ads: 1,
      },
    })
    expect(funnelInsertQuery.insert).toHaveBeenCalledWith({
      campaign_id: 'campaign-copy',
      org_id: 'org-1',
      offer_id: 'offer-copy',
      name: 'Funnel',
      domain_id: null,
      published_url: null,
      home_page_id: null,
    })
    expect(funnelPagesInsertQuery.insert).toHaveBeenCalledWith([
      {
        funnel_id: 'funnel-copy',
        title: 'Home',
        path: '/',
      },
    ])
    expect(sequenceEmailsListQuery.in).toHaveBeenCalledWith('sequence_id', [
      'campaign-1',
      'offer-1',
      'sequence-1',
      'funnel-1',
    ])
    expect(sequenceEmailInsertQuery.insert).toHaveBeenCalledWith({
      sequence_id: 'sequence-copy',
      subject: 'Welcome',
    })
    expect(adSetInsertQuery.insert).toHaveBeenCalledWith({
      campaign_id: 'campaign-copy',
      org_id: 'org-1',
      ad_campaign_id: 'ad-campaign-copy',
      name: 'Ad set',
      status: 'draft',
      external_id: null,
      meta_set_id: null,
      fb_set_id: null,
    })
    expect(adInsertQuery.insert).toHaveBeenCalledWith({
      campaign_id: 'campaign-copy',
      ad_set_id: 'ad-set-copy',
      name: 'Ad',
      status: 'draft',
      external_id: null,
      meta_ad_id: null,
      facebook_creative_id: null,
    })
  })
})
