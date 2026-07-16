#!/usr/bin/env python3
"""
render_carousel.py - clean Instagram carousel slide renderer (Pillow).

Reads a JSON config describing a deck and renders ONE PNG per slide at
1080x1350 (4:5) in a consistent, clean house style.

Clean rules (locked): no footers, no page numbers, no eyebrows/kickers,
no logos, no decorative chrome. Just the slide copy on a clean background,
with at most ONE emphasized phrase per slide.

Config schema (JSON):
{
  "style": "light",                 # light | dark | bold   (one style for the whole deck)
  "brand_color": "#E8593F",         # accent for the emphasis phrase (light/dark only)
  "emphasis_style": "color",        # color | marker        (default color = cleanest)
  "base_weight": "medium",          # medium | regular | bold | light
  "out_prefix": "carousel",
  "out_dir": "/mnt/user-data/outputs",
  "texture": true,                  # subtle grain on bg (default true; off for bold)
  "slides": [
    {"text": "Your webinar converted once. Then it died.", "emphasis": "Then it died."},
    {"text": "...", "emphasis": "...", "align": "center", "size": 78}
  ]
}

Per-slide keys: text (required, verbatim), emphasis (optional phrase to accent),
align ("center" default | "left"), size (optional fixed pt; default auto-fit).

Usage:
    python render_carousel.py config.json
    python render_carousel.py --demo
"""

import json
import os
import re
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))

W, H = 1080, 1350
MARGIN_X = 120
# Vertical "stage": keep all text in the upper ~75% safe zone. The bottom ~250px
# is obscured by the IG caption/UI, so nothing critical goes there.
STAGE_TOP = 210
STAGE_BOTTOM = 1015
STAGE_H = STAGE_BOTTOM - STAGE_TOP
COL_W = W - 2 * MARGIN_X

LINE_SPACING = 1.16
MIN_SIZE = 44
MAX_SIZE = 100

FONT_FILES = {
    "bold": "Poppins-Bold.ttf",
    "medium": "Poppins-Medium.ttf",
    "regular": "Poppins-Regular.ttf",
    "light": "Poppins-Light.ttf",
}

STYLES = {
    "light": {"bg": (247, 245, 240), "fg": (26, 26, 26),  "texture": True},
    "dark":  {"bg": (15, 15, 16),    "fg": (242, 240, 234), "texture": True},
    "bold":  {"bg": (12, 12, 12),    "fg": (255, 255, 255), "texture": False},
}


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


_font_cache = {}


def load_font(weight, size):
    key = (weight, size)
    if key not in _font_cache:
        path = os.path.join(HERE, FONT_FILES.get(weight, FONT_FILES["medium"]))
        _font_cache[key] = ImageFont.truetype(path, size)
    return _font_cache[key]


def _norm(word):
    return re.sub(r"[^\w]", "", word).lower()


def tag_emphasis(text, emphasis):
    """Return list of (word, is_emphasis). Matches emphasis as a contiguous run."""
    words = text.split()
    flags = [False] * len(words)
    if not emphasis:
        return list(zip(words, flags))
    target = [_norm(w) for w in emphasis.split() if _norm(w)]
    if not target:
        return list(zip(words, flags))
    norm_words = [_norm(w) for w in words]
    n = len(target)
    for i in range(len(norm_words) - n + 1):
        if norm_words[i:i + n] == target:
            for j in range(i, i + n):
                flags[j] = True
            break
    return list(zip(words, flags))


def wrap_tagged(tagged, font, draw, max_w):
    """Greedy word-wrap preserving emphasis flags. Returns list of lines."""
    space_w = draw.textlength(" ", font=font)
    lines, cur, cur_w = [], [], 0.0
    for word, emph in tagged:
        ww = draw.textlength(word, font=font)
        add = ww if not cur else space_w + ww
        if cur and cur_w + add > max_w:
            lines.append(cur)
            cur, cur_w = [(word, emph)], ww
        else:
            cur.append((word, emph))
            cur_w += add
    if cur:
        lines.append(cur)
    return lines


def block_height(lines, font):
    asc, desc = font.getmetrics()
    lh = (asc + desc) * LINE_SPACING
    return lh * len(lines), lh


def fit_size(tagged, weight, draw, fixed=None):
    """Pick the largest size that fits the stage, or use fixed."""
    if fixed:
        font = load_font(weight, fixed)
        lines = wrap_tagged(tagged, font, draw, COL_W)
        return fixed, font, lines
    best = MIN_SIZE
    for size in range(MAX_SIZE, MIN_SIZE - 1, -2):
        font = load_font(weight, size)
        lines = wrap_tagged(tagged, font, draw, COL_W)
        total_h, _ = block_height(lines, font)
        # also ensure no single word overflows width
        overflow = any(draw.textlength(w, font=font) > COL_W for line in lines for w, _ in line)
        if total_h <= STAGE_H and not overflow:
            best = size
            return size, font, lines
    font = load_font(weight, best)
    lines = wrap_tagged(tagged, font, draw, COL_W)
    return best, font, lines


