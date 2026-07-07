# Vibey Homepage v2 — Asset Spec (Designer-facing)

**Use with:** `homepage-v2-brief.md` (read the brief first — locked direction, locked tokens).
**Format:** Each asset has: *what, why, deliverable, references, constraints, deadline-shape.*

---

## A1. Hero visual *(Section 1)*

- **What:** a single full-bleed still that lives on the right half of the hero. The thing a CEO sees in the first 1 second.
- **Why:** wins the page in the first scroll. Must read as "this is a real product, not a demo."
- **Deliverable:** one PNG (3200 × 2400 @ 2x), one WebP, and a Figma source. Optional: a Lottie/JSON file if option B is chosen.
- **Two locked options** (Sefy picks one):
  - **A1-A (recommended): Spaces board still.**
    - Source: take the `SpacesHeroMockup` (in-app), compose a "studio still" of the board — single focal task card with an agent portrait avatar, slight grain, deep dark background.
    - Treat it like product photography: depth-of-field on the focal card, edges of the board falling into shadow.
    - References: Linear's hero (project board still), Notion's calendar still, Vercel's project dashboard still.
  - **A1-B (alternate): Brain orbital, hero-scale.**
    - Custom illustration. Not the existing `MarketingMemoryStackMockup` — that one is too busy at this scale.
    - Composition: 1 central glyph + 4–6 named agent portrait nodes on concentric orbits. Single accent color (the warm copper/ember from §3). Quiet motion: 60–80 s per revolution.
    - References: Vercel agent diagram, Anthropic agent SDK illustration.
- **Constraints:**
  - Final asset must read at both 1920w and on a 13" laptop.
  - No glow gradients. No floating particles. No extra animated chrome.
  - Background sits on flat `#0A0B0F` — no separate gradient layer behind it.

---

## A2. Brain visualization *(Section 3 — Chapter 01)*

- **What:** a quieter, more confident Brain visual than the showcase orbital.
- **Why:** sells the "knowledge layer" without screaming. Must look like a *diagram*, not a *demo*.
- **Deliverable:** SVG (component-friendly). 800 × 600 base, fluid to 1200 wide.
- **Composition:**
  - 4 concentric arcs (not full rings — partial arcs feel editorial). One arc per brain type: User / Agent / Company / Customer. Each arc labeled in eyebrow type.
  - 6–8 small nodes scattered across the arcs (representing memories). Tiny — pixel size, not card size.
  - Single warm accent for one highlighted node ("current focus"). Everything else is hairline-white.
- **References:** Edward Tufte information design, scientific paper figures, Apple Health "rings" but radically simplified.
- **Motion:** optional 60 s rotation, full optional. Default: static.

---

## A3. Agent portrait row *(Section 3 — Chapter 02)*

- **What:** 4–6 agent portraits at full vertical height of the chapter, named below.
- **Why:** Vibey's strongest differentiator that wonderful.ai can't copy — named agents with real faces.
- **Deliverable:** layout in Figma; assets are existing portraits from `agent_employee_templates.image_url`. Treatment must be applied.
- **Composition:**
  - Tall portrait crops (~3:4 each), aligned in a row with **even gaps**.
  - Each portrait sits in a thin hairline frame. No round avatars. No "card." Frame is the only chrome.
  - Below each: name (H4 weight), role (eyebrow style), 1-line tagline if it fits cleanly.
  - On hover (desktop): the portrait *very slowly* gains saturation by ~10%. No scale, no shadow.
- **Treatment for the source images:**
  - Apply a uniform color grade across all portraits (slightly desaturated, warm shadows, cool highlights — "magazine cover" feel).
  - Match lighting direction roughly across the row. If one portrait fights the grade, swap it out.
- **References:** New Yorker portrait spreads, *Time* "Person of the Year" alternates, Stripe team page (precision treatment of human photography).

---

## A4. Spaces product still *(Section 3 — Chapter 03)*

- **What:** the Spaces board as one composed still. Different crop than A1-A if A1-A was chosen.
- **Why:** show that the system actually exists and is built.
- **Deliverable:** PNG + Figma source. Should reuse `SpacesHeroMockup` UI but composed as a still (different focal area than A1-A — e.g., A1-A focuses a task card, A4 focuses the channel pane with an agent speaking).
- **Constraints:** must look like the same product as A1-A. Color grade matches.

