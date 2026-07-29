# Changelog - July 29, 2026

## [2026-07-29 12:11] - [FIX]

What: Removed the unsupported API TypeScript path mapping that made Vercel recompile `@vibey/api-shared` source after the Nest build.

Why: The frontend deployed the scheduled-meeting resolver while the backend deployment failed during Vercel's function compilation, leaving production on an older API without `POST /spaces/:spaceId/meetings/resolve`.

Impact: The backend can deploy its prebuilt Nest output and compiled shared package consistently, allowing the meeting workspace resolver and persistent meeting chat flow to reach production.

Files: `apps/api/tsconfig.json`.

## 2026-07-29 12:05 - [FIX]

What: Closed public sign-ups for now — `/register` redirects to login, API `POST /auth/register` rejects new accounts, Sign up CTAs removed/retargeted to login, marketing register links point to login, and AuthModal is login-only.

Why: Public registration needed to be blocked temporarily while keeping invite-based onboarding (`/invite`, `/join`, org invite tokens) available.

Impact: New users cannot create accounts via public register UI or API. Existing users can still sign in. Reopen by setting `NEXT_PUBLIC_WAITLIST_MODE=false` and redeploying.

Files: `apps/web/src/middleware.ts`, `apps/web/src/app/(auth)/register/page.tsx`, `apps/web/src/app/shared/layout.tsx`, `apps/web/src/features/spaces/components/shared/RestrictedViewPlaceholder.tsx`, `apps/web/src/features/public-agent/components/common/ConversionBar.tsx`, `apps/api/src/modules/auth/services/auth.service.ts`, `apps/api/src/modules/auth/config/auth-errors.config.ts`, `apps/website/src/components/*`, `apps/web/e2e/*`, env templates

## 2026-07-29 10:25 - [FEATURE]

What: Made every agenda call open the curated meeting workspace directly, added scheduled workspace creation/reuse for future calendar calls, connected the workspace to the existing main shell chat, and placed live notes and call snippets into that same conversation timeline.

Why: Past calls were hidden behind an intermediate detail modal, future calls had no canonical workspace until Fathom arrived, and meeting details previously rendered a second isolated chat instead of using the app's main chat.

Impact: A future meeting now keeps one identity from agenda prep through the live call and post-call Fathom processing. Opening its workspace automatically opens the meeting's conversation in the existing left chat, notes and snippets remain typed meeting records while also appearing in that conversation, and later Fathom recordings can reconcile onto the scheduled workspace.

Files:

- `apps/api/src/modules/meetings/`
- `apps/web/src/features/home/`
- `apps/web/src/components/global-chat/`
- `apps/web/src/app/(dashboard)/home/`
- `documentation/features/meeting-follow-up-slack.md`
