# Video Production — Analysis & Thumbnails Reference

Non-destructive operations: inspect media, extract frames, generate visual assets from existing content.

---

## probe

Get metadata about a media file without processing it. No upload, no output file — just returns information.

```json
{
  "action": "process_media",
  "label": "Checking video info",
  "data": {
    "operation": "probe",
    "url": "https://..."
  }
}
```

### Returns

| Field               | Example | What it tells you                    |
| ------------------- | ------- | ------------------------------------ |
| `duration_seconds`  | 125.4   | Total length — for trim calculations |
| `video_codec`       | "h264"  | Encoding format                      |
| `audio_codec`       | "aac"   | Audio encoding                       |
| `width`             | 1920    | Frame width in pixels                |
| `height`            | 1080    | Frame height in pixels               |
| `fps`               | 30      | Frames per second                    |
| `bitrate`           | 4500000 | Bits per second (quality indicator)  |
| `audio_channels`    | 2       | Mono (1) or stereo (2)               |
| `audio_sample_rate` | 44100   | Audio sample rate                    |
| `format`            | "mp4"   | Container format                     |

### When to Probe

- **Before trimming**: Need the duration to calculate `duration_seconds` (e.g., "trim the last 10 seconds" requires knowing total length)
- **Before resizing**: Know the source resolution to make informed resize decisions
- **Before concat**: Verify all clips share the same codec/resolution/fps for clean concatenation
- **Debugging**: When an operation fails, probe the input to check if the file is valid

---

## thumbnail

Extract a single frame from a video as a still image.

```json
{
  "action": "process_media",
  "label": "Extracting thumbnail",
  "data": {
    "operation": "thumbnail",
    "url": "https://...",
    "timestamp": 5.5,
    "output_format": "jpg"
  }
}
```

### Timestamp Selection

Pick the right moment:

- **0 seconds**: First frame — often a black frame or title card, rarely the best choice
- **10–25% into the video**: Usually catches the hook or most engaging early moment
- **Key action moment**: If you know from `analyze_video` where the highlight is, target that timestamp
- **Face close-up**: Thumbnails with expressive faces get higher click-through rates

### Output Formats

| Format | Quality               | File size | Best for                           |
| ------ | --------------------- | --------- | ---------------------------------- |
| `jpg`  | Good (lossy)          | Smallest  | YouTube thumbnails, previews       |
| `png`  | Perfect (lossless)    | Larger    | Graphics that need further editing |
| `webp` | Good (lossy/lossless) | Small     | Web display                        |

---

## frame_extract

Extract multiple frames at regular intervals. Creates a visual timeline of the video content.

```json
{
  "action": "process_media",
  "label": "Creating storyboard",
  "data": {
    "operation": "frame_extract",
    "url": "https://...",
    "interval_seconds": 10,
    "max_frames": 12
  }
}
```

### Returns

Array of frame objects, each with:

- `url` — signed URL to the extracted frame image
- `timestamp` — time position in seconds
- `media_asset_id` — asset ID in campaign media

### Use Cases

| Use case             | Interval | Max frames | Why                                         |
| -------------------- | -------- | ---------- | ------------------------------------------- |
| Quick overview       | 10–15s   | 6–8        | Understand a long video at a glance         |
| Detailed storyboard  | 3–5s     | 20         | Plan edits with frame-level precision       |
| Thumbnail candidates | 5–10s    | 12         | Multiple options to pick the best thumbnail |
| Content audit        | 30–60s   | 10         | Spot-check a long recording                 |

---

## waveform

Generate a visual waveform image from audio content. Shows amplitude over time as a graphical representation.

```json
{
  "action": "process_media",
  "label": "Generating waveform",
  "data": {
    "operation": "waveform",
    "url": "https://podcast...",
    "width": 1920,
    "height": 200,
    "color": "white"
  }
}
```

### Use Cases

- **Podcast thumbnails**: Waveform image as the visual for an audio episode
- **Audio visualization**: Show the audio shape in social posts about music/podcasts
- **Editing aid**: Visually identify loud/quiet sections before trimming
- **Audiogram creation**: Combine waveform with a static image for video podcast clips

### Sizing Guide

| Use                          | Width | Height |
| ---------------------------- | ----- | ------ |
| YouTube thumbnail background | 1920  | 200    |
| Social media post            | 1080  | 300    |
| Inline preview               | 800   | 100    |

---

## Workflow: Thumbnail from Best Moment

1. **analyze_video** — Get transcript and frames to find the highlight
2. **Identify** the most engaging moment from transcript segments
3. **thumbnail** — Extract that exact frame
4. Optionally **color_grade** the thumbnail image for visual pop

---

## Workflow: Pre-Edit Analysis

Before editing unfamiliar footage:

1. **probe** — Get duration, resolution, fps, codec
2. **frame_extract** at 10s intervals — Visual scan of the content
3. **analyze_video** with `transcribe: true` — Get the full transcript with timestamps
4. Use transcript timestamps to plan trim points for `compose`

This "know before you cut" approach prevents wasted processing on wrong assumptions.
