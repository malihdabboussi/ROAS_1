-- Designer UI component design skill.
-- Seeds the system-level skill so existing environments can route UI component
-- design work to the designer agent without requiring a manual skill create.

BEGIN;

INSERT INTO public.agent_skills (
  user_id,
  org_id,
  agent_key,
  skill_key,
  name,
  description,
  markdown_content,
  is_enabled,
  source
)
SELECT
  NULL,
  NULL,
  'designer',
  'ui-component-design',
  'ui-component-design',
  $desc$Design product UI components and component systems for Vibey-style interfaces. Use when the user asks the designer to work through a UI component, screen section, modal, dashboard panel, form, navigation pattern, responsive behavior, interaction state, visual polish, or design review for product UI. Do not use for ad creatives, social graphics, logos, or copywriting.$desc$,
  $skill$---
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
$skill$,
  true,
  'system'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.agent_skills
  WHERE user_id IS NULL
    AND org_id IS NULL
    AND agent_key = 'designer'
    AND skill_key = 'ui-component-design'
);

INSERT INTO public.agent_skill_resources (
  user_id,
  org_id,
  agent_key,
  skill_key,
  file_path,
  content,
  content_type
)
SELECT
  NULL,
  NULL,
  'designer',
  'ui-component-design',
  'references/component-design-system.md',
  $ref$# UI Component Design Reference

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
$ref$,
  'text/markdown'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.agent_skill_resources
  WHERE user_id IS NULL
    AND org_id IS NULL
    AND agent_key = 'designer'
    AND skill_key = 'ui-component-design'
    AND file_path = 'references/component-design-system.md'
);

UPDATE public.agents_registry
SET skills = (
  SELECT COALESCE(jsonb_agg(DISTINCT to_jsonb(elem)), '[]'::jsonb)
  FROM (
    SELECT jsonb_array_elements_text(COALESCE(skills, '[]'::jsonb)) AS elem
    UNION ALL SELECT 'ui-component-design'
  ) s
),
updated_at = now()
WHERE user_id IS NULL
  AND org_id IS NULL
  AND agent_key = 'designer';

COMMIT;
