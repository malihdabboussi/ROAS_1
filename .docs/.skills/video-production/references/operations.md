# Video Production — Operations Reference

Complete parameter documentation for every `process_media` operation.

---

## trim

Cut a segment from a single media file. Uses stream copy for speed — cut points may snap to the nearest keyframe.

| Param              | Type   | Required | Default | Description                  |
| ------------------ | ------ | -------- | ------- | ---------------------------- |
| `url`              | string | yes      |         | Source media URL             |
| `start_seconds`    | number | no       | 0       | Start position               |
| `duration_seconds` | number | yes      |         | Length of segment to extract |
| `output_format`    | string | no       | mp4     | Output format                |

```json
{
  "action": "process_media",
  "label": "Trimming clip",
  "data": {
    "operation": "trim",
    "url": "https://...",
    "start_seconds": 15,
    "duration_seconds": 30
  }
}
```

---

## concat

Join multiple media files end-to-end. All inputs should share the same codec, resolution, and frame rate for clean results. If they differ, use `compose` instead.

| Param           | Type   | Required | Default | Description                        |
| --------------- | ------ | -------- | ------- | ---------------------------------- |
| `inputs`        | array  | yes      |         | Array of `{ url }` objects (min 2) |
| `output_format` | string | no       | mp4     | Output format                      |

```json
{
  "action": "process_media",
  "label": "Joining clips",
  "data": {
    "operation": "concat",
    "inputs": [{ "url": "https://clip1..." }, { "url": "https://clip2..." }],
    "output_format": "mp4"
  }
}
```

---

## convert

Change the container format or codec of a media file. Re-encodes the file.

| Param           | Type   | Required | Description                                                  |
| --------------- | ------ | -------- | ------------------------------------------------------------ |
| `url`           | string | yes      | Source media URL                                             |
| `output_format` | string | yes      | Target format (mp4, webm, mp3, wav, gif, mov, mkv, aac, ogg) |

---

## extract_audio

Pull the audio track from a video file. Strips the video stream.

| Param           | Type   | Required | Default | Description                       |
| --------------- | ------ | -------- | ------- | --------------------------------- |
| `url`           | string | yes      |         | Source video URL                  |
| `output_format` | string | no       | mp3     | Audio format (mp3, wav, ogg, aac) |

---

## add_audio

Add an audio track to a video. Either mix with existing audio or replace entirely.

| Param           | Type    | Required | Default | Description                                         |
| --------------- | ------- | -------- | ------- | --------------------------------------------------- |
| `video_url`     | string  | yes      |         | Source video URL                                    |
| `audio_url`     | string  | yes      |         | Audio track URL                                     |
| `replace`       | boolean | no       | false   | `true` = discard original audio, `false` = mix both |
| `output_format` | string  | no       | mp4     | Output format                                       |

When mixing (`replace: false`), both tracks play simultaneously. Output duration matches the shorter track.

---

## resize

Change resolution and aspect ratio. Maintains aspect ratio with letterboxing/pillarboxing — never stretches or crops.

| Param           | Type   | Required | Default | Description                                 |
| --------------- | ------ | -------- | ------- | ------------------------------------------- |
| `url`           | string | yes      |         | Source video URL                            |
| `resolution`    | string | yes      |         | Target as `WIDTHxHEIGHT` (e.g. "1080x1920") |
| `output_format` | string | no       | mp4     | Output format                               |

---

## compose

Full production pipeline. Trim each input, concatenate, optionally add audio, optionally resize — one call.

| Param           | Type   | Required | Default | Description                                             |
| --------------- | ------ | -------- | ------- | ------------------------------------------------------- |
| `inputs`        | array  | yes      |         | Array of `{ url, trim_start?, trim_duration? }` (min 1) |
| `audio_url`     | string | no       |         | Background audio track URL                              |
| `output_format` | string | no       | mp4     | Output format                                           |
| `resolution`    | string | no       |         | Target as `WIDTHxHEIGHT`                                |

Processing order: trim each input → concat → add audio → resize → export.

---

## audio_effect

Apply DSP audio effects to an audio or video file.

| Param           | Type   | Required | Default | Description                   |
| --------------- | ------ | -------- | ------- | ----------------------------- |
| `url`           | string | yes      |         | Source media URL              |
| `effect`        | string | yes      |         | Effect name (see table below) |
| `output_format` | string | no       | mp3     | Output format                 |
| (effect params) | number | no       |         | Per-effect parameters         |

