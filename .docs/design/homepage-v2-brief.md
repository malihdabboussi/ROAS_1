# Vibey Homepage v2 — Design Brief

**Owner:** Sefy Tofan
**Goal:** Replace `/` with a homepage that reads as a serious, well-funded product company — credible to a CEO buying a hybrid-org operating layer. Bar: Stripe / Linear / Vercel / Wonderful.ai (with the asset budget we actually have).
**Status:** Approved direction — pending asset production.

---

## 0. The diagnosis (so we don't repeat it)

Why the first attempt failed:

- **Hero was busy:** gradient text, rotating orbital, glow blobs, two CTAs — all competing.
- **Architecture was four colored cards.** Lazy. Read as "vibe-coded in ten minutes."
- **Reused showcase mockups at hero scale.** Designed for small blocks; noisy when scaled up.
- **No editorial rhythm.** Every section was kicker → headline → paragraph → glass card. Templated.
- **No custom illustration anywhere.** Pure utility classes + lucide icons. Starter-template aesthetic.
- **Common SaaS startup tics on the page:** gradient text on H1, emoji-style colored chips, glow backgrounds, "Get Early Access" twice in the fold. Wonderful uses none of these.

**The bar:** the homepage must look like the company spent design hours on it, not coding hours.

---

## 1. Audience & frame

- **Primary persona:** CEO / Founder of a 5–50 person company. Already pays for 10–30 SaaS tools. Has tried AI agents; got demos, not outcomes.
- **The thesis he must walk away with:** Vibey is the operating layer for running a company as a hybrid of humans and agents. Three pieces — The Brain, Agents, Spaces — fit together. Not another chatbot, not another workflow tool.
- **The feeling he must walk away with:** "This is serious." Quiet confidence, not feature theater.

---

## 2. Aesthetic direction — one direction, locked

**Tag:** *"Studio film + product still."*

- **Editorial weight, not feature-spam.** Stripe / Linear / Vercel rhythm.
- **Dark base.** Near-black with warm undertone. Vibey is about depth, knowledge, identity — dark sells that.
- **One accent. Not the SaaS emerald-purple mix.** Move to a single warm accent (warm amber / copper) for CTAs and key UI. Per-Brain-memory colors only inside Brain visuals.
- **Stillness is a feature.** No glow blobs on the hero. No rotating orbits at full opacity. No emoji-colored chips on the architecture diagram.
- **Editorial typography:** larger H1 sizes (clamp(64px, 8vw, 124px)), tighter line-height, more letter-spacing on uppercase, real H1 → H2 weight contrast.
- **Custom illustration per major section.** Not lucide icons stacked in a row.

