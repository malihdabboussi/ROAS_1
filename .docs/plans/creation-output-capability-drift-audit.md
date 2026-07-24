# Creation Output Capability Drift Audit

Generated: 2026-07-24

## Purpose

Verify that the primary chat creation paths used by Vibey remain executable and produce a usable saved output: funnels, websites, presentations, PDF/DOCX files, images, and videos. The audit covers the Vibey chat agent, backend action transport, and the web output cards that open the created result.

## Result Summary

- Known drift rows after this fix: none across the checked schema, registry, policy, and generated action-doc surfaces.
- Direct product gaps: none for the checked creation actions.
- Critical conclusion: funnel and website creation already persisted artifacts, but their fallback/open routing was inconsistent. Video polling had a required-field mismatch (`operation_id` versus the actual `job_id`) and successful polls did not provide the saved media identity needed for the in-app viewer.

## Compared Surfaces

| Surface | Checked source |
| --- | --- |
| Executable schema | `artifact-action-schemas.ts` and additional schemas |
| Runtime registry | `artifact-action.registry.ts` |
| Handler implementation | funnel, presentation, document, image, and video services |
| Valid action list | `artifact-action.dto.ts` |
| Policy allowlist | agent policy actions/domains and `VIBEY_ALLOWED_ACTIONS` |
| Generated action docs | `vibey-api-action-docs.ts` |
| Checked-in runtime artifact | Atlas `skills/vibey-api/references/media.md` |
| Chat output extraction | `ui-block-extractor.ts` |
| UI/open destination | final output cards, Studio artifact controller, and Space view routing |

## Drift Rows

| Action or field | Current drift | Impact | Priority |
| --- | --- | --- | --- |
| `get_video_status.job_id` | Fixed: schema, docs, and runtime now use the same field | Video polling can reach completion instead of failing preflight | Critical |
| Completed video result | Fixed: returns URL, media asset id, prompt, and Space scope | Video card opens the saved asset in the in-app media workspace | Critical |
| `create_funnel` fallback output | Fixed: synthesizes a funnel card when transport UI blocks are absent | Successful funnels remain visible and openable | High |
| Website output type | Fixed: native result uses `website`; Studio normalizes storage to its funnel node and Space routes to Websites | Website cards open the correct destination | High |

## Direct Capability Gaps

None found for the scoped creation family. This audit does not prove deployment/runtime synchronization; it verifies the local source contract and focused execution/render paths.

## Recommended Fix Order

1. Keep the capability-drift test at an empty expected baseline.
2. Deploy the local commits through the normal agent API and web release path.
3. Run one live chat smoke test each for a funnel and async video, confirming the final card opens the saved result.

## Acceptance Criteria

- The creation-output drift test reports no unclassified missing surfaces.
- `get_video_status` accepts the `job_id` returned by `generate_video`.
- A successful video status poll emits a `media_asset` block containing the saved media id.
- Funnel and website results emit the correct artifact type.
- Clicking funnel, website, image, video, document, and presentation outputs routes to their canonical in-app destination.
- Focused backend and web regression suites, lint, typecheck, and architecture checks pass.
