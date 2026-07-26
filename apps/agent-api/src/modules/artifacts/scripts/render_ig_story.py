import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

WIDTH = 1080
HEIGHT = 1920
APPROVED_EMOJIS = {"👇", "⏰", "✅", "🚨", "🙌"}


def font(path, size):
    value = ImageFont.truetype(path, size)
    try:
        value.set_variation_by_axes([800])
    except (AttributeError, OSError):
        pass
    return value


def rounded_text(draw, text, y, font_value, fill, text_fill, radius=26, pad_x=30, pad_y=14):
    box = draw.textbbox((0, 0), text, font=font_value)
    text_w = box[2] - box[0]
    text_h = box[3] - box[1]
    left = (WIDTH - text_w) // 2 - pad_x
    top = y
    right = left + text_w + (pad_x * 2)
    bottom = top + text_h + (pad_y * 2)
    draw.rounded_rectangle((left, top, right, bottom), radius=radius, fill=fill)
    draw.text((left + pad_x, top + pad_y - box[1]), text, font=font_value, fill=text_fill)
    return bottom


def emoji_image(value, emoji_font_path, target_height):
    if value not in APPROVED_EMOJIS:
        raise ValueError("emoji is not in the approved Apple-style set")
    emoji_font = ImageFont.truetype(emoji_font_path, 96)
    scratch = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    scratch_draw = ImageDraw.Draw(scratch)
    scratch_draw.text((64, 64), value, font=emoji_font, embedded_color=True)
    bounds = scratch.getbbox()
    if not bounds:
        raise ValueError("emoji font did not render the requested glyph")
    glyph = scratch.crop(bounds)
    target_width = round(glyph.width * (target_height / glyph.height))
    return glyph.resize((target_width, target_height), Image.Resampling.LANCZOS)


def render(spec):
    output = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(output)
    heading_font = font(spec["font_path"], 58)
    pill_font = font(spec["font_path"], 54)
    cta_font = font(spec["font_path"], 48)

    y = round(HEIGHT * 0.275)
    y = rounded_text(
        draw, spec["pill_line"], y, pill_font, "#4A9FF5", "#CEEBFF", radius=28
    )
    y += 74
    for line in spec["headline_lines"]:
        highlighted = bool(line.get("highlighted"))
        y = rounded_text(
            draw,
            line["text"],
            y,
            heading_font,
            "#F72D3C" if highlighted else "#FFFFFF",
            "#FFFFFF" if highlighted else "#111111",
        )
        y -= 8

    y += 138
    cta = spec["cta_line"]
    box = draw.textbbox((0, 0), cta, font=cta_font)
    text_w = box[2] - box[0]
    text_h = box[3] - box[1]
    glyph = emoji_image(spec["emoji"], spec["emoji_font_path"], 58)
    gap = 18
    pad_x = 30
    pad_y = 14
    content_w = text_w + gap + glyph.width
    left = (WIDTH - content_w) // 2 - pad_x
    bottom = y + text_h + (pad_y * 2)
    right = left + content_w + (pad_x * 2)
    draw.rounded_rectangle((left, y, right, bottom), radius=28, fill="#0C0C0C")
    text_y = y + pad_y - box[1]
    draw.text((left + pad_x, text_y), cta, font=cta_font, fill="#FFFFFF")
    output.alpha_composite(glyph, (left + pad_x + text_w + gap, y + (bottom - y - glyph.height) // 2))
    output.save(spec["output_path"])


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("usage: python render_ig_story.py spec.json")
    render(json.loads(Path(sys.argv[1]).read_text()))
