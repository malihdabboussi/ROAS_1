# Changelog - July 25, 2026

## 2026-07-25 16:16 - [FIX]

What: Made Higgsfield organization credentials use an organization-scoped vault label, added Higgsfield to the canonical integrations overview provider list, and covered both paths with focused regression tests.

Why: A prior personal Higgsfield connection used the same vault uniqueness key as a later organization connection, causing the organization callback to fail with HTTP 409. Successful connections were also filtered out of the Settings overview.

Impact: A user can connect Higgsfield personally and later connect it to a workspace without a credential conflict. Connected workspace accounts now appear as connected in Integrations Library and Manage, while personal credentials remain private.

Files: `apps/api/src/modules/integrations/higgsfield/higgsfield.repository.ts`, `apps/api/src/modules/integrations/higgsfield/higgsfield.repository.test.ts`, `apps/api/src/modules/integrations/services/integrations-overview.service.ts`, `apps/api/src/modules/integrations/services/__tests__/integrations-overview-higgsfield.service.test.ts`, `documentation/features/integration-connections.md`

## 2026-07-25 08:18 - [FEATURE]

What: Added direct text and image editing in full funnel/website mode, serialized background saves with live status feedback, date-grouped and bookmarkable history, one-click first publish, and an explicit Publish updates action.

Why: The builder had durable file history and visual styling, but the core create-edit-recover-publish loop required too many indirect steps compared with leading AI website builders.

Impact: Users can edit selected content in place, replace images from their media library, understand when changes are saved, mark important versions, restore without losing later history, and publish through a clearer snapshot workflow.

Files: `apps/web/src/features/studio`, `apps/web/src/features/spaces/components/chat/FunnelDesignChatView.tsx`, `apps/web/src/lib/artifacts`, `apps/api/src/modules/funnels`, `documentation/features/website-artifacts.md`
