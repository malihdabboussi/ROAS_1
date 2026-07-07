import { describe, expect, it } from 'vitest'
import { buildExternalAssetRef, buildStorageAssetRef, buildVibeyAssetRef } from './asset-ref'

describe('asset ref contract', () => {
  it('builds a normalized Vibey media asset ref', () => {
    expect(
      buildVibeyAssetRef({
        id: 'asset-1',
        bucket_name: 'media',
        file_path: 'user-1/images/logo.png',
        mime_type: 'image/png',
        asset_type: 'image',
        name: 'Logo',
        original_filename: 'logo.png',
        file_size: 42,
        campaign_id: 'campaign-1',
        org_id: 'org-1',
        source: 'upload',
        source_surface: 'brain',
        public_url: 'https://cdn.example/logo.png',
      }),
    ).toEqual({
      kind: 'vibey_asset',
      asset_id: 'asset-1',
      bucket_name: 'media',
      file_path: 'user-1/images/logo.png',
      url: 'https://cdn.example/logo.png',
      mime_type: 'image/png',
      asset_type: 'image',
      name: 'Logo',
      original_filename: 'logo.png',
      file_size: 42,
      campaign_id: 'campaign-1',
      space_id: null,
      org_id: 'org-1',
      source: 'upload',
      source_surface: 'brain',
    })
  })

  it('builds first-party storage refs for files without media_assets rows', () => {
    expect(
      buildStorageAssetRef({
        bucket_name: 'avatars',
        file_path: 'user-1/avatar.png',
        url: 'https://cdn.example/avatar.png',
        mime_type: 'image/png',
        asset_type: 'image',
        name: 'avatar.png',
        original_filename: 'avatar.png',
        file_size: 1024,
        user_id: 'user-1',
        source: 'upload',
        source_surface: 'profile',
      }),
    ).toMatchObject({
      kind: 'storage_asset',
      bucket_name: 'avatars',
      file_path: 'user-1/avatar.png',
      url: 'https://cdn.example/avatar.png',
      user_id: 'user-1',
      source_surface: 'profile',
    })
  })

  it('builds provider-owned external refs', () => {
    expect(
      buildExternalAssetRef({
        provider: 'google_drive',
        external_id: 'drive-file-1',
        name: 'notes.txt',
        original_filename: 'notes.txt',
        mime_type: 'text/plain',
        file_size: 12,
        file_path: 'folder-1/notes.txt',
        url: 'https://drive.example/notes',
        org_id: 'org-1',
        source_surface: 'google_drive',
      }),
    ).toMatchObject({
      kind: 'external_asset',
      provider: 'google_drive',
      external_id: 'drive-file-1',
      file_path: 'folder-1/notes.txt',
      url: 'https://drive.example/notes',
      source_surface: 'google_drive',
    })
  })
})
