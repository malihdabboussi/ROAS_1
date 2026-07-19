# Changelog - July 19, 2026

## [2026-07-19 13:23] - [FIX]

What: Export Open in Google Docs via `GOOGLEDOCS_CREATE_DOCUMENT_MARKDOWN` after converting space-doc HTML to Markdown (headings, lists, tables, links, marks).
Why: `GOOGLEDRIVE_CREATE_FILE_FROM_TEXT` wrote the HTML source as plain text, so Docs showed raw tags instead of formatted content.
Impact: New exports open as real formatted Google Docs. Re-export existing docs to replace ugly HTML dumps.
Files: `html-to-google-docs-markdown.ts`, `google-drive-composio-files.service.ts`, unit tests

## [2026-07-19 13:05] - [FIX]

What: Create Google Docs via Composio `GOOGLEDRIVE_CREATE_FILE_FROM_TEXT` instead of a raw Drive upload using a Composio-extracted OAuth token; treat Composio `REDACTED` tokens as missing.
Why: Composio now redacts access tokens from `connectedAccounts.get`, so Open in Google Docs got a fake token and Google returned 401 → “Failed to create Google Doc”.
Impact: Open in Google Docs works again with a connected Google Drive account. Hard-refresh after API deploy.
Files: `google-drive-composio-files.service.ts`, `composio.service.ts` (api + agent-api), google-drive-api unit test

## [2026-07-19 12:45] - [FIX]

What: Home dashboard card order/size now persists on the user account (`profiles.preferences.home_layout`) via `PATCH /api/profile/preferences`, with a per-user localStorage cache (`vibey-home-layout:{userId}`) and one-shot migrate from the old global key.
Why: Reorder only wrote device-local `vibey-home-layout`, so layouts were lost across browsers/devices and could leak between accounts on a shared browser.
Impact: After API + web deploy, reorder Home once; the same layout loads when you sign in elsewhere. First Home visit claims any leftover global local layout into the signed-in account, then removes it.
Files: `profile.controller.ts`, `profile.service.ts`, `profile-preferences.dto.ts`, `use-home-layout.ts`, `home-layout-api.ts`, `home-cards.config.ts`, agent preference dump skip for UI blobs

## [2026-07-19 12:44] - [FIX]

What: Stopped integrations overview from remapping collapsed/disconnected Composio rows back to `connected`, clear shared `composio_connected_account_id` on duplicates, prefer active rows during personal sync, filter Manage + composio accounts to active statuses.
Why: After disconnecting Google Calendar duplicates, overview still forced every row sharing the active Composio account id to `connected`, so Manage kept showing 5× the same gmail account.
Impact: Manage shows one row per live connection (gmail + dylan@). Hard-refresh Settings → Integrations → Manage after API/web deploy.
Files: `integrations-overview.service.ts`, `integrations-overview-personal-composio-sync.ts`, `integrations-composio.service.ts`, `IntegrationsManage.tsx`, overview unit tests

## [2026-07-19 12:40] - [FEATURE]

What: One-click Page Grader **Create & import brain** for unmapped clients — creates campaign + space named after the client, queues brain import, and persists the client→campaign/space mapping.
Why: Most portal clients (e.g. 1DS Collective) have no ROAS campaign yet; Import brain looked like it required a pre-mapped campaign and did not sync mappings after create.
Impact: Unmapped rows show **Create & import brain**; mapped rows keep **Import brain**. After success the modal selects the new campaign/space without a separate Save.
Files: `page-grader-brain-import.service.ts`, `page-grader-api.service.ts` (`mergeClientScopeEntry`), `PageGraderClientScopeMapModal.tsx`, `page-grader-scope-api.ts`, brain-import unit tests

## [2026-07-19 12:36] - [FIX]

What: Shortened the webinar Copy Package instruction packet to fit the mission-plan API contract, restored the shared Dylan Super Voice rule for agent-owned steps, and added regression coverage for every generated intent field's 1,000-character limit.
Why: The V3 Webinar Fulfillment mission generated all 21 steps but Task 10's `intent.ecology` exceeded the API limit, so the worker retried the same invalid plan three times and marked the mission failed.
Impact: New webinar plans pass API validation without losing the copy formatting, review-map, or voice requirements.
Files: `apps/mission-worker/src/modules/missions/playbooks/webinar-fulfillment.playbook.ts`, `apps/mission-worker/src/modules/missions/playbooks/__tests__/webinar-fulfillment.playbook.test.ts`

## [2026-07-19 12:34] - [FIX]

What: Rebuilt Page Grader client map as a nested Radix dialog (`z-modal-layer-4`) with an explicit scroll pane utility and search.
Why: The createPortal popup sat under Workspace Settings’ focus/pointer trap, so clicks and scrolling did not work even though the UI appeared.
Impact: Hard-refresh. Map clients → dialog is interactive, searchable, and the client list scrolls.
Files: `PageGraderClientScopeMapModal.tsx`, `page-grader-client-scope-map.ts`, `globals.css` (web + website)

## [2026-07-19 12:30] - [FIX]

What: Page Grader client map modal scrolls reliably (`overflow-hidden` on the card + scrollable body) and includes a client search field.
Why: Long client lists could not be scrolled, and there was no way to find a client by name.
Impact: Hard-refresh. Open Map Page Grader clients → search and scroll the list; save still applies all draft mappings.
Files: `PageGraderClientScopeMapModal.tsx`, `page-grader-client-scope-map.ts`, `page-grader-client-scope-map.test.ts`

## [2026-07-19 12:54] - [FIX]

What: Typed collapse metadata as `Record<string, unknown>` so deleting `composio_connected_account_id` typechecks on Vercel.
Why: `roas-api` production build failed TS2551 on PR #20 merge tip.
Impact: Unblocks API deploy of the Google Calendar duplicate remap fix.
Files: `integrations-overview-personal-composio-sync.ts`
