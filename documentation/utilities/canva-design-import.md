# Canva design import

Last modified: 2026-07-17

`apps/web/src/lib/canva` owns the shared browser handoff for opening generated files in Canva.

It provides:

- `importCanvaDesignFile(...)` for uploading a DOCX, PPTX, or PDF to the backend Canva import route.
- `openCanvaDesignFile(...)` for opening a pending browser tab during file generation, handling Canva connection repair, and replacing that tab with the returned Canva editor URL.
- Shared user-facing Canva messages for document and presentation surfaces.

The backend route resolves the user's existing Composio-managed Canva connection and calls Canva Design Import with the original file bytes. Media images keep their existing Canva asset upload flow because Canva's Asset API is the native path for image designs.
