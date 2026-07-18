---
name: roas-ad-design
description: Builds editable Validate Messaging static creatives as native HTML visual Docs. Use for text-led Meta statics built from approved identity-callout lines. Produces light, dark, and bold cuts without generating images or creating native ad records. Do not use for photographic concepts (roas-image-brief plus generate_image), ad copy (roas-ad-copy), or final ad assembly (ad-builder plus create_ad).
---

# ROAS Ad Design — editable Validate Messaging statics

Turn locked Validate Messaging lines into an editable native visual Doc. This is the non-generative creative lane: HTML remains reviewable and editable in the Space before a media buyer assembles approved assets into native ads.

## Inputs

1. Approved Validate Messaging lines from the Copy Package. Copy stays verbatim.
2. The identity phrase to emphasize in each line.
3. Campaign theme: brand accent color, light surface, dark surface, and typography.
4. Optional factual event stamp: offer, date, and `LIVE ON ZOOM`.

Do not ask for or add a client logo. Do not invent dates, claims, or scarcity.

## Workflow

### 1. Plan the set

Produce three cuts per locked line:

- Light: light editorial surface with the campaign accent on the identity phrase.
- Dark: dark premium surface with the same accent treatment.
- Bold: neutral, high-contrast typographic cut without campaign color.

Each cut is a 4:5 feed composition. Keep one message, one emphasized phrase, and an optional factual event stamp.

### 2. Save the native Doc first

Call `save_document` with the exact mission title, normally `WEB#6 — Validate Messaging Statics`. Include:

- the source line and source section for every creative;
- a short index of line number × cut;
- the final locked copy;
- any factual event stamp;
- review notes and open flags.

Save as soon as the content is ready so work remains visible even if a later visual action fails.

### 3. Generate editable visual HTML

Call `generate_visual_html` on the saved Doc item. Build every cut in the same visual document. The HTML must:

- use semantic sections and editable text, not embedded screenshots;
- preserve the approved copy exactly;
- keep the emphasized identity phrase obvious at thumbnail size;
- show light, dark, and bold cuts in a consistent grid;
- avoid external scripts, image dependencies, client logos, and decorative clutter;
- remain readable in the Space visual editor.

### 4. Verify and hand off

Open the Doc and confirm every expected line and cut is visible. Return the Doc as the deliverable and name any missing source fact as an open flag. Do not call `create_ad`; native ad assembly happens only after creative approval.

## Hard rules

- Copy is verbatim. Never rewrite, shorten, or add punctuation.
- Three cuts per line by default: light, dark, bold.
- Native Doc plus editable visual HTML only. No PNG renderer, PDF, or loose file export.
- Register the Doc before the visual pass so partial work is recoverable.
- Photographic or illustrative concepts go to `roas-image-brief` and `generate_image`.
- Final copy-and-asset pairing goes to `ad-builder` and `create_ad` after approval.

## Handoff chain

`roas-ad-copy` → `roas-ad-design` editable statics + `roas-image-brief` generated-image lane → human creative approval → `ad-builder` / `create_ad` → media plan.
