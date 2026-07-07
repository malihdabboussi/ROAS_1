import { describe, expect, it, vi } from 'vitest'

import { ArtifactPresentationPostActionVerificationService } from './artifact-presentation-post-action-verification.service'

const sessionKey = 'agent:vibey:user-1:11111111-1111-1111-1111-111111111111'

const fixedDeckFiles = [
  {
    path: 'index.html',
    role: 'entry',
    content: [
      '<!doctype html>',
      '<html lang="en" data-vibey-theme-native="true">',
      '<head><meta charset="utf-8"><title>Deck</title><link rel="stylesheet" href="styles.css"></head>',
      '<body><main class="deck">',
      '<section class="slide" data-comment-anchor="slide-1">',
      '<div class="safe"><h1 data-comment-anchor="headline">Launch cleanly.</h1></div>',
      '</section>',
      '</main></body></html>',
    ].join(''),
  },
  {
    path: 'styles.css',
    role: 'style',
    content: [
      'html, body { margin: 0; width: 1280px; }',
      '.deck { width: 1280px; margin: 0; }',
      '.slide { position: relative; width: 1280px; height: 720px; overflow: hidden; }',
      '.safe { width: 1040px; height: 560px; margin: 80px auto; }',
    ].join('\n'),
  },
]

function makeQueryClient(input: {
  presentation: Record<string, unknown> | null
  files?: Array<Record<string, unknown>>
  assets?: Array<Record<string, unknown>>
}) {
  return {
    from: vi.fn((table: string) => {
      const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        order: vi.fn(() => query),
        maybeSingle: vi.fn(async () => {
          if (table === 'presentations') return { data: input.presentation, error: null }
          return { data: null, error: null }
        }),
        then: (
          resolve: (value: { data: unknown; error: unknown }) => unknown,
          reject?: (reason?: unknown) => unknown,
        ) => {
          const data =
            table === 'presentation_files'
              ? (input.files ?? [])
              : table === 'presentation_assets'
                ? (input.assets ?? [])
                : []
          return Promise.resolve({ data, error: null }).then(resolve, reject)
        },
      }
      return query
    }),
  }
}

function makeHost(client: unknown) {
  return {
    resolveUserId: vi.fn(() => 'user-1'),
    getUserClient: vi.fn(async () => client),
  }
}

describe('ArtifactPresentationPostActionVerificationService', () => {
  it('passes a saved fixed-stage html_bundle presentation', async () => {
    const client = makeQueryClient({
      presentation: {
        id: 'presentation-1',
        user_id: 'user-1',
        metadata: { source_mode: 'html_bundle', entry_file: 'index.html' },
        generated_html: null,
      },
      files: fixedDeckFiles,
    })
    const verifier = new ArtifactPresentationPostActionVerificationService()

    const outcome = await verifier.verify({
      host: makeHost(client),
      action: 'create_presentation',
      data: {},
      result: { id: 'presentation-1', success: true },
      sessionKey,
    })

    expect(outcome?.status).toBe('verified')
    expect(outcome?.checks).toEqual([
      expect.objectContaining({ type: 'presentation_contract', status: 'passed' }),
    ])
  })

  it('fails with repair guidance when a saved bundle uses responsive webpage layout', async () => {
    const client = makeQueryClient({
      presentation: {
        id: 'presentation-1',
        user_id: 'user-1',
        metadata: { source_mode: 'html_bundle', entry_file: 'index.html' },
        generated_html: null,
      },
      files: fixedDeckFiles.map((file) =>
        file.path === 'styles.css'
          ? {
              ...file,
              content:
                '.deck { width: 100vw; } .slide { min-height: 100vh; } .cards { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }',
            }
          : file,
      ),
    })
    const verifier = new ArtifactPresentationPostActionVerificationService()

    const outcome = await verifier.verify({
      host: makeHost(client),
      action: 'create_presentation',
      data: {},
      result: { id: 'presentation-1', success: true },
      sessionKey,
    })

    expect(outcome?.status).toBe('failed')
    expect(outcome?.failureResult).toMatchObject({
      success: false,
      error_code: 'ARTIFACT_PRESENTATION_CONTRACT_REPAIR_REQUIRED',
      effect_state: 'partial_effect',
      retry_policy: { mode: 'retry_with_corrected_payload' },
      presentation_id: 'presentation-1',
    })
    expect(String(outcome?.failureResult?.agent_instruction)).toContain('PRESENTATION_REFLOW_PATTERN')
  })

  it('skips legacy generated_html slide edits because they are not html_bundle decks', async () => {
    const client = makeQueryClient({
      presentation: {
        id: 'presentation-1',
        user_id: 'user-1',
        metadata: null,
        generated_html: '<main><section>Legacy slide</section></main>',
      },
    })
    const verifier = new ArtifactPresentationPostActionVerificationService()

    const outcome = await verifier.verify({
      host: makeHost(client),
      action: 'update_presentation_slide',
      data: {},
      result: { presentation_id: 'presentation-1', success: true },
      sessionKey,
    })

    expect(outcome?.status).toBe('not_required')
    expect(outcome?.checks).toEqual([
      expect.objectContaining({ type: 'presentation_contract', status: 'skipped' }),
    ])
  })
})
