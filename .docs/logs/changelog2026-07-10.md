# Changelog - July 10, 2026

## [2026-07-10 20:55] - [FIX]

What: Fixed roas-web Vercel production build after global chat ship — removed stale `SidebarCreditsHover` import, cleaned unused FlowsPage chat migration code, and fixed TypeScript errors in global chat config/panel.
Why: `58efca34` deployed roas-api/funnels successfully but roas-web failed at compile (missing module + strict TS unused/type checks).
Impact: `apps/web` production build passes; Vercel roas-web can redeploy from main.
Files: `apps/web/src/components/layout/sidebar/SidebarHqRail.tsx`, `apps/web/src/app/(dashboard)/home/home-dashboard-content.tsx`, `apps/web/src/components/global-chat/components/GlobalChatComposerFooter.tsx`, `apps/web/src/components/global-chat/config/work-context.config.ts`, `apps/web/src/components/global-chat/containers/GlobalChatPanel.tsx`, `apps/web/src/features/brain/components/BrainVisualization.tsx`, `apps/web/src/features/flows/containers/FlowsPage.tsx`, `.docs/logs/changelog2026-07-10.md`
