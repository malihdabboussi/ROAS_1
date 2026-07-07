---
name: mobile-optimization
description: Audit and fix Vibey frontend mobile responsiveness without redesigning the application. Use when asked to optimize pages, layouts, panels, dashboards, navigation, modals, tables, forms, or other UI for mobile/tablet viewports; when looking for desktop-only frontend surfaces; or when validating responsive regressions with a mobile audit.
---

# Mobile Optimization

## Overview

Use this skill to find and repair mobile responsiveness gaps in the actual Vibey app while preserving the existing visual design. The goal is responsive adaptation of the current UI, not a new mobile concept.

## Non-Negotiables

- Preserve the product design, hierarchy, copy, and desktop layout. Only change layout behavior needed for mobile and tablet usability.
- Protect desktop behavior explicitly: capture or inspect the current desktop layout before editing, keep desktop breakpoints visually unchanged, and verify the same desktop route or surface after the mobile fix.
- Start from evidence: run the mobile audit or inspect the target viewport before editing.
- Reuse nearby responsive patterns from the same feature or shared surface before inventing a new approach.
- Follow repo rules: read target files fully, use token/utility classes from `globals.css`, do not use inline styles, raw colors, arbitrary values, or new utilities without approval.
- Keep fixes scoped to the affected surface and its shared boundary. Do not redesign unrelated pages.

## Workflow

1. Establish scope:
   - Identify the page, route, feature, and viewport where mobile breaks.
   - Identify the desktop surface that must remain unchanged, usually the same route at a 1440px-class viewport plus any relevant open modal/panel state.
   - For shared UI, read `documentation/frontend-shared-surfaces.md` before adding or changing shared helpers/components.
   - For UI/CSS edits, read `.docs/guidelines/design/design-guidelines.md` and grep `globals.css` only for specific class names.

2. Run the audit:
   - Start the web app if needed. Do not run a build unless the user explicitly asks.
   - Run the bundled script from the repo root:

```bash
node .agents/skills/mobile-optimization/scripts/mobile-responsive-audit.mjs --base-url http://localhost:3000 --out /tmp/mobile-responsive-audit.json
```

- If bundled Playwright Chromium is missing but system Chrome exists, pass `--browser-channel chrome`; the script also tries this fallback automatically.
- For authenticated or dynamic pages, pass representative routes:

```bash
node .agents/skills/mobile-optimization/scripts/mobile-responsive-audit.mjs --base-url http://localhost:3000 --login-preset yc-demo --paths /,/spaces,/team,/studio --screenshots --out /tmp/mobile-responsive-audit.json
```

- Use `--auth-state path/to/storage-state.json` when Playwright storage state is available.
- Use `--login-preset yc-demo` for the Foundry Creative demo account. Keep passwords out of commands: set `VIBEY_MOBILE_AUDIT_PASSWORD`, `YC_DEMO_PASSWORD`, or rely on the local gitignored `apps/api/.docs/yc-demo-credentials.md` file when present.
- Use `--save-auth-state /tmp/mobile-auth-state.json` when you want to reuse the session in later audit runs.
- Use `--fail-on-findings` only when the audit is intended as a gate. Discovery mode should collect findings without blocking.

3. Mine existing responsive patterns:
   - Search the same feature and adjacent shared components for mobile classes and layout choices:

```bash
rg -n "sm:|md:|lg:|flex-col|grid-cols|overflow-x|min-w|max-w|sidebar|sheet|drawer" apps/web/src/features/<feature> apps/web/src/components
```

- Inspect similar pages that already work on mobile. Prefer copying the same breakpoint strategy, not the same markup blindly.

4. Fix by adapting layout:
   - Replace desktop-only rows with mobile stacks that return to the original layout at the existing breakpoint.
   - Prefer mobile-only changes or mobile-first classes with explicit desktop restoration such as existing `md:`/`lg:` patterns. If a base class changes, prove the desktop class path still resolves to the previous layout.
   - Let dense tools scroll horizontally only when the content is inherently tabular or canvas-like.
   - Collapse or stack sidebars, panels, and inspector rails using existing app patterns.
   - For modal work, check existing `container-modal-*`, `z-modal-*`, and `modal-scroll-*` utilities first. Treat `z-modal-layer-*` as stacking utilities, not layout utilities. Harden `container-modal-*` centrally before migrating legacy one-off modal wrappers, and migrate only wrappers that bypass the shared utilities or fail the audit.
   - Preserve content order, action priority, icons, labels, spacing rhythm, and desktop behavior.
   - If a missing utility is required, stop and report `Missing utility: [name] for [purpose]`.

5. Verify:
   - Rerun the audit against the changed routes and compare the before/after findings.
   - Recheck the desktop route or open modal state at the same desktop viewport used before editing. No desktop layout, spacing, hierarchy, content order, or action visibility should change unless the user explicitly asked for a desktop change.
   - Run focused tests or lint for the touched package when available.
   - Check changed code file LOC against architecture limits.
   - Run `git diff --check`.
   - Add the required changelog entry and log out-of-scope responsive debt in `.docs/plans/agent-follow-up-work.md`.

## Audit Script

`scripts/mobile-responsive-audit.mjs` launches Chromium with phone/tablet viewports and reports:

- document-level horizontal overflow
- visible elements wider than the viewport or positioned off-screen
- fixed/min-width styles that exceed the viewport
- clipped scrollable text/content
- small visible tap targets
- route load/status errors
- skipped dynamic Next.js routes that need representative URLs

Useful flags:

- `--base-url <url>`: app URL, default `http://localhost:3000`
- `--browser-channel <name>`: Playwright browser channel, usually `chrome` on this machine
- `--browser-executable <path>`: explicit browser executable path
- `--paths /,/team`: comma-separated route list
- `--paths-file <file>`: newline-delimited route list
- `--auth-state <file>`: Playwright storage state for authenticated pages
- `--login`: create a Playwright storage state through the login UI
- `--login-preset yc-demo`: log in as the YC demo account using env/local credentials
- `--login-email <email>`: email for a custom login
- `--login-password-env <name>`: env var containing the login password
- `--save-auth-state <file>`: write the generated storage state for reuse
- `--screenshots`: save screenshots for routes with findings
- `--out <file>`: write JSON report
- `--fail-on-findings`: exit non-zero when findings exist
- `--max-pages <n>`: cap inferred static route count
- `--list-routes`: print inferred/provided routes and skipped dynamic routes without launching a browser
- `--route-timeout <ms>`: route navigation timeout, useful when app pages compile slowly
- `--settle-ms <ms>`: wait time after `DOMContentLoaded` before DOM inspection
- `--quiet`: hide per-route progress output

If Playwright browsers are missing, the script will say so. Install them only when appropriate for the environment; do not run install/build commands without user approval.

## Triage Rules

- Treat horizontal document overflow as highest priority; it usually means mobile users cannot use the page cleanly.
- Treat fixed-width panels, tables, rails, and editor surfaces as layout-boundary problems. Fix the wrapper or shared shell first.
- Treat repeated offenders from the same component as one shared fix, not separate page fixes.
- If the audit only shows redirects or unauthenticated pages, gather auth state or a representative path list before claiming the app is mobile-safe.
- Do not claim a mobile fix is complete until the corresponding desktop route or open state has been checked and remains unchanged.
