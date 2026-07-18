# Visual Critique

Use this after implementation. The review should come from a fresh designer task so it does not inherit the builder's attachment to its own decisions.

## Required evidence

Open the actual preview and inspect screenshots at:

- 1440px desktop
- 390px mobile

If the preview cannot be opened, say that visual QA is blocked. Do not claim screenshot-level confidence from HTML or TSX alone.

## Review order

### 1. Five-second read

Identify what the page appears to offer, who it is for, and the primary action. If those are unclear, fix hierarchy before decoration.

### 2. Subject specificity

Ask whether the same visual direction could ship for a competitor by replacing the logo and copy. Flag generic typography, palettes, stock compositions, card grids, and decorative effects that are not grounded in the subject.

### 3. Composition and rhythm

Check scale changes, whitespace, alignment, section transitions, image placement, line length, density, and whether repeated structures make the page feel generated.

### 4. Typography and imagery

Check hierarchy, wrapping, contrast, font-role consistency, image crop, asset quality, and whether imagery carries meaning rather than filling space.

### 5. Conversion integrity

Check that the primary action is visible and credible. Flag invented urgency, unsupported claims, fake social proof, or unnecessary pressure mechanics.

### 6. Mobile composition

At 390px, check reading order, overflow, touch targets, image crop, sticky elements, dense sections, text wrapping, and whether the signature element survives appropriately.

### 7. Technical audit

Check visible focus, semantic controls, reduced-motion behavior, image dimensions and alt text, form labels, validation, loading states, and obvious performance risks.

## Output

```markdown
# Visual Critique

## Verdict
[Ship / revise / redesign, with one-sentence reason]

## Strongest quality
[The most successful decision worth preserving]

## Priority issues
1. [Observed issue] — [why it matters] — [exact revision]

## Desktop acceptance
- [observable check]

## Mobile acceptance
- [observable check]
```

Keep priority issues short. Five precise revisions are more useful than twenty comments. Preserve coherent decisions that already work.