---

## A5. Architecture illustration *(Section 4)* — **highest impact**

- **What:** the headline illustration of the page. Replaces the "4 colored cards" embarrassment from v1.
- **Why:** this is where Wonderful flexes (3D iso platform diagram). We need our own thing.
- **Deliverable:** single static SVG/PNG (3200 × 2400 @ 2x), Figma source.
- **Recommended composition:** *"strata cross-section."*
  - 4 horizontal layers stacked vertically. Each layer ~120 px tall.
  - Each layer drawn as a thin slice with subtle perspective skew (~6°) to imply depth without going full iso.
  - Layer labels (left margin): `01 SURFACE — Spaces`, `02 WORKFORCE — Agents`, `03 MEMORY — The Brain`, `04 REACH — Integrations`.
  - One or two minimal glyphs embedded *inside* each stratum at editorial scale (think: a tiny board outline in Surface; portrait silhouettes in Workforce; a small Brain arc in Memory; logo dots in Reach).
  - Hairline grid lines passing through all four strata to imply they're one stack.
  - Single warm accent applied to **one** element across the four — your eye lands on it first.
- **References:**
  - Wonderful.ai architecture diagram (the bar).
  - Stripe payments-flow illustrations.
  - Anthropic / OpenAI scientific paper diagrams (calm, editorial, hairlines).
- **What it must NOT look like:** colored cards stacked vertically, lucide icons inside boxes, glowing borders.

---

## A6. Founder photograph *(Section 5)*

- **What:** a real photograph of Sefy, landscape orientation, composed for editorial use.
- **Why:** the founder note is the most personal section. Round avatars cheapen it.
- **Deliverable:** original full-res RAW + 1 cropped landscape JPEG (3000 × 2000 minimum) + Figma frame.
- **Shoot direction:**
  - Natural window light, late afternoon, soft shadow side.
  - Plain warm-neutral backdrop (off-white or warm gray wall). No "office in background."
  - Sefy sitting or leaning, three-quarter angle, looking *past* camera (not direct). Hands visible.
  - Wardrobe: a single solid color. Avoid logos.
- **Treatment:** same color grade as A3 portraits (so the founder reads as part of the same magazine).
- **References:** New York Times Magazine founder profiles, The Verge Decoder interview portraits.

---

## A7. Signature mark *(Section 5)*

- **What:** Sefy's signature as an SVG glyph.
- **Why:** closes the founder note with personality. Costs nothing, lifts the whole section.
- **Deliverable:** SVG. ~120 px wide. Hand-drawn, single stroke.
- **How:** Sefy signs on paper or iPad → scan/photograph → vectorize → designer cleans up.

---

## A8. Globals.css additions *(dev — no designer needed)*

- New CSS vars:
  - `--color-accent-warm: #C99B5F;` *(or `#E5704A`, pending decision)*
  - `--color-accent-warm-soft: rgba(201,155,95,0.18);`
  - `--font-display-h1`, `--font-display-h2`, `--font-display-h3` with the clamp values from brief §3.
  - `--font-serif: "Source Serif 4", "Newsreader", Georgia, serif;` + a self-hosted `@font-face` for the chosen serif.
- New utility classes: `.text-accent-warm`, `.bg-accent-warm-soft`, `.h1-display`, `.h2-display`, `.h3-display`, `.eyebrow`, `.body-display-1`, `.body-display-2`, `.quote-serif`.
- Owner: dev (me). 1 hour.

---

## Production order (most → least leverage)

1. **A5 — Architecture illustration.** Biggest visible upgrade. Commission first.
2. **A6 — Sefy photo session.** Long lead time (logistics).
3. **A1 — Hero visual.** Composed from existing `SpacesHeroMockup` once direction locked.
4. **A2 — Brain visualization.** Custom SVG, can be built by dev.
5. **A3 — Agent row treatment + grade.** Designer half-day; uses existing photos.
6. **A7 — Signature.** Tiny task, do last.
7. **A4 — Spaces still (Chapter 03).** Reuses A1-A treatment.
8. **A8 — Globals.css token additions.** Dev, in parallel.

---

*See `homepage-v2-brief.md` for direction lock. Open questions for Sefy in brief §6.*
