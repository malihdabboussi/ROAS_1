-- Seed the fixed-stage presentation-builder skill and references.
-- Upgrade presentation-builder from loose responsive HTML guidance to a fixed-stage
-- 16:9 deck contract. This targets the agent behavior causing thumbnail/preview
-- layout drift: viewport-sized slides, responsive card grids, and centered box soup.

insert into public.skill_library (
  skill_key,
  name,
  description,
  markdown_content,
  category,
  updated_at
)
values (
  'presentation-builder',
  'Presentation Builder',
  'Build premium fixed-stage, theme-native HTML presentation decks as runnable file bundles - brand style guides, pitch decks, strategy decks, reports, lead magnets, case studies, onboarding decks, workbooks, ebooks, or any slide-based visual document. Use when the user wants slides, decks, guides, visual reports, brand books, downloadable presentations, or multi-page branded assets that should render consistently as 16:9 slides.',
  $presentation_skill$# Presentation Builder

Build premium 16:9 presentations as HTML-first file bundles. The preview, thumbnail, PDF export, and PPTX export all render the same source, so deck source must behave like a slide system, not like a responsive webpage.

Use this for designed slide-based assets: pitch decks, strategy decks, visual reports, brand guides, lead magnets, case studies, onboarding decks, checklists, ebooks, and workbooks. Use `create_pdf` for text-heavy documents and `create_funnel` for scrolling web pages.

## Core Rule

A deck is not a webpage. Author every slide on a fixed `1280x720` logical stage. The app may scale that stage, but slide content must not reflow because the iframe, thumbnail, or export surface has a different viewport width.

This prevents the common failure where a thumbnail shows three cards horizontally but the main slide collapses them vertically.

## Workflow

1. Gather context from the campaign, offer, avatar, source material, and active Theme.
2. Read `references/deck-runtime-contract.md` and `references/theme-native-html.md` before creating or fully restyling a deck.
3. Read `references/deck-anti-patterns.md` before writing slide source.
4. Choose a composition pattern per slide from `references/deck-composition-patterns.md`.
5. For brand guides, also read `references/brand-guide-structure.md`.
6. When adapting funnel or marketing-page ideas, read `references/funnel-pattern-adapter.md`.
7. Build a complete HTML bundle with `index.html` as the entry file and `styles.css` for deck styling.
8. Run the checks in `references/deck-self-review.md`.
9. Save with `create_presentation` or edit existing bundles with file-level actions.

## Runtime Contract

Use `source_mode: "html_bundle"` and `entry_file: "index.html"`.

Every new deck needs:

- `index.html` with `<!doctype html>`.
- A `<main class="deck">` wrapper.
- One top-level `<section class="slide">` per slide.
- Each slide exactly `1280px` wide and `720px` high.
- No `min-height: 100vh`, viewport-sized slide containers, `auto-fit`, or responsive breakpoints that change slide composition.
- Bundle-relative references such as `styles.css`, `deck.js`, `assets/logo.png`, or `fonts/brand.woff2`.
- Real content from the user's context. Do not use placeholder copy.
- Stable source for comments and direct edits. Add `data-comment-anchor` to important headlines, cards, CTAs, metrics, and diagrams.

## Theme Rules

New decks are theme-native. The campaign Theme is the base design system: colors, typography, radii, shadows, spacing, button shape, and brand voice.

When a Theme exists:

- Use CSS variables such as `--color-primary`, `--color-heading`, `--font-heading`, `--design-block-radius`, and `--design-button-shadow`.
- Put fallback values only in variable declarations, not throughout slide content.
- Mark the document with `data-vibey-theme-native="true"` on `<html>`.
- Keep layout classes semantic: `.slide`, `.safe`, `.headline`, `.eyebrow`, `.metric`, `.proof`, `.timeline`, `.comparison`.

When the Theme is color-only, use the available colors and add sensible default tokens for fonts, radii, shadows, spacing, and typography. Do not invent fake brand assets or pretend the Theme has custom fonts.

Manual edits still win. If the user changes a specific element later, preserve that explicit override.

## Save A New Presentation

```json
{
  "action": "create_presentation",
  "label": "Building your presentation",
  "data": {
    "name": "Strategy Deck",
    "source_mode": "html_bundle",
    "entry_file": "index.html",
    "files": [
      {
        "path": "index.html",
        "role": "entry",
        "content": "<!doctype html><html lang=\"en\" data-vibey-theme-native=\"true\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=1280, initial-scale=1\"><title>Strategy Deck</title><link rel=\"stylesheet\" href=\"styles.css\"></head><body><main class=\"deck\"><section class=\"slide slide-cover\" data-comment-anchor=\"slide-cover\"><div class=\"safe\"><p class=\"eyebrow\" data-comment-anchor=\"cover-eyebrow\">Strategy</p><h1 class=\"headline\" data-comment-anchor=\"cover-headline\">Build the authority pillar first.</h1></div></section></main></body></html>"
      },
      {
        "path": "styles.css",
        "role": "style",
        "content": ":root { --color-primary: #10b981; --color-heading: #161616; --color-body: #5c5c5c; --color-slide-background: #fafafa; --font-heading: Inter, system-ui, sans-serif; --font-body: Inter, system-ui, sans-serif; --design-block-radius: 16px; } * { box-sizing: border-box; } html, body { margin: 0; width: 1280px; background: var(--color-slide-background); color: var(--color-body); font-family: var(--font-body); } .deck { width: 1280px; margin: 0; } .slide { position: relative; width: 1280px; height: 720px; overflow: hidden; background: var(--color-slide-background); } .safe { position: relative; width: 1040px; height: 560px; margin: 80px auto; } .headline { margin: 0; max-width: 820px; color: var(--color-heading); font-family: var(--font-heading); font-size: 68px; line-height: .95; } .eyebrow { margin: 0 0 24px; color: var(--color-primary); font-size: 13px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }"
      }
    ]
  }
}
```

## Edit Existing Presentations

For an existing HTML presentation, inspect the bundle first:

- `list_presentation_files` to see source files.
- `read_presentation_file` or `show_presentation_file` before editing.
- `patch_presentation_file` for exact one-place edits.
- `write_presentation_file` to replace or add one file.
- `update_presentation` with `files` only when replacing the full bundle.
- `attach_presentation_asset` to map an uploaded image/font into the bundle path.

Use legacy `patch_presentation`, `add_presentation_slide`, or `update_presentation_slide` only for older presentations that still store TSX/HTML in `generated_html`. New decks should be file bundles.

## Quality Bar

Slides are visual arguments, not document pages:

- One idea per slide.
- One chosen composition pattern per slide.
- Consistent fixed stage, safe area, baseline, and footer/page-number rhythm.
- Specific, source-grounded copy.
- Visual variety across the deck: not the same title/cards/bullets shape every time.
- Theme tokens for identity.
- No generic box soup, random pastel blobs, or centered narrow columns unless the slide type calls for it.
- Most decks stay under 22 slides unless the user asks for a long-form guide.

Do not mention internal file paths or source mechanics to the user. Tell them what was created and where they can review it.$presentation_skill$,
  'marketing',
  now()
)
on conflict (skill_key) do update set
  name = excluded.name,
  description = excluded.description,
  markdown_content = excluded.markdown_content,
  category = excluded.category,
  updated_at = now();

