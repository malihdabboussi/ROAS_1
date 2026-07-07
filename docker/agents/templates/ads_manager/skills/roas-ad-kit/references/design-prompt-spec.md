# Design-Ready Prompt Spec

The design prompt is the new artifact this skill adds. Its job: a designer (or an image tool like the `roas-ad-design` renderer) can produce the creative from the prompt alone, with zero follow-up questions. If a designer would have to come back and ask "what color? what size? where does the text go?", the prompt isn't done.

Write it as **one complete paragraph** (plus a short format tag) that a person can read or paste straight into an image tool. Pack in all of the following:

1. **Format / size** — default to feed **4:5** and story **9:16**; add **1:1** if useful. State it up front as a tag.
2. **Scene** — what is literally in frame: the subject, the setting, the framing (close-up / wide / top-down / split), and the focal point. This is where the concept's idea gets literalized (the empty chair, the two cold coffees, the split screen). Be concrete.
3. **Style & lighting** — the medium and mood: photographic, cinematic, editorial, product-shot, flat-graphic; the lighting (moody/low-key, bright/clean, golden, neon). Match the client's brand look.
4. **Palette + brand color** — the base tones and exactly where the client's brand color appears (the accent highlight, a prop, a tint). Name the hex if known.
5. **On-image text** — the exact words, where they sit (top third / centered / lower third), the hierarchy if there's more than one line, and the **accent-word treatment** (marker highlight in brand color / bold / color block). The accent word is the one the eye should snap to.
6. **Brand & logo rule** — client wordmark placement, or "no client logo." Note any stamp (event/date) only if the offer has one; book-a-call and application funnels usually have no stamp.
7. **Avoid** — the failure modes: no stock-smile-on-gradient, no clutter, text must stay legible at thumbnail size, no fake/again-generated logos of real brands, no real people's likenesses unless cleared.

## Two creative types — handle the text differently

- **Illustrative / photographic concepts** (a metaphor object, a staged scene, a split): the design prompt is a full scene brief as above. These are the concepts this skill mostly produces.
- **Text-on-texture validate-messaging creatives** (a callout line on paper/concrete, accent highlighted): these are exactly what `roas-ad-design` renders. For these, keep the prompt short and defer to that skill's conventions (centered line on texture, identity phrase marker-highlighted, brand color, optional stamp, no client logo). Note "→ render via roas-ad-design."

## Template

```
**Design prompt** ([4:5 + 9:16]): [Scene — concrete subject, setting, framing, focal point].
[Style & lighting]. [Palette, and where the brand color/hex lands]. On-image text: "[exact
words]" set [placement], with [ACCENT WORD] [highlight/bold/color treatment]. [Logo/stamp rule].
Avoid: [the relevant failure modes]. Keep text legible at thumbnail size.
```

## Worked examples

**Concept: Stop Buying Lunch** (insider-ritual)
> **Design prompt** (4:5 + 9:16): Top-down shot of a small restaurant table for two, two coffees gone cold, one chair pushed out and empty, a folded lunch receipt on the table. Moody, cinematic, shallow depth of field, warm low light. Dark premium palette with the brand color as a thin underline beneath the headline. On-image text: "STOP BUYING LUNCH TO GET THE MEETING" set across the lower third, with LUNCH marker-highlighted in the brand color. No client logo. Avoid stock-smiling people, clutter, and busy backgrounds. Keep text legible at thumbnail size.

**Concept: They'll Say Yes** (status reframe)
> **Design prompt** (4:5 + 9:16): An empty podcast guest chair across a recording desk, mic on a boom angled toward it, a small name card waiting on the desk, studio lighting and a softly blurred video wall behind. Cinematic, low-key, premium. Dark palette, brand color on the name card edge. On-image text: "THEY IGNORED YOUR EMAIL. THEY'LL SAY YES TO THIS." set top third, two lines, with YES in a brand-color block. No client logo. Avoid clutter and any visible faces. Keep text legible at thumbnail size.

The difference between a usable prompt and a useless one is specificity. "A nice studio shot, premium feel, with the headline" forces the designer to invent everything. The examples above leave nothing to guess.
