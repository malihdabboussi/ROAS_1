import { Blob } from 'node:buffer'
import { PDFDocument } from 'pdf-lib'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ArtifactMissionsMediaDeepgramClient } from '../integrations/artifact-missions-media-deepgram.client'
import { ArtifactMissionsMediaService } from './artifact-missions-media.service'

function chainableQuery(row: Record<string, unknown>) {
  const query = {
    select: () => query,
    eq: () => query,
    is: () => query,
    limit: () => query,
    maybeSingle: async () => ({ data: row, error: null }),
  }
  return query
}

function awaitableQuery(result: unknown, calls: string[] = []) {
  const query = {
    select: vi.fn((columns: string) => {
      calls.push(`select:${columns}`)
      return query
    }),
    eq: vi.fn((column: string, value: unknown) => {
      calls.push(`eq:${column}:${String(value)}`)
      return query
    }),
    is: vi.fn((column: string, value: unknown) => {
      calls.push(`is:${column}:${String(value)}`)
      return query
    }),
    order: vi.fn((column: string, options?: unknown) => {
      calls.push(`order:${column}:${JSON.stringify(options ?? {})}`)
      return query
    }),
    limit: vi.fn((limit: number) => {
      calls.push(`limit:${limit}`)
      return query
    }),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }
  return query
}

async function makePdfBuffer(): Promise<Buffer> {
  const pdf = await PDFDocument.create()
  pdf.addPage([200, 200])
  return Buffer.from(await pdf.save())
}

describe('ArtifactMissionsMediaService media catalog access', () => {
  it('reports disabled media generation from campaign config', async () => {
    const service = new ArtifactMissionsMediaService({} as never)
    const calls: string[] = []
    const campaignQuery = awaitableQuery(
      {
        data: {
          config: {
            agent_settings: { media_generation_enabled: false },
          },
        },
        error: null,
      },
      calls,
    )
    const target = {
      resolveUserId: vi.fn(() => 'user-1'),
      getUserClient: vi.fn(async () => ({ userClient: true })),
      resolveCampaignId: vi.fn(async () => 'campaign-1'),
      serviceClient: {
        from: vi.fn((table: string) => {
          expect(table).toBe('campaigns')
          return campaignQuery
        }),
      },
    }

    const result = await service
      .getHandlers(target as never)
      .get_media_generation_status({}, 'agent:copywriter:conversation-user-1')

    expect(result).toEqual({ success: true, campaign_id: 'campaign-1', enabled: false })
    expect(calls).toEqual(['select:config', 'eq:id:campaign-1'])
  })

  it('lists campaign media with mapped response fields and filters', async () => {
    const service = new ArtifactMissionsMediaService({} as never)
    const calls: string[] = []
    const mediaQuery = awaitableQuery(
      {
        data: [
          {
            id: 'asset-1',
            name: 'Hero',
            original_filename: 'hero.png',
            public_url: 'https://files.test/hero.png',
            mime_type: 'image/png',
            asset_type: 'image',
            category: 'generated',
            tags: ['hero'],
            created_at: '2026-06-19T00:00:00.000Z',
          },
        ],
        error: null,
      },
      calls,
    )
    const target = {
      resolveUserId: vi.fn(() => 'user-1'),
      getUserClient: vi.fn(async () => ({ userClient: true })),
      resolveCampaignId: vi.fn(async () => 'campaign-1'),
      serviceClient: {
        from: vi.fn((table: string) => {
          expect(table).toBe('media_assets')
          return mediaQuery
        }),
      },
    }

    const result = await service
      .getHandlers(target as never)
      .list_campaign_media(
        { limit: 10, asset_type: 'image' },
        'agent:copywriter:conversation-user-1',
      )

    expect(result).toEqual({
      success: true,
      campaign_id: 'campaign-1',
      count: 1,
      assets: [
        {
          id: 'asset-1',
          name: 'Hero',
          filename: 'hero.png',
          url: 'https://files.test/hero.png',
          mime_type: 'image/png',
          asset_type: 'image',
          category: 'generated',
          tags: ['hero'],
          created_at: '2026-06-19T00:00:00.000Z',
        },
      ],
    })
    expect(calls).toEqual([
      'select:id, name, original_filename, public_url, mime_type, asset_type, category, tags, created_at',
      'eq:user_id:user-1',
      'order:created_at:{"ascending":false}',
      'limit:10',
      'eq:campaign_id:campaign-1',
      'eq:asset_type:image',
    ])
  })
})