insert into public.skill_library_resources (
  skill_key,
  file_path,
  content,
  content_type
)
values
(
  'presentation-builder',
  'references/deck-runtime-contract.md',
  $deck_runtime$# Deck Runtime Contract

Use this reference before creating or fully restyling a presentation.

## Why This Exists

Vibey renders a deck in multiple surfaces: large preview, thumbnail strip, PDF export, and PPTX export. If slide CSS depends on viewport width, those surfaces can show different layouts. A presentation must be authored on one fixed logical stage and scaled by the host.

## Required Stage

Author every slide at `1280x720`.

```css
* { box-sizing: border-box; }
html, body { margin: 0; width: 1280px; background: var(--color-slide-background); color: var(--color-body); font-family: var(--font-body); }
.deck { width: 1280px; margin: 0; }
.slide { position: relative; width: 1280px; height: 720px; overflow: hidden; background: var(--color-slide-background); }
.safe { position: relative; width: 1040px; height: 560px; margin: 80px auto; }
```

The `.safe` area is the default content frame. Break it intentionally for full-bleed images, section dividers, or large diagrams, but keep the slide stage fixed.

## Rules

- Use one top-level `<section class="slide">` per slide.
- Give every slide the same `1280px` width and `720px` height.
- Keep slide content inside `.safe` unless the design intentionally goes full bleed.
- Use fixed slide grids: `grid-template-columns: 360px 1fr`, `repeat(3, 1fr)`, or named tracks.
- Use fixed type sizes for slide typography. Do not scale core type with viewport width.
- Use `data-comment-anchor` on important editable elements.
- Reference assets by bundle paths: `assets/logo.png`, `assets/photo.jpg`, `fonts/brand.woff2`.

## Avoid

```css
.slide { min-height: 100vh; }
.deck { width: 100vw; }
.cards { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
.headline { font-size: clamp(32px, 7vw, 88px); }
```

These are webpage patterns. They make thumbnails, preview, PDF, and PPTX disagree.

## Export Safety

Keep each slide self-contained. Avoid nested scrolling regions, sticky positioning, video-only content, or content that only appears after user interaction. If a slide needs motion, make the static first frame strong enough for export.$deck_runtime$,
  'text/markdown'
),
(
  'presentation-builder',
  'references/deck-anti-patterns.md',
  $deck_antipatterns$# Deck Anti-Patterns

Read this before writing slide source. These are the patterns that make AI decks look cheap.

## Box Soup

Symptom: every slide becomes a title plus many rounded cards.

Why it fails: cards compete equally, hierarchy disappears, and the deck looks like a dashboard template.

Fix: choose one visual argument per slide. Use cards only when comparison, grouping, or scanning is the point.

## Centered Narrow Column

Symptom: content sits in the middle with huge empty margins, even on strategy or report slides.

Why it fails: a 16:9 stage has horizontal storytelling space. Centering everything wastes the canvas.

Fix: use left-anchored thesis layouts, side-by-side evidence, full-bleed image/text contrast, timelines, or diagram compositions.

## Responsive Webpage Layout

Symptom: thumbnail shows three cards horizontally, but main preview stacks them vertically.

Why it fails: `auto-fit`, `minmax`, `vw`, `vh`, and breakpoints respond to iframe size instead of slide size.

Fix: use the fixed `1280x720` stage contract and explicit grids.

## Same Slide Repeated

Symptom: every slide is eyebrow, headline, three cards.

Why it fails: the deck has no pacing. It feels generated even when the content is correct.

Fix: alternate slide roles: thesis, proof, process, comparison, metric spread, quote, roadmap, close.

## Decorative Blobs

Symptom: random translucent circles, pastel blobs, gradients, or abstract shapes appear without carrying meaning.

Why it fails: decoration reads as filler and often creates awkward gaps.

Fix: visual elements should show structure: timeline rail, proof stack, product image, metric field, map, grid, or branded motif.$deck_antipatterns$,
  'text/markdown'
),
(
  'presentation-builder',
  'references/deck-composition-patterns.md',
  $deck_patterns$# Deck Composition Patterns

Choose a pattern before writing each slide. Do not default to cards.

| Pattern | Use When | Layout | Avoid |
| --- | --- | --- | --- |
| Cover | Opening a deck or section | Large title, small context line, one strong visual or brand motif | Generic centered title with empty space |
| Thesis | Making the core argument | Left-anchored headline, short support, proof cue on right | Multiple equal claims |
| Section Divider | Changing topic | Full-bleed color or image, huge section label, page marker | Tiny eyebrow-only transitions |
| Evidence Stack | Showing proof behind a claim | Main claim plus 3-5 evidence rows or citations | Equal cards with no conclusion |
| Metric Spread | Reporting performance | One dominant KPI, supporting trend/benchmarks, interpretation | Six identical KPI boxes |
| Comparison | Showing before/after or option A/B | Two or three fixed columns with clear winner/contrast | Dense tables with tiny text |
| Process Ladder | Explaining steps | Vertical or diagonal sequence with numbered stages | Stacked cards that look like a webpage |
| Timeline | Showing chronology | Horizontal rail, milestones, date labels | Bullets pretending to be a timeline |
| Map / System | Showing relationships | Nodes, arrows, clusters, flow labels | Unlabeled abstract shapes |
| Persona / Audience | Describing a segment | Name/role, emotional driver, need, conversion path | Generic demographics only |
| Quote / Insight | Letting one sentence land | Oversized quote or insight, attribution, minimal support | Long testimonial paragraph |
| Roadmap | Showing future work | Now/next/later or week/month bands | Unprioritized action list |
| Checklist / Workbook | Giving an action tool | Numbered checkpoints with input space | Dense text guide |
| Close / CTA | Ending with action | Decision, next step, owner/timeline, contact | Thank-you slide with no action |

## Pattern Rules

- One pattern per slide.
- Match the pattern to the slide's job, not to the data format.
- Vary rhythm across adjacent slides.
- Use fixed grids inside the `1280x720` stage.
- If one slide needs more than 90-120 words, split it.$deck_patterns$,
  'text/markdown'
),
(
  'presentation-builder',
  'references/funnel-pattern-adapter.md',
  $funnel_adapter$# Funnel Pattern Adapter

Use this when adapting funnel-builder ideas, campaign strategy, landing page sections, or conversion assets into a presentation.

## Principle

Funnels scroll. Decks sequence.

Borrow funnel-builder thinking for hierarchy, offer clarity, proof, CTA, avatar language, and visual polish. Do not copy funnel mechanics such as full-page sections, viewport-height layouts, responsive stacking, sticky nav, or long landing-page rhythm.

## Translation Map

| Funnel Idea | Deck Translation |
| --- | --- |
| Hero section | Cover or thesis slide |
| Problem section | Audience pain or stakes slide |
| Benefits grid | Comparison or evidence stack |
| Testimonials | Quote / proof slide |
| Stats strip | Metric spread |
| How it works | Process ladder |
| Pricing block | Comparison or decision slide |
| FAQ | Objection handling slide or appendix |
| CTA section | Closing action slide |

## What Not To Copy

- `min-height: 100vh`
- `auto-fit` and `minmax` responsive grids
- nav/footer chrome
- repeated landing-page cards
- long body copy blocks
- sticky/floating page controls$funnel_adapter$,
  'text/markdown'
),
(
  'presentation-builder',
  'references/deck-examples-index.md',
  $examples_index$# Deck Examples Index

Use these as mental models before writing source. They are not templates to copy blindly.

## Strategy Deck

Pattern map: Cover, Thesis, Evidence Stack, Audience Strategy, Comparison, Process Ladder, Roadmap, Close.

Design signature: strong left margin, wide text blocks, one meaningful accent rail, sparse proof rows.

## Performance Report Deck

Pattern map: Cover with date range, Executive Thesis, Metric Spread, Channel Comparison, Daily Trend Timeline, Alerts / Risks, Recommendations, Next Steps.

Design signature: one dominant metric per slide, clear deltas, concise interpretation sentence.

## Brand Guide

Pattern map: Cover, Contents, Positioning Divider, Voice, Design Overview, Logo System, Color System, Typography, Imagery, Application Examples, Close.

Design signature: divider slides, large swatches, specimen type, realistic usage examples.

## Lead Magnet / Workbook

Pattern map: Outcome Cover, Why It Matters, Framework, Step 1, Step 2, Step 3, Checklist, CTA.

Design signature: readable worksheet spacing, clear numbered steps, practical prompts.

## Case Study

Pattern map: Result Cover, Before State, Constraints, Solution Map, Implementation Timeline, Results, Transferable Lessons, CTA.

Design signature: before/after contrast, big result number, proof hierarchy.$examples_index$,
  'text/markdown'
),
(
  'presentation-builder',
  'references/deck-self-review.md',
  $self_review$# Deck Self-Review

Run this before calling `create_presentation` or replacing a full bundle.

## Source Contract

- `index.html` is a complete document with `<!doctype html>`.
- `<html>` has `data-vibey-theme-native="true"`.
- The deck uses `<main class="deck">`.
- Every slide is a top-level `<section class="slide ...">`.
- Every slide is `width: 1280px` and `height: 720px`.
- `.safe` or an intentional full-bleed layout controls content bounds.
- Important editable elements have `data-comment-anchor`.

## Reflow Risk

Search the CSS mentally or directly for these patterns and remove them from slide composition:

- `min-height: 100vh`
- `width: 100vw`
- `height: 100vh`
- `repeat(auto-fit`
- `repeat(auto-fill`
- `minmax(`
- viewport-sized headline rules like `font-size: clamp(... vw ...)`
- breakpoints that change columns, order, or stacking inside `.slide`

## Design Quality

- Each slide has one job.
- Each slide uses a chosen composition pattern.
- Adjacent slides do not repeat the same title/cards/bullets layout.
- The main claim is visually obvious within two seconds.
- There is enough whitespace, but not a narrow centered island on every slide.
- The deck uses real context, not placeholders.
- Metrics have interpretation, not just labels.
- Visual elements carry meaning.$self_review$,
  'text/markdown'
),
(
  'presentation-builder',
  'references/theme-native-html.md',
  $theme_native$# Theme-Native HTML Reference

Use this reference when creating or fully restyling an HTML-first presentation.

## Goal

A theme-native deck changes coherently when the campaign Theme changes. The HTML structure stays stable, while colors, typography, spacing, shadows, radii, and buttons flow from CSS variables.

Theme-native does not mean responsive-webpage. Combine these token rules with `references/deck-runtime-contract.md`: every slide still lives on the fixed `1280x720` stage.

## Required Document Marker

Add this marker so the Studio preview knows the deck is already token-native and does not need legacy repaint heuristics:

```html
<html data-vibey-theme-native="true">
```

## File Shape

Use at least two files:

- `index.html` for semantic slide markup.
- `styles.css` for Theme variables, semantic classes, and layout.

Keep slide content readable in source. Future comments and direct edits rely on stable source snippets.

## CSS Variable Contract

Declare fallback values once near the top of `styles.css`. When `get_theme` provides real Theme values, map them into these variables.

```css
:root {
  --color-primary: #10b981;
  --color-heading: #161616;
  --color-body: #5c5c5c;
  --color-page-background: #fafafa;
  --color-slide-background: #fafafa;
  --color-card-background: #ffffff;
  --color-border: #e5e5e5;
  --font-heading: Inter, system-ui, sans-serif;
  --font-body: Inter, system-ui, sans-serif;
  --design-block-radius: 16px;
  --design-block-shadow: none;
  --spacing-section: 80px;
  --spacing-card: 24px;
  --spacing-grid: 24px;
  --font-size-base: 18px;
}
```

Do not repeat HEX colors throughout the deck. Use variables in semantic classes.

## What To Avoid

- Hardcoding brand HEX values in every slide.
- Inline styles for theme-owned properties.
- Random class names like `.blue-box` or `.purple-gradient` that do not describe purpose.
- Removing anchors or reshuffling source structure during minor edits.
- Dense slides that read like a document page.
- Viewport-driven slide layout such as `min-height: 100vh`, `width: 100vw`, `auto-fit`, or `font-size` based on `vw`.$theme_native$,
  'text/markdown'
),
(
  'presentation-builder',
  'references/brand-guide-structure.md',
  $brand_guide$# Brand Guide Structure Reference

Section patterns and slide counts for common presentation types. Use this as a structural blueprint - adapt the sections to the specific brand.

## Brand Style Guide (15-22 slides)

| # | Section | Slides | What It Contains |
|---|---------|--------|------------------|
| 1 | Cover | 1 | Brand name, "Brand Style Guide", version, date |
| 2 | Index / TOC | 1 | Section list with page numbers, brief intro paragraph |
| 3 | Positioning | 2-3 | Divider plus brand essence, key concepts, tagline, mission statement |
| 4 | Tone of Voice | 1-2 | Divider plus voice attributes with descriptions |
| 5 | Design Overview | 1 | Visual elements overview: logo, color, type, icon shown together |
| 6 | Logo | 3-4 | Primary logo plus variations, symbol/icon usage, minimum clearspace rules, misuse examples |
| 7 | Colors | 1-2 | Core palette with swatches showing color name, HEX, RGB, CMYK, and usage note |
| 8 | Typography | 1-2 | Primary typeface specimen, weight scale, usage hierarchy |
| 9 | Illustration | 1-2 | Illustration style direction and example compositions |
| 10 | Photography | 1-2 | Photography direction, mood/style, quality standards |
| 11 | Closing | 1 | Contact info for brand questions, version/date footer |

## Pitch Deck (8-12 slides)

Cover, Problem, Solution, How It Works, Traction, Market, Business Model, Team, Ask, Contact.

## Lead Magnet / Quick Guide (5-8 slides)

Cover, Problem/Why, 3-5 Content slides, Summary, CTA.

## Case Study (5-10 slides)

Cover, Challenge, Solution, Results, CTA.

## Onboarding Deck (6-10 slides)

Welcome, Process Overview, What We Need, What You Get, Team, Next Steps.

## Theme-Native Implementation

When turning this structure into source files, read `references/deck-runtime-contract.md` and `references/theme-native-html.md`. Build every brand-guide slide on the fixed `1280x720` stage with Theme tokens instead of hardcoded brand colors, fonts, radii, or shadows.$brand_guide$,
  'text/markdown'
)
on conflict (skill_key, file_path) do update set
  content = excluded.content,
  content_type = excluded.content_type;

