import { describe, expect, it, vi } from 'vitest'
import { ChatAttachmentContextRepository } from '../repositories/chat-attachment-context.repository'
import { ChatContextRepository } from '../repositories/chat-context.repository'
import { ChatContactLinkingService } from './chat-contact-linking.service'
import { ChatDocumentContextService } from './chat-document-context.service'
import { ChatModelInputService } from './chat-model-input.service'
import { ChatProfileContextService } from './chat-profile-context.service'
import { ChatReferenceContextService } from './chat-reference-context.service'

function makeSupabaseService(client: unknown) {
  return { client } as any
}

function makeModelInputService(input: {
  client?: unknown
  repository?: unknown
  runtimeSkillScope?: unknown
}) {
  return new ChatModelInputService(
    makeSupabaseService(input.client ?? {}),
    (input.runtimeSkillScope ??
      ({
        resolveRuntimeSkillCatalog: vi.fn(async () => ({ entries: [] })),
        resolveRuntimeSkillScope: vi.fn(async () => ({
          skills: [],
          resources: [],
          requiredSkillFiles: [],
        })),
      } as any)) as any,
    (input.repository ?? new ChatContextRepository()) as any,
  )
}

function makeContactLinkingService(input: { conversations: unknown; repository?: unknown }) {
  return new ChatContactLinkingService(
    input.conversations as any,
    (input.repository ?? new ChatContextRepository()) as any,
  )
}

function makeDocumentContextService(client: unknown) {
  return new ChatDocumentContextService(
    makeSupabaseService(client),
    new ChatAttachmentContextRepository(),
  )
}

function makeReferenceContextService(client: unknown) {
  return new ChatReferenceContextService(
    makeSupabaseService(client),
    new ChatAttachmentContextRepository(),
  )
}

function makeProfileContextService(input: { client?: unknown; repository?: unknown }) {
  return new ChatProfileContextService(
    makeSupabaseService(input.client ?? {}),
    (input.repository ?? new ChatContextRepository()) as any,
  )
}

function makeQuery<T>(result: T, error: { message?: string } | null = null) {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    in: vi.fn(() => query),
    neq: vi.fn(() => query),
    or: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    update: vi.fn(() => query),
    insert: vi.fn(async () => ({ data: result, error })),
    maybeSingle: vi.fn(async () => ({ data: result, error })),
    then: (resolve: (value: { data: T; error: { message?: string } | null }) => unknown) =>
      Promise.resolve(resolve({ data: result, error })),
  }
  return query
}

function makeClient(tables: Record<string, unknown>) {
  return {
    from: vi.fn((table: string) => makeQuery(tables[table] ?? null)),
  }
}

