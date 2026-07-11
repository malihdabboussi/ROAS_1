# Changelog - July 10, 2026

## [2026-07-10 20:55] - [FIX]

What: Fixed roas-web Vercel production build after global chat ship — removed stale `SidebarCreditsHover` import, cleaned unused FlowsPage chat migration code, and fixed TypeScript errors in global chat config/panel.
Why: `58efca34` deployed roas-api/funnels successfully but roas-web failed at compile (missing module + strict TS unused/type checks).
Impact: `apps/web` production build passes; Vercel roas-web can redeploy from main.
Files: `apps/web/src/components/layout/sidebar/SidebarHqRail.tsx`, `apps/web/src/app/(dashboard)/home/home-dashboard-content.tsx`, `apps/web/src/components/global-chat/components/GlobalChatComposerFooter.tsx`, `apps/web/src/components/global-chat/config/work-context.config.ts`, `apps/web/src/components/global-chat/containers/GlobalChatPanel.tsx`, `apps/web/src/features/brain/components/BrainVisualization.tsx`, `apps/web/src/features/flows/containers/FlowsPage.tsx`, `.docs/logs/changelog2026-07-10.md`

## [2026-07-10 21:25] - [FIX]

What: Wired deferred dashboard compile path — lazy `DashboardSidebar`, `DashboardShell`, and slim `/home` page that dynamic-imports `HomeDashboardContent`.
Why: Post-login `/home` was blocking on one giant compile (Sidebar + global chat + full home tree) for 30–90s in local dev.
Impact: After login, dashboard shell and a skeleton should appear quickly; sidebar, chat rail, and home content load as separate chunks.
Files: `apps/web/src/app/(dashboard)/layout.tsx`, `apps/web/src/app/(dashboard)/home/page.tsx`, `.docs/logs/changelog2026-07-10.md`

## [2026-07-10 21:25] - [FIX]

What: Preserved provider-specific chat gateway failures for OpenRouter billing/key and rate-limit responses, and kept those codes ahead of generic gateway wording in backend and frontend classifiers.
Why: Non-OpenAI chat models could collapse real provider failures into vague gateway/model-busy states, hiding whether the fix is provider billing, credentials, or a retryable rate limit.
Impact: Chat now surfaces durable `provider_billing` or `busy` codes from gateway status responses instead of masking them as generic gateway failures; streamed assistant responses are also protected by the staged merge fix.
Files: `apps/agent-api/src/modules/chat/services/openclaw-gateway-request.service.ts`, `apps/agent-api/src/modules/chat/services/openclaw-gateway-request.service.test.ts`, `apps/agent-api/src/modules/chat/chat-stream-errors.ts`, `apps/agent-api/src/modules/chat/chat-stream-errors.test.ts`, `apps/web/src/lib/chat/chat-stream-errors.config.ts`, `apps/web/src/lib/chat/chat-stream-errors.config.test.ts`
