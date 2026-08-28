# Changelog - August 28, 2026

## 2026-08-28 12:25 - [FIX]

What: Aligned Space task-list headers with the external selection, expansion, and status controls, and made a childless task's expand chevron open the inline Add subtask composer.

Why: Moving row controls outside the Name cell left the header grid offset, while expanding an empty task produced no editable subtask row.

Impact: All Tasks and shared Space task lists keep Name and subsequent headers aligned with row data, and users can begin entering the first subtask directly from the chevron.

Files: `apps/web/src/features/spaces/components/DraggableColumnHeaders.tsx`, `apps/web/src/features/spaces/components/GroupSection.tsx`, `apps/web/src/features/spaces/components/ListView.tsx`, `apps/web/src/features/spaces/components/space-list-group-chrome.tsx`, `apps/web/src/features/spaces/components/ListView.test.tsx`, `documentation/features/space-items-custom-data-drive.md`
