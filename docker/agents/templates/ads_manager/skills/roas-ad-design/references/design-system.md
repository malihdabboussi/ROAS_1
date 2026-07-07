# ROAS Ad Creative — Design System

The look: a single Validate Messaging line, centered, large, on a paper/concrete texture, with the identity phrase emphasized and an optional event stamp at the bottom. No photos, no logos (except the Zoom logo in the stamp), no clutter. The words are the creative. Pairs with `roas-ad-copy` (that skill writes the lines; this one renders them).

The renderer is `assets/render_ad.py` (Pillow + numpy + Poppins + the bundled `assets/zoom_logo.png`, fully self-contained). Don't hand-build images; drive the engine.

---

## THREE OUTPUTS PER LINE (default)

Every line renders THREE creatives. A "set" is light + dark + bold for each line:

- **LIGHT** — branded. Paper texture, marker highlight in the client's brand color, optional subtle light brand tint on the background.
- **DARK** — branded. Charcoal texture, marker highlight in the client's brand color, optional subtle dark brand tint.
- **BOLD** — neutral house style. Charcoal texture, the identity phrase just bolded (no marker, NO client color, no brand tint). The clean, universal reference cut.

Light + dark = branded. Bold = stock/neutral. Always produce all three unless told otherwise.

## Brand identity = COLORS ONLY (light + dark)

The client's brand shows up only as color, and only on light + dark:
- `brand_color` (hex) — the marker highlight color, replacing stock yellow/red. The engine auto-picks white or dark ink inside the marker for contrast.
- `brand_bg_light` / `brand_bg_dark` (hex, optional) — a subtle brand tint for the background. Keep it subtle; the copy stays the hero.

Everything else stays stock: texture, layout, Poppins typography, the stamp. No brand fonts, no brand textures, no brand layouts. If no `brand_color` is given, light/dark fall back to stock yellow/red.

The BOLD cut never takes any client color or tint. It is the neutral version every time.

## NO CLIENT LOGO, EVER

The only logo that ever appears on a creative is the Zoom logo in the stamp. No client or product logo lockups, no brand wordmarks (no "AOS," no "AUTHORITY," nothing). We don't carry client logo files and they never appear. Brand identity here is colors, not logos.

## COPY IS VERBATIM

The engine renders the exact text it's given (the locked lines from `roas-ad-copy`). It never rewrites, shortens, reflows words, or "improves" copy, and never adds an em dash. It only wraps lines to fit the frame. Pass the copy through untouched.

---

## The Zoom logo stamp

For live-training ads, the stamp is two lines near the bottom, bold:
- Line 1: offer + date, e.g. "FREE TRAINING. JUNE 17TH."
- Line 2: "LIVE ON" followed by the **official Zoom logo image** (`assets/zoom_logo.png`), composited by the engine. The drawn dot/wordmark is gone; it's the real logo file now, permanent default.

Pass the second stamp line as `"LIVE ON"` (the engine appends the logo). Omit the whole stamp for evergreen offers. By default the BOLD cut is rendered without the stamp (clean/universal); set `bold_stamp: true` to add it.

## Highlight styles

- **marker** — rounded color block behind the identity phrase (highlighter effect), phrase bold. Brand color on light/dark, stock yellow/red if no brand color. The Yasir / Speak Like a CEO look. Used for LIGHT and DARK.
- **bold** — the phrase just bolded, no color block. The Taylor / Leadr look. Used for the BOLD cut.
- **none** — uniform weight, rare.

One highlighted phrase per creative: the identity ("project manager," "spiritual work deserves a bigger audience"), not a random keyword.

## Typography

Poppins throughout (installed). Body Medium, highlighted phrase Bold, stamp Bold. Centered, line spacing ~1.34. The engine auto-fits the size so the line fills the frame without overflowing. Don't set font sizes by hand.

## Dimensions

- **portrait** 1080×1350 (4:5) — default, best feed real estate
- **square** 1080×1080 (1:1) — universal
- **story** 1080×1920 (9:16) — Stories / Reels

## Texture

Procedural (speckle + blur + vignette), license-clean, no asset files. Light reads as paper, dark as concrete. Subtle on purpose so the copy stays the hero.

---

## Engine schemas

**Line spec (recommended — expands to light/dark/bold):**
```json
{
  "text": "If you're a project manager who ...",
  "highlight": "project manager",
  "stamp": ["FREE TRAINING. JUNE 17TH.", "LIVE ON"],
  "size": "portrait",
  "brand_color": "#7C3AED",
  "brand_bg_light": "#F4F1FB",
  "brand_bg_dark": "#1E1633",
  "bold_stamp": false,
  "out_prefix": "out/yasir_pm"
}
```
Produces `out/yasir_pm_light.png`, `_dark.png`, `_bold.png`. Pass a JSON **list** of line specs to render several lines at once. Drop `brand_color`/`brand_bg_*` for an unbranded set. Drop `stamp` for evergreen.

**Explicit single creative (fine control / the demo):**
```json
{ "text": "...", "highlight": "...", "variant": "light|dark",
  "highlight_style": "marker|bold|none", "highlight_color": "auto|#hex",
  "bg_override": "#hex", "stamp": ["...", "LIVE ON"], "size": "portrait", "out": "file.png" }
```

Run: `python render_ad.py config.json` — or `python render_ad.py --demo` to regenerate the three reference creatives (now with the real Zoom logo).

---

## Design-tool guardrails (when this is used as a brief, not the engine)

If this skill is used as a brief inside a design tool (e.g. Claude Design) instead of the Python engine, the output MUST still be one of the three reference looks and nothing more. Keep it simple. Hard DON'Ts:

- NO background photos or imagery. Plain or subtly brand-tinted texture only.
- NO Instagram / app / feed chrome (no profile rows, like/share/comment bars, "Sponsored" tags, phone frames).
- NO extra badges or pills. Nothing like a "LIVE MASTERCLASS" tag or a "100% FREE" badge.
- NO logo lockups of any kind except the Zoom logo in the stamp.
- NO decorative elements stacked at the bottom, no icons, no flourishes, no borders.
- NO rewriting the copy. Verbatim, no em dashes, no cut words.

The creative is ONE line of copy on a plain or subtly brand-tinted texture, ONE marker-highlighted (or bolded) phrase, and the simple stamp. Nothing else. If in doubt, match the light / dark / bold demo references in `assets/samples/` exactly.
