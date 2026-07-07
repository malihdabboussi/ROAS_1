# Video Production — Long-Form Reference

Multi-clip assembly for YouTube, presentations, course content, and promotional videos longer than 90 seconds.

---

## Structure Planning

Long-form video benefits from deliberate structure. Before calling `process_media`, plan the sequence:

### Standard Structure

1. **Hook** (0–5s) — Most compelling moment, attention grab
2. **Intro** (5–15s) — Context, branding, what the viewer will get
3. **Body segments** (15s–end) — Core content, each segment focused on one point
4. **Outro** (last 10–15s) — Call to action, branding, next steps

### Interview / Testimonial Structure

1. **Teaser** (0–5s) — Best quote or moment from the interview
2. **Introduction** (5–15s) — Who is speaking, context
3. **Main content** — Key quotes and moments, trimmed for pacing
4. **Closing statement** — Final thought + CTA

### Product / Promo Structure

1. **Problem hook** (0–5s) — Pain point the audience relates to
2. **Solution intro** (5–15s) — Your product/service enters
3. **Feature highlights** — 3–5 key benefits, one per segment
4. **Social proof** (testimonial clip if available)
5. **CTA** — Clear next step

---

## Working with Many Clips

The `compose` operation supports up to 20 inputs. For videos built from many short clips:

```json
{"action": "process_media", "label": "Building your video", "data": {
  "operation": "compose",
  "inputs": [
    {"url": "https://hook...", "trim_start": 0, "trim_duration": 5},
    {"url": "https://intro...", "trim_start": 0, "trim_duration": 10},
    {"url": "https://segment1...", "trim_start": 3, "trim_duration": 25},
    {"url": "https://segment2...", "trim_start": 0, "trim_duration": 30},
    {"url": "https://segment3...", "trim_start": 10, "trim_duration": 20},
    {"url": "https://testimonial...", "trim_start": 5, "trim_duration": 15},
    {"url": "https://cta...", "trim_start": 0, "trim_duration": 10}
  ],
  "audio_url": "https://background-music...",
  "output_format": "mp4",
  "resolution": "1920x1080"
}}
```

Total: 5+10+25+30+20+15+10 = 115 seconds (~2 minutes).

---

## Audio Track Management

### Background Music

Add background music that plays under the original audio (speech, ambient sound):

```json
{"action": "process_media", "label": "Adding background music", "data": {
  "operation": "add_audio",
  "video_url": "https://assembled-video...",
  "audio_url": "https://music...",
  "replace": false
}}
```

`replace: false` mixes both tracks. The music plays alongside any existing audio. The mix uses ffmpeg's `amix` filter with `dropout_transition=2` for smooth blending.

### Full Audio Replacement

For voiceover or narration that completely replaces the original sound:

```json
{"action": "process_media", "label": "Adding voiceover", "data": {
  "operation": "add_audio",
  "video_url": "https://assembled-video...",
  "audio_url": "https://voiceover...",
  "replace": true
}}
```

### Using compose with Audio

The `compose` operation's `audio_url` parameter replaces the audio track of the final assembled video. If you want to keep original audio AND add music, assemble first with `compose` (no `audio_url`), then use `add_audio` with `replace: false` as a second step.

---

## Duration Management

- **Calculate total before composing** — add up all `trim_duration` values to predict final length
- **120s timeout** — processing must complete within 120 seconds. For very long videos with many inputs, the concatenation step is the bottleneck
- **Audio matching** — when using `audio_url` in compose, the output duration is the shorter of video/audio. If your music track is shorter than the assembled video, the audio will cut off. Use a long enough music track or loop it externally first

---

## Multi-Step Workflow for Complex Productions

For productions that need more control than a single `compose` call:

1. **Trim** individual clips to their best segments (parallel calls if needed)
2. **Concat** the trimmed clips in order
3. **Add audio** — mix background music with the concatenated result
4. **Resize** for the final target platform

Each step returns a URL that becomes the input for the next step.

---

## Example: 3-Minute YouTube Video from 8 Clips

```json
{"action": "process_media", "label": "Producing your YouTube video", "data": {
  "operation": "compose",
  "inputs": [
    {"url": "https://hook-clip...", "trim_duration": 5},
    {"url": "https://intro...", "trim_duration": 15},
    {"url": "https://point1...", "trim_start": 5, "trim_duration": 30},
    {"url": "https://point2...", "trim_start": 0, "trim_duration": 25},
    {"url": "https://point3...", "trim_start": 10, "trim_duration": 35},
    {"url": "https://demo...", "trim_start": 0, "trim_duration": 30},
    {"url": "https://testimonial...", "trim_start": 3, "trim_duration": 20},
    {"url": "https://outro...", "trim_duration": 15}
  ],
  "audio_url": "https://background-music...",
  "output_format": "mp4",
  "resolution": "1920x1080"
}}
```

Total: 5+15+30+25+35+30+20+15 = 175 seconds (~2:55).
