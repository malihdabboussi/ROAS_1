import { describe, expect, it, vi } from 'vitest'
import { TaskAgentArtifactOutputsService } from './task-agent-artifact-outputs.service'

function createRepositoryMock() {
  return {
    listRecentSpaceDocuments: vi.fn(async () => ({ data: [], error: null })),
    listRecentScopedRows: vi.fn(async ({ table }: { table: string }) => {
      if (table === 'presentations') {
        return {
          data: [
            {
              id: 'presentation-1',
              name: 'Board Deck',
              status: 'draft',
              generated_html: '',
            },
          ],
          error: null,
        }
      }
      if (table === 'funnels') {
        return {
          data: [
            { id: 'funnel-empty', name: 'Empty Website', status: 'draft', home_page_id: null },
            { id: 'funnel-1', name: 'Launch Website', status: 'draft', home_page_id: null },
          ],
          error: null,
        }
      }
      if (table === 'forms') {
        return {
          data: [{ id: 'form-1', name: 'Lead Form', status: 'draft' }],
          error: null,
        }
      }
      if (table === 'media_assets') {
        return {
          data: [
            {
              id: 'media-1',
              name: 'Hero Image',
              original_filename: 'hero.png',
              public_url: 'https://cdn.vibey.ai/hero.png',
              mime_type: 'image/png',
              asset_type: 'image',
              source_prompt: 'green hero image',
            },
          ],
          error: null,
        }
      }
      return { data: [], error: null }
    }),
    listPresentationFiles: vi.fn(async () => ({
      data: [{ id: 'file-1', presentation_id: 'presentation-1', content: '<html />' }],
      error: null,
    })),
    listFunnelPages: vi.fn(async () => ({
      data: [{ id: 'page-1', funnel_id: 'funnel-1', generated_html: '<main>Ready</main>' }],
      error: null,
    })),
    listFunnelFiles: vi.fn(async () => ({ data: [], error: null })),
    listRecentTaskEmails: vi.fn(async () => ({
      data: [{ id: 'email-1', subject: 'Launch Email', body: '<p>Hello</p>', status: 'draft' }],
      error: null,
    })),
    listRecentSpaceItems: vi.fn(async () => ({
      data: [
        { id: 'task-1', title: 'Current task', status: 'todo', custom_data: {} },
        {
          id: 'child-task-1',
          title: 'Follow-up task',
          status: 'todo',
          custom_data: { _view_type: 'task' },
        },
      ],
      error: null,
    })),
  }
}

describe('TaskAgentArtifactOutputsService', () => {
  it('reconciles scoped persisted artifacts into task output blocks', async () => {
    const repository = createRepositoryMock()
    const service = new TaskAgentArtifactOutputsService(repository as never)

    const blocks = await service.reconcile({
      blocks: [],
      itemId: 'task-1',
      spaceId: 'space-1',
      campaignId: 'campaign-1',
      userId: 'user-1',
      orgId: 'org-1',
      startedAt: Date.now(),
    })

    expect(blocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'artifact_preview',
          artifactType: 'presentation',
          artifactId: 'presentation-1',
          name: 'Board Deck',
        }),
        expect.objectContaining({
          type: 'artifact_preview',
          artifactType: 'funnel',
          artifactId: 'funnel-1',
          name: 'Launch Website',
        }),
        expect.objectContaining({
          type: 'artifact_preview',
          artifactType: 'form',
          artifactId: 'form-1',
          name: 'Lead Form',
        }),
        expect.objectContaining({
          type: 'artifact_preview',
          artifactType: 'email',
          artifactId: 'email-1',
          name: 'Launch Email',
          bodyPreview: 'Hello',
        }),
        expect.objectContaining({
          type: 'artifact_preview',
          artifactType: 'task',
          artifactId: 'child-task-1',
          name: 'Follow-up task',
        }),
        expect.objectContaining({
          type: 'media_asset',
          mediaAssetId: 'media-1',
          url: 'https://cdn.vibey.ai/hero.png',
          kind: 'image',
        }),
      ]),
    )
    expect(blocks).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ artifactId: 'funnel-empty' })]),
    )
    expect(repository.listRecentScopedRows).toHaveBeenCalledWith(
      expect.objectContaining({
        table: 'presentations',
        spaceId: 'space-1',
        campaignId: 'campaign-1',
      }),
    )
    expect(repository.listRecentScopedRows).toHaveBeenCalledWith(
      expect.objectContaining({ table: 'media_assets', limit: 25 }),
    )
  })

  it('does not duplicate streamed or completion artifact blocks', async () => {
    const repository = createRepositoryMock()
    const service = new TaskAgentArtifactOutputsService(repository as never)

    const blocks = await service.reconcile({
      blocks: [
        {
          type: 'artifact_preview',
          id: 'artifact-presentation-presentation-1',
          artifactType: 'presentation',
          artifactId: 'presentation-1',
          name: 'Board Deck',
        },
      ],
      outputBlocks: [
        {
          type: 'artifact_preview',
          id: 'artifact-presentation-presentation-1',
          artifactType: 'presentation',
          artifactId: 'presentation-1',
          name: 'Board Deck',
        },
      ],
      itemId: 'task-1',
      spaceId: 'space-1',
      userId: 'user-1',
      orgId: 'org-1',
      startedAt: Date.now(),
    })

    expect(blocks.filter((block) => block.artifactId === 'presentation-1')).toHaveLength(1)
  })
})
