# Video Production — Transitions & Pacing Reference

Transitions between clips, speed manipulation, reverse effects, and looping. These operations control the rhythm and energy of the edit.

---

## Transitions

Apply a visual transition between two clips using ffmpeg's xfade filter. The transition replaces the hard cut at the boundary — the end of clip A blends into the start of clip B.

```json
{
  "action": "process_media",
  "label": "Adding crossfade",
  "data": {
    "operation": "transition",
    "url_a": "https://clip1...",
    "url_b": "https://clip2...",
    "type": "fade",
    "duration": 1.0
  }
}
```

### Transition Types

| Type                                      | Effect                        | Best for                         |
| ----------------------------------------- | ----------------------------- | -------------------------------- |
| `fade`                                    | Opacity crossfade             | Universal — works everywhere     |
| `fadeblack`                               | Fade through black            | Scene changes, time passing      |
| `fadewhite`                               | Fade through white            | Dreamy, flashback transitions    |
| `dissolve`                                | Soft blend                    | Emotional moments, interviews    |
| `wipeleft` / `wiperight`                  | Horizontal wipe               | Energetic, before/after reveals  |
| `wipeup` / `wipedown`                     | Vertical wipe                 | Platform transitions, lists      |
| `slideleft` / `slideright`                | Slide one clip over the other | Dynamic, modern feel             |
| `slideup` / `slidedown`                   | Vertical slide                | Story progression                |
| `circlecrop`                              | Expanding/contracting circle  | Dramatic reveals, retro style    |
| `rectcrop`                                | Expanding rectangle           | Tech demos, UI reveals           |
| `radial`                                  | Radial sweep                  | Clock-wipe effect                |
| `smoothleft` / `smoothright`              | Smooth directional blend      | Polished, professional           |
| `pixelize`                                | Pixelation transition         | Glitch aesthetic, gaming content |
| `diagtl` / `diagtr` / `diagbl` / `diagbr` | Diagonal wipes                | Dynamic angles                   |

### Duration Guidelines

- **0.3–0.5s**: Barely noticeable — maintains fast pace, just softens the cut
- **0.5–1.0s**: Standard — visible but not distracting
- **1.0–2.0s**: Dramatic — draws attention to the transition itself
- **2.0s+**: Very slow — only for intentional dramatic effect (montages, endings)

### When to Use Transitions vs Hard Cuts

Hard cuts (no transition) are the default. They feel energetic, fast, and modern. Only add transitions when:

- **Signaling time passing** → fadeblack
- **Changing location/topic** → dissolve or fade
- **Building drama** → slow fade or circlecrop
- **Stylistic choice** → consistent transition style throughout a piece

Overusing transitions makes content feel amateur. Most MrBeast/YouTube content uses 95% hard cuts.

---

## Speed Changes

Alter playback speed for dramatic effect or practical purposes.

```json
{
  "action": "process_media",
  "label": "Slow motion",
  "data": {
    "operation": "speed",
    "url": "https://...",
    "factor": 0.5
  }
}
```

### Speed Factor Guide

| Factor | Effect                          | Use case                                |
| ------ | ------------------------------- | --------------------------------------- |
| 0.25   | Quarter speed (extreme slow-mo) | Impact moments, reveals                 |
| 0.5    | Half speed                      | Standard slow-mo                        |
| 0.75   | Slightly slower                 | Subtle emphasis                         |
| 1.0    | Normal (no change)              | —                                       |
| 1.25   | Slightly faster                 | Tighten pacing without feeling rushed   |
| 1.5    | 1.5x speed                      | Speed through less interesting sections |
| 2.0    | Double speed                    | Time-lapses, setup montages             |
| 4.0    | 4x speed                        | Fast-forward through long processes     |

Audio pitch is preserved during speed changes. The system chains `atempo` filters internally because ffmpeg's atempo only accepts 0.5–2.0 per pass.

### Speed Ramp Pattern

For a "speed ramp" (normal → slow → normal), use three operations:

1. **Trim** the moment you want to slow down
2. **Speed** that segment at 0.5x
3. **Concat** or **compose** the normal-speed sections with the slowed segment in between

---

## Reverse

Play video and audio backwards. Creates dramatic reveals, rewind effects, or surreal visuals.

```json
{
  "action": "process_media",
  "label": "Reversing clip",
  "data": {
    "operation": "reverse",
    "url": "https://..."
  }
}
```

Memory-intensive — trim to just the section you want reversed (under 30 seconds) before calling reverse.

### Creative Uses

- **Dramatic intro**: Film someone walking away, reverse it so they walk toward camera
- **Magic trick**: Film the "result" and reverse to show the "trick"
- **Music video**: Classic rewind effect
- **Transition**: Reverse the last second of a clip for a boomerang-like ending

---

## Loop

Repeat content a specified number of times. Useful for extending short clips or audio tracks.

```json
{
  "action": "process_media",
  "label": "Looping background music",
  "data": {
    "operation": "loop",
    "url": "https://short-track.mp3",
    "count": 4
  }
}
```

### When to Loop

- **Background music**: 30-second track needs to cover a 2-minute video — loop 4x, then trim to match video length
- **Animated backgrounds**: Loop a 5-second animated pattern for a longer composition
- **Hypnotic content**: Short clip repeated for artistic effect
- **GIF-like video**: Loop a satisfying moment 3–5 times

---

## Pacing Guidelines by Content Type

| Content             | Cuts per minute | Avg clip length | Speed use                                    |
| ------------------- | --------------- | --------------- | -------------------------------------------- |
| MrBeast / challenge | 12–20           | 3–5 seconds     | Occasional 2x for montages                   |
| Tutorial / how-to   | 6–10            | 6–10 seconds    | 1.25x for repetitive steps                   |
| Interview / podcast | 4–8             | 8–15 seconds    | Rarely — authenticity matters                |
| Product demo        | 8–12            | 5–8 seconds     | 1.5x for setup, 0.5x for key features        |
| Music video         | 15–25           | 2–4 seconds     | Frequent slow-mo (0.5x) for dramatic moments |
| Reel / TikTok       | 15–30           | 2–3 seconds     | Speed variety is key to retention            |

---

## Workflow: Energy Edit (MrBeast Style)

1. **silence_remove** — Auto jump-cut all dead air
2. **speed** at 1.1x — Subtly tighten the pacing
3. **compose** — Assemble the best segments with trim points
4. **text_overlay** — Add key word captions at impact moments
5. **add_audio** — Layer energetic background music
6. **thumbnail** — Extract the best frame for the video poster
