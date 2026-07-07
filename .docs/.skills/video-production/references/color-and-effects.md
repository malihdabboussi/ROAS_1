# Video Production — Color & Effects Reference

Visual effects that change how the footage looks without altering structure or timing.

---

## Color Grading

Adjust the mood and feel of footage through color manipulation. Use `color_grade` with individual parameters or named presets.

### Individual Parameters

```json
{
  "action": "process_media",
  "label": "Color grading",
  "data": {
    "operation": "color_grade",
    "url": "https://...",
    "brightness": 0.05,
    "contrast": 1.2,
    "saturation": 1.3
  }
}
```

| Parameter    | Range       | Neutral | Effect                            |
| ------------ | ----------- | ------- | --------------------------------- |
| `brightness` | -1.0 to 1.0 | 0       | Darker ← → Brighter               |
| `contrast`   | 0.0 to 3.0  | 1.0     | Flat ← → Punchy                   |
| `saturation` | 0.0 to 3.0  | 1.0     | Grayscale ← → Vivid               |
| `hue`        | degrees     | 0       | Rotate the color wheel            |
| `gamma`      | 0.1 to 10.0 | 1.0     | Darken midtones ← → Lift midtones |

### Named Presets

Use `preset` instead of individual values for common looks:

| Preset      | Look                    | Parameters                                                |
| ----------- | ----------------------- | --------------------------------------------------------- |
| `warm`      | Golden/sunset feel      | brightness +0.03, saturation 1.2, hue shift toward orange |
| `cool`      | Blue/clinical feel      | saturation 0.9, hue shift toward blue                     |
| `vintage`   | Faded retro film        | contrast 0.9, saturation 0.7, brightness +0.05            |
| `cinematic` | Movie-grade contrast    | contrast 1.3, saturation 1.1, gamma 0.9, slight vignette  |
| `bright`    | Clean, airy, optimistic | brightness +0.1, contrast 1.1, saturation 1.15            |
| `muted`     | Understated, editorial  | saturation 0.6, contrast 0.95                             |

```json
{
  "action": "process_media",
  "label": "Cinematic grade",
  "data": {
    "operation": "color_grade",
    "url": "https://...",
    "preset": "cinematic"
  }
}
```

### When to Use Each

- **Product demos / tutorials:** `bright` — clean and professional
- **Lifestyle / brand content:** `warm` — inviting and aspirational
- **Drama / storytelling:** `cinematic` — high contrast, controlled saturation
- **Throwback / nostalgic content:** `vintage` — faded, retro feel
- **Minimalist / editorial:** `muted` — understated, lets content speak

---

## Blur

Apply blur to the entire frame.

```json
{
  "action": "process_media",
  "label": "Blurring footage",
  "data": {
    "operation": "blur",
    "url": "https://...",
    "sigma": 10
  }
}
```

`sigma` controls strength: 1–5 = subtle softness, 5–15 = noticeable blur, 15–50 = heavy blur for censoring.

**Common uses:**

- **Censor faces/plates**: Blur the full frame, then overlay the original with a mask (or just blur heavily for quick privacy)
- **Dreamy B-roll**: Light blur (sigma 2–4) for atmospheric background shots
- **Transition aid**: Heavy blur on last frame of clip A, dissolve into clip B

---

## Sharpen

Enhance detail — useful for footage that's slightly soft or for making text more readable.

```json
{
  "action": "process_media",
  "label": "Sharpening footage",
  "data": {
    "operation": "sharpen",
    "url": "https://...",
    "amount": 1.5
  }
}
```

`amount` range: 0.5 = subtle, 1.0 = standard, 2.0+ = aggressive (may introduce artifacts on noisy footage).

Sharpen after color grading, not before — grading can soften the image, so sharpening first gets undone.

---

## Vignette

Darken edges to focus attention on the center of the frame. Subtle vignettes add a cinematic quality; heavy ones create a dramatic tunnel effect.

```json
{
  "action": "process_media",
  "label": "Adding vignette",
  "data": {
    "operation": "vignette",
    "url": "https://...",
    "angle": 0.5
  }
}
```

`angle` in radians: 0.3 = subtle, 0.785 (PI/4, default) = standard cinematic, 1.2+ = dramatic.

---

## Denoise

Reduce grain and noise from low-light footage, phone cameras, or compressed sources.

```json
{
  "action": "process_media",
  "label": "Cleaning up footage",
  "data": {
    "operation": "denoise",
    "url": "https://...",
    "strength": 4
  }
}
```

`strength` range: 1–3 = light (preserve detail), 4–6 = moderate (good balance), 7–10 = heavy (smooths detail but removes more noise).

Denoise before color grading — grading amplifies noise, so clean first.

---

## Stabilize

Smooth shaky handheld footage using two-pass video stabilization (vidstab).

```json
{
  "action": "process_media",
  "label": "Stabilizing footage",
  "data": {
    "operation": "stabilize",
    "url": "https://...",
    "smoothing": 15
  }
}
```

`smoothing` range: 5 = minimal correction, 10 = standard, 15–30 = very smooth (may crop edges more).

Takes longer than most operations because it analyzes the full clip first, then applies corrections in a second pass. Trim to just the section you need before stabilizing.

---

## Recommended Processing Order

When applying multiple effects, order matters:

1. **Denoise** — clean the source first
2. **Stabilize** — smooth camera motion on clean footage
3. **Color grade** — set the look
4. **Sharpen** — restore detail lost in grading
5. **Vignette** — add cinematic edges last

Each step is a separate `process_media` call — the output URL from one becomes the input to the next.