What we are **not** doing:
- ❌ Gradient text on the H1.
- ❌ Stock photography (we can't out-Wonderful Wonderful on photo).
- ❌ Carousels at hero scale.
- ❌ Reusing showcase-block mockups at full width.
- ❌ "Glass card with glow" everywhere.
- ❌ Emoji-colored chip rows for the architecture story.

---

## 3. Color, type, motion (locked tokens)

### Color
- **Base:** `#0A0B0F` (near-black, deep cool).
- **Surface 1:** `#13141A` (raised panels).
- **Surface 2:** `#1B1D26` (cards).
- **Hairline:** `rgba(255,255,255,0.06)` (default border).
- **Text/primary:** `#F4F4F0` (warm off-white).
- **Text/secondary:** `rgba(244,244,240,0.62)`.
- **Text/dim:** `rgba(244,244,240,0.38)`.
- **Accent (single):** *to commit:* warm copper `#C99B5F` **or** soft ember `#E5704A`. **Designer to pick one and lock.**
- **Brain memory colors:** stay scoped to the Brain visuals only. Do not leak into chrome.

> *Action:* Replace ad-hoc `emerald + purple + blue` usage in homepage components with the locked tokens above. Globals will gain `--color-accent-warm` and `--color-text-warm` if not already present.

### Type
- **Display H1:** `clamp(64px, 8vw, 124px)`, weight 600, tracking `-0.02em`, line-height 0.92.
- **H2:** `clamp(40px, 5vw, 72px)`, weight 600, tracking `-0.015em`, line-height 1.02.
- **H3:** `clamp(28px, 3vw, 40px)`, weight 600.
- **Eyebrow / kicker:** 13px, uppercase, weight 600, tracking `0.22em`, secondary color.
- **Body 1 (hero sub):** 19px / 1.55, secondary color.
- **Body 2 (section sub):** 17px / 1.6.
- **Quote (founder pull-quote):** serif, 28px / 1.3 (a single serif face — `Source Serif 4` or `Newsreader`).

### Motion
- **All motion is subtle and slow.** 700–1100 ms ease-out. No bouncy springs in chrome.
- **Hero motion budget:** at most one element breathing (the Brain orbital can rotate at 60–80 s per revolution). Everything else is still.
- **Scroll-driven fade-in only.** No rotating carousels in section visuals (carousels are reserved for the dedicated *Meet your agents* section).

---

## 4. Page structure (locked, no options)

Section count: **6** (not 7 — collapsed "Architecture" + "Three pieces" into one editorial spread).

### Section 1 — Hero (`Thesis`)
- **Layout:** 12-column. Type left (cols 1–6, vertically centered). Visual right (cols 7–12, full bleed to right edge).
- **Type left:**
  - Eyebrow: `Hybrid operating layer`
  - H1: `Run your company with humans and agents.` *(no gradient, no italic, no decoration)*
  - Sub (Body 1): `The Brain holds the knowledge. Agents do the work. Spaces is where it happens. One operating layer instead of fifteen disconnected tools.`
  - CTA row: **one** primary `Get Early Access →` + one ghost link `Read the thesis ↗` (linking to `/blog/vibey-beta`). No secondary button.
  - Trust line below CTAs (small): `Currently onboarding founders. Reply within 24h.` *(replace with a real line — see open questions)*
- **Visual right:** **one custom asset** — see Asset Plan §A1. Either:
  - **Option Hero-A (recommended): a deliberately composed full-bleed still of the Spaces board** (the real product). Tasteful crop, single focal point (one task card with an agent portrait avatar). Slight grain, slight blur on edges. Treats the product as the photograph.
  - **Option Hero-B (alternate): a custom slow-breathing Brain orbital** rendered at hero scale — single composition, agent portraits as nodes, central glyph. Quiet motion (rotation = one revolution per 75 s). Built as a dedicated component, not the reused showcase block.
- **Background:** flat `#0A0B0F`. **No dot grid, no glow beams, no gradient haze.** A single very subtle vignette toward the corners.
- **Nav:** existing nav stays. Pill announcement removed from the fold (move into Section 2 if at all).
- **Height:** `100vh` minus nav. No scroll cue arrow.

### Section 2 — *The shift* (`Why now`)
- **Layout:** centered editorial. Max-width 920 px. Lots of air above and below (240 px top, 200 px bottom on desktop).
- **Content (final copy):**
  > *"AI tools gave you a chatbot. You needed a company. The shift now is not toward smarter chatbots — it is toward hybrid orgs where people make the calls and agents take the load. Vibey is the operating layer for that org."*
- **Type:** H2 size, secondary color on the connective phrases, primary on the noun phrases. **No card. No box. No glow.** Just type on the dark base.
- **Single hairline divider** below.

### Section 3 — *The system* (`Three pieces` — editorial spread)

Replaces both the old "Three pieces" and "Architecture" sections. This is the heart of the page.

- **Layout:** 3 horizontal "chapters" stacked vertically. Each chapter is a 12-col grid:
  - **Chapter 01 — The Brain.** Cols 1–5: kicker `01 · The knowledge layer` + H3 `The Brain` + 2-sentence framing + ghost link `Explore →`. Cols 7–12: **custom Brain visualization** — not the reused MarketingMemoryStackMockup. A simpler, more confident still: 4 concentric arcs (User / Agent / Company / Customer) with named labels, one accent. Quiet. (Asset §A2.)
  - **Chapter 02 — Agents.** Reverse: visual cols 1–6, type cols 8–12. Visual: **4–6 agent portraits arranged in a row at full vertical height of the chapter, with each one's name and role typeset in editorial form below the portrait.** This is the "found portrait" treatment — treats agents as people, not chips. (Asset §A3 — uses existing portrait library.)
  - **Chapter 03 — Spaces.** Back to type-left, visual-right. Visual: **single product still of the Spaces board, full bleed right side.** (Asset §A4 — composed from existing SpacesHeroMockup, but framed correctly.)
- **No CTA at the bottom of this section.** Each chapter has its own `Explore →` link. The page CTA is at the end.

### Section 4 — *The architecture* (`How it fits`)
- **Custom illustration required.** This is the spot Wonderful uses for their iso 3D stack. Ours is simpler but must be original.
- **Recommended visual:** a hand-drawn-feeling cross-section diagram — 4 horizontal "strata" with the labels Surface / Workforce / Memory / Reach. Each stratum drawn as a thin layer with one or two icons embedded at editorial scale. Either:
  - **A static commissioned illustration (preferred),** or
  - **A custom SVG built as a component** with a real depth treatment (skewed perspective, hairline strokes, single accent on labels).
- **Copy (terse):**
  - Kicker: `Architecture`
  - H2: `One stack. No glue work.`
  - Sub: `Four layers wired into a single operating layer instead of five tools your team has to translate between.`
- **No layered colored cards stacked vertically (current draft). That goes in the bin.**

### Section 5 — *A note from the founder*
- **Layout:** asymmetric editorial. Cols 1–7: a **real photograph of Sefy** (composed, not the round avatar crop). Cols 8–12: a serif pull-quote + 1 short paragraph + signature.
- **Pull-quote (serif, 28 px):**
  > *"I built Vibey because the people I respect most are drowning in tools that should be doing the boring half of the job for them. The system is the integration. The team is the team — humans and agents — in one place."*
- **Paragraph (Body 2):**
  > "If that resonates, the Beta is open. Bring a real workflow. Connect a real tool. Tell me what breaks."
- **Signature:** stylized `Sefy Tofan, Founder` with a hand-drawn-style signature mark (SVG).
- **No round avatar. No glass card. No glow.**

### Section 6 — *Closing*
- **Layout:** full-bleed dark, 60vh, vertically centered.
- **Type only:**
  - Eyebrow: `The Beta is open.`
  - H1-sized line: `Run your company with humans and agents.` *(same line as hero — closes the loop)*
  - One button: `Get Early Access`. Warm accent. No second button.
- **Background:** subtle 1-px grid (very low opacity, intentional). No glow. No gradient.

---

## 5. Acceptance criteria (a section "passes" only if all are true)

For **every** section:
1. There is exactly **one** focal point. A user can tell you what it is in one sentence.
2. There is **no** glow blob, no decorative dot grid, no animated background outside the explicitly-allowed places (only the Brain orbital, only on Chapter 01).
3. Typography uses the locked scale in §3. No arbitrary `text-[XX]` values.
4. Colors are from the locked palette. No ad-hoc `purple-400`, `emerald-400`, `blue-400` outside the Brain visual.
5. Lucide icons appear **only** inside product visuals or as a tiny chrome glyph in a CTA. **Not as the section's main visual.**
6. The section's structure is **not** "kicker + headline + paragraph + glass card." Each section earns its layout.
7. Motion is slow (≥ 700 ms) or absent. No bounce.

If any line above is not true, ship the section is blocked.

---

## 6. Open questions for you (Sefy) — answer before designer kick-off

1. **Accent color lock:** warm copper `#C99B5F` or ember `#E5704A`? *(I lean copper — quieter, more enterprise.)*
2. **Hero visual choice:** Hero-A (Spaces product still) vs Hero-B (Brain orbital, custom hero-scale). *(I lean Hero-A — product confidence; orbital can live in Chapter 01.)*
3. **Founder photo:** do we have a usable hi-res landscape shot? If not, we need a half-day session (natural light, plain backdrop). The current 256-square avatar is not enough.
4. **Architecture diagram:** commissioned illustration (1 designer day) or custom SVG by me (1.5 dev days, lower polish)? *(I lean commissioned.)*
5. **Trust line under hero CTAs:** what's the real one-liner? Options:
   - "Currently onboarding founders one by one."
   - "Beta cohort opens [Month]. Reply within 24 h."
   - Or nothing — let the CTA stand alone.
6. **Footer tagline change:** keep "Your whole team. Humans and agents. One place." or move to "The operating layer for hybrid orgs."

---

## 7. Assets we have vs assets we need

### We have
- Agent portrait library (real photos: Atlas, Ivy, Niko, Jaime, Vibey, etc.) — usable for Chapter 02.
- `SpacesHeroMockup` (board UI, real portraits embedded) — usable as the source for the Hero / Chapter 03 still, but needs an editorial composition pass (crop, scale, focal direction).
- `MarketingMemoryStackMockup` (Brain orbital with portraits) — too busy for the hero; can serve as the Chapter 01 visual *if* it is simplified (fewer rings, slower motion, single accent).
- Sefy's headshot (`/images/authors/sefy-tofan.png`) — 256-square crop. Not enough for Section 5.
- Globals.css token system + utility class set — most type/spacing tokens exist.

### We need (commission list, ordered by priority)
1. **Architecture illustration** (Section 4). Static SVG/PNG. ~1 designer day.
2. **Custom Brain visualization** (Chapter 01). Simplified composition, possibly hand-drawn texture overlay. ~1 designer day OR a 1.5-day custom SVG build by me.
3. **Founder photograph** (Section 5). 1 session (~3 hours including travel). Hi-res. Landscape orientation.
4. **Signature mark** for Sefy (Section 5). 1 hour by a designer with a Wacom; or scan-and-vectorize an actual handwritten one.
5. **Globals.css additions:** `--color-accent-warm`, `--color-text-warm`, serif `@font-face` for the pull-quote, type scale CSS variables for the new display sizes. ~1 hour.

### Optional but worth it
- A short scroll-driven sound design pass (subtle, very quiet click on section transitions). Skip for v1.
- A 4-second hero loop video (Sefy talking, low-volume; muted by default) — overlay the trust line. **Skip for v1 unless the photograph turns into a video shoot anyway.**

---

## 8. Phasing

### Phase 0 — Today (done)
- ✅ Roll back `/` to legacy hero.
- ✅ Park v2 draft at `/preview-v2` (noindex).
- ✅ This brief written and committed.

### Phase 1 — Design (Sefy decides + designer engaged)
- Lock accent color, hero visual choice, architecture-illustration source (commission vs custom SVG), trust line.
- If commission: brief the designer using Sections 3–4 of this doc.
- Schedule the Sefy photo session.

### Phase 2 — Foundation (dev, no assets blocked)
- Add token additions to `globals.css` (warm accent, type scale, serif).
- Build the new section components from scratch under `apps/website/src/components/sections/home-v2/` — do **not** patch the v2 draft. Throw it out.
- Wire skeleton placeholders for the hero visual, Chapter 01 visual, architecture illustration, founder photo. Each placeholder is a clearly-labeled `<aside>` so QA can spot them.

### Phase 3 — Assets land + integration
- Replace each placeholder as the asset ships. Each replacement is its own PR.
- Acceptance-test each section against §5.

### Phase 4 — Cutover
- Swap `app/page.tsx` to import from `home-v2`. Decommission v1 (current legacy) — move legacy out of `/` and either delete or park behind a feature flag.

---

## 9. Non-goals for v2

- Pricing on the homepage (still hidden site-wide).
- A live product demo embed.
- Client logos (we don't have tier-1 logos to put up; faking it kills trust).
- "How it works" step diagrams beyond Section 4.
- "Why choose Vibey vs X" comparison on the homepage (that belongs on the compare pages).

---

## 10. Definition of done

- `/` loads the new homepage.
- A CEO scrolling the page in 60 s can answer: "what is this?", "for whom?", "what are the three pieces?", "is it serious?".
- Page passes every line in §5 for all six sections.
- Sefy approves it without saying "this looks vibe-coded."

---

*Status: written 2026-05-17. Awaiting Sefy's answers to §6 to unblock Phase 1.*
