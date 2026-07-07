# Video Production — Analysis Reference

When and how to use `analyze_video` and `extract_url_transcript` for understanding video content before editing or as standalone analysis.

---

## analyze_video

Extracts frames and transcribes audio from a video file. Use when you have a direct URL to a video file (Supabase media, uploaded file, direct MP4 link).

```json
{"action": "analyze_video", "label": "Analyzing your video", "data": {
  "media_url": "https://...",
  "extract_frames": true,
  "transcribe": true,
  "frame_count": 12,
  "frame_interval_seconds": 5
}}
```

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `media_url` | string | required | Direct URL to video file |
| `extract_frames` | boolean | true | Extract still frames |
| `transcribe` | boolean | true | Transcribe audio via Deepgram |
| `frame_count` | number | 12 | Number of frames to extract (max 200) |
| `frame_interval_seconds` | number | auto | Fixed interval between frames (overrides frame_count) |

Returns:
- `frames` — array of `{ index, timestamp_seconds, url, media_asset_id }` for each extracted frame
- `transcript` — full text transcript
- `transcript_segments` — array of `{ start, end, text }` with timestamps

### When to Use
- User uploads a video and asks "what's in this?"
- Pre-editing analysis — understand the content to plan trim points
- Extracting quotes/segments — use transcript timestamps to identify good moments
- Thumbnail generation — extracted frames can be used as thumbnails

---

## extract_url_transcript

Extracts transcripts from video platforms (YouTube, TikTok, Instagram, etc.). Tries native captions first, falls back to audio download + AI transcription.

```json
{"action": "extract_url_transcript", "label": "Getting transcript", "data": {
  "url": "https://www.youtube.com/watch?v=...",
  "lang": "en",
  "include_metadata": true
}}
```

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `url` | string | required | Video platform URL |
| `lang` | string | "en" | Preferred language for captions |
| `include_metadata` | boolean | true | Include title and duration |

Returns:
- `platform` — detected platform (youtube, tiktok, instagram, x, facebook, unknown)
- `transcript` — full text
- `segments` — timestamped segments `{ start, end, text }`
- `metadata` — `{ title, duration_seconds }` (if include_metadata is true)
- `source` — "native_captions" or "ai_transcription"

### When to Use
- User shares a YouTube/TikTok/social media link and wants content extracted
- Research phase — understand what a competitor's video covers
- Content repurposing — get the script from an existing video to rework it

---

## Analyze-Then-Edit Workflow

The most powerful pattern: use analysis to inform production decisions.

**Step 1 — Analyze the source material:**
```json
{"action": "analyze_video", "label": "Analyzing your video", "data": {
  "media_url": "https://long-interview...",
  "transcribe": true,
  "frame_count": 24
}}
```

**Step 2 — Read the transcript segments:**
Look for the best quotes, key moments, emotional peaks. Note their `start` and `end` timestamps.

**Step 3 — Plan the edit:**
Based on the transcript, decide which segments to keep and in what order. Map each segment to a `trim_start` and `trim_duration`.

**Step 4 — Produce:**
```json
{"action": "process_media", "label": "Building your highlight reel", "data": {
  "operation": "compose",
  "inputs": [
    {"url": "https://long-interview...", "trim_start": 45, "trim_duration": 15},
    {"url": "https://long-interview...", "trim_start": 120, "trim_duration": 20},
    {"url": "https://long-interview...", "trim_start": 305, "trim_duration": 10}
  ],
  "output_format": "mp4",
  "resolution": "1080x1920"
}}
```

Notice: the same source URL appears multiple times with different trim points. This is how you pull multiple segments from one long video.

---

## Combining URL Transcript with Production

**Scenario:** User wants to repurpose a YouTube video into a shorter clip.

1. `extract_url_transcript` — get the full transcript with timestamps
2. Identify the best 30–60 seconds based on content
3. Download or reference the video URL
4. `process_media` trim — cut to the identified segment
5. `process_media` resize — adjust for target platform

This turns a 10-minute YouTube video into a 45-second Reel with the best content preserved.
