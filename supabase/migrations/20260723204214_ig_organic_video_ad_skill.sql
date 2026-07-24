BEGIN;

INSERT INTO public.skill_library (
  skill_key, name, description, markdown_content, category, updated_at
)
VALUES (
  'ig-organic-video-ad',
  'IG Organic Video Ad',
  'Creates native-looking Instagram Story video ads from approved reusable footage or new Higgsfield scenes. Use when the user asks for an organic IG ad, caption-led Story ad, text-on-video ad, or wants an Ads Research recommendation turned into a video. Runs an explicit copy approval stage, renders exact sticker text with Pillow, uses only the approved Apple-style emoji set, and avoids generation credits when a clean preset is available.',
  $skill$# IG Organic Video Ad

Create caption-led 9:16 Instagram Story videos that look organically posted. Use the direct Higgsfield MCP for new footage and its sandbox for production. Do not route Higgsfield through Composio.

## Inputs

Read `playbook_kickoff` when present. Otherwise collect:

- `copy_mode`: `write_for_me` or `use_my_copy`
- one or more scene IDs from `references/stock-backgrounds.md`
- `source_strategy`: `reuse_when_available` or `generate_new`
- pill line, headline, exact red highlight phrase, CTA, and emoji
- offer and audience context

The selected scene count is the output count. Never silently force two variants.

## Stage 1: Copy

Copy is a separate approval stage.

- For `write_for_me`, load `dylans-super-voice`, inspect the campaign and source Ads Research deliverables, then propose three concise sticker-copy options. Include pill, headline, highlight phrase, CTA, and one caption for each option.
- For `use_my_copy`, repeat the supplied copy verbatim for confirmation.
- Stop for approval before generating footage or rendering.
- Keep sticker copy short enough to read in under three seconds. Put the strongest phrase on its own red line.

## Stage 2: Resolve footage

Read `references/stock-backgrounds.md`.

- With `reuse_when_available`, use the clean preset video URL whenever the selected scene has one. This is the default because it saves credits and preserves a proven organic look.
- With `generate_new`, or when no preset exists, use the direct Higgsfield MCP.
- Do not accept person, product, or location reference uploads for this format. Those belong to future static-ad formats.

Before any Higgsfield call, use `list_mcp_servers`, find the server whose URL is `https://mcp.higgsfield.ai`, then use `list_mcp_tools` and copy the current tool names and schemas exactly. If it is not connected, stop and ask the user to connect Higgsfield. Never guess tool parameters.

For a new scene, generate a clean 9:16 background using the prompt seed from the reference file. Use this prompt shape:

> Candid handheld photo, vertical 9:16 upright composition, level horizon: [prompt seed], natural light, true-to-life colors, slightly imperfect amateur framing, realistic documentary style. The frame contains only the scene itself, edge-to-edge photograph, no text, no readable signs, no logos, no flags, no banners, and no license plate characters.

Do not use the words smartphone, phone, iPhone, Instagram, story, camera roll, selfie, or screenshot in a generation prompt because they trigger fake interface chrome. Animate for 10 seconds with subtle ambient movement only. Do not add people, text, pans, or dramatic zooms.

## Stage 3: Render exact stickers

Never ask an image or video model to render copy. Use `assets/render_ig_story.py` with Pillow to create a transparent 1080x1920 overlay, then composite it over the clean video with FFmpeg.

Use Montserrat ExtraBold Italic. Keep the Instagram-simulation colors fixed by design:

- blue pill: `#4A9FF5`, text `#CEEBFF`
- white stickers: `#FFFFFF`, text `#111111`
- highlighted line: `#F72D3C`
- CTA: `#0C0C0C`, text `#FFFFFF`

Approved Apple-style emojis are only `👇`, `⏰`, `✅`, `🚨`, and `🙌`. Fetch the Apple Color Emoji Linux build in the Higgsfield sandbox, pass its path to the renderer, render at the font's supported native size with embedded color, crop to the glyph bounds, and resize proportionally. Never replace an approved glyph with a platform-default or monochrome emoji.

Build music after the visual is approved. Match the music vibe in the scene reference, keep it under the speech/copy experience, and add short fades. If a clean preset already contains acceptable audio, preserve it unless the user asks for a different track.

## Stage 4: Verify and deliver

Visually inspect every final frame, not just an intermediate widget preview. Confirm:

- no fake Instagram chrome, gibberish, or model-rendered copy
- all supplied copy is verbatim
- the highlight is red and the font is heavy italic
- the emoji matches the approved Apple-style asset
- 9:16 output, 10 seconds, readable safe-area placement, and working audio

Save every final as a video deliverable on the mission and into Media with the campaign and Space attached. Record whether each result reused a preset or spent a new generation. Return the video links and the approved caption copy.
$skill$,
  'paid_media',
  now()
)
ON CONFLICT (skill_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  markdown_content = EXCLUDED.markdown_content,
  category = EXCLUDED.category,
  updated_at = now();

INSERT INTO public.skill_library_resources (skill_key, file_path, content, content_type)
VALUES (
  'ig-organic-video-ad',
  'references/stock-backgrounds.md',
  $references$# IG Organic Scene Library

Use the preset video when available and `source_strategy` is `reuse_when_available`. The matching still is a start frame for a new motion variant.

| ID | Scene | Prompt seed | Music vibe | Preset video | Matching still |
|---|---|---|---|---|---|
| golden-hour-infinity-pool | Golden-hour infinity pool | Pool terrace, lounge chairs, hills, warm evening light | Chill ambient | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260724_003101_2e049fa6-6f75-43a4-a77c-e68e77022ba0.mp4 | https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/00dbdb3f-9491-4fb9-b644-eceec84475ee.png |
| hillside-pool-terrace | Hillside pool terrace | Hillside pool terrace, planters, lounge chair, warm evening light | Chill ambient | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260724_004922_6c4276c8-dad4-457a-9cda-1d68c6a903c8.mp4 | https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/be041616-4600-41dd-9e04-5bfa79b623b1.png |
| luxury-car-step-out | Luxury car step-out | POV hand opening a G-Wagon or Rolls door in a modern driveway, no face | Upbeat hip-hop |  |  |
| private-jet-cabin | Private jet cabin | Window seat POV, cream leather, clouds outside the window | Smooth luxury lounge | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260724_033030_6ffbb202-097b-4074-9fbc-0e5ed9d01942.mp4 | https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/26e5a447-8730-43c0-a323-398fb7f4361d.png |
| jet-boarding | Jet boarding | Tarmac steps up to a private jet at golden hour | Upbeat confident |  |  |
| rooftop-dinner | Rooftop dinner at dusk | Set table, wine glasses, and city-light bokeh | Warm jazz chill |  |  |
| beach-laptop | Laptop by the beach | Dark closed laptop on a wooden table, turquoise water, iced coffee | Tropical house chill | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260724_033017_9546947b-efaf-4b02-886d-6b6a90e38cd8.mp4 | https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/bdc76acd-40b0-4bd8-93ba-4bdcc841f664.png |
| penthouse-night | Penthouse night view | Floor-to-ceiling windows, city lights, moody interior | Dark ambient luxe |  |  |
| morning-gym | Morning gym | Dumbbell rack, sunrise through windows, empty gym | Motivational upbeat | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260724_033032_784b8ea0-d619-4707-b4c8-5ac694bba321.mp4 | https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/7614ea8a-2044-4533-bd3d-d83fa5db1c0a.png |
| coffee-shop-deep-work | Coffee-shop deep work | Latte art, open notebook, warm cafe light | Lofi |  |  |
| yacht-deck | Yacht deck | White deck, open water, wake behind the boat | Summer upbeat |  |  |
| hotel-suite-morning | Hotel suite morning | Room-service tray, robe on the bed, city view | Soft piano chill | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260724_033019_8af0feee-6f19-41a6-991d-c386b11a8e66.mp4 | https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/e52d48db-73fe-4176-9187-ec707a128412.png |
| desert-drive | Desert drive | Windshield POV, open road at sunset | Cinematic chill |  |  |
| golf-course | Golf course | Cart POV down a cypress-lined fairway in late afternoon | Easy acoustic | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260724_033043_aa502e8a-8ea0-44c8-989f-6ef1a8e56ec8.mp4 | https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/13abcba6-7a5f-41f9-9ce1-ea584a4977cd.png |
| modern-listing | Modern listing walkthrough | Bright, staged open-plan interior | Bright pop upbeat |  |  |
| plane-window | 35k-feet window | Plane window and wing over clouds at sunset | Dreamy ambient |  |  |
| luxury-hotel-valet | Valet at luxury hotel | Grand hotel porte-cochere at dusk, luxury car, warm lobby glow | Smooth luxury lounge | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260724_033045_a88b8be2-dc12-42a2-bca5-f74a960b3a3b.mp4 | https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/6cd21baf-a9fe-4c30-ba79-3ece3da0098c.png |
$references$,
  'text/markdown'
)
ON CONFLICT (skill_key, file_path) DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type;

INSERT INTO public.skill_library_resources (skill_key, file_path, content, content_type)
VALUES (
  'ig-organic-video-ad',
  'assets/render_ig_story.py',
  $python$import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

WIDTH = 1080
HEIGHT = 1920
APPROVED_EMOJIS = {"👇", "⏰", "✅", "🚨", "🙌"}


def font(path, size):
    return ImageFont.truetype(path, size)


def rounded_text(draw, canvas, text, y, font_value, fill, text_fill, radius=26, pad_x=30, pad_y=14):
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
        draw, output, spec["pill_line"], y, pill_font, "#4A9FF5", "#CEEBFF", radius=28
    )
    y += 74
    for line in spec["headline_lines"]:
        highlighted = bool(line.get("highlighted"))
        y = rounded_text(
            draw,
            output,
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
$python$,
  'text/x-python'
)
ON CONFLICT (skill_key, file_path) DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type;

INSERT INTO public.template_skill_assignments (template_key, skill_key, is_enabled)
VALUES ('designer', 'ig-organic-video-ad', true)
ON CONFLICT (template_key, skill_key) DO UPDATE SET is_enabled = true;

INSERT INTO public.agent_skills (
  user_id, org_id, agent_key, skill_key, name, description, markdown_content, is_enabled, source
)
SELECT NULL, NULL, target.agent_key, library.skill_key, library.name, library.description,
  library.markdown_content, true, 'system'
FROM (VALUES ('designer'), ('vibey')) AS target(agent_key)
CROSS JOIN public.skill_library library
WHERE skill_key = 'ig-organic-video-ad'
ON CONFLICT (agent_key, skill_key) WHERE user_id IS NULL AND org_id IS NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  markdown_content = EXCLUDED.markdown_content,
  is_enabled = true,
  source = 'system',
  updated_at = now();

INSERT INTO public.agent_skill_resources (
  user_id, org_id, agent_key, skill_key, file_path, content, content_type, storage_url
)
SELECT NULL, NULL, target.agent_key, resource.skill_key, resource.file_path, resource.content,
  resource.content_type, NULL
FROM (VALUES ('designer'), ('vibey')) AS target(agent_key)
CROSS JOIN public.skill_library_resources resource
WHERE resource.skill_key = 'ig-organic-video-ad'
ON CONFLICT (agent_key, skill_key, file_path) WHERE user_id IS NULL AND org_id IS NULL DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type,
  updated_at = now();

-- Backfill already-hired designers without overwriting user-authored copies.
INSERT INTO public.agent_skills (
  user_id, org_id, agent_key, skill_key, name, description, markdown_content, is_enabled, source
)
SELECT DISTINCT marker.user_id, marker.org_id, marker.agent_key, library.skill_key, library.name,
  library.description, library.markdown_content, true, 'template'
FROM public.agent_skills marker
CROSS JOIN public.skill_library library
WHERE marker.skill_key IN ('roas-ad-design', 'instagram-carousel-design')
  AND library.skill_key = 'ig-organic-video-ad'
  AND (marker.user_id IS NOT NULL OR marker.org_id IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1
    FROM public.agent_skills existing
    WHERE existing.agent_key = marker.agent_key
      AND existing.skill_key = library.skill_key
      AND existing.user_id IS NOT DISTINCT FROM marker.user_id
      AND existing.org_id IS NOT DISTINCT FROM marker.org_id
  );

INSERT INTO public.agent_skill_resources (
  user_id, org_id, agent_key, skill_key, file_path, content, content_type, storage_url
)
SELECT skill.user_id, skill.org_id, skill.agent_key, resource.skill_key, resource.file_path,
  resource.content, resource.content_type, NULL
FROM public.agent_skills skill
JOIN public.skill_library_resources resource ON resource.skill_key = skill.skill_key
WHERE skill.skill_key = 'ig-organic-video-ad'
  AND NOT EXISTS (
    SELECT 1
    FROM public.agent_skill_resources existing
    WHERE existing.agent_key = skill.agent_key
      AND existing.skill_key = skill.skill_key
      AND existing.file_path = resource.file_path
      AND existing.user_id IS NOT DISTINCT FROM skill.user_id
      AND existing.org_id IS NOT DISTINCT FROM skill.org_id
  );

COMMIT;