insert into public.template_skill_assignments (template_key, skill_key, is_enabled)
values
  ('designer', 'presentation-builder', true),
  ('brand_manager', 'presentation-builder', true),
  ('copywriter', 'presentation-builder', true),
  ('analyst', 'presentation-builder', true)
on conflict (template_key, skill_key) do update set
  is_enabled = excluded.is_enabled;

insert into public.agent_skills (
  user_id,
  org_id,
  agent_key,
  skill_key,
  name,
  description,
  markdown_content,
  is_enabled,
  source,
  archetype_filter
)
select
  null,
  null,
  'vibey',
  skill_key,
  name,
  description,
  markdown_content,
  true,
  'system',
  null
from public.skill_library
where skill_key = 'presentation-builder'
on conflict (agent_key, skill_key) where user_id is null and org_id is null do update set
  name = excluded.name,
  description = excluded.description,
  markdown_content = excluded.markdown_content,
  is_enabled = true,
  source = 'system',
  updated_at = now();

insert into public.agent_skill_resources (
  user_id,
  org_id,
  agent_key,
  skill_key,
  file_path,
  content,
  content_type,
  storage_url
)
select
  null,
  null,
  'vibey',
  skill_key,
  file_path,
  content,
  coalesce(content_type, 'text/markdown'),
  storage_url
