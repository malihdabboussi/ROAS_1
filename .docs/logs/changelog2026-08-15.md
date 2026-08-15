# Changelog - August 15, 2026

## [2026-08-15 16:20] - [FIX]

What: The Home chat artifact pane now opens the real editors at an editor-sized width, can be dragged past the old 720px cap, and uses its Artifacts / files / title crumbs to browse inside that same right pane.

Why: Opening a document or deck from chat dropped into a cramped lightweight viewer that could not grow with the chat column, so the presentation, designer, image, document, and funnel editors were unusable beside chat.

Impact: Docs, presentations, funnels, and media keep their canonical editors in the side view; the pane has a 420px minimum and no maximum, so chat can shrink as the editor grows; breadcrumb clicks stay on the right instead of navigating away.

Files: `apps/web/src/lib/artifacts/artifact-viewer-layout.ts`, `apps/web/src/components/shell/use-shell-store.ts`, `apps/web/src/components/shell/ShellArtifactViewerColumn.tsx`, `apps/web/src/components/shell/ShellArtifactViewerPanel.tsx`, `apps/web/src/components/shell/ShellArtifactViewerBrowse.tsx`, `apps/web/src/features/studio/components/preview/ShellArtifactViewerAdapter.tsx`, `apps/web/src/components/deliverables/PresentationFullPreview.tsx`, `apps/web/src/features/artifacts/components/GlobalArtifactsPage.tsx`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-15 11:40] - [FIX]

What: Empty Slack Brain imports now skip Atlas and toast "Nothing to save from that Slack period." instead of "Atlas could not ingest/process".

Why: Formatted Slack windows with no usable messages were still sent to Atlas, which reported failure, and the Brain notifier showed that raw error.

Impact: Empty or chatter-only Slack periods no longer retry as failed imports or show a red Atlas toast.

Files: `packages/api-shared/src/utils/brain-import-job-status.ts`, `apps/api/src/modules/brain/services/brain-import-jobs-execution.base.ts`, `apps/agent-api/src/modules/brain-import-runtime/services/brain-import-runtime.service.ts`, `apps/web/src/features/brain/components/brain-import-job-toast.ts`, `apps/web/src/features/brain/components/BrainImportJobNotifier.tsx`
