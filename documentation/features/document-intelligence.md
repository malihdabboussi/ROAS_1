# Document Intelligence

Last Modified: June 22, 2026

## Data Flow

1. Upload confirmation creates or finalizes a `media_assets` row and starts background indexing.
2. Upload confirmation returns a normalized `asset_ref` descriptor so downstream UI, Brain imports, and mission flows can keep the storage identity without parsing URLs.
3. The media indexer sets `media_assets.document_intelligence.status` to `processing` for document assets.
4. Native PDF text is extracted first, then checked by the shared document intelligence policy.
5. Empty or low-signal native text, including repeated watermark text such as `Made with Vibey`, is OCRed through the existing Gemini OCR path.
6. Only usable native or OCR text is stored in `media_assets.text_layer` and `media_asset_chunks`.
7. If OCR cannot produce usable text and the PDF fits model file limits, the request path marks the file for native `input_file` attachment instead of prompting the agent to retry unrelated tools.
8. Chat saves `conversation_documents.metadata.document_intelligence` so each uploaded file has traceable read status.
9. File chips show upload/read status by polling `GET /api/media/assets/:id` after presigned upload confirmation.
10. Current-message uploaded images are attached to the model as native `input_image` parts so the agent can inspect them directly without a separate image-reader step.
11. Previous/stored image URLs, readable `media_assets` ids, and normalized `asset_ref` handles are exposed with `analyze_image` for re-reading, ranking, text-in-image checks, and carousel selection.
12. `analyze_image` accepts public image URLs, readable `media_assets` ids, `asset_ref`, or `asset_refs`, rejects local/private URLs and redirects, downloads only image MIME types with timeout/size limits, and sends the image through the platform-managed vision path.

## Code Examples

Shared quality gate:

```ts
const assessment = assessDocumentTextQuality({
  text,
  pageCount,
  mimeType: 'application/pdf',
  filename,
})

if (assessment.quality !== 'usable') {
  // OCR or attach the original file.
}
```

Native file fallback:

```ts
{
  type: 'input_file',
  source: {
    type: 'url',
    url: signedUrl,
    media_type: 'application/pdf',
    filename,
  },
}
```

Image analysis action:

```json
{
  "action": "analyze_image",
  "label": "Analyzing photos",
  "data": {
    "asset_refs": [{ "kind": "vibey_asset", "asset_id": "asset-1" }],
    "prompt": "Rank these for an Instagram carousel. Return subject, quality, brand fit, and carousel_score."
  }
}
```

## Decision Log

- V1 uses the existing Gemini OCR services. No new OCR provider was introduced.
- Low-signal text is never treated as ready context, even when native extraction returns non-empty text.
- `document_intelligence` lives on `media_assets` as JSONB so the status can evolve without another schema change.
- Chat can synchronously recover when background indexing is still processing.
- The OpenClaw request now uses real `input_file` content parts instead of mutating tool results after the model has already responded.
- Upload UX remains lightweight: chips show `Reading`, `Ready`, or `Failed`; sending is not blocked after upload completes.
- Direct image uploads rely on the selected model's native image understanding. `analyze_image` exists only as the platform adapter for image URLs/assets that are not currently attached to the model turn.
- `analyze_image` is a platform capability, not a skill-specific workaround. Agents must use Vibey-managed tools and connected integrations for image analysis, never user-pasted API keys or tokens.
- Presigned upload confirmation returns `asset_ref` as the stable handoff between upload, indexing, Brain imports, and mission attachment flows.
- File-aware actions accept `asset_ref` as the stable handoff and normalize it to legacy handler fields internally, so agents do not guess between local paths, signed URLs, Drive links, and media asset ids.
