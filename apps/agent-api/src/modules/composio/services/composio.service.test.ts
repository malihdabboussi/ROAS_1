import { describe, expect, it, vi } from 'vitest'
import { ComposioService } from './composio.service'

describe('ComposioService uploadFile asset refs', () => {
  it('returns an external asset_ref for Composio uploaded files', async () => {
    const service = new ComposioService({} as never)
    ;(service as unknown as { _composio: unknown })._composio = {
      files: {
        upload: vi.fn(async () => ({
          name: 'hero.png',
          mimetype: 'image/png',
          s3key: 'composio/file-key',
        })),
      },
    }

    await expect(
      service.uploadFile(
        'https://cdn.example/hero.png',
        'LINKEDIN_CREATE_LINKED_IN_POST',
        'linkedin',
      ),
    ).resolves.toMatchObject({
      asset_ref: {
        kind: 'external_asset',
        provider: 'composio',
        external_id: 'composio/file-key',
        file_path: 'composio/file-key',
        url: 'https://cdn.example/hero.png',
        mime_type: 'image/png',
        asset_type: 'image',
        name: 'hero.png',
        original_filename: 'hero.png',
        source: 'composio',
        source_surface: 'composio_file_upload',
      },
      name: 'hero.png',
      mimetype: 'image/png',
      s3key: 'composio/file-key',
    })
  })
})