| Effect       | Params                                                         | What it does                                  |
| ------------ | -------------------------------------------------------------- | --------------------------------------------- |
| `reverb`     | `in_gain`(0.8), `out_gain`(0.88), `delay_ms`(60), `decay`(0.4) | Room ambience / space                         |
| `echo`       | `in_gain`(0.8), `out_gain`(0.9), `delay_ms`(500), `decay`(0.5) | Distinct echo repeats                         |
| `fade_in`    | `duration`(2)                                                  | Gradually increase volume from silence        |
| `fade_out`   | `start`(0), `duration`(2)                                      | Gradually decrease volume to silence          |
| `volume`     | `level`(1.5)                                                   | Adjust volume (1.0 = unchanged, 2.0 = double) |
| `pitch`      | `semitones`(0)                                                 | Shift pitch up/down by semitones              |
| `normalize`  | (none)                                                         | EBU R128 loudness normalization (-16 LUFS)    |
| `bass_boost` | `gain_db`(6)                                                   | Boost bass frequencies around 80Hz            |
| `speed`      | `factor`(1.0)                                                  | Change audio speed (0.5–2.0, preserves pitch) |

```json
{
  "action": "process_media",
  "label": "Normalizing audio",
  "data": {
    "operation": "audio_effect",
    "url": "https://...",
    "effect": "normalize"
  }
}
```

---

## probe

Get media metadata without processing or uploading. Returns duration, codec, resolution, fps, bitrate, audio channels.

| Param | Type   | Required | Description      |
| ----- | ------ | -------- | ---------------- |
| `url` | string | yes      | Source media URL |

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

Returns: `{ duration_seconds, video_codec, audio_codec, width, height, fps, bitrate, audio_channels, audio_sample_rate, format }`

Use before editing unfamiliar files — know the duration for trim calculations, resolution for resize decisions, and codec for compatibility.

---

## speed

Change playback speed of video and audio. Audio pitch is preserved.

| Param           | Type   | Required | Default | Description                                                    |
| --------------- | ------ | -------- | ------- | -------------------------------------------------------------- |
| `url`           | string | yes      |         | Source media URL                                               |
| `factor`        | number | yes      |         | Speed multiplier (0.25–4.0). Below 1 = slow-mo, above 1 = fast |
| `output_format` | string | no       | mp4     | Output format                                                  |

ffmpeg uses `setpts` for video and chained `atempo` for audio (atempo only accepts 0.5–2.0, so 4x chains two 2.0 passes).

```json
{
  "action": "process_media",
  "label": "Slow-mo reveal",
  "data": {
    "operation": "speed",
    "url": "https://...",
    "factor": 0.5
  }
}
```

---

## reverse

Play video and audio backwards.

| Param           | Type   | Required | Default | Description      |
| --------------- | ------ | -------- | ------- | ---------------- |
| `url`           | string | yes      |         | Source media URL |
| `output_format` | string | no       | mp4     | Output format    |

Re-encodes the entire file. Works best on short clips (under 30s) due to memory requirements.

---

## loop

Loop video or audio content N times.

| Param           | Type   | Required | Default | Description                    |
| --------------- | ------ | -------- | ------- | ------------------------------ |
| `url`           | string | yes      |         | Source media URL               |
| `count`         | number | yes      |         | Number of times to loop (2–10) |
| `output_format` | string | no       | mp4     | Output format                  |

Use to extend short background music to match a longer video, or loop a short clip for a hypnotic effect.

---

## crop

Cut a rectangular region from the video frame. Unlike resize (which scales), crop removes pixels outside the selected area.

| Param           | Type   | Required | Default  | Description                  |
| --------------- | ------ | -------- | -------- | ---------------------------- |
| `url`           | string | yes      |          | Source media URL             |
| `width`         | number | yes      |          | Crop region width in pixels  |
| `height`        | number | yes      |          | Crop region height in pixels |
| `x`             | number | no       | centered | Left offset in pixels        |
| `y`             | number | no       | centered | Top offset in pixels         |
| `output_format` | string | no       | mp4      | Output format                |

Use to reframe landscape to portrait by cropping the center, or to focus on a specific area of the frame.

```json
{
  "action": "process_media",
  "label": "Cropping to vertical",
  "data": {
    "operation": "crop",
    "url": "https://...",
    "width": 608,
    "height": 1080,
    "output_format": "mp4"
  }
}
```

