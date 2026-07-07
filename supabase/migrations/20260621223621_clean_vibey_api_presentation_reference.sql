-- Clean the generated vibey-api presentation contract after the fixed-stage deck migration.
-- The generator now emits this order for future syncs; this data migration repairs the
-- canonical production seed rows that were already materialized in Supabase.

update public.agent_skills
set markdown_content = replace(
    replace(
      markdown_content,
      $old_bundle$- **Presentations are fixed-stage HTML bundles**: New presentations use `source_mode: "html_bundle"` with `index.html` as the entry file. Use `files` on `create_presentation` for a full bundle, and use `read_presentation_file`, `write_presentation_file`, or `patch_presentation_file` for targeted edits. Author every slide on a fixed `1280x720` stage so thumbnails, preview, PDF, and PPTX agree. Use `attach_presentation_asset` for uploaded images/fonts referenced by bundle-relative paths.$old_bundle$,
      $new_bundle$- **Presentations are fixed-stage HTML bundles**: New presentations use `source_mode: "html_bundle"` with `index.html` as the entry file. Use `files` on `create_presentation` for one complete deck, then use `read_presentation_file`, `write_presentation_file`, or `patch_presentation_file` for targeted edits. Author every slide on a fixed `1280x720` stage; do not use `min-height: 100vh`, `auto-fit` slide grids, or viewport-scaled type. Use `attach_presentation_asset` for uploaded images/fonts referenced by bundle-relative paths.$new_bundle$
    ),
    $old_theme$- **Theme-native presentation source**: For new decks, read `skills/presentation-builder/SKILL.md` and its fixed-stage/theme-native references. Generate semantic HTML plus `styles.css` that uses Theme tokens (`var(--color-*)`, `var(--font-*)`, `var(--design-*)`, spacing, typography) instead of hardcoded brand colors, fonts, radii, or shadows. Mark the document with `data-vibey-theme-native="true"`. Do not use `min-height: 100vh`, `auto-fit` slide grids, or viewport-scaled type for slide composition.$old_theme$,
    $new_theme$- **Presentation craft vs contract**: For deck structure, composition, theme-native styling, and slide quality, read `skills/presentation-builder/SKILL.md`. Use `vibey-api` only to verify exact backend payload contracts. Mark new deck documents with `data-vibey-theme-native="true"` and use Theme tokens (`var(--color-*)`, `var(--font-*)`, `var(--design-*)`, spacing, typography) instead of hardcoded brand colors, fonts, radii, or shadows.$new_theme$
  ),
  updated_at = now()
where agent_key = 'vibey'
  and skill_key = 'vibey-api'
  and user_id is null
  and org_id is null;

update public.agent_skill_resources
set content = $vibey_api_presentations$# Presentations

## Section Contract

- New presentations use `create_presentation` with `source_mode: "html_bundle"`, `entry_file: "index.html"`, and a complete `files` bundle.
- Author slides as fixed `1280x720` stages. Do not use `min-height: 100vh`, `auto-fit` slide grids, or viewport-scaled type for slide composition.
- Use `skills/presentation-builder/SKILL.md` for deck structure and visual quality. Use this file only for exact backend payload contracts.
- Legacy slide/TSX actions (`patch_presentation`, `update_presentation_slide`, `add_presentation_slide`) are only for older `generated_html` presentations. Never use them for new decks.

## create_presentation
**Optional keys:** `name`, `generated_html`, `slides`, `offer_id`, `status`, `theme_id`, `files`, `entry_file`, `source_mode`

**Types:** `name`: string, `generated_html`: string, `offer_id`: string, `status`: string, `theme_id`: string, `files`: object_array, `entry_file`: string, `source_mode`: string

**Use when:** Create a new presentation artifact. Save an HTML presentation file bundle.

**Do not use when:** Renaming an existing presentation; use update_presentation with name.

Relevant skill: read `skills/presentation-builder/SKILL.md`. Presentation work needs deck structure, HTML bundle rules, and slide quality guidance. Read before creating, editing, or reviewing presentation assets.

Creates a fixed-stage, theme-native presentation as an HTML-first file bundle. Pass files with index.html as the entry file. Use bundle-relative paths for styles, scripts, images, and fonts. Wrap slides in <section> elements for PDF/PPTX export. Author each slide on a 1280x720 stage; do not use viewport-driven slide layout such as min-height: 100vh, auto-fit grids, or vw-scaled type. Use Theme tokens in styles.css (`var(--color-*)`, `var(--font-*)`, `var(--design-*)`, spacing, typography) and mark the document with data-vibey-theme-native="true". Use React+Babel only when interactivity is required.

