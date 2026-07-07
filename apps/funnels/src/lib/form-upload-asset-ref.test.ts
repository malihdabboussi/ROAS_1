import { describe, expect, it } from 'vitest'
import { buildFormUploadAssetRef } from './form-upload-asset-ref'

describe('buildFormUploadAssetRef', () => {
  it('returns a first-party storage asset ref for public form uploads', () => {
    expect(
      buildFormUploadAssetRef({
        formId: 'form-1',
        filePath: 'forms/form-1/123-avatar.png',
        url: 'https://signed.example/forms/form-1/123-avatar.png',
        fileName: 'avatar.png',
        mimeType: 'image/png',
        size: 123,
      }),
    ).toEqual({
      kind: 'storage_asset',
      bucket_name: 'media',
      file_path: 'forms/form-1/123-avatar.png',
      url: 'https://signed.example/forms/form-1/123-avatar.png',
      mime_type: 'image/png',
      asset_type: 'image',
      name: 'avatar.png',
      original_filename: 'avatar.png',
      file_size: 123,
      user_id: null,
      org_id: null,
      source: 'public_form',
      source_surface: 'form_upload',
      metadata: { form_id: 'form-1' },
    })
  })
})
