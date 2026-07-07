---
name: video-production
description: Produce, edit, and analyze video and audio using server-side ffmpeg. Use when the user mentions video editing, trimming, combining clips, adding effects, color grading, overlays, text, subtitles, transitions, speed changes, thumbnails, silence removal, audio effects, resizing for social media, or any work with existing video/audio files. Also covers video analysis, transcription, and frame extraction. If the request involves working with existing media rather than generating new content from text prompts, this is the right skill.
---

# Video Production

Server-side video and audio processing powered by ffmpeg. From basic trims to full post-production pipelines — color grading, compositing, text overlays, transitions, audio effects, silence removal, and platform-specific exports.

---

## What You Can Do

| Action                   | Type          | Capabilities                                               |
| ------------------------ | ------------- | ---------------------------------------------------------- |
| `process_media`          | Production    | 21 operations — see decision tree below                    |
| `analyze_video`          | Analysis      | Extract frames + transcribe audio from a video file        |
| `extract_url_transcript` | Analysis      | Pull transcript from YouTube, TikTok, and other video URLs |
| `generate_video`         | AI Generation | Create new video from a text prompt (NOT this skill)       |

When a user says "make me a video," figure out which they mean:

- "Trim 500ms from this audio" → `process_media` (trim)
- "Add reverb to this track" → `process_media` (audio_effect)
- "Put my logo on this video" → `process_media` (overlay)
- "Make a highlight reel from these clips" → `process_media` (compose)
- "Make me a video of a cat surfing" → `generate_video` (not this skill)
- "What's in this video?" → `analyze_video`

---

## Decision Tree

```
User request about video/audio
├── Working with EXISTING files?
│   ├── Understand/analyze content
│   │   ├── Get metadata (duration, codec, fps) → probe
│   │   ├── What's in this video? → analyze_video
│   │   └── Get transcript from URL → extract_url_transcript
│   │
│   ├── Structural editing
│   │   ├── Cut a segment → trim
│   │   ├── Join clips end-to-end → concat
│   │   ├── Change format → convert
│   │   ├── Full pipeline (trim+concat+audio+resize) → compose
│   │   ├── Play backwards → reverse
│   │   ├── Repeat/loop content → loop
│   │   └── Change playback speed → speed
│   │
│   ├── Visual effects
│   │   ├── Color correction/grading → color_grade
│   │   ├── Blur (censor, dreamy) → blur
│   │   ├── Sharpen footage → sharpen
│   │   ├── Dark edge vignette → vignette
│   │   ├── Reduce noise/grain → denoise
│   │   └── Smooth shaky footage → stabilize
│   │
│   ├── Compositing (layering)
│   │   ├── Logo/watermark/PiP → overlay
│   │   ├── Green screen removal → chroma_key
│   │   ├── Side-by-side grid → split_screen
│   │   ├── Add text/titles → text_overlay
│   │   └── Burn subtitles → subtitle_burn
│   │
│   ├── Transitions
│   │   └── Crossfade/wipe between clips → transition
│   │
│   ├── Audio
│   │   ├── Extract audio track → extract_audio
│   │   ├── Add/replace audio → add_audio
│   │   ├── Effects (reverb, echo, fade, pitch, normalize, etc.) → audio_effect
│   │   └── Remove silence (auto jump-cuts) → silence_remove
│   │
│   ├── Platform export
│   │   ├── Change resolution/aspect → resize
│   │   └── Crop (cut frame area) → crop
│   │
│   └── Asset generation
│       ├── Extract thumbnail frame → thumbnail
│       ├── Extract frames at intervals → frame_extract
│       └── Audio waveform image → waveform
│
└── CREATE new video from description?
    └── generate_video (not this skill)
```

---

## Pre-Production Gates

Before running any operation, check these gates.

### Gate 1 — Source Material

The agent needs URLs. Check with `list_campaign_media` or look for uploads in the conversation context. If no source material exists, ask the user.

### Gate 2 — Target Platform

Output format depends on destination. Ask if the user hasn't specified. Read `references/social-media-video.md` for platform specs.

### Gate 3 — Know Before You Edit

For unfamiliar source material, run `probe` first to get duration, codec, resolution, and fps. This prevents wasted processing from wrong assumptions.

---

## Core Production Workflows

### Quick Trim

```json
{
  "action": "process_media",
  "label": "Trimming your clip",
  "data": {
    "operation": "trim",
    "url": "https://...",
    "start_seconds": 10,
    "duration_seconds": 30
  }
}
```

### Full Compose (trim + concat + audio + resize in one call)

```json
{
  "action": "process_media",
  "label": "Producing your video",
  "data": {
    "operation": "compose",
    "inputs": [
      { "url": "https://intro...", "trim_start": 0, "trim_duration": 5 },
      { "url": "https://main...", "trim_start": 12, "trim_duration": 30 },
      { "url": "https://outro...", "trim_start": 0, "trim_duration": 10 }
    ],
    "audio_url": "https://music...",
    "output_format": "mp4",
    "resolution": "1080x1920"
  }
}
```

### Audio Effect

```json
{
  "action": "process_media",
  "label": "Adding reverb",
  "data": {
    "operation": "audio_effect",
    "url": "https://...",
    "effect": "reverb",
    "delay_ms": 60,
    "decay": 0.4,
    "output_format": "mp3"
  }
}
```

### Overlay (logo/PiP)

```json
{
  "action": "process_media",
  "label": "Adding your logo",
  "data": {
    "operation": "overlay",
    "url": "https://video...",
    "overlay_url": "https://logo.png",
    "position": "top-right",
    "scale": 0.15,
    "opacity": 0.8
  }
}
```

### Silence Removal (auto jump-cuts)

```json
{
  "action": "process_media",
  "label": "Removing dead air",
  "data": {
    "operation": "silence_remove",
    "url": "https://...",
    "threshold_db": -30,
    "min_silence_duration": 0.5
  }
}
```

---

## Reference Files

For complete parameter docs on every operation, read `references/operations.md`.

| Topic                                              | Reference File                          |
| -------------------------------------------------- | --------------------------------------- |
| All operation parameters                           | `references/operations.md`              |
| Color grading, blur, sharpen, vignette, denoise    | `references/color-and-effects.md`       |
| Overlays, PiP, green screen, split screen          | `references/compositing.md`             |
| Text overlays and subtitle burn-in                 | `references/text-and-subtitles.md`      |
| Transitions, speed ramps, reverse, pacing          | `references/transitions-and-pacing.md`  |
| Probe, thumbnails, frame extraction, waveform      | `references/analysis-and-thumbnails.md` |
| Audio extraction, mixing, effects, silence removal | `references/audio-production.md`        |
| Platform specs (Reels, TikTok, Shorts, YouTube)    | `references/social-media-video.md`      |
| Long-form assembly, structure planning             | `references/long-form-video.md`         |
| Video analysis and transcript workflows            | `references/video-analysis.md`          |

---

## Limits

- Max 500MB per input file
- Max 1GB total across all inputs
- Max 20 input files per call
- 120 second processing timeout
- Only HTTP/HTTPS URLs accepted
- Output formats: mp4, webm, mov, mkv, mp3, wav, ogg, aac, gif

---

## Ecology

- **Depends on:** campaign media (source assets via `list_campaign_media`), theme (brand consistency)
- **Feeds into:** social-content-builder, ad-builder, reel-editor, youtube-editor
- **Connected to:** `generate_video` (AI-generated clips can be inputs for post-production), `generate_image` (generated images for overlays/thumbnails)