from public.skill_library_resources
where skill_key = 'presentation-builder'
on conflict (agent_key, skill_key, file_path) where user_id is null and org_id is null do update set
  content = excluded.content,
  content_type = excluded.content_type,
  storage_url = excluded.storage_url,
  updated_at = now();

update public.agent_skills
set markdown_content = regexp_replace(
      markdown_content,
      '- `presentation` .*add_presentation_slide.*',
      '- `presentation` -> read `references/presentation-template.md`, then call `create_presentation` once with a complete HTML bundle.',
      'g'
    ),
    updated_at = now()
where skill_key = 'campaign-performance-reporting'
  and user_id is null
  and org_id is null;

insert into public.agent_skill_resources (
  user_id,
  org_id,
  agent_key,
  skill_key,
  file_path,
  content,
  content_type
)
select
  null,
  null,
  s.agent_key,
  'campaign-performance-reporting',
  'references/presentation-template.md',
  $atlas_presentation_template$# Presentation Report Template

Use this when the user picked `presentation`. Target: 8-12 fixed-stage slides.

If `presentation-builder` is available, read it before writing source. Build one `html_bundle` deck with `index.html` and `styles.css`. Do not create a title-only presentation and then add slides with `title`/`content`; that legacy path produces low-quality, inconsistent decks.

