# Website Artifacts

Last Modified: 2026-06-16

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
  -> restored page rows are touched so previews refetch the active bundle
```

History scope is the current page plus shared files. V1 does not version assets and does not expose a full history panel; the UI exposes only Undo and Redo controls in the funnel toolbar and iframe keyboard shortcuts.

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

- `GET /api/funnels/:id/history/state?funnel_page_id=...`
- `POST /api/funnels/:id/history/undo`
- `POST /api/funnels/:id/history/redo`

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

## Skill Layer

Skill work follows `.cursor/skills/claude-skills/SKILL.md`: DB-backed `agent_skills` and `agent_skill_resources` are canonical. The migration `supabase/migrations/20260604120000_first_class_website_skill_contracts.sql` updates persistent skill guidance.

Context-engineering guidance from `.docs/guidelines/ai/context-engineering.md` and `.docs/architecture/semantic-first-context-engineering.md` drove the explicit intent rules, allowed enums, examples, and retry constraints.

## Testing

- `artifact-action-schemas.test.ts` covers `describe_action` allowed values and website examples.
- `artifact-funnels.service.contract.test.ts` covers `create_website`, Home page defaults, `general-home-page -> home-page`, history capture, and full-replacement guardrails.
- `funnel-history.service.test.ts` covers record, undo, redo, redo superseding, page/shared scope, and no-op edit behavior.
- Web history tests cover the API client, undo/redo hook state, toolbar controls, and iframe `funnel:history` delegation.
- `agent-policy.test.ts` covers website action contracts and MCP exposure.
- `supabase/functions/vibey-artifacts/ownership.test.ts` covers fallback Edge Function owner scoping before page writes.

## Decision Log

- **2026-06-04** — Kept DB storage shared in `funnels` rather than adding a `websites` table. Reason: blog posts and existing render paths already attach through `funnel_id`.
- **2026-06-04** — Added website as first-class API/UX/action concept. Reason: agents need clear routing and cannot safely infer website behavior from generic funnel examples.
- **2026-06-04** — Made `lead-magnet` an explicit-only type for homepage flows. Reason: retrying homepage validation failures as lead magnet caused wrong metadata.
- **2026-06-06** — Made the fallback Edge Function require an explicit `VIBEY_AGENT_TOKEN`. Reason: fallback artifacts access must fail closed instead of accepting a built-in shared token.
- **2026-06-07** — Added parent-funnel ownership checks before fallback Edge Function page writes. Reason: service-role fallback writes must not rely on client-supplied `funnel_id` or `page_id`.
- **2026-06-07** — Restricted public direct slug rendering to published funnels. Reason: direct public routes must not expose draft rows or globally resolve unpublished duplicate slugs.
- **2026-06-16** — Added durable file-level funnel history with Undo/Redo controls. Reason: small AI/UI edits must be recoverable and full bundle replacements must require explicit intent.