```json
{"action":"create_presentation","label":"Building your presentation","data":{"name":"Guide","source_mode":"html_bundle","entry_file":"index.html","files":[{"path":"index.html","role":"entry","content":"<!doctype html><html data-vibey-theme-native=\"true\"><head><meta name=\"viewport\" content=\"width=1280, initial-scale=1\"><link rel=\"stylesheet\" href=\"styles.css\"></head><body><main class=\"deck\"><section class=\"slide\"><div class=\"safe\"><h1 class=\"headline\">...</h1></div></section></main></body></html>"},{"path":"styles.css","role":"style","content":":root { --color-primary: #10b981; --color-heading: #161616; --font-heading: Inter, system-ui, sans-serif; --design-block-radius: 16px; } * { box-sizing: border-box; } body { margin: 0; width: 1280px; background: var(--color-page-background, #fafafa); color: var(--color-body, #5c5c5c); font-family: var(--font-body, Inter, system-ui, sans-serif); } .deck { width: 1280px; margin: 0; } .slide { position: relative; width: 1280px; height: 720px; overflow: hidden; background: var(--color-slide-background, #fafafa); } .safe { width: 1040px; height: 560px; margin: 80px auto; } .headline { color: var(--color-heading); font-family: var(--font-heading); font-size: 68px; line-height: .95; }"}]}}
```

Contract example: create a presentation from HTML files
```json
{"action":"create_presentation","label":"create a presentation from HTML files","data":{"name":"Guide","source_mode":"html_bundle","entry_file":"index.html","files":[{"path":"index.html","content":"<!doctype html><html>...</html>","role":"entry"}]}}
```

## update_presentation
**Required keys:** `presentation_id`

**Optional keys:** `name`, `slides`, `file_url`, `status`, `generated_html`, `theme_id`, `files`, `entry_file`, `source_mode`

**Aliases:** `title` → `name`

**Types:** `presentation_id`: string, `name`: string, `file_url`: string, `status`: string, `generated_html`: string, `theme_id`: string, `files`: object_array, `entry_file`: string, `source_mode`: string

**Use when:** Rename a presentation by passing name. Replace the full HTML presentation bundle by passing files. Update presentation metadata such as status, file_url, slides, or theme_id.

**Do not use when:** Patching one text node inside slide TSX; use patch_presentation. Replacing one slide only; use update_presentation_slide.

Relevant skill: read `skills/presentation-builder/SKILL.md`. Presentation work needs deck structure, HTML bundle rules, and slide quality guidance. Read before creating, editing, or reviewing presentation assets.

Updates a presentation. To rename the presentation, pass name. To replace the entire HTML bundle, pass files. For small edits inside one source file, use patch_presentation_file instead.

```json
{"action":"update_presentation","label":"Renaming your presentation","data":{"presentation_id":"UUID","name":"The Test. The Practice."}}
```

```json
{"action":"update_presentation","label":"Refining your presentation","data":{"presentation_id":"UUID","files":[{"path":"index.html","role":"entry","content":"<!doctype html><html>...</html>"}]}}
```

Contract example: rename a presentation
```json
{"action":"update_presentation","label":"rename a presentation","data":{"presentation_id":"UUID","name":"The Test. The Practice."}}
```

Contract example: replace the full presentation HTML bundle
```json
{"action":"update_presentation","label":"replace the full presentation HTML bundle","data":{"presentation_id":"UUID","files":[{"path":"index.html","content":"<!doctype html><html>...</html>","role":"entry"}]}}
```

## get_presentation
**Required keys:** `presentation_id`

**Types:** `presentation_id`: string

Fetches one presentation by id.

```json
{"action":"get_presentation","label":"Loading your presentation","data":{"presentation_id":"UUID"}}
```

## list_presentations
Lists presentations for current campaign.

```json
{"action":"list_presentations","label":"Checking your presentations","data":{}}
```

## list_presentation_files
**Required keys:** `presentation_id`

Relevant skill: read `skills/presentation-builder/SKILL.md`. Presentation work needs deck structure, HTML bundle rules, and slide quality guidance. Read before creating, editing, or reviewing presentation assets.

Lists source files in an HTML-first presentation bundle.

```json
{"action":"list_presentation_files","label":"Reading presentation files","data":{"presentation_id":"UUID"}}
```

