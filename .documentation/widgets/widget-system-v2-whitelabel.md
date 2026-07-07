# Widget System v2 Theme and White-Label

## Renderer Contract

Widget v2 renders from `widget_definition` JSON and does not allow raw color injection from the agent output.

All visual styling resolves from CSS variable layers:

- `--color-*`
- `--vibe-*`
- `--widget-*` (mapped by `buildWidgetThemeCss()`)

This guarantees every widget follows the active brand/theme without regenerating widget JSON.

## White-Label Swap

White-labeling is a theme variable swap, not a widget rewrite.

1. Override brand variables in the customer theme layer.
2. Keep widget definitions unchanged.
3. Renderer re-renders every component with new variables.

## Why This Works

- Component catalog limits output to known UI primitives.
- Renderer maps chart/card/text/button styles to CSS variables only.
- Action/data bindings are data-driven and independent of visual tokens.

## Operational Rule

When adding new catalog components:

1. Read colors from CSS variables only.
2. Do not introduce hardcoded hex/rgb values.
3. Keep dark/light/brand behavior theme-driven.
