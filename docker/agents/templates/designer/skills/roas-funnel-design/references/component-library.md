# Component Library — the engine's section spec

Every section type `render_funnel.py` renders, and the fields each takes. This is how you translate a `roas-funnel-build` section guide into the JSON spec. Sections flow into **one continuous page** (not separate boxes); each gets a subtle **annotation label in the left margin**, off the page. Left-aligned copy blocks should be laid out as balanced two-column sections (see `text`).

The spec shape:
```json
{
  "funnel_name": "Client — VSL Funnel",
  "outdir": "out",
  "brand": { ...see design-system.md... },
  "pages": [
    { "name": "Pre-Call", "slug": "precall", "next": "precall", "sections": [ {…}, {…} ] }
  ]
}
```
- `slug` → output filename (`precall.html`); derived from `name` if omitted.
- `next` → slug the page's CTAs link to; defaults to the next page in the array.
- Any section: `"tag"` overrides its annotation label, `"tag": false` hides it; `"cta"` adds a button; `"href"` overrides the link.

---

## Asset placeholders (the core wireframe feature)

Four section/field kinds render a **crossed-box placeholder** with a `suggestion` caption: `video`, `image`, `mockup` (standalone sections), and the `media` field on `hero`, plus `photo` on testimonial items and `mockup` on offer panels. Always give them a `suggestion` — a one-line description of the real asset to shoot or make (subject, mood, setting). That suggestion IS the value: the wireframe tells the client what to produce.

Examples of good suggestions:
- `"Founder on camera in the studio, warm, under 90 seconds"`
- `"Product mockup of the course dashboard on a laptop"`
- `"Wide photo of the studio set, lit, mics on the table, premium"`
- `"Client headshot, smiling, neutral backdrop"`

---

## Section types

### `logo_bar` — `{ logo?, callout? }`
Top brand bar. **Logo centers automatically when there's no `callout`.** Add a `callout` (e.g. "Attention coaches") only if the real header has one; otherwise leave it off and let the logo center.

### `hero` — `{ eyebrow?, headline (req), subhead?, dark?, media?:"video"|"image"|"mockup", media_label?, suggestion?, ratio?, countdown?:{label?}, cta?, cta_sub? }`
Above-the-fold block. `media` adds a placeholder (with `suggestion`). `dark:true` makes the block dark.

### `video` — `{ heading?, label?, suggestion?, ratio?:"16x9"|"9x16", cta? }`
Standalone video/VSL block — crossed box with a play glyph. Never autoplay.

### `image` — `{ heading?, label?, suggestion?, ratio?:"16x9"|"4x3"|"1x1"|"9x16" }`
Standalone image placeholder.

### `mockup` — `{ heading?, label?, suggestion?, ratio? }`
Same as image but labeled as a product/screen mockup.

### `bullets` — `{ heading?, items:[{ bold?, text }], cta? }`
Check-icon benefit/intrigue bullets.

### `steps` — `{ heading?, items:[{ title, text }], cta? }`
Numbered steps (confirmation, pre-call, process).

### `text` — `{ heading?, paras:[str], align?:"center"|"left", media?:"image"|"mockup"|"video", media_side?:"left"|"right", suggestion?, ratio?, cta?, cta_sub? }`
Prose block — problem agitation, story, differentiator, "why us". **Add `media` to make it a balanced two-column section** (copy + a placeholder), with `media_side` choosing which side the asset sits (`right` default); give it a `suggestion`. With no `media` it renders as a single column and **centers by default** so it never orphans on the right — only pass `align:"left"` for a short blurb where left looks intentional. Any left-aligned copy block with a CTA should use the two-column form.

### `offer_stack` — `{ heading?, mockup?, items:[{ label, value? }], total?, anchor?, price?, savings?, badges?, cta? }`
Value stack + price, no form. `mockup` (a suggestion string) adds a product placeholder at the top of the panel.

### `offer_form_split` — `{ heading?, mockup?, offer:{ items, total?, anchor?, price?, savings? }, fields:[str], cta? }`
Offer stack left, order form right (offer/replay page).

### `order_form` — `{ heading?, fields:[str], cta?, note? }`
Standalone form panel (checkout, opt-in capture).

### `testimonials` — `{ heading?, items:[{ quote, name, role?, photo? }] }`
Three-up proof cards. Each item shows a small crossed-box headshot placeholder; `photo` is the suggestion caption (defaults to "Client headshot").

### `comparison` — `{ heading?, them_label?, us_label?, rows:[{ them, us }] }`

### `faq` — `{ heading?, items:[{ q, a }] }`

### `guarantee` — `{ badge?, heading?, body }`

### `cta` — `{ heading?, sub?, cta, cta_sub? }`
Standalone CTA block.

### `countdown` — `{ label? }`  ·  `band` — `{ text }`
Urgency timer / thin urgency strip.

### `footer` — `{ logo?, links?:[str], disclaimer? }`
FTC disclaimer goes here on offer/sales pages.

---

## Mapping a build section guide → these types

| Build skill block | Engine section |
|---|---|
| Logo bar / top bar | `logo_bar` (omit callout → logo centers) |
| Hero / headline + subhead + CTA | `hero` (+ `media` + `suggestion`) |
| VSL / confirmation / replay video | `video` |
| Product image / mockup | `mockup` or `image` |
| "See the room" / team / lifestyle shot | `image` (+ `suggestion`) |
| Intrigue / benefit bullets | `bullets` |
| Numbered confirmation/pre-call steps | `steps` |
| Problem agitation / story / future pacing | `text` |
| Price box / value stack (no form) | `offer_stack` (+ `mockup`) |
| Offer + order form | `offer_form_split` (+ `mockup`) |
| Cart / checkout, opt-in capture | `order_form` |
| Testimonials / social proof | `testimonials` (+ `photo` suggestions) |
| Us vs. them | `comparison` |
| FAQ | `faq` |
| Guarantee | `guarantee` |
| Final CTA stack | `cta` |
| Countdown / urgency | `countdown` or `band` |
| Footer + disclaimer | `footer` |

Typical **opt-in**: `logo_bar → hero(media:video,suggestion) → bullets → footer`.
Typical **VSL**: `logo_bar → video → cta → testimonials → footer`.
Typical **offer**: `logo_bar → band → offer_form_split(mockup) → footer`.
Typical **low-ticket sales**: `logo_bar → hero(mockup) → offer_stack → text(problem) → bullets → image → faq → guarantee → testimonials → cta → footer`.

If a build block doesn't map cleanly, use `text` rather than inventing a section. Add a new renderer to the engine only if a real layout recurs and nothing existing can express it.
