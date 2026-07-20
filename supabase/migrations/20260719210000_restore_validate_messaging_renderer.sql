BEGIN;

UPDATE public.skill_library
SET
  name = 'Roas Ad Design',
  description = 'Renders approved identity-callout lines as deterministic light, dark, and bold PNG cuts, then registers every cut as native Space Media.',
  markdown_content = $roas_ad_design_v3$---
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
$roas_ad_design_v3$,
  category = 'agency_ads',
  updated_at = now()
WHERE skill_key = 'roas-ad-design';

INSERT INTO public.skill_library_resources (skill_key, file_path, content, content_type)
VALUES ('roas-ad-design', 'references/design-system.md', $roas_ad_design_references_design_system_md$# ROAS Ad Creative — Design System

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
$roas_ad_design_references_design_system_md$, 'text/markdown')
ON CONFLICT (skill_key, file_path) DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type;

INSERT INTO public.skill_library_resources (skill_key, file_path, content, content_type)
VALUES ('roas-ad-design', 'assets/render_ad.py', $roas_ad_design_assets_render_ad_py$#!/usr/bin/env python3
"""
ROAS ad-creative renderer.

Renders text-on-texture Meta ad creatives in the ROAS house style: a centered
Validate Messaging line on a paper/concrete texture, the identity phrase
marker-highlighted or bolded, and an optional event stamp ("FREE TRAINING. <date>."
+ "LIVE ON" followed by the official Zoom logo image).

Self-contained: Pillow + numpy + the Poppins font + the bundled zoom_logo.png.
No browser, no network.

COPY IS VERBATIM. This engine renders the exact text it is given. It never
rewrites, shortens, reflows words, or adds punctuation (no em dashes, ever).
It only wraps lines to fit the frame.

THREE OUTPUTS PER LINE (default). A "line spec" renders three creatives:
    LIGHT  - branded (client marker color + optional light bg tint), marker highlight
    DARK   - branded (client marker color + optional dark bg tint),  marker highlight
    BOLD   - NEUTRAL house style (no client color), bold emphasis, the clean universal cut
Only LIGHT and DARK carry client brand color. BOLD is always stock/neutral.
The only logo ever placed on a creative is the Zoom logo in the stamp. No client logos.

Usage:
    python render_ad.py config.json     # see schemas below
    python render_ad.py --demo          # regenerate the three reference creatives

Line-spec schema (recommended - expands to light/dark/bold):
    {
      "text": "If you're a project manager who ...",   # rendered verbatim
      "highlight": "project manager",                   # phrase to emphasize (str or [str])
      "stamp": ["FREE TRAINING. JUNE 17TH.", "LIVE ON"],# optional; "LIVE ON" gets the Zoom logo
      "size": "portrait",                               # square | portrait | story
      "brand_color": "#7C3AED",                         # client marker color for light+dark (optional)
      "brand_bg_light": "#F4F1FB",                      # optional subtle light bg tint
      "brand_bg_dark": "#1E1633",                       # optional subtle dark bg tint
      "bold_stamp": false,                              # default false: bold cut stays date-free/clean
      "out_prefix": "out/yasir_pm"                      # -> out/yasir_pm_light.png, _dark.png, _bold.png
    }

Explicit single-creative schema (used by --demo / fine control):
    { "text":..., "highlight":..., "variant":"light|dark", "highlight_style":"marker|bold|none",
      "highlight_color":"auto|#hex", "bg_override":"#hex", "stamp":[...], "size":..., "out":"file.png" }
"""
import sys, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = "/usr/share/fonts/truetype/google-fonts"
FONTS = {
    "light":   f"{FONT_DIR}/Poppins-Light.ttf",
    "regular": f"{FONT_DIR}/Poppins-Regular.ttf",
    "medium":  f"{FONT_DIR}/Poppins-Medium.ttf",
    "bold":    f"{FONT_DIR}/Poppins-Bold.ttf",
}
ZOOM_LOGO = os.path.join(HERE, "zoom_logo.png")
SIZES = {"square": (1080, 1080), "portrait": (1080, 1350), "story": (1080, 1920)}

# Stock (neutral) palette. Client brand color overrides the marker on light/dark only.
PALETTE = {
    "light": dict(base=(242, 240, 235), ink=(26, 26, 26),   hi=(255, 224, 77),  hi_ink=(26, 26, 26)),
    "dark":  dict(base=(43, 43, 43),    ink=(245, 245, 245), hi=(226, 59, 46),  hi_ink=(255, 255, 255)),
}


def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def f(weight, size):
    return ImageFont.truetype(FONTS[weight], size)


def luminance(rgb):
    return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2])