---

## overlay

Layer an image or video on top of another video. Supports watermarks, logos, picture-in-picture, and facecam overlays.

| Param           | Type   | Required | Default      | Description                                                              |
| --------------- | ------ | -------- | ------------ | ------------------------------------------------------------------------ |
| `url`           | string | yes      |              | Base video URL                                                           |
| `overlay_url`   | string | yes      |              | Image or video to overlay                                                |
| `position`      | string | no       | bottom-right | Preset: `top-left`, `top-right`, `bottom-left`, `bottom-right`, `center` |
| `x`             | number | no       |              | Custom X offset (overrides position)                                     |
| `y`             | number | no       |              | Custom Y offset (overrides position)                                     |
| `scale`         | number | no       | 1.0          | Scale the overlay (0.1–1.0)                                              |
| `opacity`       | number | no       | 1.0          | Overlay opacity (0.0–1.0)                                                |
| `start_time`    | number | no       | 0            | When overlay appears (seconds)                                           |
| `end_time`      | number | no       |              | When overlay disappears (omit = entire video)                            |
| `output_format` | string | no       | mp4          | Output format                                                            |

```json
{
  "action": "process_media",
  "label": "Adding watermark",
  "data": {
    "operation": "overlay",
    "url": "https://video...",
    "overlay_url": "https://logo.png",
    "position": "bottom-right",
    "scale": 0.12,
    "opacity": 0.7
  }
}
```

---

## text_overlay

Burn text directly into the video using ffmpeg's drawtext filter.

| Param              | Type   | Required | Default | Description                                                                               |
| ------------------ | ------ | -------- | ------- | ----------------------------------------------------------------------------------------- |
| `url`              | string | yes      |         | Source video URL                                                                          |
| `text`             | string | yes      |         | Text to display                                                                           |
| `font_size`        | number | no       | 48      | Font size in pixels                                                                       |
| `font_color`       | string | no       | white   | Color name or hex (e.g. "yellow", "0xFF0000")                                             |
| `position`         | string | no       | center  | Preset: `top`, `center`, `bottom`, `top-left`, `top-right`, `bottom-left`, `bottom-right` |
| `background_color` | string | no       |         | Background box color (e.g. "black@0.5" for semi-transparent)                              |
| `start_time`       | number | no       | 0       | When text appears (seconds)                                                               |
| `end_time`         | number | no       |         | When text disappears (omit = entire video)                                                |
| `output_format`    | string | no       | mp4     | Output format                                                                             |

```json
{
  "action": "process_media",
  "label": "Adding title",
  "data": {
    "operation": "text_overlay",
    "url": "https://...",
    "text": "SUBSCRIBE",
    "font_size": 64,
    "font_color": "white",
    "position": "bottom",
    "background_color": "black@0.6",
    "start_time": 2,
    "end_time": 8
  }
}
```

---

## subtitle_burn

Burn SRT subtitle text into the video. Subtitles become permanent part of the video frames — essential for social media where most viewers watch muted.

| Param           | Type   | Required | Default | Description                    |
| --------------- | ------ | -------- | ------- | ------------------------------ |
| `url`           | string | yes      |         | Source video URL               |
| `subtitle_text` | string | yes      |         | SRT-formatted subtitle content |
| `font_size`     | number | no       | 24      | Subtitle font size             |
| `font_color`    | string | no       | white   | Subtitle text color            |
| `output_format` | string | no       | mp4     | Output format                  |

---

## transition

Apply a crossfade or visual transition between two video clips. ffmpeg supports 30+ built-in transition types.

| Param           | Type   | Required | Default | Description                      |
| --------------- | ------ | -------- | ------- | -------------------------------- |
| `url_a`         | string | yes      |         | First clip URL                   |
| `url_b`         | string | yes      |         | Second clip URL                  |
| `type`          | string | no       | fade    | Transition type (see list below) |
| `duration`      | number | no       | 1       | Transition duration in seconds   |
| `output_format` | string | no       | mp4     | Output format                    |

Transition types: `fade`, `fadeblack`, `fadewhite`, `dissolve`, `wipeleft`, `wiperight`, `wipeup`, `wipedown`, `slideleft`, `slideright`, `slideup`, `slidedown`, `circlecrop`, `rectcrop`, `radial`, `smoothleft`, `smoothright`, `pixelize`, `diagtl`, `diagtr`, `diagbl`, `diagbr`

