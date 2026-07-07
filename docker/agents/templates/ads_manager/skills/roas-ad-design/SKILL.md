---
name: roas-ad-design
description: Renders ROAS Meta ad creatives, the text-on-texture images that pair with the ad copy. From one locked line it outputs THREE creatives by default, light, dark, and bold. Light and dark carry the client's brand color (marker highlight plus an optional subtle background tint); bold stays neutral and stock. A centered Validate Messaging line on a paper or concrete texture, the identity phrase marker-highlighted or bolded, plus an optional FREE TRAINING / date / LIVE ON stamp ending in the official Zoom logo. Copy renders verbatim and no client logo ever appears. Supports brand colors and feed, square, and story sizes, and batch-renders sets. Load for the visual side of an ad. Triggers on "design the ad," "make the ad creative," "ad image," "render the ad," "creative for the validate messaging lines," "webinar ad creative," or turning ad copy into a finished graphic. Do NOT load to write the copy (that's roas-ad-copy), or for landing pages, logos, or non-ad graphics.
---

# ROAS Ad Design — render the creative that pairs with the copy

The visual half of the ad system. `roas-ad-copy` writes the Validate Messaging lines; this skill turns each line into finished Meta creatives in the house style: one centered line on a paper/concrete texture, the identity phrase emphasized, the Zoom stamp on training ads.

The renderer is `assets/render_ad.py` (Pillow + numpy + Poppins + the bundled `assets/zoom_logo.png`, self-contained, no browser/network). It reproduces the reference creatives faithfully. Drive the engine; don't build images by hand or with the visualizer. Read `references/design-system.md` before the first render.

---

## THE RULES (locked)

1. **Three outputs per line.** Every line renders LIGHT, DARK, and BOLD. A set is light + dark + bold for each line.
2. **Brand = colors, on light + dark only.** Light and dark use the client's brand color for the marker (and an optional subtle background tint). BOLD is always neutral/stock, no client color. Brand identity is colors only; texture, layout, Poppins, and the stamp stay stock.
3. **No client logo, ever.** The only logo on a creative is the Zoom logo in the stamp. No client/product logos or wordmarks.
4. **Copy is verbatim.** Render the exact locked line from `roas-ad-copy`. Never rewrite, shorten, reflow, or "improve" it. Never add an em dash. Never cut words.
5. **Keep it simple.** One line of copy, one highlighted phrase, the simple stamp, nothing else. See the design-tool guardrails in `references/design-system.md` when working in a design tool instead of the engine.

---

## INPUTS — gather before rendering

1. **The copy line(s)** — the locked Validate Messaging set from `roas-ad-copy`. Render one set (light/dark/bold) per line. If you don't have the lines, get them or write them first with `roas-ad-copy`. Render them verbatim.
2. **The highlighted phrase** per line — the identity callout ("project manager"). Infer if obvious; otherwise ask.
3. **Client brand color(s)** — at minimum a brand marker hex for light + dark. Optionally a light-background hex and a dark-background hex for a subtle tint. If none given, light/dark use stock yellow/red and you can flag that a brand color would be better.
4. **Event stamp** — for live trainings, the offer + date + "LIVE ON" (the engine appends the Zoom logo). Omit for evergreen.
5. **Size(s)** — portrait 1080×1350 (default), square, story. Render multiple if running feed + stories.

Never ask for or use a client logo file. Brand identity is colors, not logos.

---

## STEP 1 — DECIDE THE SET

One line in → three creatives out (light branded, dark branded, bold neutral). Confirm the highlighted phrase per line and the brand color. State the plan (how many lines × light/dark/bold, which sizes) before rendering so it can be adjusted.

## STEP 2 — RENDER

Write a JSON **line spec** per line (a list for several lines) following the schema in `references/design-system.md`, then run the engine:

```bash
python assets/render_ad.py config.json
```

Each line spec sets `text` (verbatim), `highlight`, optional `stamp` (`"LIVE ON"` gets the Zoom logo), `size`, `brand_color`, optional `brand_bg_light` / `brand_bg_dark`, and `out_prefix`. The engine produces `{prefix}_light.png`, `{prefix}_dark.png`, `{prefix}_bold.png` — light/dark branded, bold neutral. Write outputs to `/mnt/user-data/outputs/`.

`python assets/render_ad.py --demo` regenerates the three reference creatives (with the real Zoom logo).

## STEP 3 — REVIEW + PRESENT

`view` the PNGs: the highlight sits on the right phrase, the brand color is on light/dark (and bold is neutral), the Zoom logo reads correctly, nothing overflows the margins, copy matches the locked line exactly. Re-render if a line overflows a size. Then `present_files` all three per line. Offer to pair them with the full ad copy (primary text, headline, CTA) from `roas-ad-copy` if that wasn't already delivered.

---

## COMMON PITFALLS

- **Not producing all three cuts.** Every line is light + dark + bold by default.
- **Branding the bold cut.** Bold is neutral/stock, no client color, no tint. Only light and dark are branded.
- **Adding a client logo.** Never. Only the Zoom logo in the stamp.
- **Rewriting the copy.** Verbatim only. No em dashes, no cut words, no "improvements."
- **Design clutter.** No background photos, no app/feed chrome, no badges or pills ("LIVE MASTERCLASS," "100% FREE"), no decorative elements, no logo lockups. One line, one highlight, the stamp.
- **Building by hand or with the visualizer.** Use `render_ad.py`.
- **Highlighting the wrong thing.** The marker goes on the identity phrase, not a random keyword.
- **Stamp creep.** Offer + date + "LIVE ON" + Zoom logo. Not a sentence.

---

## Where this sits

`roas-ad-copy` (lines + Validate Messaging) → `roas-ad-design` (light/dark/bold creatives) → buyer assembles in Ads Manager → click hits the registration page → `roas-webinar-emails` / `roas-master-webinar`. Keep the identity and angle consistent across all of it.
