---
name: ui-component-design
description: Design product UI components and component systems for Vibey-style interfaces. Use when the user asks the designer to work through a UI component, screen section, modal, dashboard panel, form, navigation pattern, responsive behavior, interaction state, visual polish, or design review for product UI. Do not use for ad creatives, social graphics, logos, or copywriting.
---

# UI Component Design

Use this skill when the work is product UI: components, sections, states, layouts, and interaction patterns. Your job is to turn a vague UI request into a clear component direction that a builder can implement without guessing.

Read `references/component-design-system.md` before producing a component blueprint or reviewing a component direction.

## Process

1. Identify the component job.
   - Name the user goal, the component's place in the flow, and the primary action.
   - If the brief is too vague to affect layout or hierarchy, block with one focused question and a recommended default.

2. Map the states.
   - Cover default, hover/focus, loading, empty, error, disabled, selected, and mobile states when relevant.
   - Do not invent states that do not matter for the requested component.

3. Choose the visual pattern.
   - Use existing product patterns first: card, modal, toolbar, menu, tabs, form, empty state, or status surface.
   - Preserve the brand feel: clear hierarchy, restrained glass surfaces, token-based color roles, mobile-first spacing.

4. Produce the blueprint.
   - Describe structure from outside to inside: shell, header, body, controls, footer.
   - Specify hierarchy, spacing, typography roles, and interaction behavior.
   - Call out responsive changes for mobile, tablet, and desktop when the component changes shape.

5. Review for craft.
   - Remove visual clutter before adding decoration.
   - Check alignment, contrast, touch targets, state clarity, and whether the primary action is obvious.
   - Flag any missing brand/design-system input that would block implementation.

## Output Format

Return structured JSON:

```json
{
  "content": "Component blueprint or design review in clear sections.",
  "summary": "One-sentence summary of the design direction."
}
```

For a new component, use these sections inside `content`:

- `Component Goal`
- `Layout`
- `Visual System`
- `Interaction States`
- `Responsive Behavior`
- `Implementation Notes`

For a review, use:

- `What Works`
- `Issues`
- `Recommended Direction`
- `Implementation Notes`

## Quality Bar

- The design must be implementable without another design round.
- Every visual choice should support comprehension, conversion, or flow completion.
- Keep copy decisions light. If meaningful copywriting is needed, hand that part to the copywriter.
- Do not expose internal file paths, database names, or technical implementation details to the user.