```json
{
  "action": "process_media",
  "label": "Adding transition",
  "data": {
    "operation": "transition",
    "url_a": "https://clip1...",
    "url_b": "https://clip2...",
    "type": "dissolve",
    "duration": 1.5
  }
}
```

---

## color_grade

Adjust brightness, contrast, saturation, hue, and other color properties.

| Param           | Type   | Required | Default | Description                                                             |
| --------------- | ------ | -------- | ------- | ----------------------------------------------------------------------- |
| `url`           | string | yes      |         | Source video URL                                                        |
| `brightness`    | number | no       | 0       | -1.0 to 1.0                                                             |
| `contrast`      | number | no       | 1.0     | 0.0 to 3.0 (1.0 = unchanged)                                            |
| `saturation`    | number | no       | 1.0     | 0.0 to 3.0 (0 = grayscale, 1.0 = unchanged)                             |
| `hue`           | number | no       | 0       | Hue rotation in degrees                                                 |
| `gamma`         | number | no       | 1.0     | Gamma correction (0.1 to 10.0)                                          |
| `preset`        | string | no       |         | Named preset: `warm`, `cool`, `vintage`, `cinematic`, `bright`, `muted` |
| `output_format` | string | no       | mp4     | Output format                                                           |

Read `references/color-and-effects.md` for preset details and grading workflows.

---

## blur

Apply blur to the full frame or a region. Use for censoring, dreamy backgrounds, or transition effects.

| Param           | Type   | Required | Default | Description          |
| --------------- | ------ | -------- | ------- | -------------------- |
| `url`           | string | yes      |         | Source video URL     |
| `sigma`         | number | no       | 5       | Blur strength (1–50) |
| `output_format` | string | no       | mp4     | Output format        |

---

## sharpen

Enhance detail and crispness in soft or slightly out-of-focus footage.

| Param           | Type   | Required | Default | Description                   |
| --------------- | ------ | -------- | ------- | ----------------------------- |
| `url`           | string | yes      |         | Source video URL              |
| `amount`        | number | no       | 1.0     | Sharpening strength (0.5–3.0) |
| `output_format` | string | no       | mp4     | Output format                 |

---

## vignette

Darken the edges of the frame to draw attention to the center. Classic cinematic look.

| Param           | Type   | Required | Default | Description                              |
| --------------- | ------ | -------- | ------- | ---------------------------------------- |
| `url`           | string | yes      |         | Source video URL                         |
| `angle`         | number | no       | 0.785   | Vignette angle in radians (PI/4 default) |
| `output_format` | string | no       | mp4     | Output format                            |

---

## denoise

Reduce grain and noise from low-light or phone footage.

| Param           | Type   | Required | Default | Description                     |
| --------------- | ------ | -------- | ------- | ------------------------------- |
| `url`           | string | yes      |         | Source video URL                |
| `strength`      | number | no       | 3       | Noise reduction strength (1–10) |
| `output_format` | string | no       | mp4     | Output format                   |

---

## stabilize

Smooth shaky handheld footage. Requires two processing passes internally (analyze motion, then apply correction).

| Param           | Type   | Required | Default | Description                                               |
| --------------- | ------ | -------- | ------- | --------------------------------------------------------- |
| `url`           | string | yes      |         | Source video URL                                          |
| `smoothing`     | number | no       | 10      | Smoothing window size (higher = smoother, may crop edges) |
| `output_format` | string | no       | mp4     | Output format                                             |

Processing takes longer than most operations due to the two-pass approach.

---

## chroma_key

Remove a solid color background (green screen / blue screen). Replaces the keyed color with transparency or a background video/image.

| Param            | Type   | Required | Default | Description                                        |
| ---------------- | ------ | -------- | ------- | -------------------------------------------------- |
| `url`            | string | yes      |         | Foreground video URL (with green/blue screen)      |
| `background_url` | string | no       |         | Background video/image URL (omit for transparent)  |
| `color`          | string | no       | green   | Key color: `green`, `blue`, or hex like `0x00FF00` |
| `similarity`     | number | no       | 0.3     | Color matching tolerance (0.01–1.0)                |
| `blend`          | number | no       | 0.1     | Edge blending (0.0–1.0)                            |
| `output_format`  | string | no       | mp4     | Output format                                      |