def texture(size, base, dark):
    """Procedural paper/concrete texture: speckle noise + soft blur + vignette."""
    w, h = size
    rng = np.random.default_rng(7)
    noise = rng.normal(0, 1, (h, w)).astype(np.float32)
    img = Image.fromarray(((noise - noise.min()) / (np.ptp(noise) + 1e-6) * 255).astype("uint8"))
    img = img.filter(ImageFilter.GaussianBlur(1.1))
    n = np.asarray(img, dtype=np.float32) / 255.0
    amp = 10.0 if not dark else 14.0
    out = np.empty((h, w, 3), dtype=np.float32)
    for i, c in enumerate(base):
        out[..., i] = c + (n - 0.5) * 2 * amp
    yy, xx = np.mgrid[0:h, 0:w]
    cx, cy = w / 2, h / 2
    d = np.sqrt(((xx - cx) / cx) ** 2 + ((yy - cy) / cy) ** 2)
    vig = np.clip(1 - (d - 0.6) * (0.18 if dark else 0.10), 0, 1)
    out *= vig[..., None]
    return Image.fromarray(np.clip(out, 0, 255).astype("uint8"), "RGB")


def mark_words(text, highlights):
    if isinstance(highlights, str):
        highlights = [highlights] if highlights else []
    words = text.split()
    flags = [False] * len(words)
    low = [w.lower().strip(".,!?'\"") for w in words]
    for phrase in highlights:
        pw = [p.lower().strip(".,!?'\"") for p in phrase.split()]
        if not pw:
            continue
        for i in range(len(words) - len(pw) + 1):
            if low[i:i + len(pw)] == pw:
                for j in range(len(pw)):
                    flags[i + j] = True
    return list(zip(words, flags))


def wrap(tokens, body_font, hi_font, max_w, draw):
    space = draw.textlength(" ", font=body_font)
    lines, cur, cur_w = [], [], 0.0
    for word, flag in tokens:
        fnt = hi_font if flag else body_font
        ww = draw.textlength(word, font=fnt)
        add = ww + (space if cur else 0)
        if cur and cur_w + add > max_w:
            lines.append(cur)
            cur, cur_w = [(word, flag, ww)], ww
        else:
            cur.append((word, flag, ww))
            cur_w += add
    if cur:
        lines.append(cur)
    return lines, space


def line_width(line, space):
    return sum(w for _, _, w in line) + space * (len(line) - 1)


