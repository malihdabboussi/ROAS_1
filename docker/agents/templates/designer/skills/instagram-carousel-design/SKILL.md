---
name: instagram-carousel-design
description: Renders clean Instagram carousel slides, the text-on-background images that pair with the carousel copy. Takes the slide-by-slide lines from the instagram-carousel skill and turns the whole deck into finished 1080x1350 PNGs in one consistent house style... no footers, no page counts, no eyebrows, no kickers, no logos. Just the copy on a clean background with at most one accented phrase per slide. Supports light, dark, and bold/neutral styles, brand-color or marker emphasis, and renders the full deck consistently. Load for the visual side of a carousel. Triggers on "design the carousel," "render the slides," "make the carousel creative," "turn this carousel into slides," "carousel images," or turning carousel copy into finished graphics. Do NOT load to write the carousel copy (that's instagram-carousel), or for single ad creatives (roas-ad-design), landing pages, or logos.
---

# Instagram Carousel Design — render the slides

The visual half of the carousel system. `instagram-carousel` writes the slide copy and loop chain; this skill turns the whole deck into finished slides in one clean, consistent style.

The renderer is `assets/render_carousel.py` (Pillow + numpy + bundled Poppins, self-contained, no browser/network). Drive the engine; don't build slides by hand or with the visualizer. **Read `references/design-system.md` before the first render.**

The aesthetic is deliberately bare: clean text on a clean background, one statement per slide, at most one accented phrase. No footers, no page numbers, no eyebrows, no kickers, no logos, no chrome.

---

## THE RULES (locked)

1. **One consistent style for the whole deck.** Unlike the ad system (three variants per line), a carousel renders in ONE style start to finish. Consistency across slides is a core carousel principle... same background, font, accent, and margins on every slide so the reader never re-orients on a swipe.
2. **Clean only.** No page counts / "1 of 9", no footers or headers, no eyebrows or kickers, no handles, no logos, no badges, no decorative elements. If it isn't the slide's words, it doesn't go on the slide.
3. **Copy is verbatim.** Render the exact lines from `instagram-carousel`. Never rewrite, reflow, shorten, or "improve" them. Never add an em dash. Never cut words.
4. **At most one accent per slide.** One phrase, in brand color (light/dark) or weight-only (bold). Some slides need none... that's fine.
5. **Brand = color, on light + dark only.** The brand color lives on the accented phrase. `bold` style is neutral, no brand color. Identity is the accent color; texture, layout, and Poppins stay stock.

---

## INPUTS — gather before rendering

1. **The slide lines** — the per-slide copy from `instagram-carousel` (the loop-chain output). If you don't have them, get them or write them first with `instagram-carousel`. Render verbatim, in order.
2. **The accent phrase per slide** — usually the emphasized phrase the copy already calls out. Infer if obvious; otherwise leave a slide unaccented.
3. **Style** — `light` (default), `dark`, or `bold` (neutral). One for the whole deck.
4. **Brand color** — a hex for the accent (light/dark). If none given, default works but flag that a brand color sharpens it. Not used for `bold`.
5. **Emphasis style** — `color` (default, cleanest) or `marker` (the ROAS highlight swipe). Deck-wide.

Never ask for or use a logo file. There are no logos on carousel slides.

---

## STEP 1 — CONFIRM THE DECK

State the plan before rendering: how many slides, which style (light/dark/bold), which emphasis mode, the brand color. One style for the whole deck. Confirm the accented phrase per slide matches what the copy emphasizes.

## STEP 2 — RENDER

Write a JSON config (schema in `references/design-system.md`): deck-level `style`, `brand_color`, `emphasis_style`, `out_prefix`, `out_dir`, and a `slides` list where each slide has `text` (verbatim) and optional `emphasis`. Then run:

```bash
python assets/render_carousel.py config.json
```

The engine writes `{prefix}_01.png ... {prefix}_NN.png` (claude.ai: `/mnt/user-data/outputs/`; Vibey: local workspace then register), one per slide, in order. Font auto-fits per slide within the safe zone, so short slides render big and denser slides step down.

`python assets/render_carousel.py --demo` regenerates the reference deck.

## STEP 3 — REVIEW + PRESENT

`view` the PNGs: one statement per slide, the accent on the right phrase and in the right color (or weight-only on bold), nothing in the bottom ~250px, no clipping, and every slide in the same consistent style. Check no page numbers / footers / eyebrows / kickers / logos slipped in. Copy matches the lines exactly. Re-render if a slide overflows or an accent phrase didn't match. Then deliver per environment: in a platform with native media artifacts (Vibey), register the slide set as a media/Deliverables artifact ("Carousel — [Topic]") in slide order; in claude.ai, `present_files` the PNGs. Engine and output identical either way — only the destination changes.

Then `present_files` the full deck in slide order (slide 1 first). Offer to re-render the deck in an alternate style (e.g. dark instead of light) if useful, and to pair with the caption + loop map from `instagram-carousel` if not already delivered.

---

## COMMON PITFALLS

- **Adding chrome.** No page counts, footers, eyebrows, kickers, handles, logos, or badges. This is the whole point of the style.
- **Mixing styles across the deck.** Pick one style and one accent mode; every slide matches.
- **More than one accent per slide.** One phrase max. Two reads busy.
- **Rewriting the copy.** Verbatim only. No em dashes, no cut words, no reflow.
- **Branding the bold style.** `bold` is neutral... no brand color, weight contrast only.
- **Text in the bottom zone.** Keep critical text in the upper ~75%; the engine handles this, so don't override sizing in a way that pushes text low.
- **Building by hand or with the visualizer.** Use `render_carousel.py`.
- **Accent on the wrong phrase.** The accent goes on the phrase the copy emphasizes (the loop/payoff word), not a random keyword.

---

## Where this sits

`instagram-carousel` (loop chain + slide copy + caption) → `instagram-carousel-design` (the finished slides) → posted to IG. Keep the accent phrase consistent with the loop the copy is closing/opening on each slide. For the voice in the copy, that's set upstream by `instagram-carousel` + the brand voice skill (`dylans-super-voice` for Dylan); this skill only renders.