## read_presentation_file
**Required keys:** `presentation_id`, `path`

**Types:** `presentation_id`: string, `path`: string

Relevant skill: read `skills/presentation-builder/SKILL.md`. Presentation work needs deck structure, HTML bundle rules, and slide quality guidance. Read before creating, editing, or reviewing presentation assets.

Reads one source file from an HTML-first presentation bundle.

```json
{"action":"read_presentation_file","label":"Opening presentation file","data":{"presentation_id":"UUID","path":"index.html"}}
```

## show_presentation_file
**Required keys:** `presentation_id`, `path`

**Types:** `presentation_id`: string, `path`: string

Relevant skill: read `skills/presentation-builder/SKILL.md`. Presentation work needs deck structure, HTML bundle rules, and slide quality guidance. Read before creating, editing, or reviewing presentation assets.

Shows one presentation source file. Defaults to index.html in the handler when no path is supplied.

```json
{"action":"show_presentation_file","label":"Showing presentation source","data":{"presentation_id":"UUID","path":"index.html"}}
```

## write_presentation_file
**Required keys:** `presentation_id`, `path`, `content`

**Optional keys:** `role`

**Types:** `presentation_id`: string, `path`: string, `content`: string, `role`: string

Relevant skill: read `skills/presentation-builder/SKILL.md`. Presentation work needs deck structure, HTML bundle rules, and slide quality guidance. Read before creating, editing, or reviewing presentation assets.

Creates or replaces one source file in an HTML-first presentation bundle.

```json
{"action":"write_presentation_file","label":"Saving presentation file","data":{"presentation_id":"UUID","path":"styles.css","content":".slide { width: 1280px; height: 720px; overflow: hidden; }","role":"style"}}
```

## patch_presentation_file
**Required keys:** `presentation_id`, `path`, `find`, `replace`

**Types:** `presentation_id`: string, `path`: string, `find`: string, `replace`: string

Relevant skill: read `skills/presentation-builder/SKILL.md`. Presentation work needs deck structure, HTML bundle rules, and slide quality guidance. Read before creating, editing, or reviewing presentation assets.

Find-and-replace on one presentation source file. Use for small copy/style changes where the find string matches exactly once.

```json
{"action":"patch_presentation_file","label":"Tuning slide copy","data":{"presentation_id":"UUID","path":"index.html","find":"Old headline","replace":"New headline"}}
```

## delete_presentation_file
**Required keys:** `presentation_id`, `path`

**Types:** `presentation_id`: string, `path`: string

Relevant skill: read `skills/presentation-builder/SKILL.md`. Presentation work needs deck structure, HTML bundle rules, and slide quality guidance. Read before creating, editing, or reviewing presentation assets.

Deletes one non-entry source file from an HTML-first presentation bundle.

```json
{"action":"delete_presentation_file","label":"Removing presentation file","data":{"presentation_id":"UUID","path":"unused.js"}}
```

## list_presentation_assets
**Required keys:** `presentation_id`

Relevant skill: read `skills/presentation-builder/SKILL.md`. Presentation work needs deck structure, HTML bundle rules, and slide quality guidance. Read before creating, editing, or reviewing presentation assets.

Lists image/font asset mappings for an HTML-first presentation bundle.

```json
{"action":"list_presentation_assets","label":"Checking presentation assets","data":{"presentation_id":"UUID"}}
```

## attach_presentation_asset
**Required keys:** `presentation_id`, `path`, `media_asset_id`

**Optional keys:** `role`

**Types:** `presentation_id`: string, `path`: string, `media_asset_id`: string, `role`: string

Relevant skill: read `skills/presentation-builder/SKILL.md`. Presentation work needs deck structure, HTML bundle rules, and slide quality guidance. Read before creating, editing, or reviewing presentation assets.

Maps an uploaded media asset into a presentation bundle path such as assets/logo.png or fonts/brand.woff2.

```json
{"action":"attach_presentation_asset","label":"Adding presentation asset","data":{"presentation_id":"UUID","path":"assets/logo.png","media_asset_id":"UUID","role":"image"}}
```

## detach_presentation_asset
**Required keys:** `presentation_id`, `path`

**Types:** `presentation_id`: string, `path`: string

Relevant skill: read `skills/presentation-builder/SKILL.md`. Presentation work needs deck structure, HTML bundle rules, and slide quality guidance. Read before creating, editing, or reviewing presentation assets.

