-- Validation flow v2: write-then-lint. Creates save valid files immediately;
-- broken files are rejected per-file (rejected_files) and reference problems
-- come back as bundle_errors on every save response — the agent fixes with
-- single-file writes instead of resending the whole bundle.

UPDATE agent_skills
SET markdown_content = replace(
  markdown_content,
  $OLD$## Validation — the page must render correctly

The backend validates every save and REJECTS broken bundles (missing `index.html`, a `<link rel="stylesheet">` pointing at a file not in the bundle, unbalanced/truncated CSS). If you get `BUNDLE_INVALID`, fix exactly what the error names and retry — never strip the stylesheet to make the error go away.

After every save, do a self-check pass:

1. Confirm every `<link>`/`<script src>` in `index.html` matches a file you actually saved (or `shared/...`).
2. Confirm every class used in the HTML is defined in the page or shared stylesheet — unstyled markup looks broken to the user.
3. If the save response includes `bundle_warnings`, fix them before telling the user the page is ready.

TSX (`generated_html`) is fully retired — the backend rejects it. Older TSX pages still render but cannot be edited; rebuild them as HTML bundles if the user wants changes.$OLD$,
  $NEW$## Validation — write, then lint, then fix

Saves work like writing code and then checking the compiler + linter:

- **Syntax errors block the file, not the bundle.** A broken stylesheet (unbalanced/truncated CSS) or a non-document `index.html` is never stored. On `add_funnel_page`, valid files save immediately and broken ones come back in `rejected_files` with the exact reason — fix each one with a single `write_funnel_file`. Never resend the whole bundle.
- **Lint runs on every save.** Save responses include `bundle_errors` (a stylesheet/script reference pointing at a file that doesn't exist — the page renders unstyled) and `bundle_warnings` (missing `<title>`/meta description). Every page-scoped `write_funnel_file`/`patch_funnel_file` response returns the fresh lint, so iterate: save → read `bundle_errors` → fix the named problem → repeat.
- **Done means clean.** Do not tell the user the page is ready while `rejected_files` or `bundle_errors` exist. Fix `bundle_warnings` too. Never "fix" a missing-stylesheet error by removing the `<link>` — write the stylesheet.
- Also self-check: every class used in the HTML must be defined in the page or shared stylesheet — unstyled markup looks broken to the user.
- `BUNDLE_INVALID` on a single-file write means that file was rejected — send the complete, valid file content.

TSX (`generated_html`) is fully retired — the backend rejects it. Older TSX pages still render but cannot be edited; rebuild them as HTML bundles if the user wants changes.$NEW$
)
WHERE skill_key = 'funnel-builder' AND agent_key = 'vibey';

UPDATE agent_skills
SET markdown_content = replace(
  markdown_content,
  $OLD$The backend validates every save and rejects broken bundles (missing stylesheet refs, unbalanced CSS → `BUNDLE_INVALID`). Fix what the error names and retry. If a save returns `bundle_warnings`, fix them before finishing. TSX is fully retired — `generated_html` and `navigation_tsx`/`footer_tsx` are rejected; use `files` and `nav_html`/`footer_html`.$OLD$,
  $NEW$Saves are write-then-lint: syntactically broken files (unbalanced CSS, non-document entry) are rejected per-file (`rejected_files` / `BUNDLE_INVALID`) while valid files save; reference problems come back as `bundle_errors` on every save response. Fix the named problem with a single-file write and iterate until `bundle_errors` is empty — never resend the whole bundle, and never delete a `<link>` to silence a missing-stylesheet error. TSX is fully retired — `generated_html` and `navigation_tsx`/`footer_tsx` are rejected; use `files` and `nav_html`/`footer_html`.$NEW$
)
WHERE skill_key = 'website-builder' AND agent_key = 'vibey';
