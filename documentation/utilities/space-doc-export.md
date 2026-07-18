# Space document export utilities

Last modified: 2026-07-17

`apps/web/src/lib/spaces/space-doc-export.ts` is the shared source for native Space document export helpers used by the full editor, Mission deliverable previews, and shell open-in targets. Feature-owned Space export wiring reuses it when generating Canva import files.

It provides:

- `buildSpaceDocExportHtml(title, docBody)` for the complete HTML payload sent to Google Docs and file exporters.
- `googleDocHref(customData)` for validating and resolving a previously exported Google Doc.
- `googleDocMetadataPatch(file)` for persisting the created Google file identity on the native Space document.

The first Google export creates a Google Doc and stores its file metadata in the Space item's `custom_data`. Later actions reopen that same Google Doc instead of creating duplicates.

Canva export preserves the strongest available source format: rich-text Space docs are generated as DOCX, while Visual docs use the shared high-resolution PDF renderer. The resulting file is passed to Canva Design Import rather than uploaded as one flattened screenshot.