def draw_stamp(img, draw, stamp, fs, ink, W, H):
    """Render stamp lines; a 'LIVE ON' line gets the official Zoom logo image appended."""
    sy = int(H * 0.80)
    main = f("bold", int(fs * 0.62))
    line_step = int(fs * 0.8)
    for k, line in enumerate(stamp):
        yy = sy + k * line_step
        if "LIVE ON" in line.upper():
            sf = f("bold", int(fs * 0.55))
            pre = "LIVE ON"
            bb = sf.getbbox(pre)
            text_h = bb[3] - bb[1]
            pre_w = draw.textlength(pre, font=sf)
            logo = Image.open(ZOOM_LOGO).convert("RGBA")
            logo_h = int(text_h * 1.28)
            logo_w = int(logo.width * logo_h / logo.height)
            logo = logo.resize((logo_w, logo_h), Image.LANCZOS)
            gap = int(fs * 0.16)
            total_w = pre_w + gap + logo_w
            sx = int((W - total_w) // 2)
            draw.text((sx, yy), pre, font=sf, fill=ink)
            # vertically center logo against the text
            text_top = yy + bb[1]
            logo_y = int(text_top + (text_h - logo_h) / 2)
            img.paste(logo, (int(sx + pre_w + gap), logo_y), logo)
        else:
            lw = draw.textlength(line, font=main)
            draw.text(((W - lw) // 2, yy), line, font=main, fill=ink)


def render_one(cfg):
    """Render a single creative. Returns output path."""
    size = SIZES[cfg.get("size", "portrait")]
    W, H = size
    variant = cfg.get("variant", "light")
    pal = dict(PALETTE[variant])

    # background: optional brand tint override (light/dark only; bold passes none)
    base = pal["base"]
    if cfg.get("bg_override"):
        base = hex2rgb(cfg["bg_override"])
        # keep ink readable against the chosen base
        pal["ink"] = (245, 245, 245) if luminance(base) < 140 else (26, 26, 26)

    style = cfg.get("highlight_style", "marker")

    # marker color: client brand color if given, else stock yellow/red
    hi_color = cfg.get("highlight_color", "auto")
    if cfg.get("brand_color") and style == "marker":
        hi_color = hex2rgb(cfg["brand_color"])
        pal["hi_ink"] = (255, 255, 255) if luminance(hi_color) < 150 else (26, 26, 26)
    elif hi_color == "auto":
        hi_color = pal["hi"]
    elif isinstance(hi_color, str) and hi_color.startswith("#"):
        hi_color = hex2rgb(hi_color)

    img = texture(size, base, variant == "dark").convert("RGB")
    draw = ImageDraw.Draw(img)

    margin = int(W * 0.11)
    max_w = W - 2 * margin
    tokens = mark_words(cfg["text"], cfg.get("highlight", []))
    stamp = cfg.get("stamp") or []

    max_block_h = int(H * (0.52 if stamp else 0.62))
    fs = int(W * 0.062)
    while fs > 22:
        body_font = f("medium", fs)
        hi_font = f("bold", fs)
        lines, space = wrap(tokens, body_font, hi_font, max_w, draw)
        line_h = int(fs * 1.34)
        block_h = line_h * len(lines)
        widest = max(line_width(ln, space) for ln in lines)
        if widest <= max_w and block_h <= max_block_h:
            break
        fs -= 2

    y0 = (H - block_h) // 2
    if stamp:
        y0 = int(H * 0.30) if len(lines) <= 4 else int(H * 0.24)

    ascent, descent = body_font.getmetrics()
    pad_x, pad_y = int(fs * 0.16), int(fs * 0.10)
    radius = int(fs * 0.18)

    for li, line in enumerate(lines):
        lw = line_width(line, space)
        x = (W - lw) // 2
        y = y0 + li * line_h
        if style == "marker":
            positions, cx = [], x
            for word, flag, ww in line:
                positions.append((cx, ww, flag))
                cx += ww + space
            i = 0
            while i < len(positions):
                if positions[i][2]:
                    j = i
                    while j + 1 < len(positions) and positions[j + 1][2]:
                        j += 1
                    x0 = positions[i][0] - pad_x
                    x1 = positions[j][0] + positions[j][1] + pad_x
                    draw.rounded_rectangle(
                        [x0, y - pad_y, x1, y + ascent + descent * 0.4 + pad_y],
                        radius=radius, fill=hi_color)
                    i = j + 1
                else:
                    i += 1
        cx = x
        for word, flag, ww in line:
            if flag:
                fnt = hi_font
                col = pal["hi_ink"] if style == "marker" else pal["ink"]
            else:
                fnt = body_font
                col = pal["ink"]
            draw.text((cx, y), word, font=fnt, fill=col)
            cx += ww + space

    if stamp:
        draw_stamp(img, draw, stamp, fs, pal["ink"], W, H)

    out = cfg["out"]
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    img.save(out, "PNG")
    return out


def render_set(spec):
    """Expand one line spec into THREE creatives: light(branded), dark(branded), bold(neutral)."""
    text = spec["text"]
    highlight = spec.get("highlight", [])
    stamp = spec.get("stamp")
    size = spec.get("size", "portrait")
    brand = spec.get("brand_color")
    prefix = spec.get("out_prefix") or os.path.splitext(spec.get("out", "creative"))[0]
    bold_stamp = spec.get("bold_stamp", False)
    outs = []
    outs.append(render_one(dict(text=text, highlight=highlight, variant="light",
                                highlight_style="marker", brand_color=brand,
                                bg_override=spec.get("brand_bg_light"),
                                stamp=stamp, size=size, out=f"{prefix}_light.png")))
    outs.append(render_one(dict(text=text, highlight=highlight, variant="dark",
                                highlight_style="marker", brand_color=brand,
                                bg_override=spec.get("brand_bg_dark"),
                                stamp=stamp, size=size, out=f"{prefix}_dark.png")))
    # BOLD: neutral house style, no client color, no brand bg; clean universal cut
    outs.append(render_one(dict(text=text, highlight=highlight, variant="dark",
                                highlight_style="bold",
                                stamp=(stamp if bold_stamp else None),
                                size=size, out=f"{prefix}_bold.png")))
    return outs


# Demo regenerates the three reference creatives (with the real Zoom logo in the stamp).
DEMO = [
    dict(text="If you're a project manager who gets put on the spot in meetings and starts rambling with no idea where you're going, I'm going to show you how to organize your thoughts so fast that people think you rehearsed it.",
         highlight="project manager", variant="light", highlight_style="marker",
         stamp=["FREE TRAINING. JUNE 17TH.", "LIVE ON"], size="portrait", out="demo_light.png"),
    dict(text="If you just got promoted to a leadership position where you have to communicate constantly about critical decisions, but you're still struggling to get your point across, I'm going to show you how to walk into those conversations and make your message land every time you speak.",
         highlight="promoted to a leadership position", variant="dark", highlight_style="marker",
         stamp=["FREE TRAINING. JUNE 17TH.", "LIVE ON"], size="portrait", out="demo_dark.png"),
    dict(text="If your spiritual work deserves a bigger audience, we'll help you land a talk on one of the world's biggest stages.",
         highlight="spiritual work deserves a bigger audience", variant="dark", highlight_style="bold",
         size="portrait", out="demo_bold.png"),
]


def main():
    if len(sys.argv) >= 2 and sys.argv[1] == "--demo":
        for c in DEMO:
            print("rendered", render_one(c))
        return
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    cfg = json.load(open(sys.argv[1]))
    items = cfg if isinstance(cfg, list) else [cfg]
    for c in items:
        if "variant" in c and "out" in c:          # explicit single creative
            print("rendered", render_one(c))
        else:                                        # line spec -> three creatives
            for p in render_set(c):
                print("rendered", p)


if __name__ == "__main__":
    main()
$roas_ad_design_assets_render_ad_py$, 'text/x-python')
ON CONFLICT (skill_key, file_path) DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type;


UPDATE public.agent_skills AS skill
SET
  name = library.name,
  description = library.description,
  markdown_content = library.markdown_content,
  updated_at = now()
FROM public.skill_library AS library
WHERE skill.skill_key = 'roas-ad-design'
  AND library.skill_key = skill.skill_key
  AND skill.source IN ('template', 'system', 'default');

INSERT INTO public.agent_skill_resources (
  user_id, org_id, agent_key, skill_key, file_path, content, content_type, storage_url
)
SELECT
  skill.user_id,
  skill.org_id,
  skill.agent_key,
  resource.skill_key,
  resource.file_path,
  resource.content,
  resource.content_type,
  NULL
FROM public.agent_skills AS skill
JOIN public.skill_library_resources AS resource
  ON resource.skill_key = skill.skill_key
WHERE skill.skill_key = 'roas-ad-design'
  AND skill.source IN ('template', 'system', 'default')
  AND skill.user_id IS NULL
  AND skill.org_id IS NULL
ON CONFLICT (agent_key, skill_key, file_path) WHERE user_id IS NULL AND org_id IS NULL DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type,
  updated_at = now();

INSERT INTO public.agent_skill_resources (
  user_id, org_id, agent_key, skill_key, file_path, content, content_type, storage_url
)
SELECT
  skill.user_id,
  skill.org_id,
  skill.agent_key,
  resource.skill_key,
  resource.file_path,
  resource.content,
  resource.content_type,
  NULL
FROM public.agent_skills AS skill
JOIN public.skill_library_resources AS resource
  ON resource.skill_key = skill.skill_key
WHERE skill.skill_key = 'roas-ad-design'
  AND skill.source IN ('template', 'system', 'default')
  AND (skill.user_id IS NOT NULL OR skill.org_id IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1
    FROM public.agent_skill_resources AS existing
    WHERE existing.agent_key = skill.agent_key
      AND existing.skill_key = skill.skill_key
      AND existing.file_path = resource.file_path
      AND existing.user_id IS NOT DISTINCT FROM skill.user_id
      AND existing.org_id IS NOT DISTINCT FROM skill.org_id
  );

COMMIT;
