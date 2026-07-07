# Video Production — Compositing Reference

Layering content: overlays, picture-in-picture, green screen, and split screen.

---

## Overlay (Image)

Place a logo, watermark, or graphic on top of a video.

```json
{
  "action": "process_media",
  "label": "Adding logo",
  "data": {
    "operation": "overlay",
    "url": "https://video...",
    "overlay_url": "https://logo.png",
    "position": "top-right",
    "scale": 0.12,
    "opacity": 0.7
  }
}
```

### Position Presets

| Preset         | Placement                       | Typical use                 |
| -------------- | ------------------------------- | --------------------------- |
| `top-left`     | Upper left corner with padding  | Channel branding            |
| `top-right`    | Upper right corner with padding | Watermark                   |
| `bottom-left`  | Lower left corner               | Source attribution          |
| `bottom-right` | Lower right corner              | Logo (most common)          |
| `center`       | Dead center                     | Title cards, intro graphics |

For custom placement, use `x` and `y` pixel offsets instead of `position`.

### Scale and Opacity

- `scale`: 0.05–0.2 for watermarks, 0.3–0.5 for PiP, 1.0 for full-frame overlays
- `opacity`: 0.3–0.5 for subtle watermarks, 0.7–0.9 for visible but not dominant, 1.0 for opaque

---

## Overlay (Video — Picture in Picture)

Layer a video on top of another video. The classic facecam overlay for reaction videos, commentary, and tutorials.

```json
{
  "action": "process_media",
  "label": "Adding facecam",
  "data": {
    "operation": "overlay",
    "url": "https://gameplay...",
    "overlay_url": "https://facecam...",
    "position": "bottom-right",
    "scale": 0.3
  }
}
```

### Timed Overlays

Show the overlay only during specific sections:

```json
{
  "action": "process_media",
  "label": "Adding PiP segment",
  "data": {
    "operation": "overlay",
    "url": "https://video...",
    "overlay_url": "https://reaction-clip...",
    "position": "bottom-left",
    "scale": 0.35,
    "start_time": 10,
    "end_time": 45
  }
}
```

---

## Green Screen (Chroma Key)

Remove a solid-color background and optionally composite over a new background.

```json
{
  "action": "process_media",
  "label": "Removing green screen",
  "data": {
    "operation": "chroma_key",
    "url": "https://greenscreen-video...",
    "background_url": "https://office-background...",
    "color": "green",
    "similarity": 0.3,
    "blend": 0.1
  }
}
```

### Tuning Tips

- `color`: `green` (default) for green screens, `blue` for blue screens, or exact hex for custom colors
- `similarity`: Start at 0.3 — increase toward 0.5 if remnants of the screen color remain, decrease toward 0.1 if the subject is getting keyed out
- `blend`: Edge softness — 0.0 for hard edges, 0.1–0.2 for natural blending

### Without Background

Omit `background_url` to get a video with transparency (requires output format that supports alpha, like webm).

---

## Split Screen

Display multiple videos simultaneously in a grid or side-by-side layout.

```json
{
  "action": "process_media",
  "label": "Creating split screen",
  "data": {
    "operation": "split_screen",
    "inputs": [{ "url": "https://left..." }, { "url": "https://right..." }],
    "layout": "horizontal"
  }
}
```

### Layouts

| Layout       | Description                   | Best for                                    |
| ------------ | ----------------------------- | ------------------------------------------- |
| `horizontal` | Side by side (2 videos)       | Before/after comparisons, dual perspectives |
| `vertical`   | Stacked top/bottom (2 videos) | Vertical content comparisons                |
| `grid`       | 2x2 grid (4 videos)           | Multi-cam, reaction compilations            |

All inputs are scaled to fit their grid cell. Duration matches the shortest input.

---

## Workflow: Reaction Video

1. **Get the original video** from the user's media library
2. **Record or obtain the reaction footage** (facecam)
3. **Overlay** the facecam as picture-in-picture:

```json
{
  "action": "process_media",
  "label": "Building reaction video",
  "data": {
    "operation": "overlay",
    "url": "https://original-video...",
    "overlay_url": "https://facecam...",
    "position": "bottom-right",
    "scale": 0.3
  }
}
```

4. **Crop** to vertical if targeting Reels/TikTok
5. **Add captions** via `text_overlay` or `subtitle_burn`

---

## Workflow: Branded Content

1. **Color grade** the footage to match brand aesthetics
2. **Overlay** brand logo watermark (small, semi-transparent, corner)
3. **Text overlay** for title/CTA at beginning and end
4. **Resize** for target platform
