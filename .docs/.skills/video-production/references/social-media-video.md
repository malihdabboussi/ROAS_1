# Video Production — Social Media Reference

Platform-specific specs and production patterns for social media video.

---

## Platform Specs

### Instagram Reels
- **Aspect ratio:** 9:16 (vertical)
- **Resolution:** 1080x1920
- **Duration:** 15–90 seconds (30–60s performs best)
- **Format:** MP4 (H.264)
- **Safe zone:** Keep text/key visuals within center 80% — edges get covered by UI (username, caption, share button)

### TikTok
- **Aspect ratio:** 9:16 (vertical)
- **Resolution:** 1080x1920
- **Duration:** 15–60 seconds optimal (up to 10 min allowed, but short performs better)
- **Format:** MP4
- **Safe zone:** Bottom 20% and top 10% have UI overlays

### YouTube Shorts
- **Aspect ratio:** 9:16 (vertical)
- **Resolution:** 1080x1920
- **Duration:** Up to 60 seconds
- **Format:** MP4
- **Safe zone:** Similar to Reels — keep key content centered

### Instagram Stories
- **Aspect ratio:** 9:16 (vertical)
- **Resolution:** 1080x1920
- **Duration:** Up to 15 seconds per story segment
- **Format:** MP4
- **Note:** For longer content, split into 15s segments

### Facebook / LinkedIn Feed
- **Aspect ratio:** 1:1 (square) or 16:9 (landscape)
- **Resolution:** 1080x1080 (square) or 1920x1080 (landscape)
- **Duration:** Up to 240 minutes (but 30–120s is optimal for feed)
- **Format:** MP4

### Twitter/X
- **Aspect ratio:** 16:9 (landscape) or 1:1 (square)
- **Resolution:** 1920x1080 or 1080x1080
- **Duration:** Up to 2 minutes 20 seconds
- **Format:** MP4

### YouTube (standard)
- **Aspect ratio:** 16:9 (landscape)
- **Resolution:** 1920x1080 (1080p) or 3840x2160 (4K)
- **Duration:** No practical limit (8–15 min optimal for most content)
- **Format:** MP4

---

## Quick Reference Table

| Platform | Ratio | Resolution | Max Duration | Optimal Duration |
|----------|-------|------------|-------------|-----------------|
| Reels | 9:16 | 1080x1920 | 90s | 30–60s |
| TikTok | 9:16 | 1080x1920 | 10min | 15–60s |
| Shorts | 9:16 | 1080x1920 | 60s | 30–60s |
| Stories | 9:16 | 1080x1920 | 15s/segment | 15s |
| FB/LI Feed | 1:1 / 16:9 | 1080x1080 / 1920x1080 | 240min | 30–120s |
| Twitter/X | 16:9 | 1920x1080 | 2:20 | 30–60s |
| YouTube | 16:9 | 1920x1080 | none | 8–15min |

---

## Example: Build a 30-Second Reel from 3 Clips

User has 3 clips in their media library. Goal: trim each to the best segment, combine, add trending audio, export for Reels.

**Step 1 — Check media library:**
```json
{"action": "list_campaign_media", "label": "Loading your clips", "data": {"asset_type": "video"}}
```

**Step 2 — Produce the Reel:**
```json
{"action": "process_media", "label": "Producing your Reel", "data": {
  "operation": "compose",
  "inputs": [
    {"url": "https://clip1...", "trim_start": 2, "trim_duration": 10},
    {"url": "https://clip2...", "trim_start": 0, "trim_duration": 12},
    {"url": "https://clip3...", "trim_start": 5, "trim_duration": 8}
  ],
  "audio_url": "https://music-track...",
  "output_format": "mp4",
  "resolution": "1080x1920"
}}
```

Total: 10 + 12 + 8 = 30 seconds. Audio is trimmed to match video duration automatically.

---

## Example: Repurpose a YouTube Video to TikTok

User has a 16:9 landscape video and wants it vertical for TikTok.

```json
{"action": "process_media", "label": "Resizing for TikTok", "data": {
  "operation": "resize",
  "url": "https://youtube-video...",
  "resolution": "1080x1920",
  "output_format": "mp4"
}}
```

The resize operation adds letterboxing to maintain the original content without cropping. If the source is too long, trim first:

```json
{"action": "process_media", "label": "Trimming for TikTok", "data": {
  "operation": "trim",
  "url": "https://resized-video...",
  "start_seconds": 0,
  "duration_seconds": 60
}}
```

---

## Production Tips

- **Hook in first 3 seconds** — place the most engaging clip first in a compose sequence
- **Audio matters** — videos with background music get significantly more engagement. Always consider adding audio via `add_audio` or `compose` with `audio_url`
- **Match the platform** — always resize to the target platform's native resolution. Letterboxed videos look amateur in vertical feeds
- **Optimal pacing** — for short-form (Reels/TikTok), keep individual clips between 3–8 seconds each. Rapid cuts work better than long static shots
- **Duration sweet spot** — 30–45 seconds is the engagement sweet spot for most short-form platforms
