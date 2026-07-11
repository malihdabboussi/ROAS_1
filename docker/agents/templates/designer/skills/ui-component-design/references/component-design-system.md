# UI Component Design Reference

This reference is for product UI, not marketing graphics. Use it to produce component blueprints, polish passes, and design reviews.

## Component Anatomy

Start every component with its job:

- `Trigger`: what makes the user open or see it.
- `Primary action`: the main thing the component should make easy.
- `Secondary actions`: useful but visually quieter.
- `Exit path`: how the user cancels, dismisses, or recovers.
- `Data dependency`: what information must be present for the component to be useful.

If the job is unclear, the design will drift. Ask one focused question instead of producing several competing options.

## Visual Hierarchy

Use a three-layer hierarchy:

- `Layer 1`: the primary action, active selection, or key outcome.
- `Layer 2`: supporting controls, labels, descriptions, and secondary actions.
- `Layer 3`: metadata, helper text, timestamps, captions, and dense chrome.

The viewer should understand the component in this order:

1. What is this?
2. What changed or matters?
3. What can I do next?

## Layout Patterns

Default to established product patterns:

- `Card`: summary, preview, metric, settings section, or contained object.
- `Modal`: focused decision, creation, edit, confirmation, or short workflow.
- `Toolbar`: search, filtering, sort, bulk actions, view controls.
- `Menu`: compact action list, contextual actions, destructive operations.
- `Tabs`: sibling views with stable page context.
- `Form`: progressive input with clear label, hint, validation, and action row.
- `Empty state`: explain what is missing and give one clear recovery action.

Avoid novelty when an existing pattern communicates faster.

## States Checklist

Include only states that matter for the component:

- `Default`: normal populated state.
- `Hover`: clarifies clickable rows or controls.
- `Focus`: keyboard-visible and accessible.
- `Selected`: visibly distinct from hover.
- `Loading`: describes what is happening, not just that time is passing.
- `Empty`: names the absence and offers the next best action.
- `Error`: states the problem and the recovery path.
- `Disabled`: explains why the action is unavailable when that is not obvious.
- `Mobile`: keeps the main action reachable and avoids horizontal overflow.

## Vibey Product UI Direction

Use restrained, premium product UI:

- Token-based roles: foreground, muted, card, background, border, primary, destructive, warning, success.
- Glass surfaces for meaningful containers, not every nested element.
- Clear whitespace and aligned edges.
- Muted chrome icons unless selected or semantic.
- Buttons with one obvious primary action per surface.
- Status color by meaning, not by decoration.

Avoid:

- Extra badges that do not change behavior.
- Competing primary buttons.
- Decorative gradients that reduce readability.
- Dense desktop layouts that collapse poorly on mobile.
- New patterns when a known product pattern fits.

## Responsive Rules

Design mobile-first:

- Keep tap targets comfortable.
- Collapse side-by-side form fields into one column.
- Move secondary metadata below primary labels.
- Keep destructive actions behind confirmation or lower visual priority.
- Let dense tables become cards, stacked rows, or horizontal-safe lists.

Desktop should add clarity and scanning speed, not more decoration.

## Handoff Detail

A builder should be able to implement from the handoff without asking:

- Container pattern and visual role.
- Header/body/footer structure.
- Primary and secondary actions.
- State list and behavior.
- Responsive changes.
- Accessibility notes: labels, focus order, keyboard dismissal, destructive confirmation.
- Any open question that truly blocks the design.

## Examples

### New Modal Blueprint

Use a centered modal with a short title, one explanatory sentence, a single-column form, inline validation, and a footer with neutral cancel plus primary save. On mobile, keep the same structure but let the modal become nearly full-width with scrollable body and sticky footer actions.

### Component Review

If a dashboard card has equal visual weight on title, metadata, CTA, and status, reduce competition: title and status become the first scan line, metadata moves to muted secondary text, and the CTA becomes the only primary visual element in the footer.
