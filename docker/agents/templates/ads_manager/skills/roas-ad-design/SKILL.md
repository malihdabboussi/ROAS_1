---
name: roas-ad-design
description: Renders the visual half of Validate Messaging ads as deterministic light, dark, and bold PNG cuts. Use after roas-ad-copy has produced approved identity-callout lines. Do not use for photographic concepts, ad copy, or final native ad assembly.
---

# ROAS Ad Design — deterministic Validate Messaging statics

Turn the clearly labeled Validate Messaging lines from `roas-ad-copy` into finished Meta creative. The words are the creative: one identity-callout line, one emphasized phrase, and an optional factual event stamp.

Use the deterministic `process_media` Validate Messaging renderer. It reproduces the reference system server-side without moving rendered image bytes through the model context. Do not rebuild the look in HTML, a presentation, a visualizer, or an image-generation model. Read `references/design-system.md` before rendering.

## Source lock

Read only the clearly labeled `VALIDATE MESSAGING SET` from the approved Copy Package. Do not substitute generic ad headlines, overlay copy, proof claims, or webinar topics.

Every line must begin with an identity callout such as:

- `If you've ...`
- `If you're ...`
- `If you are ...`
- `If your ...`

If that section is absent or the lines do not follow the identity-callout structure, stop and identify the missing copy instead of inventing replacements.

## Rules

1. Render three cuts per line: light, dark, and bold.
2. Light and dark use the verified campaign accent color. Bold stays neutral.
3. Copy is verbatim. Never rewrite, shorten, add punctuation, or add an em dash.
4. Use no client logo. The only allowed logo is the official Zoom logo inside a factual live-event stamp.
5. Use one line, one highlighted identity phrase, and one optional stamp. No photos, app chrome, badges, or decorative clutter.

## Render and register in Vibey

In Vibey, the PNGs must become native image Deliverables, not a Doc or Presentation:

1. Call `process_media` once with `operation: "render_validate_messaging"`.
2. Pass the verified Theme `brand_color` and one ordered `lines` item per approved source line.
3. Each line item contains exact `text`, an exact `highlight` substring, and an optional factual `stamp`.
4. The server creates `Static 1 — Light`, `Static 1 — Dark`, `Static 1 — Bold`, then continues by line number.
5. Confirm every expected image appears in Space Media and the mission Deliverables before completing.

Do not call `generate_visual_html`, `save_document`, `generate_image`, or `create_ad` in this step. Final ad assembly happens only after the creative gate.

## Handoff

`roas-ad-copy` → deterministic PNG cuts → human creative approval → `ad-builder` / `create_ad` → media plan.
