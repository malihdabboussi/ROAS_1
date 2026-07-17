---
name: roas-funnel-design
description: Renders the general wireframe for a ROAS funnel. Takes the section guide + mini brand guide + page copy from roas-funnel-build (or an equivalent brief) and turns it into clickable, branded, responsive HTML page wireframes, one self-contained file per page with CTAs wired to the next page, driven by a bundled engine (assets/render_funnel.py) so output stays consistent. Real copy in place, the client's brand (colors + fonts) applied, labeled placeholders for VSL thumbnails, images, and testimonial photos. Use whenever someone wants to SEE the funnel laid out, render/build/mock up the pages, or visualize the structure. Triggers on "design the funnel," "make the funnel wireframe," "render the funnel pages," "mock up the funnel," "turn this funnel copy into pages," or a funnel build handed over to be visualized. The companion to roas-funnel-build (that skill writes the funnel; this one renders it). Do NOT load to write the funnel copy/flow (roas-funnel-build) or to render Meta ad creatives (roas-ad-design).
---

# ROAS Funnel Design — render the wireframe

The companion to `roas-funnel-build`. That skill produces the copy, the section guide, and the mini brand guide. This skill turns it into **clickable HTML wireframes** — one self-contained `.html` per page, CTAs wired to the next page, plus an `index.html` to click through the whole funnel.

This is a wireframe, **fully committed** — not a half-finished funnel. It renders as **one continuous page** (not chopped into bordered boxes) so it reads like the real end layout, with annotations in the margin. Specifically:
- **One continuous page.** Sections flow into a single page surface; they are not separate cards. Section separation comes from whitespace and the natural dark/light bands, like a real landing page.
- **Annotation labels live in the left margin, off the page.** Each section is labeled (`HERO`, `DIFFERENTIATOR`, `SOCIAL PROOF`, `FOOTER`…) with a subtle monospace tag in the left gutter, plus a thin "Wireframe" rail at the top. The labels sit beside the page, not on it.
- **Real copy in place**, rendered verbatim.
- **Balanced layouts — no orphaned left-aligned text.** A left-aligned copy block is laid out as a real two-column section (copy one side, an image/mockup placeholder the other) so the spacing reads like the finished page. Short standalone blurbs center instead. Never ship a left-aligned block with an empty right half.
- **Crossed-box placeholders for every asset** — video, image, product mockup, headshot — each carrying a concrete **suggestion** of what goes there (e.g. "Founder on camera in the studio, under 90s"). Added throughout based on the content, not only where the copy mentions a video.
- **The brand is documented, not painted on.** The page stays neutral; the brand color appears only as a small restrained accent (the label dot, step numbers, check marks, the CTA edge). The full brand (swatches + fonts) is documented on the `index.html`. Applying the brand for real is the hi-fi design job.

**Drive the engine. Don't hand-write HTML.** The renderer is `assets/render_funnel.py` (stdlib only). Build a JSON spec and run it — that keeps every page consistent.

---

## INPUTS

1. **The funnel** — ideally the `roas-funnel-build` output (flow + per-page section guide + page copy). If only a brief exists, run `roas-funnel-build` first, or map the brief to sections via `references/component-library.md`.
2. **The brand** — accent color (hex), primary/secondary (for the documented reference), heading + body fonts, logo wordmark. From the build skill's mini brand guide, or pulled from the client's site (`web_fetch`; see `roas-funnel-build/references/design-handoff.md`). If unknown, the engine's neutral defaults apply — note them as defaults. Never present a guessed hex as the client's.
3. **Asset suggestions** — for every placeholder, a one-line suggestion of the real asset (the photo/mockup/video to shoot or make). You write these from the content; see Step 2.

---

## THE WORKFLOW

### Step 1 — Read the engine's spec format
Read `references/component-library.md` (every section type + its fields) and `references/design-system.md` (the wireframe house style, the placeholder/suggestion rules, how the brand is documented). This is how you translate a section guide into the JSON spec.

### Step 2 — Map the funnel to a JSON spec, and place asset suggestions throughout
For each page, turn its section guide + copy into an ordered list of section objects (mapping table in `component-library.md`). Three things this skill does on top of a straight translation:
- **Copy is verbatim.** Drop the build skill's copy into each section's fields unchanged. The engine renders, it doesn't rewrite.
- **Add asset placeholders with suggestions wherever the content implies one** — not just explicit videos. A hero usually wants a video or mockup; an offer wants a product `mockup`; social proof wants headshot `photo` suggestions; a "see the room" / "meet the team" beat wants an `image`. For each, write a concrete `suggestion` describing the real asset (subject, mood, setting), drawn from the funnel's content. The wireframe doubles as the client's shot/asset list.
- **Lay out copy blocks so they're balanced, never orphaned.** A `text` block that would be left-aligned (a differentiator, a "why us", a story beat with a CTA) gets a `media` + `media_side` so it renders as a real two-column section (copy + image/mockup). A short standalone blurb (e.g. "who it's not for") stays a centered `text` block. Don't leave a left-aligned block with an empty right side — that's the layout problem this fixes.