describe('ChatService context helpers', () => {
  it('resolves configured models and model capability profiles', async () => {
    const client = makeClient({
      agents_registry: { config: { model_id: 'anthropic/claude-fable-5' } },
      llm_model_capabilities: {
        capability_profile: {
          reasoning: { transport: 'reasoning.effort', levels: ['low'] },
          speed: { available: true, fastModelId: 'google/gemini-3.5-flash' },
        },
      },
    })
    const service = makeModelInputService({ client })

    await expect(service.resolveAgentConfiguredModel(client, 'user-1', 'zara', null)).resolves.toBe(
      'auto:power',
    )
    await expect(service.loadModelCapability('anthropic/claude-opus-4.6')).resolves.toEqual({
      provider: 'anthropic',
      modelName: 'claude-opus-4.6',
      profile: {
        reasoning: { transport: 'reasoning.effort', levels: ['low'] },
        speed: { available: true, fastModelId: 'google/gemini-3.5-flash' },
      },
    })
  })

  it('links extracted contact emails onto conversations', async () => {
    const client = makeClient({ contacts: { id: 'contact-1' } })
    const update = vi.fn(async () => undefined)
    const service = makeContactLinkingService({
      conversations: {
        findByIdScoped: vi.fn(async () => ({
          id: 'conversation-1',
          contact_id: null,
          metadata: { existing: true },
        })),
        update,
      },
    })
    const logger = { log: vi.fn() }

    await service.tryExtractAndLinkContact(
      client,
      'conversation-1',
      'user-1',
      'Please follow up with ava@example.com',
      null,
      logger,
    )

    expect(update).toHaveBeenCalledWith(client, 'conversation-1', {
      metadata: expect.objectContaining({
        existing: true,
        extracted_email: 'ava@example.com',
        extracted_email_at: expect.any(String),
      }),
      contact_id: 'contact-1',
    })
  })

  it('persists uploaded document rows and document cache metadata', async () => {
    const client = makeClient({
      conversation_documents: [],
      media_assets: [],
    })
    const logger = { log: vi.fn(), warn: vi.fn() }
    const service = makeDocumentContextService(client)

    await service.saveUploadedDocuments(
      'conversation-1',
      'campaign-1',
      [
        {
          filename: 'brief.pdf',
          type: 'text',
          text: 'Brief text',
          fileUrl: 'https://cdn.example.com/brief.pdf',
          mediaAssetId: 'media-1',
          preview: 'Brief preview',
        },
        {
          filename: 'hero.png',
          type: 'image',
          fileUrl: 'https://cdn.example.com/hero.png',
        },
        { filename: 'empty.txt', type: 'text' },
      ],
      logger,
    )
    await service.cacheUploadedDocumentText('media-1', ' Extracted text ', 3)

    const documentQuery = client.from.mock.results[0]?.value
    const cacheQuery = client.from.mock.results[1]?.value
    expect(documentQuery.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        conversation_id: 'conversation-1',
        campaign_id: 'campaign-1',
        title: 'brief.pdf',
        document_type: 'upload',
      }),
      expect.objectContaining({
        conversation_id: 'conversation-1',
        title: 'hero.png',
        document_type: 'image_upload',
      }),
    ])
    expect(cacheQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        text_layer: 'Extracted text',
        page_count: 3,
        index_error: null,
      }),
    )
    expect(logger.log).toHaveBeenCalledWith(
      'Saved 2 uploaded document(s) to conversation_documents',
    )
  })

  it('routes current and previous image attachments into in-chat image editing', () => {
    const service = makeDocumentContextService({})
    const currentContext = service.buildImageContext([
      {
        filename: 'employee.png',
        type: 'image',
        fileUrl: 'https://cdn.example.com/employee.png',
        mediaAssetId: 'media-1',
      },
    ])
    const previousContext = service.buildImageUrlContext([
      {
        filename: 'employee.png',
        url: 'https://cdn.example.com/employee.png',
      },
    ])

    for (const context of [currentContext, previousContext]) {
      expect(context).toContain('generate_image')
      expect(context).toContain('input_image_url')
      expect(context).toContain('https://cdn.example.com/employee.png')
      expect(context).toContain('Do not search for an external OpenAI or ChatGPT integration')
      expect(context).toContain('Do not invent a separate consent requirement')
    }
  })

  it('loads uploaded document cache rows into normalized metadata', async () => {
    const client = makeClient({
      media_assets: {
        id: 'media-1',
        text_layer: ' Cached text ',
        document_intelligence: { status: 'ready', text_quality: 'usable' },
        page_count: '4',
        public_url: 'https://cdn.example.com/brief.pdf',
        file_size: '1024',
        mime_type: 'application/pdf',
      },
    })
    const service = makeDocumentContextService(client)

    await expect(service.loadUploadedDocumentCache('media-1', 'user-1', null)).resolves.toEqual({
      textLayer: 'Cached text',
      documentIntelligence: { status: 'ready', text_quality: 'usable' },
      pageCount: 4,
      fileUrl: 'https://cdn.example.com/brief.pdf',
      sizeBytes: 1024,
      mimeType: 'application/pdf',
    })
  })

  it('builds highlighted artifact context from resolved space items', async () => {
    const client = makeClient({
      space_items: [
        {
          id: 'item-1',
          space_id: 'space-1',
          custom_data: {
            post_url: 'https://example.com/post',
            analyzed_at: '2026-06-01',
            comments: [{ text: 'Great' }],
          },
        },
      ],
    })
    const service = makeReferenceContextService(client)

    const context = await service.buildHighlightedArtifactsContext(
      [
        {
          id: 'media:space-1:media-1',
          type: 'instagram-research',
          label: 'Launch reel',
        },
      ],
      { warn: vi.fn() },
    )

    expect(context).toContain('Launch reel')
    expect(context).toContain('retrieve_via: get_task(space_id="space-1", task_id="item-1")')
    expect(context).toContain('post_url="https://example.com/post"')
  })

  it('builds message reference context from media and mission rows', async () => {
    const client = makeClient({
      media_assets: [
        {
          id: 'media-1',
          name: 'Hero image',
          public_url: 'https://cdn.example.com/hero.png',
          mime_type: 'image/png',
        },
      ],
      missions: [
        {
          id: 'mission-1',
          title: 'Write launch brief',
          status: 'active',
          assigned_agent_key: 'zara',
        },
      ],
    })
    const service = makeReferenceContextService(client)

    const context = await service.buildMessageReferencesContext(
      [
        { kind: 'media', id: 'media-1', label: 'Hero fallback' },
        { kind: 'mission', id: 'mission-1', label: 'Mission fallback' },
      ],
      'user-1',
      undefined,
    )

    expect(context).toContain('[Media] Hero image')
    expect(context).toContain('https://cdn.example.com/hero.png')
    expect(context).toContain('[Mission] Write launch brief')
    expect(context).toContain('agent: zara')
  })

  it('resolves an organization-scoped person reference and exposes its Person Brain', async () => {
    const client = makeClient({
      channel_members: [
        {
          id: 'person-1',
          display_name: 'Bob Builder',
          title: 'Media buyer',
          relationship_kind: 'internal',
          person_brain_id: 'brain-bob',
        },
      ],
    })
    const service = makeReferenceContextService(client)

    const context = await service.buildMessageReferencesContext(
      [
        {
          kind: 'person',
          id: 'person-1',
          label: 'Bob',
          type: 'managed_person',
          brain_id: 'brain-bob',
        },
      ],
      'user-1',
      'org-1',
    )

    expect(context).toContain('[Person] Bob Builder')
    expect(context).toContain('Media buyer')
    expect(context).toContain('Person Brain: brain-bob')
  })

  it('includes tagged campaign references in the @ context block', async () => {
    const service = makeReferenceContextService(makeClient({}))

    const context = await service.buildMessageReferencesContext(
      [{ kind: 'campaign', id: 'campaign-1', label: 'Launch Plan' }],
      'user-1',
      'org-1',
    )

    expect(context).toContain('[Campaign] Launch Plan')
    expect(context).toContain('id: campaign-1')
  })

  it('resolves a portal teammate reference and validates their default User Brain', async () => {
    const client = makeClient({
      team_roster: [
        {
          user_id: 'user-bob',
          display_name: 'Bob Builder',
          role_label: 'Media buyer',
        },
      ],
      ns_brains: [
        {
          id: 'brain-bob',
          owner_id: 'user-bob',
          name: 'Bob Brain',
        },
      ],
    })
    const service = makeReferenceContextService(client)

    const context = await service.buildMessageReferencesContext(
      [
        {
          kind: 'person',
          id: 'user-bob',
          label: 'Bob',
          type: 'portal_user',
          brain_id: 'brain-bob',
        },
      ],
      'user-1',
      'org-1',
    )

    expect(context).toContain('[Person] Bob Builder')
    expect(context).toContain('Media buyer')
    expect(context).toContain('Person Brain: brain-bob')
  })

  it('rejects unresolved people and never trusts a client-supplied Brain id', async () => {
    const client = makeClient({
      channel_members: [],
      team_roster: [],
      ns_brains: [
        {
          id: 'brain-outside-org',
          owner_id: 'user-outside-org',
          name: 'Outside Brain',
        },
      ],
    })
    const service = makeReferenceContextService(client)

    const context = await service.buildMessageReferencesContext(
      [
        {
          kind: 'person',
          id: 'user-outside-org',
          label: 'Spoofed teammate',
          type: 'portal_user',
          brain_id: 'brain-outside-org',
        },
      ],
      'user-1',
      'org-1',
    )

    expect(context).not.toContain('[Person]')
    expect(context).not.toContain('Spoofed teammate')
    expect(context).not.toContain('brain-outside-org')
  })

  it('builds and caches organization-scoped user profile summaries', async () => {
    const client = {}
    const repository = {
      findOrganizationProfile: vi.fn(async () => ({
        name: 'Acme',
        slug: 'acme',
        account_type: 'agency',
      })),
      findUserProfile: vi.fn(async () => ({
        data: {
          full_name: 'Ava Admin',
          email: 'ava@example.com',
        },
        error: null,
      })),
    }
    const service = makeProfileContextService({ client, repository })

    const summary = await service.buildUserProfileSummary('user-1', 'org-1')
    const cached = await service.buildUserProfileSummary('user-1', 'org-1')

    expect(summary).toContain('ORG_PROFILE:')
    expect(summary).toContain('- Organization: Acme')
    expect(summary).toContain('CURRENT_USER:')
    expect(summary).toContain('- Email: ava@example.com')
    expect(cached).toBe(summary)
    expect(repository.findOrganizationProfile).toHaveBeenCalledTimes(1)
    expect(repository.findOrganizationProfile).toHaveBeenCalledWith(client, 'org-1')
    expect(repository.findUserProfile).toHaveBeenCalledTimes(1)
    expect(repository.findUserProfile).toHaveBeenCalledWith(client, 'user-1')
  })

  it('builds team roster summaries with managed domain hints', async () => {
    const client = {}
    const repository = {
      listTeamRosterAgents: vi.fn(async () => ({
        data: [
          {
            agent_key: 'copywriter',
            name: 'Cora',
            role: 'Copywriter',
            level: 'employee',
            specialty: 'Launches',
            config: { capability_domain: 'marketing' },
          },
        ],
        error: null,
      })),
    }
    const service = makeProfileContextService({ client, repository })

    const summary = await service.buildTeamRosterContext('user-1', null, 'zara')

    expect(summary).toContain('TEAM_ROSTER:')
    expect(summary).toContain('"copywriter" (Cora — Copywriter) [marketing]')
    expect(summary).toContain('Use resolve_agent_brain')
    expect(repository.listTeamRosterAgents).toHaveBeenCalledWith(client, {
      userId: 'user-1',
      orgId: null,
    })
  })

  it('builds campaign team summaries with registry role metadata', async () => {
    const client = {}
    const repository = {
      listCampaignAgents: vi.fn(async () => ({
        data: [{ agent_key: 'designer', name: 'Dina', config: {} }],
        error: null,
      })),
      listAgentsByKeys: vi.fn(async () => [
        {
          agent_key: 'designer',
          role: 'Designer',
          specialty: 'Ads',
          config: { capability_domain: 'marketing' },
        },
      ]),
    }
    const service = makeProfileContextService({ client, repository })

    const summary = await service.buildCampaignTeamContext('campaign-1')

    expect(summary).toContain('CAMPAIGN_TEAM:')
    expect(summary).toContain('"designer" (Dina) — Designer. Domain: marketing. Specialty: Ads')
    expect(repository.listCampaignAgents).toHaveBeenCalledWith(client, 'campaign-1')
    expect(repository.listAgentsByKeys).toHaveBeenCalledWith(client, ['designer'])
  })
})
