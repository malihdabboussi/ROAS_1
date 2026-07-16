# Carousel Design System

Read this before the first render. The engine is `assets/render_carousel.py` (Pillow + numpy + bundled Poppins, self-contained, no network). Drive the engine; don't build slides by hand or with the visualizer.

## The look (locked)

Clean text-on-background slides. One statement per slide, optionally one accented phrase. Nothing else.

**Never add:** page numbers / "1 of 9" counters, footers, headers, eyebrows or kickers (the small label above a headline), handles/@usernames as a persistent element, logos, badges/pills, decorative shapes, drop shadows, photo backgrounds, swipe-arrow chrome. If it isn't the slide's words, it doesn't go on the slide.

Consistency across the deck is the point: one style, one font, one accent color, same margins on every slide. The reader should never have to re-orient on a swipe.

## Canvas + safe zone

- 1080 x 1350 px (4:5 portrait). This ratio is non-negotiable for feed real estate.
- Text lives in the upper ~75%. The renderer keeps every line between y=210 and y=1015 (the "stage") and vertically centers within it. The bottom ~250px is left empty because IG's caption/UI covers it.
- Side margins are 120px. Text wraps inside a 840px column.

## Styles (pick ONE per deck)

| style | background | text | accent | use |
|-------|-----------|------|--------|-----|
| `light` | warm off-white, subtle grain | near-black | brand color | default, feels editorial/clean |
| `dark` | near-black, subtle grain | off-white | brand color | high-contrast, punchy |
| `bold` | near-black, flat | white | none (weight only) | brandless/neutral, maximum simplicity |

`light` and `dark` carry the brand color on the accented phrase. `bold` uses no brand color at all... emphasis is weight contrast only (medium body, bold phrase).

## Emphasis (at most one phrase per slide)

- `emphasis_style: "color"` (default) — the accented phrase renders in the brand color, bold weight. Cleanest.
- `emphasis_style: "marker"` — a continuous brand-color highlight swipe behind the phrase, white text on top. This is the ROAS ad-system signature look; use when a deck wants more punch.
- Keep emphasis to ONE phrase per slide. Two accents per slide reads busy. Some slides need no emphasis at all... that's fine, omit it.

## Sizing

- Font auto-fits per slide between 44 and 100pt: short lines render big, denser slides step down to fit the stage. This is intended... it fills each slide while staying inside the safe zone.
- Override with a per-slide `"size"` only when you deliberately want a fixed size (e.g. matching the hook and CTA).
- Base weight is `medium`; the accented phrase is always `bold`. Override deck-wide with `base_weight` if a deck wants a lighter or heavier feel.

## Config schema

```json
{
  "style": "light",
  "brand_color": "#E8593F",
  "emphasis_style": "color",
  "base_weight": "medium",
  "brand_bg": false,
  "texture": true,
  "out_prefix": "clientname_carousel",
  "out_dir": "/mnt/user-data/outputs",
  "slides": [
    {"text": "Verbatim slide copy.", "emphasis": "accented phrase"},
    {"text": "A slide with no accent.", "align": "center"},
    {"text": "A fixed-size slide.", "emphasis": "fixed", "size": 84}
  ]
}
```

- `text` (required): the slide copy, rendered VERBATIM. Never rewrite, reflow, shorten, or add an em dash.
- `emphasis` (optional): a phrase that appears inside `text`; matched as a contiguous run, case/punctuation-insensitive. If it isn't found, the slide renders with no accent (and you should fix the phrase).
- `align` (optional): `center` (default) or `left`.
- `size` (optional): fixed pt; omit for auto-fit.
- `brand_bg` (optional): adds a very subtle background tint toward the brand color on light/dark. Default false (cleaner).

## Run it

```bash
python assets/render_carousel.py config.json     # renders {prefix}_01.png ... _NN.png
python assets/render_carousel.py --demo          # regenerates the reference deck
```

Outputs go to `out_dir` as zero-padded `{prefix}_01.png`, `{prefix}_02.png`, ... in slide order.

## Review checklist (view the PNGs)

- One statement per slide, at most one accented phrase.
- Accent sits on the right phrase, in brand color (light/dark) or weight-only (bold).
- Nothing in the bottom ~250px; no text clipping the margins.
- Same style/font/accent on every slide... the deck looks like one set.
- No page numbers, footers, eyebrows, kickers, logos, or chrome anywhere.
- Copy matches the provided slide lines exactly.
