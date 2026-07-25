# Website Artifacts

Last Modified: 2026-07-25

## Overview

Website is now first-class at the API, agent contract, skill, and UX layers while the DB storage model stays unchanged.

- Website rows live in `funnels` with `funnel_type = "website"`.
- Website pages live in `funnel_pages`.
- Website-safe page types are `home`, `about`, `services`, `pricing`, `team`, `contact`, `blog-listing`, `blog-post`, `faq`, `testimonials`, `portfolio`, and `custom`.
- Homepage requests must check existing websites before creating new artifacts.

## Data Flow

```
User asks for homepage/site
  -> agent calls describe_action/list_websites
  -> existing website found: add_website_page or update_website_page
  -> no website found: create_website for brand/site homepage
  -> standalone home artifact only: create_funnel with funnel_type home-page
  -> DB stores website in funnels, pages in funnel_pages
```

`general-home-page` is an example-library category, not a DB enum. It can map to `home-page` or website intent only, never `lead-magnet`.

### Durable Funnel History

HTML bundle edits now record database-backed change sets for page-scoped files plus funnel-shared files.

```
Studio or agent writes funnel_files
  -> capture before/after file snapshots in funnel_change_sets + funnel_change_items
  -> Undo applies before_snapshot to funnel_files
  -> Redo applies after_snapshot to funnel_files
  -> Version history groups the 50 latest restorable page edits by date
  -> Users can bookmark important versions for quick recognition
  -> Restore replays Undo/Redo in order until the selected version is current
  -> restored page rows are touched so previews refetch the active bundle
```

History scope is the current page plus shared files. The funnel toolbar exposes Undo, Redo, and a date-grouped version-history menu for funnels and websites backed by HTML bundles. Each entry identifies whether the user or Vibey made the edit, can be bookmarked through its existing change-set metadata, and can restore that page version. A restore creates another durable change set, so restoring never destroys the versions that came after it. History does not currently version assets, funnel settings, or legacy TSX page content.

### Full-Mode Editing and Publishing

The full-screen funnel and website editor supports a short visual-edit loop:

1. Choose Design and click an element in the live preview.
2. Edit text directly, replace a selected image from the media library, edit image alt text, or change typography/layout controls.
3. The iframe applies the change immediately while the source-file save runs in the background.
4. The editor shows Saving, Saved, or Save failed state, and the successful change appears in durable history.

Direct edits use the selected element's source file and unique source hint. If the source can no longer be mapped uniquely, the editor refuses the write instead of changing a different element. Background writes are serialized per file so rapid edits cannot reach the server out of order and resurrect older content.

Draft funnels publish from the primary Publish button in one click. Published funnels expose an explicit Publish updates action. Publishing remains snapshot-based: saved editor changes do not alter the live URL until Publish updates succeeds.

## Backend Layer

Primary implementation:

- `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-funnel-history.service.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-funnels.service.ts`
- `apps/api/src/modules/funnels/services/funnel-history.service.ts`
- `apps/api/src/modules/funnels/repositories/funnel-history.repository.ts`
- `packages/agent-policy/src/action-contracts.ts`
- `packages/agent-policy/src/mcp-catalog.ts`
- `docker/tools/vibey-backend/index.ts`

Fallback Edge Function path:

- `supabase/functions/vibey-artifacts/index.ts`
- `supabase/functions/vibey-artifacts/ownership.ts`
- `VIBEY_AGENT_TOKEN` is required in the Edge Function environment. Requests must send it as a bearer token, and the function fails closed when the token is missing.
- Page insert/update actions verify the caller owns the parent `funnels` row before mutating `funnel_pages`. Website page actions additionally require the parent funnel to have `funnel_type = "website"`.

Public direct slug rendering only resolves `funnels.status = "published"`. Draft website/funnel rows stay editable in the app but do not render through the public direct slug route.

History APIs:

- `GET /api/funnels/:id/history?funnel_page_id=...`
- `GET /api/funnels/:id/history/state?funnel_page_id=...`
- `POST /api/funnels/:id/history/undo`
- `POST /api/funnels/:id/history/redo`
- `POST /api/funnels/:id/history/restore`
- `POST /api/funnels/:id/history/:changeSetId/bookmark`

## Actions

| Action                | Storage behavior                                                |
| --------------------- | --------------------------------------------------------------- |
| `create_website`      | Inserts `funnels.funnel_type = "website"`                       |
| `list_websites`       | Filters `funnels.funnel_type = "website"`                       |
| `get_website`         | Reads website funnel plus pages and blog metadata               |
| `add_website_page`    | Inserts `funnel_pages` with website-safe `page_type` and `path` |
| `update_website_page` | Updates an existing website page                                |
| `patch_website_page`  | Patches an existing website page                                |
| `delete_website`      | Uses the existing delete confirmation model                     |

`update_funnel_page.files` and `update_website_page.files` require `replace_entire_page: true`. Small edits should use `patch_funnel_file` or `write_funnel_file`, which also record history.

Successful `create_website` results identify the output as a website even though storage remains in `funnels`. Chat opens the card as the same underlying funnel artifact in Studio and focuses the Websites view in a Space. `create_funnel` retains a transport fallback that synthesizes the same openable artifact card when a downstream tool envelope omits backend `ui_blocks`.

## Skill Layer

Skill work follows `.cursor/skills/claude-skills/SKILL.md`: DB-backed `agent_skills` and `agent_skill_resources` are canonical. The migration `supabase/migrations/20260604120000_first_class_website_skill_contracts.sql` updates persistent skill guidance.