Removes one presentation asset mapping without deleting the underlying media asset.

```json
{"action":"detach_presentation_asset","label":"Removing presentation asset","data":{"presentation_id":"UUID","path":"assets/logo.png"}}
```

## patch_presentation
**Required keys:** `presentation_id`

**Optional keys:** `marker_id`, `patch_type`, `value`, `fallback_find`, `fallback_replace`

**Types:** `presentation_id`: string, `marker_id`: string, `patch_type`: string, `value`: string, `fallback_find`: string, `fallback_replace`: string

**Use when:** Patch one marked element in presentation TSX. Patch one exact text snippet via fallback_find and fallback_replace.

**Do not use when:** Renaming the presentation artifact; use update_presentation with name.

Relevant skill: read `skills/presentation-builder/SKILL.md`. Presentation work needs deck structure, HTML bundle rules, and slide quality guidance. Read before creating, editing, or reviewing presentation assets.

Legacy TSX patch action for older presentations that still store generated_html. For HTML-first presentations, use patch_presentation_file.

```json
{"action":"patch_presentation","label":"Tuning slide copy","data":{"presentation_id":"UUID","marker_id":"slide3.headline","patch_type":"text","value":"New Headline"}}
```

```json
{"action":"patch_presentation","label":"Fixing slide text","data":{"presentation_id":"UUID","fallback_find":"Old Text","fallback_replace":"New Text"}}
```

Contract example: patch marked headline text
```json
{"action":"patch_presentation","label":"patch marked headline text","data":{"presentation_id":"UUID","marker_id":"slide3.headline","patch_type":"text","value":"New headline"}}
```

Contract example: fallback find and replace
```json
{"action":"patch_presentation","label":"fallback find and replace","data":{"presentation_id":"UUID","fallback_find":"Old text","fallback_replace":"New text"}}
```

## update_presentation_slide
**Required keys:** `presentation_id`, `slide_index`, `generated_html`

**Types:** `presentation_id`: string, `slide_index`: number, `generated_html`: string

**Use when:** Replace one slide by zero-based slide_index without touching other slides.

Relevant skill: read `skills/presentation-builder/SKILL.md`. Presentation work needs deck structure, HTML bundle rules, and slide quality guidance. Read before creating, editing, or reviewing presentation assets.

Legacy TSX slide action. Replaces one slide (by 0-based index) in an older generated_html presentation without touching other slides. New HTML-bundle decks should use read_presentation_file plus patch_presentation_file or write_presentation_file.

```json
{"action":"update_presentation_slide","label":"Redesigning slide 3","data":{"presentation_id":"UUID","slide_index":2,"generated_html":"<section key=\"resources\">...</section>"}}
```

Contract example: replace slide 3
```json
{"action":"update_presentation_slide","label":"replace slide 3","data":{"presentation_id":"UUID","slide_index":2,"generated_html":"<section key=\"resources\">...</section>"}}
```

## add_presentation_slide
**Required keys:** `presentation_id`, `slide_index`, `generated_html`

**Types:** `presentation_id`: string, `slide_index`: number, `generated_html`: string

**Use when:** Insert one new slide at a zero-based index. Use total slide count to append.

Relevant skill: read `skills/presentation-builder/SKILL.md`. Presentation work needs deck structure, HTML bundle rules, and slide quality guidance. Read before creating, editing, or reviewing presentation assets.

Legacy TSX slide action. Inserts a new slide at the given 0-based index in an older generated_html presentation. New HTML-bundle decks should be created as one coherent bundle or edited with presentation file actions.

```json
{"action":"add_presentation_slide","label":"Adding a new slide","data":{"presentation_id":"UUID","slide_index":3,"generated_html":"<section key=\"new-slide\">...</section>"}}
```

Contract example: append a new slide
```json
{"action":"add_presentation_slide","label":"append a new slide","data":{"presentation_id":"UUID","slide_index":3,"generated_html":"<section key=\"new-slide\">...</section>"}}
```

## delete_presentation
**Required keys:** `presentation_id`

Requests deletion of a presentation. Returns a confirmation card the user must approve.

```json
{"action":"delete_presentation","label":"Removing your presentation","data":{"presentation_id":"UUID"}}
```
$vibey_api_presentations$,
  updated_at = now()
where agent_key = 'vibey'
  and skill_key = 'vibey-api'
  and file_path = 'references/presentations.md'
  and user_id is null
  and org_id is null;
