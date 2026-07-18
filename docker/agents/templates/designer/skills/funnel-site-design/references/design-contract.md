# Design Contract

Use this format for the handoff from design to implementation.

## Required sections

### Context

- Surface and page set
- Audience
- Single job
- Offer
- Verified proof
- Brand inputs
- Anti-references
- Constraints

### Decision status and open decisions

Mark each substantive choice as **Confirmed**, **Proposed**, or **Missing**. Confirmed choices come directly from supplied assets or approved brand material. Proposed choices need approval before production. Missing choices block publishing or require the builder to preserve an honest neutral state.

Do not make a fallback font, guessed token value, draft copy line, or arbitrary numeric ratio look approved. Group unresolved items once instead of repeating them throughout the contract.

### Visual thesis

Write one sentence that connects the subject to the chosen design language. Add an inverse test: explain why the sentence would not fit a direct competitor unchanged.

### Signature element

Name the one memorable element, why it belongs to this subject, and where it appears. It may be typographic, photographic, editorial, spatial, illustrative, or interactive. It does not need to be an effect.

### Visual system

Specify:

- color roles, including background, surface, text, muted text, primary action, and semantic states
- heading, body, and utility type roles
- corner, border, and shadow posture
- spacing density and vertical rhythm
- image treatment and asset requirements
- icon policy
- motion posture and reduced-motion behavior

Use existing brand tokens when present. Do not invent replacement colors or fonts simply to make the design feel new.

Use relational layout guidance by default: dominant/supporting, narrow/wide, dense/open, aligned/offset. Add exact sizes, ratios, or percentages only when they prevent a real implementation ambiguity; numerical quotas are not evidence of art direction.

### Page composition

For every page, describe:

- opening thesis
- section sequence and changes in rhythm
- content hierarchy
- where proof appears
- primary and secondary actions
- transitions between sections
- intentional asymmetry or alignment

### Responsive composition

Describe desktop and mobile separately.

For 1440px desktop, name container behavior, column relationships, image scale, and whitespace.

For 390px mobile, name reading order, elements that move or disappear, typography adjustments, touch-safe actions, image crops, and any sticky behavior. "Stack the columns" is not a composition.

### Content integrity

List supplied claims and proof that may be shown. List missing evidence separately. Never turn missing evidence into placeholder testimonials, logos, metrics, urgency, or scarcity.

### Builder acceptance criteria

Write 5-10 observable checks. Include fidelity to the thesis, hierarchy, mobile behavior, accessibility, and the signature element.

Keep the full contract concise enough for a builder to scan in under five minutes. Define the shared system once; for multi-page sites, describe only what is distinctive about each page.

## Compact example

```markdown
# Design Contract

## Context
Audience: independent operators evaluating a live workshop.
Single job: make the workshop method credible enough to register.
Verified proof: two supplied before/after operating plans and one attributed quote.
Anti-references: neon SaaS, glass cards, fake event urgency.

## Visual thesis
Treat the page like a working session wall: real marked-up plans and decisive annotations show the method in use. A generic business coach could not use this without possessing the same operating artifacts.

## Signature element
One oversized annotated plan crosses the hero boundary and becomes the evidence anchor. No decorative ambient effect.

## Responsive composition
At 390px, the annotated plan moves below the promise, crops to its clearest evidence area, and the registration action remains visible after the proof section rather than becoming a permanent sticky bar.
```
