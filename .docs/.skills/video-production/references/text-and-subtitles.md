# Video Production — Text & Subtitles Reference

Adding text, titles, lower-thirds, and burning subtitles into video.

---

## Text Overlay

Burn text directly into video frames using ffmpeg's drawtext filter. Text becomes a permanent part of the video — it cannot be turned off by the viewer.

```json
{
  "action": "process_media",
  "label": "Adding title text",
  "data": {
    "operation": "text_overlay",
    "url": "https://...",
    "text": "TOP 5 MARKETING TIPS",
    "font_size": 64,
    "font_color": "white",
    "position": "center",
    "background_color": "black@0.5",
    "start_time": 0,
    "end_time": 5
  }
}
```

### Position Presets

| Preset         | Placement                          | Typical use             |
| -------------- | ---------------------------------- | ----------------------- |
| `top`          | Centered horizontally, near top    | Section headers         |
| `center`       | Dead center                        | Title cards, intro text |
| `bottom`       | Centered horizontally, near bottom | Subtitles, CTAs         |
| `top-left`     | Upper left                         | Labels, context         |
| `top-right`    | Upper right                        | Timestamps, counters    |
| `bottom-left`  | Lower left                         | Source credits          |
| `bottom-right` | Lower right                        | Watermark text          |

### Background Box

`background_color` adds a colored box behind the text for readability:

- `"black@0.5"` — semi-transparent black (most common, reads on any background)
- `"black@0.8"` — nearly opaque black (high contrast)
- `"white@0.7"` — semi-transparent white (for dark footage)
- Omit for no background (text floats directly on video — use with bold/large text)

### Timed Text

Use `start_time` and `end_time` to show text only during specific sections. Omit both to show for the entire video.

Multiple text overlays require chaining: call `text_overlay` once, use the output URL as input for the next `text_overlay` call with different text/timing.

---

## Subtitle Burn-in

Burn SRT-formatted subtitles permanently into the video. Essential for social media where 85% of viewers watch without sound.

```json
{
  "action": "process_media",
  "label": "Burning captions",
  "data": {
    "operation": "subtitle_burn",
    "url": "https://video...",
    "subtitle_text": "1\n00:00:00,000 --> 00:00:03,000\nThis is the first caption\n\n2\n00:00:03,500 --> 00:00:07,000\nAnd here's the second one",
    "font_size": 28,
    "font_color": "white"
  }
}
```

### SRT Format

The `subtitle_text` field expects standard SRT format:

```
1
00:00:00,000 --> 00:00:03,000
First line of text

2
00:00:03,500 --> 00:00:07,000
Second line of text
```

Each entry has: sequence number, timestamp range (`HH:MM:SS,mmm`), and text content.

### Getting Subtitles

If the user doesn't have subtitle text:

1. Use `analyze_video` with `transcribe: true` to get `transcript_segments`
2. Convert the segments (which have `start`, `end`, `text`) into SRT format
3. Pass the SRT text to `subtitle_burn`

### Caption Styles by Platform

| Platform       | Font size | Style                                             |
| -------------- | --------- | ------------------------------------------------- |
| TikTok / Reels | 28–36     | Bold, centered bottom, often with background box  |
| YouTube        | 24–28     | Clean, bottom-center, semi-transparent background |
| Stories        | 32–40     | Large, centered, vibrant colors                   |

---

## Workflow: Auto-Caption a Video

1. **Transcribe** the video:

```json
{
  "action": "analyze_video",
  "label": "Transcribing",
  "data": {
    "media_url": "https://...",
    "transcribe": true,
    "extract_frames": false
  }
}
```

2. **Convert** transcript segments to SRT format (map `start`/`end` seconds to `HH:MM:SS,mmm` timestamps)

3. **Burn** subtitles:

```json
{
  "action": "process_media",
  "label": "Adding captions",
  "data": {
    "operation": "subtitle_burn",
    "url": "https://...",
    "subtitle_text": "<generated SRT>",
    "font_size": 30
  }
}
```

---

## Workflow: Title Card + Content + CTA

Chain three text overlays for a structured video:

1. **Title card** (0–5s): Large centered text on the opening
2. **Content** (5s–end): No text overlay (or minimal lower-third)
3. **CTA** (last 5s): "Follow for more" or "Link in bio" at bottom

Each step uses the previous output as input.

---

## Tips

- Keep text short — 3–6 words per overlay for social media
- Use high contrast — white text on dark footage, or add a background box
- Safe zones matter — TikTok/Reels UI covers the bottom 20% and top 10%, so place text in the center 70% of the frame
- One thought per caption — break long sentences into multiple timed captions (2–4 seconds each)
