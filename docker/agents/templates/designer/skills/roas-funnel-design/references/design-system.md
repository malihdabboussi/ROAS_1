# Design System — the wireframe house style

The engine renders one thing well: a clean, committed **wireframe**. Not a branded funnel, not a hi-fi mockup. You don't style pages by hand; you pass a brand block and content, and the engine applies a consistent structural look across every page. This file covers the house style, the brand rule, and the placeholder/suggestion rule.

---

## The look — committed wireframe
- **One continuous page** on a grey canvas — sections flow into a single page surface, not separate bordered cards. Separation comes from whitespace and the natural light/dark bands, like a real long landing page.
- **Annotation labels in the left margin, off the page.** Each section gets a subtle monospace tag in the left gutter (`HERO`, `DIFFERENTIATOR`, `SOCIAL PROOF`, `FOOTER`…) with a small accent dot; a thin **"Wireframe" rail** sits at the top. Labels sit beside the page, not on it.
- **Balanced layouts.** Left-aligned copy blocks render as two columns (copy + an asset placeholder) so the page reads like the real end layout; short blurbs center. No orphaned left-aligned text.
- **Neutral and structural.** Ink text, grey lines and placeholder fills, white page. The type uses the brand fonts (greyscale, so the type personality shows) but the layout stays neutral.
- **Crossed-box placeholders** (the universal "asset goes here" ✕) for every image, mockup, video, and headshot, each with a suggestion caption.
- **Flat, structural CTAs** — a solid ink button with a thin accent edge, no gradient or glow.

This deliberate plainness, plus the margin annotations, keeps it unmistakably a wireframe a designer/dev builds from. Applying the real brand and art direction is a later, separate hi-fi step.

---

## The brand rule — documented, not painted on
The client's brand is **documented** for handoff, **not** applied to make the page look finished:
- On the pages, the brand color appears **only as a small restrained accent**: the annotation-tag dot, step-number rings, check marks, the CTA's accent edge, the play glyph. Everything else is greyscale.
- On the `index.html`, the full brand is shown as a **reference panel** — color swatches with hex (accent / primary / secondary) and the heading + body font names — labeled as documented, to be applied in hi-fi design.

Brand block fields (all optional; neutral defaults fill gaps):

| Field | Role |
|---|---|
| `accent` | the single restrained accent on the pages (tags, numbers, checks, CTA edge) |
| `primary` | documented on the index; (the engine also uses ink for structure) |
| `secondary` | documented on the index |
| `heading_font` | Google Font for headings (shown greyscale) |
| `body_font` | Google Font for body |
| `logo_text` | wordmark text — no logo image files |
| `frame` | `true` (default) shows the top "Wireframe" rail |

### Getting the brand
- From the `roas-funnel-build` mini brand guide if it exists.
- Else, if a client/site is referenced: `web_fetch` the site and pull the real accent/primary hex and the fonts (see `roas-funnel-build/references/design-handoff.md`). Mark inferred values.
- Else: the engine defaults apply (`accent #3DBDB0`, `primary #111315`, `Poppins`/`Inter`). Flag them as defaults so the client can swap them. Never present a guessed hex as the client's.

---

## The placeholder + suggestion rule (the core feature)
Every asset in the funnel renders as a labeled crossed box **with a one-line suggestion** of the real asset to produce. This is the most useful thing the wireframe does — it turns the funnel into a shot/asset list.

- Add a placeholder **wherever the content implies an asset**, not only where the copy says "video": hero (video or mockup), offer (product mockup), social proof (headshots), a "see the room/team/results" beat (image).
- Write each `suggestion` from the funnel's content — name the subject, the mood, and the setting: *"Founder on camera in the studio, warm, under 90s"*, *"Wide photo of the studio set, lit, mics on the table"*, *"Course dashboard mockup on a laptop"*, *"Client headshot, smiling, neutral backdrop"*.
- Placeholders are honest stand-ins, never faked assets. When presenting, list the suggestions as the assets the client still owes.

---

## Logo centering
`logo_bar` centers the logo automatically when there's no `callout`. Don't add a fake nav or a throwaway callout just to justify a left-aligned logo — if the real header has nothing else, the lone logo belongs centered.

---

## Extending the engine
Renderers live in `assets/render_funnel.py` (`RENDERERS` map) with default annotation tags in `DEFAULT_TAGS`. Add a new section type only if a real layout recurs and none of the existing sections (especially `text`) can express it. Keep new sections within the house style — bordered block, annotation tag, greyscale + accent-only, crossed-box placeholders. Compose existing sections first; reach for a new renderer last.