def make_background(style_cfg, texture, brand_tint=None):
    bg = style_cfg["bg"]
    img = Image.new("RGB", (W, H), bg)
    if brand_tint:
        # very subtle vertical tint toward the brand color (kept clean)
        base = np.array(img).astype(np.float32)
        tint = np.array(brand_tint, dtype=np.float32)
        alpha = 0.05
        base = base * (1 - alpha) + tint * alpha
        img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8))
    if texture and style_cfg["texture"]:
        arr = np.array(img).astype(np.int16)
        noise = np.random.normal(0, 3.2, (H, W, 1))
        arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
        img = Image.fromarray(arr)
    return img


def draw_slide(slide, deck, idx):
    style_cfg = STYLES[deck["style"]]
    fg = style_cfg["fg"]
    brand = hex_to_rgb(deck["brand_color"]) if deck.get("brand_color") else fg
    is_bold_style = deck["style"] == "bold"
    emph_color = fg if is_bold_style else brand

    brand_tint = None
    if deck.get("brand_bg") and not is_bold_style and deck.get("brand_color"):
        brand_tint = hex_to_rgb(deck["brand_color"])

    img = make_background(style_cfg, deck.get("texture", True), brand_tint)
    draw = ImageDraw.Draw(img)

    weight = deck.get("base_weight", "medium")
    tagged = tag_emphasis(slide["text"], slide.get("emphasis"))
    size, font, lines = fit_size(tagged, weight, draw, slide.get("size"))
    emph_font = load_font("bold", size)  # emphasis always renders bold

    total_h, lh = block_height(lines, font)
    y = STAGE_TOP + (STAGE_H - total_h) / 2
    align = slide.get("align", "center")
    space_w = draw.textlength(" ", font=font)

    for line in lines:
        # precompute each word's x-offset and width on this line
        positions = []
        cx0 = 0.0
        for k, (word, emph) in enumerate(line):
            f = emph_font if emph else font
            ww = draw.textlength(word, font=f)
            positions.append([cx0, ww, word, emph, f])
            cx0 += ww + (space_w if k < len(line) - 1 else 0)
        line_w = cx0
        x = MARGIN_X + (COL_W - line_w) / 2 if align == "center" else MARGIN_X

        marker = deck.get("emphasis_style") == "marker" and not is_bold_style
        # marker: one continuous swipe per contiguous emphasis run (drawn first)
        if marker:
            pad = size * 0.10
            k = 0
            while k < len(positions):
                if positions[k][3]:
                    j = k
                    while j + 1 < len(positions) and positions[j + 1][3]:
                        j += 1
                    sx = x + positions[k][0]
                    ex = x + positions[j][0] + positions[j][1]
                    draw.rounded_rectangle(
                        [sx - pad, y + lh * 0.14, ex + pad, y + lh * 0.92],
                        radius=int(size * 0.12), fill=brand,
                    )
                    k = j + 1
                else:
                    k += 1

        for off, ww, word, emph, f in positions:
            if emph:
                col = (255, 255, 255) if marker else emph_color
            else:
                col = fg
            draw.text((x + off, y), word, font=f, fill=col)
        y += lh

    return img


def render_deck(deck):
    deck.setdefault("style", "light")
    deck.setdefault("emphasis_style", "color")
    deck.setdefault("base_weight", "medium")
    deck.setdefault("texture", True)
    out_dir = deck.get("out_dir", "/mnt/user-data/outputs")
    prefix = deck.get("out_prefix", "carousel")
    os.makedirs(out_dir, exist_ok=True)
    paths = []
    for i, slide in enumerate(deck["slides"], 1):
        img = draw_slide(slide, deck, i)
        path = os.path.join(out_dir, f"{prefix}_{i:02d}.png")
        img.save(path)
        paths.append(path)
        print(f"  wrote {path}")
    return paths


DEMO = {
    "style": "light",
    "brand_color": "#E8593F",
    "emphasis_style": "color",
    "out_prefix": "demo_carousel",
    "out_dir": os.path.join(HERE, "..", "demo_out"),
    "slides": [
        {"text": "Your webinar converted once. Then it died.", "emphasis": "Then it died."},
        {"text": "The first launch always works. It's the second one that breaks.", "emphasis": "the second one"},
        {"text": "Your tracking quietly broke after launch day. You're optimizing on numbers that aren't real.", "emphasis": "aren't real"},
        {"text": "No escalation trigger means you scale on vibes, not signal.", "emphasis": "not signal"},
        {"text": "The fix is three moves. Most people skip the first one.", "emphasis": "skip the first one"},
        {"text": "Rebuild the tracking before you touch the budget.", "emphasis": "before you touch the budget"},
        {"text": "Set the trigger that tells you when to scale, and when to stop.", "emphasis": "when to stop"},
        {"text": "Save this for your next launch.", "emphasis": "Save this"},
    ],
}


def main():
    if len(sys.argv) == 2 and sys.argv[1] == "--demo":
        render_deck(DEMO)
        return
    if len(sys.argv) != 2:
        print("usage: python render_carousel.py config.json  |  --demo")
        sys.exit(1)
    with open(sys.argv[1]) as f:
        deck = json.load(f)
    render_deck(deck)


if __name__ == "__main__":
    main()
