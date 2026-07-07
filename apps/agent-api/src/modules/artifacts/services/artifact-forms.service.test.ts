import { describe, expect, it } from 'vitest'
import { ArtifactFormsService } from './artifact-forms.service'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const ORG_ID = '22222222-2222-4222-8222-222222222222'
const CAMPAIGN_ID = '33333333-3333-4333-8333-333333333333'

type BuilderConfig = {
  data?: unknown
  error?: { message: string } | null
}

function makeBuilder(config: BuilderConfig, onCall?: (method: string, args: unknown[]) => void) {
  const builder = {
    select: (...args: unknown[]) => {
      onCall?.('select', args)
      return builder
    },
    eq: (...args: unknown[]) => {
      onCall?.('eq', args)
      return builder
    },
    is: (...args: unknown[]) => {
      onCall?.('is', args)
      return builder
    },
    neq: (...args: unknown[]) => {
      onCall?.('neq', args)
      return builder
    },
    insert: (...args: unknown[]) => {
      onCall?.('insert', args)
      return builder
    },
    update: (...args: unknown[]) => {
      onCall?.('update', args)
      return builder
    },
    maybeSingle: async () => ({ data: config.data ?? null, error: config.error ?? null }),
    single: async () => ({ data: config.data ?? null, error: config.error ?? null }),
  }
  return builder
}

function makeTarget(
  supabase: { from: (table: string) => unknown },
  options?: { uploadedAttachments?: Array<Record<string, unknown>> },
) {
  return {
    resolveUserId: () => USER_ID,
    resolveOrgId: () => ORG_ID,
    resolveCampaignId: async () => CAMPAIGN_ID,
    getUserClient: async () => supabase,
    requestContext: {
      getUploadedAttachments: () => options?.uploadedAttachments ?? [],
    },
  }
}

describe('ArtifactFormsService', () => {
  it('creates forms with resolved campaign and user ownership', async () => {
    const inserts: unknown[] = []
    const supabase = {
      from: (table: string) => {
        expect(table).toBe('forms')
        return makeBuilder({ data: { id: 'form-1', name: 'Lead Capture' } }, (method, args) => {
          if (method === 'insert') inserts.push(args[0])
        })
      },
    }
    const handlers = new ArtifactFormsService().getHandlers(makeTarget(supabase))

    const result = await handlers.create_form?.({
      name: 'Lead Capture',
      schema: { questions: [] },
      settings: { submitLabel: 'Send' },
    })

    expect(result).toEqual({
      success: true,
      form: { id: 'form-1', name: 'Lead Capture' },
      form_id: 'form-1',
    })
    expect(inserts[0]).toMatchObject({
      user_id: USER_ID,
      org_id: ORG_ID,
      campaign_id: CAMPAIGN_ID,
      name: 'Lead Capture',
      schema: { questions: [] },
      settings: { submitLabel: 'Send' },
    })
  })

  it('publishes forms by deriving slug and URL when missing', async () => {
    const updates: unknown[] = []
    const responses = [
      {
        id: 'form-1',
        user_id: USER_ID,
        org_id: ORG_ID,
        campaign_id: CAMPAIGN_ID,
        name: 'Lead Capture',
        slug: null,
        share_token: null,
        published_url: null,
      },
      null,
      {
        id: 'form-1',
        status: 'published',
        slug: 'lead-capture',
        published_url: 'https://user-11111111.vibeyfunnels.com/form/lead-capture',
      },
    ]
    const supabase = {
      from: (table: string) => {
        expect(table).toBe('forms')
        const data = responses.shift()
        return makeBuilder({ data }, (method, args) => {
          if (method === 'update') updates.push(args[0])
        })
      },
    }
    const handlers = new ArtifactFormsService().getHandlers(makeTarget(supabase))

    const result = await handlers.publish_form?.({ form_id: 'form-1' })

    expect(result).toMatchObject({
      success: true,
      status: 'published',
      slug: 'lead-capture',
      url: 'https://user-11111111.vibeyfunnels.com/form/lead-capture',
    })
    expect(updates[0]).toMatchObject({
      slug: 'lead-capture',
      status: 'published',
      published_url: 'https://user-11111111.vibeyfunnels.com/form/lead-capture',
    })
  })

  it('attaches the current uploaded image to a form cover slot', async () => {
    const updates: unknown[] = []
    const responses = [
      {
        id: 'form-1',
        user_id: USER_ID,
        org_id: ORG_ID,
        campaign_id: CAMPAIGN_ID,
        settings: { button_label: 'Send' },
      },
      {
        id: 'form-1',
        settings: {
          button_label: 'Send',
          cover_url: 'https://files.example/cover.png',
          cover_focal_y: 45,
        },
      },
    ]
    const supabase = {
      from: (table: string) => {
        expect(table).toBe('forms')
        const data = responses.shift()
        return makeBuilder({ data }, (method, args) => {
          if (method === 'update') updates.push(args[0])
        })
      },
    }
    const conversationId = '44444444-4444-4444-8444-444444444444'
    const handlers = new ArtifactFormsService().getHandlers(
      makeTarget(supabase, {
        uploadedAttachments: [
          {
            filename: 'cover.png',
            mimeType: 'image/png',
            type: 'image',
            fileUrl: 'https://files.example/cover.png',
            mediaAssetId: 'media-1',
          },
        ],
      }),
    )

    const result = await handlers.attach_form_asset?.(
      { form_id: 'form-1', placement: 'cover', focal_y: 45 },
      `agent:vibey:${conversationId}`,
    )

    expect(result).toMatchObject({
      success: true,
      placement: 'cover',
      file_url: 'https://files.example/cover.png',
      media_asset_id: 'media-1',
      source: 'current_upload',
    })
    expect(updates[0]).toMatchObject({
      settings: {
        button_label: 'Send',
        cover_url: 'https://files.example/cover.png',
        cover_focal_y: 45,
      },
    })
  })
})