Context-engineering guidance from `.docs/guidelines/ai/context-engineering.md` and `.docs/architecture/semantic-first-context-engineering.md` drove the explicit intent rules, allowed enums, examples, and retry constraints.

### Premium Funnel and Site Design

`funnel-site-design` is the canonical high-fidelity art-direction and visual-review skill. It sits between wireframing and implementation:

1. The designer creates a subject-specific Design Contract with separate 1440px and 390px compositions.
2. The funnel or website builder implements that contract using its normal efficient model.
3. A fresh designer pass opens the real preview, inspects desktop and mobile screenshots, and returns concrete revisions.
4. The builder revises and re-checks the acceptance criteria.

The design lane uses `anthropic/claude-opus-4.8`; routine builder execution remains unchanged. Every enabled template that owns `funnel-builder` or `website-builder` receives the design skill, and existing Designer, Lux, and designer-role registry agents are backfilled. Canonical Designer/Lux runtimes may use the browser for visual review; custom designer-role runtimes receive that exception only when they own `funnel-site-design`. All other denied tools remain denied. The old platform-managed `funnel-page-design` skill is retired because it overlaps this workflow; user-authored skill copies and variants are preserved.

The skill rejects effect counting and fabricated conversion pressure as quality proxies. Gradients, glow, motion, card grids, counters, urgency, testimonials, and statistics are used only when the subject and verified inputs justify them.

Design Contracts mark substantive choices as Confirmed, Proposed, or Missing so fallback fonts, guessed tokens, draft copy, and arbitrary ratios cannot look production-approved. Shared design-system decisions are stated once, with page-specific detail reserved for choices that materially change implementation; the handoff should be scannable in under five minutes.

## Testing

- `artifact-action-schemas.test.ts` covers `describe_action` allowed values and website examples.
- `artifact-funnels.service.contract.test.ts` covers `create_website`, Home page defaults, `general-home-page -> home-page`, history capture, and full-replacement guardrails.
- `funnel-history.service.test.ts` covers record, undo, ordered redo, arbitrary version restore, redo superseding, page/shared scope, and no-op edit behavior.
- Web history tests cover timeline grouping, bookmarks, version restore, undo/redo hook state, toolbar controls, and iframe `funnel:history` delegation.
- Direct-edit tests cover escaped text writes, image replacement, alt-text insertion, and stale source-hint refusal.
- Save-queue tests cover rapid same-file writes and verify that the newest content remains authoritative.
- Publishing tests cover one-click first publish and the explicit Publish updates action.
- `agent-policy.test.ts` covers website action contracts and MCP exposure.
- `supabase/functions/vibey-artifacts/ownership.test.ts` covers fallback Edge Function owner scoping before page writes.
- `funnel-site-design-skill-contract.test.ts` covers the canonical skill, current builder-template handoff for future hires, all existing designer-role agents, responsive critique, user-authored copy preservation, legacy retirement, and Opus 4.8 routing.
- `openclaw-gateway.visual-review.test.ts` covers browser review access for canonical Designer/Lux and trained custom designer-role runtimes while preserving the deny policy for untrained or non-designer agents.

## Decision Log

- **2026-06-04** — Kept DB storage shared in `funnels` rather than adding a `websites` table. Reason: blog posts and existing render paths already attach through `funnel_id`.
- **2026-06-04** — Added website as first-class API/UX/action concept. Reason: agents need clear routing and cannot safely infer website behavior from generic funnel examples.
- **2026-06-04** — Made `lead-magnet` an explicit-only type for homepage flows. Reason: retrying homepage validation failures as lead magnet caused wrong metadata.
- **2026-06-06** — Made the fallback Edge Function require an explicit `VIBEY_AGENT_TOKEN`. Reason: fallback artifacts access must fail closed instead of accepting a built-in shared token.
- **2026-06-07** — Added parent-funnel ownership checks before fallback Edge Function page writes. Reason: service-role fallback writes must not rely on client-supplied `funnel_id` or `page_id`.
- **2026-06-07** — Restricted public direct slug rendering to published funnels. Reason: direct public routes must not expose draft rows or globally resolve unpublished duplicate slugs.
- **2026-06-16** — Added durable file-level funnel history with Undo/Redo controls. Reason: small AI/UI edits must be recoverable and full bundle replacements must require explicit intent.
- **2026-07-17** — Added a browsable page-version timeline and arbitrary restore for funnels and websites. Reason: durable change sets existed, but users could only step backward or forward one edit at a time and could not see or select saved versions.
- **2026-07-17** — Added a high-fidelity design-contract and fresh screenshot-critique workflow for funnels and websites. Reason: wireframing and builder skills existed, but no specialist layer owned subject-specific art direction, deliberate mobile composition, or independent visual QA.
- **2026-07-17** — Tightened Design Contracts after blind forward-testing. Reason: the first run was visually specific and evidence-safe but allowed provisional fallback typography and arbitrary layout percentages to read as approved decisions and produced a longer-than-needed handoff.
- **2026-07-24** — Aligned created website/funnel result types and chat destinations. Reason: website rows share funnel storage, but users must still see and open them as Websites while funnel cards continue to route to Funnels.
- **2026-07-25** — Shortened the full-mode edit/publish loop and made history easier to navigate. Reason: durable primitives existed, but users could not directly edit content or images, see save progress, recognize important versions, or publish a draft without opening a secondary menu.
