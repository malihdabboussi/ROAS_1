# Asset Ref

Last Modified: 2026-06-22

## Purpose

`asset_ref` is the normalized file handle used when a file comes from Vibey storage, raw storage, or an external provider. It lets UI, Brain jobs, agents, and integrations pass a file around without guessing from a URL.

## Shapes

- `vibey_asset`: a registered `media_assets` row.
- `storage_asset`: a storage object without a `media_assets` row, such as public form uploads.
- `external_asset`: a provider-owned object, such as Google Drive, Dropbox, Slack, or WordPress media.

## Source

Shared helpers live in `packages/api-shared/src/types/asset-ref.ts`:

```ts
buildVibeyAssetRef(asset, url)
buildStorageAssetRef(input)
buildExternalAssetRef(input)
inferAssetRefType(mimeType, fallback)
```

## Rules

- Preserve old response fields like `url`, `path`, `asset`, and `asset_id`.
- Add `asset_ref` beside those fields.
- Use `vibey_asset` only when there is a durable `media_assets.id`.
- Use `storage_asset` when the object is first-party storage but not registered as user media.
- Use `external_asset` when the file remains owned by the provider.
- Agent/tool calls may pass `asset_ref` or `asset_refs` directly to file-aware actions. The action normalizer keeps the handle and derives the legacy field the current handler already understands.
- Explicit legacy fields win. If `image_url`, `asset_id`, `media_asset_id`, or similar fields disagree with `asset_ref`, the normalizer reports a conflict and does not overwrite the explicit value.
- Local project file tools (`read`, `write`, `edit`) are only for workspace paths. Web URLs and connected-provider files should use `web_fetch`, media actions, or Vibey actions with `asset_ref`.

## Agent Action Support

The backend normalizes `asset_ref` for these file-aware actions:

- `read_document`: `asset_ref.asset_id` becomes `asset_id`.
- `analyze_image`: `asset_ref` or `asset_refs` become `asset_id`/`asset_ids` or `image_url`/`image_urls`.
- `analyze_video`: `asset_ref.url` becomes `media_url`.
- `process_media`: `asset_ref.url` becomes `url`; `asset_refs[].url` becomes `inputs`.
- `upload_skill_asset`: `asset_ref.url` becomes `image_url`.
- `attach_form_asset`, `attach_funnel_asset`, `attach_presentation_asset`: `asset_ref.asset_id` becomes `media_asset_id`.
- `generate_image`: `asset_ref.url`/`asset_refs[].url` become `input_image_url`/`input_image_urls`.
- `edit_image`: `asset_ref.asset_id` becomes `parent_image_asset_id`, with URL fallback to `parent_image_url`.
