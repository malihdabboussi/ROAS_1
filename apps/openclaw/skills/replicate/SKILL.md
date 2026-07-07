---
name: replicate
description: Generate images or videos via Replicate API (Nano Banana Pro for images, Veo 3.1 Fast for videos).
homepage: https://replicate.com
metadata:
  {
    "openclaw":
      {
        "emoji": "🎬",
        "requires": { "bins": ["uv"], "env": ["REPLICATE_API_TOKEN"] },
        "primaryEnv": "REPLICATE_API_TOKEN",
        "install":
          [
            {
              "id": "uv-brew",
              "kind": "brew",
              "formula": "uv",
              "bins": ["uv"],
              "label": "Install uv (brew)",
            },
          ],
      },
  }
---

# Replicate (Image & Video Generation)

Generate images or videos using Replicate's API. Uses Nano Banana Pro for images and Veo 3.1 Fast for videos.

## Image Generation

```bash
uv run {baseDir}/scripts/generate_image.py --prompt "your image description" --filename "output.png" [--aspect-ratio 1:1|16:9|9:16|3:2|4:3]
```

## Video Generation (Text-to-Video)

```bash
uv run {baseDir}/scripts/generate_video.py --prompt "a cat walking on the beach at sunset" --filename "output.mp4" [--aspect-ratio 16:9|9:16] [--duration 4|6|8]
```

## Image-to-Video

```bash
uv run {baseDir}/scripts/generate_video.py --prompt "gentle camera zoom" --filename "output.mp4" -i "input.png"
```

## API Key

- `REPLICATE_API_TOKEN` env var (get from [replicate.com/account](https://replicate.com/account))
- Or set `skills.replicate.apiKey` / `skills.replicate.env.REPLICATE_API_TOKEN` in `~/.openclaw/openclaw.json`

## Notes

- Image model: nano-banana-pro (google/nano-banana-pro)
- Video model: veo-3.1-fast (google/veo-3.1-fast, no audio)
- Scripts print `MEDIA:` line for OpenClaw to auto-attach on supported chat providers
- Video generation can take 1–3 minutes