---

## split_screen

Display multiple videos side-by-side or in a grid layout.

| Param           | Type   | Required | Default    | Description                                                     |
| --------------- | ------ | -------- | ---------- | --------------------------------------------------------------- |
| `inputs`        | array  | yes      |            | Array of `{ url }` objects (2–4 videos)                         |
| `layout`        | string | no       | horizontal | `horizontal` (side-by-side), `vertical` (stacked), `grid` (2x2) |
| `output_format` | string | no       | mp4        | Output format                                                   |

---

## thumbnail

Extract a single frame from a video as an image. Use for YouTube thumbnails, poster frames, or preview images.

| Param           | Type   | Required | Default | Description                   |
| --------------- | ------ | -------- | ------- | ----------------------------- |
| `url`           | string | yes      |         | Source video URL              |
| `timestamp`     | number | no       | 0       | Time position in seconds      |
| `output_format` | string | no       | jpg     | Image format (jpg, png, webp) |

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

---

## frame_extract

Extract multiple frames at regular intervals. Use for storyboards, content review, or sprite sheets.

| Param              | Type   | Required | Default | Description                         |
| ------------------ | ------ | -------- | ------- | ----------------------------------- |
| `url`              | string | yes      |         | Source video URL                    |
| `interval_seconds` | number | no       | 5       | Seconds between frames              |
| `max_frames`       | number | no       | 20      | Maximum number of frames to extract |
| `output_format`    | string | no       | jpg     | Image format                        |

Returns an array of frame image URLs with timestamps.

---

## waveform

Generate a visual waveform image from audio. Use for podcast thumbnails, audio visualization, or content review.

| Param           | Type   | Required | Default | Description            |
| --------------- | ------ | -------- | ------- | ---------------------- |
| `url`           | string | yes      |         | Source audio/video URL |
| `width`         | number | no       | 1920    | Image width            |
| `height`        | number | no       | 200     | Image height           |
| `color`         | string | no       | white   | Waveform color         |
| `output_format` | string | no       | png     | Image format           |

---

## silence_remove

Detect and cut silent gaps from audio or video. The MrBeast jump-cut generator — removes dead air automatically.

Two-step process internally: first detects silence timestamps via `silencedetect`, then cuts non-silent segments and concatenates them.

| Param                  | Type   | Required | Default | Description                                                                |
| ---------------------- | ------ | -------- | ------- | -------------------------------------------------------------------------- |
| `url`                  | string | yes      |         | Source media URL                                                           |
| `threshold_db`         | number | no       | -30     | Noise floor in dB (lower = more aggressive, e.g. -40 catches quieter gaps) |
| `min_silence_duration` | number | no       | 0.5     | Minimum silence length in seconds to cut                                   |
| `output_format`        | string | no       | mp4     | Output format                                                              |

```json
{
  "action": "process_media",
  "label": "Removing dead air",
  "data": {
    "operation": "silence_remove",
    "url": "https://podcast...",
    "threshold_db": -30,
    "min_silence_duration": 0.8
  }
}
```

---

## Chaining Operations

`compose` handles most multi-step workflows in a single call. For cases it doesn't cover:

- Each `process_media` call returns a URL you can use as input to the next call
- Chain: `probe` → `trim` → `color_grade` → `text_overlay` → `resize`
- Chain: `silence_remove` → `compose` (with other clips) → `add_audio` → `thumbnail`
- Chain: `analyze_video` → read transcript → `compose` with best segments

---

## Common Mistakes

| Mistake                                   | Fix                                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| Concat clips with different resolutions   | Use `compose` with `resolution` to normalize                                    |
| Using `trim` for frame-accurate cuts      | Trim uses stream copy (keyframe-based). Use `compose` for re-encoded exact cuts |
| Audio longer than video without `replace` | Audio mixing uses `dropout_transition=2` and matches video duration             |
| Forgetting `output_format`                | Defaults to mp4 for video, mp3 for audio                                        |
| Passing local file paths                  | Only HTTP/HTTPS URLs accepted                                                   |
| Not probing before editing                | Run `probe` first to know duration, resolution, and codec                       |
| Using speed factor outside 0.25–4.0       | Factor must be between 0.25 (quarter speed) and 4.0 (4x speed)                  |
| Stabilize on long videos                  | Two-pass stabilization is slow — trim first, stabilize the short clip           |