describe('ArtifactMissionsMediaService analyze_image', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('analyzes a public image URL with platform-managed vision', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key')
    const imageBytes = Uint8Array.from([1, 2, 3, 4])
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const href = String(url)
      if (href === 'https://images.test/photo.jpg') {
        expect(init?.redirect).toBe('manual')
        return {
          ok: true,
          status: 200,
          headers: {
            get: (name: string) =>
              name.toLowerCase() === 'content-type'
                ? 'image/jpeg'
                : name.toLowerCase() === 'content-length'
                  ? String(imageBytes.length)
                  : null,
          },
          arrayBuffer: async () => imageBytes.buffer,
        }
      }
      if (href.startsWith('https://generativelanguage.googleapis.com/')) {
        expect(href).toContain('key=test-gemini-key')
        const body = JSON.parse(String(init?.body ?? '{}')) as {
          contents?: Array<{ parts?: Array<{ inline_data?: { data?: string } }> }>
        }
        expect(body.contents?.[0]?.parts?.[1]?.inline_data?.data).toBe(
          Buffer.from(imageBytes).toString('base64'),
        )
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: 'Strong product focus. carousel_score: 8/10.' }],
                },
              },
            ],
          }),
        }
      }
      throw new Error(`Unexpected fetch: ${href}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const service = new ArtifactMissionsMediaService({} as never)
    const result = (await service.getHandlers({} as never).analyze_image(
      {
        image_url: 'https://images.test/photo.jpg',
        prompt: 'Rank for a carousel',
      },
      'agent:copywriter:conversation-user-1',
    )) as Record<string, unknown>

    expect(result.success).toBe(true)
    expect(result.count).toBe(1)
    expect(result.analyses).toEqual([
      {
        source: { type: 'url', url: 'https://images.test/photo.jpg' },
        success: true,
        mime_type: 'image/jpeg',
        analysis: 'Strong product focus. carousel_score: 8/10.',
      },
    ])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('rejects image URL redirects before fetching redirected content', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key')
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 302,
      headers: {
        get: (name: string) =>
          name.toLowerCase() === 'location' ? 'http://127.0.0.1/admin.png' : null,
      },
    }))
    vi.stubGlobal('fetch', fetchMock)

    const service = new ArtifactMissionsMediaService({} as never)
    const result = (await service
      .getHandlers({} as never)
      .analyze_image(
        { image_url: 'https://images.test/redirect.png' },
        'agent:copywriter:conversation-user-1',
      )) as { success?: boolean; analyses?: Array<Record<string, unknown>> }

    expect(result.success).toBe(false)
    expect(result.analyses?.[0]?.error).toBe('Image URL redirects are not supported')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://images.test/redirect.png',
      expect.objectContaining({ redirect: 'manual' }),
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects local image URLs before fetching', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const service = new ArtifactMissionsMediaService({} as never)
    const result = (await service
      .getHandlers({} as never)
      .analyze_image(
        { image_url: 'http://127.0.0.1/admin.png' },
        'agent:copywriter:conversation-user-1',
      )) as { success?: boolean; analyses?: Array<Record<string, unknown>> }

    expect(result.success).toBe(false)
    expect(result.analyses?.[0]?.error).toBe('Image URL must be public')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('ArtifactMissionsMediaService transcribe_audio', () => {
  it('passes explicit language hints to Deepgram transcription', async () => {
    const downloadClient = {
      downloadMedia: vi.fn(async () => ({
        success: true as const,
        buffer: Buffer.from('ogg bytes'),
      })),
    }
    const processClient = {
      transcodeAudioToMp3: vi.fn(async () => undefined),
    }
    const deepgramClient = {
      transcribeAudioFile: vi.fn(async () => ({
        transcript: 'שלום, זה תמלול בדיקה.',
        segments: [{ start: 0, end: 2, text: 'שלום, זה תמלול בדיקה.' }],
      })),
    }
    const service = new ArtifactMissionsMediaService(
      {} as never,
      undefined,
      undefined,
      undefined,
      downloadClient as never,
      deepgramClient as unknown as ArtifactMissionsMediaDeepgramClient,
      processClient as never,
    )
    const target = {
      resolveUserId: vi.fn(() => 'user-1'),
      getUserClient: vi.fn(async () => ({ userClient: true })),
      resolveCampaignId: vi.fn(async () => 'campaign-1'),
    }

    const result = (await service.getHandlers(target as never).transcribe_audio(
      {
        media_url: 'https://files.test/voice.ogg',
        language: 'he',
      },
      'agent:vibey:conversation-1',
    )) as Record<string, unknown>

    expect(result.success).toBe(true)
    expect(deepgramClient.transcribeAudioFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ language: 'he' }),
    )
  })

  it('returns a failure when Deepgram returns an empty transcript', async () => {
    const downloadClient = {
      downloadMedia: vi.fn(async () => ({
        success: true as const,
        buffer: Buffer.from('ogg bytes'),
      })),
    }
    const processClient = {
      transcodeAudioToMp3: vi.fn(async () => undefined),
    }
    const deepgramClient = {
      transcribeAudioFile: vi.fn(async () => ({
        transcript: '',
        segments: [],
      })),
    }
    const service = new ArtifactMissionsMediaService(
      {} as never,
      undefined,
      undefined,
      undefined,
      downloadClient as never,
      deepgramClient as unknown as ArtifactMissionsMediaDeepgramClient,
      processClient as never,
    )
    const target = {
      resolveUserId: vi.fn(() => 'user-1'),
      getUserClient: vi.fn(async () => ({ userClient: true })),
      resolveCampaignId: vi.fn(async () => 'campaign-1'),
    }

    const result = (await service.getHandlers(target as never).transcribe_audio(
      {
        media_url: 'https://files.test/voice.ogg',
      },
      'agent:vibey:conversation-1',
    )) as Record<string, unknown>

    expect(result).toMatchObject({
      success: false,
      error: expect.stringMatching(/No speech transcript returned/i),
      retry_hint: expect.stringMatching(/language/i),
    })
  })
})

describe('ArtifactMissionsMediaService read_document', () => {
  afterEach(() => {
    vi.doUnmock('pdf-parse')
  })

  it('returns PDF text/reference metadata without inline base64 payloads', async () => {
    const pdfBuffer = await makePdfBuffer()
    const service = new ArtifactMissionsMediaService({} as never)
    const assetRow = {
      id: 'asset-1',
      user_id: 'user-1',
      org_id: null,
      name: 'Reference',
      original_filename: 'reference.pdf',
      file_path: 'docs/reference.pdf',
      bucket_name: 'media',
      file_size: pdfBuffer.length,
      mime_type: 'application/pdf',
      asset_type: 'document',
      public_url: '',
      page_count: 1,
      outline: [],
      text_layer: '',
    }
    const target = {
      resolveUserId: () => 'user-1',
      resolveOrgId: () => null,
      serviceClient: {
        from: () => chainableQuery(assetRow),
        storage: {
          from: () => ({
            createSignedUrl: async () => ({
              data: { signedUrl: 'https://files.test/reference.pdf' },
            }),
            download: async () => ({ data: new Blob([pdfBuffer]), error: null }),
          }),
        },
      },
    }

    const result = (await (
      service as unknown as {
        readDocument: (
          target: Record<string, unknown>,
          input: Record<string, unknown>,
          sessionKey?: string,
        ) => Promise<Record<string, unknown>>
      }
    ).readDocument(target, { asset_id: 'asset-1', mode: 'read', page_range: [1, 1] })) as {
      content_ref?: Record<string, unknown>
      text_content?: string
    }

    expect(result.content_ref?.type).toBe('signed_url')
    expect(result.content_ref?.url).toBe('https://files.test/reference.pdf')
    expect(result.content_ref?.data).toBeUndefined()
    expect(result.text_content).toBeTypeOf('string')
  })

  it('OCRs low-signal PDF text and returns document intelligence', async () => {
    vi.doMock('pdf-parse', () => ({
      default: vi.fn().mockResolvedValue({
        text: Array.from({ length: 6 }, () => 'Made with Vibey').join('\n'),
      }),
    }))
    const pdfBuffer = await makePdfBuffer()
    const service = new ArtifactMissionsMediaService({} as never)
    vi.spyOn(service as any, 'extractTextViaGemini').mockResolvedValue(
      [
        'OCR recovered the scanned document content for the proposal.',
        'It includes target customers, implementation risks, timeline, and budget notes.',
      ].join('\n'),
    )
    const assetRow = {
      id: 'asset-scan',
      user_id: 'user-1',
      org_id: null,
      name: 'Scan',
      original_filename: 'scan.pdf',
      file_path: 'docs/scan.pdf',
      bucket_name: 'media',
      file_size: pdfBuffer.length,
      mime_type: 'application/pdf',
      asset_type: 'document',
      public_url: '',
      page_count: 1,
      outline: [],
      text_layer: '',
      document_intelligence: {},
    }
    const target = {
      resolveUserId: () => 'user-1',
      resolveOrgId: () => null,
      serviceClient: {
        from: () => chainableQuery(assetRow),
        storage: {
          from: () => ({
            createSignedUrl: async () => ({
              data: { signedUrl: 'https://files.test/scan.pdf' },
            }),
            download: async () => ({ data: new Blob([pdfBuffer]), error: null }),
          }),
        },
      },
    }

    const result = (await (
      service as unknown as {
        readDocument: (
          target: Record<string, unknown>,
          input: Record<string, unknown>,
          sessionKey?: string,
        ) => Promise<Record<string, unknown>>
      }
    ).readDocument(target, { asset_id: 'asset-scan', mode: 'read', page_range: [1, 1] })) as {
      text_content?: string
      document_intelligence?: { strategy?: string }
    }

    expect(result.text_content).toContain('OCR recovered')
    expect(result.text_content).not.toContain('Made with Vibey')
    expect(result.document_intelligence?.strategy).toBe('ocr')
  })

  it('returns PPTX extracted text instead of raw binary text', async () => {
    const pptxBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0xff])
    const extraction = {
      extractText: vi.fn().mockResolvedValue('Slide 1\nReadable deck content'),
    }
    const service = new ArtifactMissionsMediaService({} as never, extraction as any)
    const assetRow = {
      id: 'asset-pptx',
      user_id: 'user-1',
      org_id: null,
      name: 'Deck',
      original_filename: 'deck.pptx',
      file_path: 'docs/deck.pptx',
      bucket_name: 'media',
      file_size: pptxBuffer.length,
      mime_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      asset_type: 'document',
      public_url: '',
      page_count: null,
      outline: [],
      text_layer: '',
    }
    const target = {
      resolveUserId: () => 'user-1',
      resolveOrgId: () => null,
      serviceClient: {
        from: () => chainableQuery(assetRow),
        storage: {
          from: () => ({
            createSignedUrl: async () => ({
              data: { signedUrl: 'https://files.test/deck.pptx' },
            }),
            download: async () => ({ data: new Blob([pptxBuffer]), error: null }),
          }),
        },
      },
    }

    const result = (await (
      service as unknown as {
        readDocument: (
          target: Record<string, unknown>,
          input: Record<string, unknown>,
          sessionKey?: string,
        ) => Promise<Record<string, unknown>>
      }
    ).readDocument(target, { asset_id: 'asset-pptx', mode: 'read' })) as {
      content_ref?: Record<string, unknown>
      text_content?: string
    }

    expect(extraction.extractText).toHaveBeenCalledWith(
      pptxBuffer,
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'deck.pptx',
    )
    expect(result.text_content).toBe('Slide 1\nReadable deck content')
    expect(result.text_content).not.toContain('\u0003')
    expect(result.content_ref?.type).toBe('signed_url')
    expect(result.content_ref?.url).toBe('https://files.test/deck.pptx')
  })

  it('returns vector search matches when cached document text is usable', async () => {
    const service = new ArtifactMissionsMediaService({} as never)
    vi.spyOn(service as any, 'createQueryEmbedding').mockResolvedValue(
      Array.from({ length: 768 }, () => 0.1),
    )
    const assetRow = {
      id: 'asset-search',
      user_id: 'user-1',
      org_id: 'org-1',
      name: 'Research Notes',
      original_filename: 'notes.txt',
      file_path: 'docs/notes.txt',
      bucket_name: 'media',
      file_size: 1200,
      mime_type: 'text/plain',
      asset_type: 'document',
      public_url: 'https://files.test/notes.txt',
      page_count: 3,
      outline: [],
      text_layer: [
        'Customer research shows strong buying intent across onboarding interviews.',
        'Sales notes mention urgency, budget alignment, objections, workflow gaps, and timeline pressure.',
        'The implementation plan connects product education, proof assets, reminders, and buyer enablement.',
      ].join('\n'),
    }
    const rpc = vi.fn(async () => ({
      data: [
        {
          page_number: 2,
          snippet: 'Strong buying intent appears in onboarding notes.',
          similarity: 0.82,
        },
      ],
      error: null,
    }))
    const target = {
      resolveUserId: () => 'user-1',
      resolveOrgId: () => 'org-1',
      serviceClient: {
        from: () => chainableQuery(assetRow),
        rpc,
        storage: {
          from: () => ({
            createSignedUrl: async () => ({
              data: { signedUrl: 'https://files.test/notes.txt' },
            }),
          }),
        },
      },
    }

    const result = (await (
      service as unknown as {
        readDocument: (
          target: Record<string, unknown>,
          input: Record<string, unknown>,
          sessionKey?: string,
        ) => Promise<Record<string, unknown>>
      }
    ).readDocument(target, {
      asset_id: 'asset-search',
      mode: 'search',
      query: 'buying intent',
      max_pages: 3,
    })) as { mode?: string; matches?: Array<Record<string, unknown>> }

    expect(rpc).toHaveBeenCalledWith('search_media_asset_chunks', {
      p_asset_id: 'asset-search',
      p_user_id: 'user-1',
      p_org_id: 'org-1',
      p_query_embedding: expect.stringMatching(/^\[0\.1,/),
      p_match_count: 3,
      p_min_similarity: 0.3,
    })
    expect(result.mode).toBe('search')
    expect(result.matches).toEqual([
      {
        page: 2,
        snippet: 'Strong buying intent appears in onboarding notes.',
        score: 0.82,
      },
    ])
  })
})
