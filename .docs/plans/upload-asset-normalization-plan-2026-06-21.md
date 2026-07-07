# Upload Asset Normalization Plan - June 21, 2026

## Goal

Every user-facing upload path should produce one stable Vibey asset descriptor, not just a raw URL or storage path. Agents, Brain, flows, missions, and UI surfaces should be able to refer to the same uploaded file by a durable `asset_id` plus a normalized `asset_ref`.

## Contract

New normalized response field:

```ts
type AssetRef = VibeyAssetRef | StorageAssetRef | ExternalAssetRef
```

- `vibey_asset`: file has a durable `media_assets.id`.
- `storage_asset`: file lives in Vibey/Supabase storage but does not have a user-owned media row.
- `external_asset`: file lives in Google Drive, Dropbox, Slack, WordPress, or another provider.

Compatibility rule: keep existing `url`, `path`, `asset`, and `asset_id` fields. Add `asset_ref`; do not break old clients.

## Upload Route Inventory

### Primary storage writers

| Route or flow | Current behavior | Target behavior | Implementation status |
| --- | --- | --- | --- |
| `POST /api/media/upload` | Uploads to `media`, creates `media_assets`, returns `asset` and `url`. | Also returns `asset_ref`. | Implemented |
| `POST /api/media/presign` + `POST /api/media/confirm` | Creates pending `media_assets`, uploads directly to storage, confirms row. | Confirm response also returns `asset_ref`. | Implemented |
| `POST /api/media/import-url` | Fetches public media URL, stores through media upload path. | Also returns `asset_ref`. | Implemented |
| `POST /api/media/campaigns/upload` | Uploads to `campaigns` bucket and returns only `url/path`. | Registers a `media_assets` row and returns `asset_id` plus `asset_ref`, while preserving `url/path`. | Implemented |
| `POST /api/missions/:id/attachments` | Uploads to `mission-attachments`, creates `media_assets`, returns `asset_id`. | Also returns `asset_ref`. | Implemented |
| `POST /api/profile/avatar` | Uploads to `avatars`, updates profile, returns only `url`. | Returns `asset_id` plus `vibey_asset`. | Implemented |
| `POST /api/transcribe/file` | Uses uploaded audio transiently, no persistent storage. | Accepts multipart upload or `asset_ref`/`fileUrl` body. | Implemented |
| `POST /api/brain/sk/extract-text` | Accepts multipart file or `fileUrl`; current Brain UI mostly uploads through media first. | Accepts `asset_id`/`asset_ref`, keeps `fileUrl` fallback. | Implemented |
| `apps/funnels` `POST /api/form-upload` | Public form upload to `media` bucket by token, returns `url/path`. | Returns a public-form `storage_asset` descriptor without user-owned `media_assets`. | Implemented |

### Client flows that already converge through media upload

| Flow | Current upload path | Target behavior |
| --- | --- | --- |
| Studio chat attachments | `presignPutUploadFile` to `/api/media/presign` and `/api/media/confirm` | Receives `asset_ref` automatically. |
| Brain user add-info uploads | `usePresignedUpload` then Brain import | Carries `asset_id`/`asset_ref` into import metadata. |
| Brain image picker | `usePresignedUpload` | Receives `asset_ref` automatically. |
| Spaces media toolbar | `usePresignedUpload` | Receives `asset_ref` automatically. |
| Spaces docs editor image uploads | `presignPutUploadFile` | Receives `asset_ref` automatically. |
| Spaces native form logo uploads | `presignPutUploadFile` | Receives `asset_ref` automatically. |
| Mission creation attachments | `presignPutUploadFile`, currently stores only URL/name/size/type | Add `asset_id` and `asset_ref` to attachment objects. |
| Org logo picker | `usePresignedUpload` | Receives `asset_ref` automatically. |
| Channel composer attachments | `usePresignedUpload` | Receives `asset_ref` automatically. |
| Human DM composer attachments | `usePresignedUpload` | Receives `asset_ref` automatically. |
| Studio media tab legacy upload | `/api/media/upload` | Receives `asset_ref` automatically. |
| Media picker cloud re-upload | `/api/media/upload` | Receives `asset_ref` automatically. |
| Theme/settings/logo uploads | `/api/media/upload` | Receives `asset_ref` automatically. |
| Team widget/portrait uploads | `usePresignedUpload` or `/api/media/upload` | Receives `asset_ref` automatically. |

### External integrations and agent-generated file paths

| Route or flow | Current behavior | Target behavior |
| --- | --- | --- |
| Google Drive `POST /api/integrations/google-drive/files/upload` | Uploads into Drive, not Vibey storage. | Return external asset descriptor with provider file id, not `media_assets`. |
| Dropbox `POST /api/integrations/dropbox/files/upload` | Uploads into Dropbox, not Vibey storage. | Return external asset descriptor with provider path/id. |
| Slack `POST /api/integrations/slack/upload-file` | Uploads to Slack. | Return external asset descriptor with provider file id. |
| WordPress media upload | Uploads to WordPress. | Return external asset descriptor with provider media id. |
| Composio file upload helper | Uploads transient provider files for Composio-backed actions. | Return external asset descriptor with Composio file key. |
| Agent-generated PDFs/DOCX/images | Usually upload bytes to storage and store URL/path. | Register or return `asset_ref` when the file is meant for user/agent reuse. |
| Project runtime files | Writes project files to `projects` storage. | Keep project file contract; only wrap as asset when referenced outside project runtime. |

## Second-Pass Completion

Status: implemented and passing.

1. Shared `AssetRef` union and builders added in `packages/api-shared`.
2. Profile avatars now register and return a `vibey_asset`.
3. Brain extract/import routes preserve `assetId` and `assetRef` into queued payloads and metadata.
4. Transcribe file route accepts an `asset_ref` or `fileUrl` without requiring multipart audio.
5. Public funnel form uploads return a `storage_asset`.
6. Google Drive, Dropbox, Slack, WordPress, and Composio upload routes return `external_asset`.
7. Agent-generated image/video media returns `vibey_asset`.
8. Agent-generated DOCX/PDF returns and persists `storage_asset`.
9. Brain web upload flows pass `assetId`/`assetRef` into import jobs when available.

## TDD Matrix For This Pass

Status: implemented and passing.

1. `MediaService.uploadFile` returns `asset_ref` that matches the inserted `media_assets` row.
2. `MediaService.confirmPresignedUpload` returns `asset_ref` for direct browser uploads.
3. `MediaService.uploadCampaignAsset` inserts a `media_assets` row and returns `asset_id` plus `asset_ref`.
4. `MissionsUserOperationsService.uploadAttachment` keeps `asset_id` and also returns `asset_ref`.
5. `uploadMissionCreationAttachments` preserves existing fields and adds `asset_id`/`asset_ref` when present.

## Long-Term UX Rule

The user can upload, paste, import, or connect any file from anywhere. Vibey imports or references it once, shows one clean file state, and every agent/tool receives the same asset handle. No tool should need to guess whether something is a local path, a signed URL, a Drive link, or a storage object.
