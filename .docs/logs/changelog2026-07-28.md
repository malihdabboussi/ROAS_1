# Changelog - July 28, 2026

## [2026-07-28 07:50] - [FEATURE]

What: Wired 18 industry-adjacent IG Story CloudFront presets + stills into the scene catalog and skill stock library (Claude-generated Higgsfield assets; scene IDs aligned to delivered names).

Why: Industry packs had prompt seeds only; Production/`reuse_when_available` needed real preset URLs so insurance/RE/coaching/trades/fitness/creator ads avoid lifestyle beach defaults without burning credits.

Impact: All six industry packs show “Clean preset ready”; skill guidance now says industry presets ship and should be reused.

Files: `ig-organic-video-scenes.config.ts`, migration `20260728120000_ig_organic_video_industry_presets.sql`, skill contract test, `social-research.md`.


## [2026-07-28 08:14] - [FIX]

What: Menu dock hold-drag now live-previews the real menu into each candidate home (layout opens the seam while still holding). Top/bottom docks are compact and centered on the work card again (not a full-width blocked rail).

Why: Full-width top strip looked like a separate rail and was not centered; users need to see the menu lock into left/right/top/bottom before release.

Impact: Dragging shows the menu sitting in the target dock immediately; top/bottom read as a centered HQ pill on the page card.

Files: `SidebarHqHubLogoButton.tsx`, `use-shell-menu-dock.ts`, `ShellMenuDockLayout.tsx`, `ShellWorkspace.tsx`, `Sidebar.tsx`, `SidebarHqRail.tsx`, `SidebarHqSection.tsx`, `HubDockFlyout.tsx`, both product `globals.css`, tests, `claude-chatgpt-shell.md`.

## [2026-07-28 10:33] - [FIX]

What: Changed the manual chat `Resume` action to refresh the canonical conversation, stop an orphaned interrupted run, and start one hidden continuation grounded in the exact user request, partial assistant output, and original attachments.

Why: Interrupted queued runs could remain marked active after execution stopped, causing `Resume` to reconnect to the same dead run instead of continuing the unfinished answer.

Impact: Manual recovery now continues the same task from the visible stopping point, including screenshot context, without making the user resend the prompt or attachment.

Files: `StreamInterruptedBar.tsx`, `StreamInterruptedBar.test.tsx`, `chat.service.ts`, `chat-resume-context.ts`, `chat-resume-context.test.ts`, `chat-stream-interruption.test.ts`, `chat-stream-recovery.md`.
