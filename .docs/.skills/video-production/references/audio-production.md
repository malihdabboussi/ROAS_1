# Video Production — Audio Reference

Audio extraction, mixing, replacement, format conversion, effects, and silence removal.

---

## Extract Audio from Video

Pull the audio track from any video file.

```json
{
  "action": "process_media",
  "label": "Extracting audio",
  "data": {
    "operation": "extract_audio",
    "url": "https://video...",
    "output_format": "mp3"
  }
}
```

Supported audio output formats: mp3, wav, ogg, aac.

---

## Add Background Music

Overlay a music track while keeping the original audio.

```json
{
  "action": "process_media",
  "label": "Adding music",
  "data": {
    "operation": "add_audio",
    "video_url": "https://video...",
    "audio_url": "https://music...",
    "replace": false
  }
}
```

Both audio streams are mixed together. The mix uses equal volume — if music overpowers speech, use a quieter track.

---

## Replace Audio Entirely

Discard original audio and use a new track.

```json
{
  "action": "process_media",
  "label": "Replacing audio",
  "data": {
    "operation": "add_audio",
    "video_url": "https://video...",
    "audio_url": "https://voiceover...",
    "replace": true
  }
}
```

Output duration matches the shorter of video or audio.

---

## Audio Effects

Apply DSP effects to audio or video files via `audio_effect`.

### Reverb / Echo

Add spatial depth or distinct repeats:

```json
{
  "action": "process_media",
  "label": "Adding reverb",
  "data": {
    "operation": "audio_effect",
    "url": "https://...",
    "effect": "reverb",
    "delay_ms": 60,
    "decay": 0.4
  }
}
```

- **Reverb**: Short delay (40–80ms), low decay — simulates room ambience
- **Echo**: Longer delay (200–1000ms), higher decay — distinct repeats

### Fade In / Fade Out

Gradually bring audio in from silence or out to silence:

```json
{
  "action": "process_media",
  "label": "Fading in",
  "data": {
    "operation": "audio_effect",
    "url": "https://...",
    "effect": "fade_in",
    "duration": 3
  }
}
```

For fade_out, set `start` to the position where the fade begins (in seconds). If you don't know the duration, `probe` the file first.

### Volume Adjustment

Scale the overall volume:

```json
{
  "action": "process_media",
  "label": "Boosting volume",
  "data": {
    "operation": "audio_effect",
    "url": "https://...",
    "effect": "volume",
    "level": 1.5
  }
}
```

`level`: 0.5 = half volume, 1.0 = unchanged, 2.0 = double.

### Normalize (Loudness)

Standardize loudness to broadcast standards (EBU R128, -16 LUFS). Makes all audio consistent in perceived volume — essential before publishing.

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

Normalize is the single most impactful audio operation — apply it to every final output.

### Pitch Shift

Change pitch without changing speed:

```json
{
  "action": "process_media",
  "label": "Pitching up",
  "data": {
    "operation": "audio_effect",
    "url": "https://...",
    "effect": "pitch",
    "semitones": 2
  }
}
```

Positive = higher pitch, negative = lower. Each semitone is one piano key.

### Bass Boost

Enhance low-frequency presence:

```json
{
  "action": "process_media",
  "label": "Boosting bass",
  "data": {
    "operation": "audio_effect",
    "url": "https://...",
    "effect": "bass_boost",
    "gain_db": 8
  }
}
```

### Speed (Audio Only)

Change playback speed while preserving pitch:

```json
{
  "action": "process_media",
  "label": "Speeding up",
  "data": {
    "operation": "audio_effect",
    "url": "https://...",
    "effect": "speed",
    "factor": 1.25
  }
}
```

Factor range: 0.5–2.0. For video speed changes, use the `speed` operation instead (it handles both video and audio).

---

## Silence Removal (Auto Jump-Cuts)

Detect and cut silent gaps automatically. This is the core technique behind MrBeast-style jump-cut pacing — removes all dead air, pauses, and filler gaps.

```json
{
  "action": "process_media",
  "label": "Removing dead air",
  "data": {
    "operation": "silence_remove",
    "url": "https://podcast...",
    "threshold_db": -30,
    "min_silence_duration": 0.5
  }
}
```

### How It Works

Two-step process internally:

1. **Detect**: `silencedetect` scans the audio for segments below the threshold
2. **Cut**: Non-silent segments are extracted and concatenated — silent gaps disappear entirely

The output video/audio is shorter than the input because the silent parts are gone.

### Tuning

| Parameter              | Default | Lower =                                | Higher =                                       |
| ---------------------- | ------- | -------------------------------------- | ---------------------------------------------- |
| `threshold_db`         | -30     | Catches more silence (more aggressive) | Only catches deep silence (conservative)       |
| `min_silence_duration` | 0.5s    | Cuts shorter pauses (tighter pacing)   | Only cuts long pauses (natural breathing room) |

Start with defaults and adjust:

- **Podcasts/interviews**: threshold -30dB, duration 0.8s (keep natural pauses for breathing)
- **Tutorials/explainers**: threshold -30dB, duration 0.5s (tighter pacing)
- **MrBeast-style energy**: threshold -25dB, duration 0.3s (very aggressive — nearly zero dead air)

---

## Convert Audio Formats

Change format for compatibility or file size:

```json
{
  "action": "process_media",
  "label": "Converting to MP3",
  "data": {
    "operation": "convert",
    "url": "https://audio.wav",
    "output_format": "mp3"
  }
}
```

| Conversion | Why                                    |
| ---------- | -------------------------------------- |
| WAV → MP3  | Smaller file size for sharing          |
| MP3 → WAV  | Lossless, good for further editing     |
| Any → AAC  | Quality + small size, Apple-compatible |
| Any → OGG  | Open format, web-friendly              |

---

## Workflow: Interview Highlight

1. **analyze_video** with `transcribe: true` — get transcript with timestamps
2. Identify best quotes from transcript segments
3. **compose** — trim to those segments, concatenate
4. **extract_audio** — pull the audio track
5. **audio_effect** normalize — standardize loudness
6. **audio_effect** fade_in + fade_out — smooth start/end

---

## Workflow: Podcast Cleanup

1. **silence_remove** — auto jump-cut dead air
2. **audio_effect** normalize — consistent loudness
3. **audio_effect** fade_in (duration 1s) — smooth open
4. **audio_effect** fade_out (at end) — clean close

---

## Workflow: Music Under Narration

1. **audio_effect** normalize on the narration — consistent voice level
2. **audio_effect** volume on the music track at 0.3 — bring music way down
3. **add_audio** with `replace: false` — mix the quiet music under the narration

---

## Tips

- **Normalize everything** before publishing — inconsistent volume is the #1 amateur audio mistake
- **Silence removal before compose** — clean each clip before assembling, not after
- **Fade in/out on every final output** — even 0.5s fades prevent jarring starts/stops
- **Probe for duration** before fade_out — you need to know total length to set the fade start position
- **Music selection matters** — upbeat for promos, subtle for interviews, energetic for social content