## Slide Plan

| # | Slide | Pattern | Content |
|---|---|---|---|
| 1 | Title | Cover | Campaign name, date range, "Performance Report" |
| 2 | Executive Summary | Thesis | Top signal, top risk, top opportunity |
| 3 | KPIs at a Glance | Metric Spread | Leads, conversion, email open, engagement, reach, revenue if any |
| 4 | Funnel Performance | Process / Metric | Visitors to leads, conversion rate, trend direction |
| 5 | Email Performance | Metric Spread | Sent, open rate, click rate, top-performing send |
| 6 | Ads Performance | Comparison | Spend, CTR, CPM, ROAS, top ad campaign |
| 7 | Social Performance | Comparison | Per-platform reach and engagement, top post |
| 8 | Revenue | Metric Spread | Gross, refunds, net, refund rate; skip if not connected |
| 9 | Unified Trend | Timeline | Daily visitors, leads, email opens, social reach |
| 10 | Alerts | Evidence Stack | One alert per row; if none, state "No alerts - all healthy." |
| 11 | Recommendations | Roadmap | 3-5 action items tied to evidence |
| 12 | Next Steps | Close / CTA | What to do this week and who owns it if known |

## Per-Slide Rules

- Use one idea and one composition pattern per slide.
- Headlines state the takeaway, not the metric name. Not "Email Performance" but "Email open rate jumped 4 points - headline testing is working."
- Numbers first. If a bullet starts with "The user..." or "Our...", rewrite with the number up front.
- Skip any slide whose underlying section has zero data, but say so on slide 3 ("No ads this period").
- Keep the deck fixed-stage: each slide is `1280px` by `720px`; no `min-height: 100vh`, responsive card grids, or viewport-based type.

