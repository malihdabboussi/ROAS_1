# Vibey Homepage v2 — Phasing (one screen)

**Use with:** `homepage-v2-brief.md` + `homepage-v2-assets.md`.

---

## Phase 0 — Today (done)

- [x] Roll back `/` to legacy hero.
- [x] Park v2 draft at `/preview-v2` (noindex).
- [x] Brief + asset spec + phasing committed under `.docs/design/`.

**Status:** waiting on Sefy's answers to brief §6 (accent, hero choice, photo plan, illustration source, trust line, footer line).

---

## Phase 1 — Decisions (Sefy, ~30 min)

Sefy answers the 6 open questions in brief §6 and confirms designer (commission vs in-house). After that:

- Lock accent color → `--color-accent-warm` value.
- Lock hero visual choice (A1-A or A1-B).
- Lock architecture source (commissioned illustration or custom SVG).
- Schedule the Sefy photo session.

**Output:** decisions appended to brief §6 with date.

---

## Phase 2 — Foundation (dev, 1 day, no assets blocked)

Independent of any designer work. Can ship in parallel.

- [ ] Add token additions to `globals.css` (asset spec §A8).
- [ ] Self-host the serif font (license check first).
- [ ] Scaffold new section components under `apps/website/src/components/sections/home-v2/`:
  - `HomeHeroV2.tsx` — hero with placeholder slot for A1.
  - `HomeShiftV2.tsx` — type-only "The shift" section.
  - `HomeSystemV2.tsx` — three editorial chapters with placeholder slots for A2/A3/A4.
  - `HomeArchitectureV2.tsx` — placeholder slot for A5.
  - `HomeFounderV2.tsx` — placeholder slots for A6 + A7.
  - `HomeClosingV2.tsx` — type-only closing.
- [ ] Each placeholder is a clearly-labeled `<aside>` with the asset code (`A1`, `A2`, …) so QA can spot them.
- [ ] Wire `apps/website/src/app/preview-v2/page.tsx` to render `home-v2` instead of the v1 draft. **Delete the v1 draft (`apps/website/src/components/sections/home/`).** No mercy — we are not patching it.

**Output:** `/preview-v2` shows the new skeleton with labeled placeholders.

---

## Phase 3 — Assets land + integration (designer + dev, ~1–2 weeks elapsed)

Each asset lands and is integrated in its own PR. Order matches asset-spec production order:

- [ ] **A5** Architecture illustration → replace `HomeArchitectureV2` placeholder.
- [ ] **A6** Sefy photo → replace `HomeFounderV2` photo placeholder.
- [ ] **A1** Hero visual → replace `HomeHeroV2` placeholder.
- [ ] **A2** Brain SVG → replace `HomeSystemV2` Chapter 01 placeholder.
- [ ] **A3** Portrait row treatment → wire grade + frames into Chapter 02.
- [ ] **A7** Signature → drop into `HomeFounderV2`.
- [ ] **A4** Spaces still → wire into Chapter 03.

**Each PR must pass brief §5 acceptance criteria for the section it touches.**

---

## Phase 4 — Cutover (dev, 1 hour)

- [ ] QA pass on `/preview-v2` end-to-end (Sefy + dev).
- [ ] Swap `apps/website/src/app/page.tsx` to render `home-v2`.
- [ ] Decommission legacy hero: move `HeroLegacy.tsx` → `_archived/HeroLegacy.tsx` (or delete after 2 weeks).
- [ ] Delete `apps/website/src/app/preview-v2/page.tsx` once `/` is the new homepage.

---

## What is explicitly not in v2

- Pricing on homepage (hidden site-wide; unchanged).
- Live product demo embed.
- Client logo wall (no tier-1 logos yet).
- "How it works" step diagrams (lives in feature pages).
- Compare-vs-X content (lives in `/compare/*`).

---

## Risk register

| Risk | Mitigation |
|------|-----------|
| Sefy photo session delayed | Phase 4 can ship with a temporary high-quality crop of the existing avatar set against the editorial layout. Replace as soon as shoot lands. |
| Architecture illustration commission slow | Have dev build a custom SVG version (1.5 days) as a parallel fallback. Ship whichever lands first; upgrade to the better one later. |
| Designer not yet hired | Asset A5 (architecture) and A2 (Brain SVG) can both be done by dev at lower polish. Asset A6 (photo) cannot — no shortcut. |
| Accent color regret | Token-based, swap is a single CSS variable change. |
| Globals.css drift | All new utilities and tokens added in one PR with code review. |

---

*Last updated: 2026-05-17.*