Set each page's `slug`; the engine wires CTAs to the next page in order (override with `next` or a section `href`). Set the `brand` block from the mini brand guide.

### Step 3 — Render (environment-aware)
The skill's real product is the SPEC — the ordered sections, the verbatim copy, the asset suggestions, the brand block. The renderer follows the environment:

**Vibey / any platform with a native funnel builder:**
- If the native builder can express wireframe intent (labeled placeholders, annotation, an unfinished-on-purpose look) → translate the spec into the platform's funnel artifact directly and build there. No HTML files.
- If the native builder only renders finished-looking pages → run the HTML engine below as the REVIEW artifact for the gate (wireframe honesty matters at review), and hand the approved spec + asset suggestions to the native builder for the hi-fi build after approval. The spec is the contract between the two.
- Either way, the deliverable registered in the platform is a funnel artifact, not a folder of files.

**claude.ai / no native funnel builder (fallback):** drive the bundled engine as always:
```bash
python assets/render_funnel.py spec.json --outdir /mnt/user-data/outputs/<client>-funnel
```
Writes one `.html` per page + `index.html`. Regenerate the reference funnel with `python assets/render_funnel.py --demo`.

### Step 4 — Visually check (if a renderer is available)
If `wkhtmltoimage` or a headless browser is present, rasterize a page and look at it: confirm the annotation tags read, the placeholders carry suggestions, nothing overflows, the logo centers when the header is bare. Fix the spec and re-run if needed. (Brand fonts load at view time; a sandbox screenshot may fall back to system fonts — that's fine, you're checking structure.)

### Step 5 — Present
Present `index.html` first (the click-through + brand reference), then the page files. One line on what it is: the funnel wireframe, copy in place, asset suggestions noted, ready for hi-fi design or a GHL build. List the real assets the client still owes (the suggestions). Don't over-explain.

---

## OUTPUT

A folder in `/mnt/user-data/outputs/`:
- `index.html` — funnel click-through + the documented brand reference (swatches + fonts).
- one `<slug>.html` per page — self-contained, responsive, annotated wireframe, CTAs wired to the next page.

---

## HARD RULES

- **It's a wireframe — commit to it.** One continuous page, margin annotations, crossed-box placeholders. Don't drift back toward a branded funnel mockup, and don't chop the page into separate bordered cards.
- **Balanced layouts.** Left-aligned copy blocks become two-column (copy + media); short blurbs center. No orphaned left-aligned text with an empty right half.
- **Drive a renderer, don't hand-build HTML.** In claude.ai that's the bundled engine (only edit it to add a genuinely new, recurring section type); in a platform with a native funnel builder, that's the platform's builder fed by the spec. Never hand-write page HTML in either.
- **Copy is verbatim.** Render the build skill's copy unchanged. Copy edits go back to `roas-funnel-build`.
- **Every asset gets a placeholder + a suggestion.** Video, image, mockup, headshot — each a crossed box with a concrete one-line suggestion drawn from the content. This is a feature, not filler.
- **Brand is documented, not painted on.** Accent-only on the pages; full brand on the index. Flag defaults as defaults. No client logo files — the wordmark is text.
- **Logo centers when the header is bare.** A lone logo with nothing else in the bar is centered, not left-stranded (the engine handles this; don't add a fake nav to justify left alignment).
- **Every page renders, linked, with an index.** Real proof only in the copy; suggestions stay labeled.

---

## COMMON PITFALLS

- **Sitting between a wireframe and a funnel.** The original failure. Stay fully wireframe — continuous page, margin labels, suggestions.
- **Chopping the page into bordered cards.** It's one continuous page; labels live in the margin, off the page.
- **Orphaned left-aligned copy.** A left block with a blank right half isn't a layout. Pair it with a media placeholder (two-column) or center it.
- **Painting the brand onto the pages.** Brand goes in the index reference + the small accent. Don't recolor the page to look "finished."
- **Bare placeholders with no suggestion.** "[image]" is useless. Say what to shoot: subject, mood, setting.
- **Too few placeholders.** Add them wherever the content implies an asset (hero, proof, offer, team, room), not only on explicit video blocks.
- **Hand-writing HTML or rewriting copy while "designing."** Drive the engine; render copy as written.
- **Left-aligned lone logo / forgetting to wire CTAs.** Center the bare logo; set slugs so pages link; ship the index.