## Output Action

Create one presentation with a complete file bundle:

```json
{"action":"create_presentation","label":"Creating the performance deck","data":{"name":"<Campaign> - Performance Report","source_mode":"html_bundle","entry_file":"index.html","files":[{"path":"index.html","role":"entry","content":"<!doctype html><html data-vibey-theme-native=\"true\">...</html>"},{"path":"styles.css","role":"style","content":":root { ... } .deck { width: 1280px; } .slide { width: 1280px; height: 720px; overflow: hidden; }"}]}}
```$atlas_presentation_template$,
  'text/markdown'
from public.agent_skills s
where s.skill_key = 'campaign-performance-reporting'
  and s.user_id is null
  and s.org_id is null
on conflict (agent_key, skill_key, file_path) where user_id is null and org_id is null do update set
  content = excluded.content,
  content_type = excluded.content_type,
  updated_at = now();

-- Patch the generated vibey-api skill copy so live agents stop seeing the bad
-- presentation sizing examples before the next code-generated sync.
update public.agent_skills
set markdown_content = replace(
      replace(
        markdown_content,
        '**Presentations are HTML bundles**: New presentations use `source_mode: "html_bundle"` with `index.html` as the entry file. Use `files` on `create_presentation` for a full bundle, and use `read_presentation_file`, `write_presentation_file`, or `patch_presentation_file` for targeted edits. Use `attach_presentation_asset` for uploaded images/fonts referenced by bundle-relative paths.',
        '**Presentations are fixed-stage HTML bundles**: New presentations use `source_mode: "html_bundle"` with `index.html` as the entry file. Use `files` on `create_presentation` for a full bundle, and use `read_presentation_file`, `write_presentation_file`, or `patch_presentation_file` for targeted edits. Author every slide on a fixed `1280x720` stage so thumbnails, preview, PDF, and PPTX agree. Use `attach_presentation_asset` for uploaded images/fonts referenced by bundle-relative paths.'
      ),
      '**Theme-native presentation source**: For new decks, read `skills/presentation-builder/SKILL.md` and its theme-native reference. Generate semantic HTML plus `styles.css` that uses Theme tokens (`var(--color-*)`, `var(--font-*)`, `var(--design-*)`, spacing, typography) instead of hardcoded brand colors, fonts, radii, or shadows. Mark the document with `data-vibey-theme-native="true"`. Use `get_theme` when you need explicit Theme fields for design decisions.',
      '**Theme-native presentation source**: For new decks, read `skills/presentation-builder/SKILL.md` and its fixed-stage/theme-native references. Generate semantic HTML plus `styles.css` that uses Theme tokens (`var(--color-*)`, `var(--font-*)`, `var(--design-*)`, spacing, typography) instead of hardcoded brand colors, fonts, radii, or shadows. Mark the document with `data-vibey-theme-native="true"`. Do not use `min-height: 100vh`, `auto-fit` slide grids, or viewport-scaled type for slide composition.'
    ),
    updated_at = now()
where skill_key = 'vibey-api'
  and agent_key = 'vibey'
  and user_id is null
  and org_id is null;

update public.agent_skill_resources
set content = replace(
      replace(
        replace(
          content,
          'Creates a theme-native presentation as an HTML-first file bundle. Pass files with index.html as the entry file.',
          'Creates a fixed-stage, theme-native presentation as an HTML-first file bundle. Pass files with index.html as the entry file.'
        ),
        '.slide { min-height: 100vh; background: var(--color-slide-background, #fafafa); }',
        '.deck { width: 1280px; margin: 0; } .slide { position: relative; width: 1280px; height: 720px; overflow: hidden; background: var(--color-slide-background, #fafafa); } .safe { width: 1040px; height: 560px; margin: 80px auto; }'
      ),
      'section { min-height: 100vh; }',
      '.slide { width: 1280px; height: 720px; overflow: hidden; }'
    ),
    updated_at = now()
where skill_key = 'vibey-api'
  and agent_key = 'vibey'
  and file_path = 'references/presentations.md'
  and user_id is null
  and org_id is null;
