-- Funnel skills v2 polish after first live test:
-- 1. Editing discipline — agents were rewriting whole pages for one-line
--    changes; make patch-first an explicit hard rule with a decision table.
-- 2. Bundle validation — saves are now validated server-side (missing
--    stylesheet refs, unbalanced CSS are rejected); teach the verify loop.
-- 3. Remove "legacy TSX still accepted" wording — TSX writes are now rejected
--    (patch_funnel_page/patch_website_page removed, generated_html rejected).

--------------------------------------------------------------------
-- 1. funnel-builder: editing discipline + validation
--------------------------------------------------------------------
UPDATE agent_skills
SET markdown_content = replace(
  markdown_content,
  $OLD$Editing existing pages — always the smallest action that fits:

- `list_funnel_files` then `read_funnel_file` before any edit. The files are the truth.
- `patch_funnel_file` for one-place copy/style changes (find must match exactly once).
- `write_funnel_file` to replace or add one file.
- `update_funnel_page` with `files` only when replacing the whole page.
- `apply_funnel_element_edit` when working from a Markup/Edit selection context.

Legacy note: older pages store TSX in `generated_html` (`source_mode: 'tsx'`). They keep working; edit them with the legacy `patch_funnel_page`. Never write TSX for new pages.$OLD$,
  $NEW$## Editing Discipline (hard rules)

Rewriting a whole page for a small change is slow, expensive, and destroys unrelated work. **Always use the smallest action that fits.** Read the target file first (`list_funnel_files` → `read_funnel_file`) — the files are the truth.

| Change | Action |
|---|---|
| One headline, one sentence, one class, one color value | `patch_funnel_file` (exact `find` that matches once → `replace`) |
| A few values in the stylesheet | `patch_funnel_file` on `styles.css` |
| Add/replace one section of the page | `patch_funnel_file` with the section's opening tag → closing tag as `find` |
| Replace or add one whole file | `write_funnel_file` |
| Full page redesign (user explicitly asked) | `update_funnel_page` with `files` |
| Edit from a Markup/Edit selection | `apply_funnel_element_edit` |

NEVER call `update_funnel_page` with `files` to change copy, a section, or styles. If your `find` string matches more than once, make it more specific — do not fall back to a rewrite.

## Validation — the page must render correctly

The backend validates every save and REJECTS broken bundles (missing `index.html`, a `<link rel="stylesheet">` pointing at a file not in the bundle, unbalanced/truncated CSS). If you get `BUNDLE_INVALID`, fix exactly what the error names and retry — never strip the stylesheet to make the error go away.

After every save, do a self-check pass:

1. Confirm every `<link>`/`<script src>` in `index.html` matches a file you actually saved (or `shared/...`).
2. Confirm every class used in the HTML is defined in the page or shared stylesheet — unstyled markup looks broken to the user.
3. If the save response includes `bundle_warnings`, fix them before telling the user the page is ready.

TSX (`generated_html`) is fully retired — the backend rejects it. Older TSX pages still render but cannot be edited; rebuild them as HTML bundles if the user wants changes.$NEW$
)
WHERE skill_key = 'funnel-builder' AND agent_key = 'vibey';

--------------------------------------------------------------------
-- 2. website-builder: same discipline + drop legacy note
--------------------------------------------------------------------
UPDATE agent_skills
SET markdown_content = replace(
  markdown_content,
  $OLD$## Editing

- `list_funnel_files` / `read_funnel_file` first — files are the truth.
- `patch_funnel_file` for one-place changes; `write_funnel_file` per file; shared scope (no `funnel_page_id`) for site-wide changes.
- Changing `shared/styles.css` restyles the whole site in one write — prefer it over editing each page.

Legacy note: older websites store TSX pages (`source_mode: 'tsx'`) and `navigation_tsx`/`footer_tsx` layouts. They keep working. Never write TSX for new pages.$OLD$,
  $NEW$## Editing Discipline (hard rules)

- `list_funnel_files` / `read_funnel_file` first — files are the truth.
- `patch_funnel_file` for ANY copy, class, or style change (exact `find` matching once). Never rewrite a page for a small edit.
- `write_funnel_file` to replace one file; shared scope (no `funnel_page_id`) for site-wide changes.
- Changing `shared/styles.css` restyles the whole site in one write — prefer it over editing each page.
- `update_website_page` with `files` is for full redesigns only.

The backend validates every save and rejects broken bundles (missing stylesheet refs, unbalanced CSS → `BUNDLE_INVALID`). Fix what the error names and retry. If a save returns `bundle_warnings`, fix them before finishing. TSX is fully retired — `generated_html` and `navigation_tsx`/`footer_tsx` are rejected; use `files` and `nav_html`/`footer_html`.$NEW$
)
WHERE skill_key = 'website-builder' AND agent_key = 'vibey';
