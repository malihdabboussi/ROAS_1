-- Flip funnel/website building from legacy single-TSX generated_html to
-- presentation-style HTML file bundles (funnel_files / funnel_assets).
-- 1. Rewrite funnel-builder SKILL.md (HTML bundle authoring).
-- 2. Rewrite website-builder SKILL.md (HTML bundle + shared nav/footer files).
-- 3. Add references/funnel-runtime-contract.md (data attributes the public
--    runtime honors: lead capture, navigation, anchors).
-- 4. Reframe designer funnel-page-design skill to HTML output.
-- Existing TSX pages keep rendering; this changes what agents BUILD.

--------------------------------------------------------------------
-- 1. funnel-builder SKILL.md
--------------------------------------------------------------------
UPDATE agent_skills
SET markdown_content = $SKILL$
# Funnel Builder

## Why Quality Matters

Vibey users compare your output to pages built by $5K-$10K agencies. A page that looks like a free template kills trust. A page with visual depth, conversion mechanics, and brand integration makes the user screenshot it and show their friends. That word-of-mouth is how Vibey grows.

Follow the steps in order. The order matters.

---

## What a Funnel Page Is Now

Every funnel page is an **HTML file bundle**: a complete `index.html` document plus optional `styles.css` and `page.js`, saved per page. Funnel-wide files live in a shared scope (`shared/styles.css`, `shared/nav.html`, `shared/footer.html`) and apply to every page. No TSX, no React, no imports — plain semantic HTML and CSS that renders exactly as written, server-side, fully visible to search engines.

You edit pages file-by-file with `read_funnel_file`, `write_funnel_file`, and `patch_funnel_file` — never regenerate a whole page for a one-line change.

---

## Step 1: Understand Intent

- What type of page? (opt-in, sales, webinar, event, VSL, checkout, home, thank-you)
- What's the conversion goal? (email capture, call booking, purchase, registration)
- Standalone page or part of a multi-page funnel?

| User Says | funnel_type |
|-----------|-------------|
| "home page", "brand page", "business page" | `home-page` |
| "product page", "ecommerce", "supplement" | `ecommerce-product` |
| "webinar", "masterclass", "training registration" | `webinar` |
| "event page", "live event", "conference" | `live-event` |
| "checkout", "cart", "order page" | `cart-checkout` |
| "VSL", "video sales letter", "call booking" | `vsl` |
| "lead magnet", "freebie", "opt-in", "guide" | `lead-magnet` |

---

## Step 2: Pre-Build Gates

### 2a. Theme Check

1. Call `list_themes`. If a theme exists, its colors/fonts/voice drive every design decision.
2. If no theme — tell the user: "Let me set up your brand identity first so everything looks on-brand." Run the theme-builder flow, then come back.

### 2b. Brand Assets & Media

1. Use the theme's `logo_url` and `product_images` when they exist.
2. Never fabricate logos or product photos. Generated imagery is for mood only (gradients, ambient scenes, abstract backgrounds).
3. Upload-backed images and fonts go through `attach_funnel_asset` and are referenced by bundle-relative paths (`assets/logo.png`, `fonts/brand.woff2`).

### 2c. Design Library

Read the relevant files under `skills/funnel-builder/references/design-library/` (heroes, cta-sections, testimonials, features, stats, navigation, pricing, faq, footer, team, utility). These patterns are written in the legacy TSX format — **extract the visual ideas (layout, gradients, glow, animation timing, spacing rhythm) and re-express them as plain HTML + CSS**. Do not copy TSX syntax, `className`, or React constructs into your output.

Incorporate at least 2 premium patterns per page: 1 background/ambient effect and 1 interaction/motion effect (CSS animations and transitions; small vanilla-JS IntersectionObserver reveals in `page.js` when needed).

### 2d. Anti-Patterns

Read `skills/funnel-builder/references/anti-patterns.md` before writing any HTML. Without it you will default to the same patterns every AI produces: purple-to-blue gradients, three equal columns, Inter everywhere, fade-up on every element. The user's customers judge the page in 3 seconds.

---

## Step 3: Author the HTML Bundle

### Theme-Native CSS

Define the brand as CSS custom properties at the top of `styles.css` (or `shared/styles.css` for multi-page funnels) and use the variables everywhere:

```css
:root {
  --color-primary: #10b981;
  --color-heading: #161616;
  --color-body: #5c5c5c;
  --color-page-background: #fafafa;
  --font-heading: 'Sora', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --design-block-radius: 16px;
}
```

Mark the document theme-native with `data-vibey-theme-native="true"` on `<html>`. Pull actual values from the campaign Theme (`get_theme`). Put fallbacks only in the variable declarations, never inline in markup.

### Document Requirements

Every page entry file must be a complete HTML document:

- `<!doctype html>` + `<html>` + `<head>` + `<body>`.
- `<title>` and `<meta name="description">` in the head — these become the page's SEO metadata.
- `<link rel="stylesheet" href="styles.css">` for the page stylesheet; `shared/styles.css` is applied automatically on every page.
- Semantic sections (`<header>`, `<section>`, `<footer>`), one `<h1>` per page.
- Self-contained CSS. There is no Tailwind and no CSS framework at runtime — write real stylesheets.
- Google Fonts via `<link>` when the theme calls for them.
- JavaScript only when the page needs interaction (countdowns, reveals, accordions) — keep it in `page.js`, vanilla, no frameworks.

### Runtime Contract (lead capture + navigation)

Read `skills/funnel-builder/references/funnel-runtime-contract.md` for the exact data attributes. The essentials:

Every opt-in page needs a lead form:

```html
<form data-vibey-capture data-next-page="1">
  <input type="email" name="email" required placeholder="Enter your email" />
  <input type="text" name="name" placeholder="Your name" />
  <button type="submit">Get Instant Access</button>
</form>
```

- `data-vibey-capture` on every lead form, `name="email"` on the email input. The runtime posts the lead and fires the Meta pixel — do not write your own submit handler.
- `data-next-page="1"` navigates to the page at order_index 1 after submit (or a full URL for external targets like Calendly).
- `data-vibey-link="..."` on any clickable element navigates between funnel pages (page index, path, or URL).
- `data-comment-anchor="hero-headline"` on important editable elements so comments and edits can target them later.

---

## Step 4: Quality Self-Check

Before saving, verify:

- Layered gradients or ambient depth (not flat solid sections)
- Scroll/entrance effects where they earn attention (not on everything)
- At least 1 conversion mechanic beyond the form (countdown, social proof, urgency)
- Visual variety between sections
- Hero feels premium: min 80vh, large type, ambient effect
- Real brand assets embedded, theme variables used throughout
- `<title>`/meta description present; H1 communicates the offer

Do not mention file paths or internal mechanics to the user. Keep responses focused on the funnel.

---

## Step 5: Save via vibey_backend

Create the funnel, then add each page as a file bundle:

```json
{"action":"create_funnel","label":"Setting up your funnel","data":{"name":"Free Guide Funnel","slug":"free-guide-funnel","funnel_type":"lead-magnet"}}
```

```json
{"action":"add_funnel_page","label":"Designing your page","data":{"funnel_id":"UUID","name":"Free Guide Opt-in","slug":"free-guide-opt-in","page_type":"opt-in","order_index":0,"files":[{"path":"index.html","role":"entry","content":"<!doctype html><html data-vibey-theme-native=\"true\">...</html>"},{"path":"styles.css","role":"style","content":":root { --color-primary: ... }"}]}}
```

Editing existing pages — always the smallest action that fits:

- `list_funnel_files` then `read_funnel_file` before any edit. The files are the truth.
- `patch_funnel_file` for one-place copy/style changes (find must match exactly once).
- `write_funnel_file` to replace or add one file.
- `update_funnel_page` with `files` only when replacing the whole page.
- `apply_funnel_element_edit` when working from a Markup/Edit selection context.

Legacy note: older pages store TSX in `generated_html` (`source_mode: 'tsx'`). They keep working; edit them with the legacy `patch_funnel_page`. Never write TSX for new pages.

---

## Page Naming

Pattern: `[Offer or Campaign Topic] [Page Type]` — e.g. "Weight Loss Guide Opt-in", "Coaching Program Sales Page". Never 'Untitled'.

---

## Ecology

Funnels are the conversion layer of the campaign:

- **Depends on:** theme-builder (colors, fonts, voice), offer-builder (headlines, benefits, proof), avatar-builder (pain points, language), ad-builder (traffic destination)
- **Feeds into:** email-sequence-builder (funnel opt-in triggers welcome/nurture sequences)
- **Connected to:** meta-publisher (ad destination URLs point to funnel pages), social-content-builder (organic traffic)

A funnel without an offer produces generic copy. A funnel without a theme looks like a template. A funnel without an email sequence captures leads that go nowhere.
$SKILL$
WHERE skill_key = 'funnel-builder' AND agent_key = 'vibey';

--------------------------------------------------------------------
-- 2. website-builder SKILL.md
--------------------------------------------------------------------
UPDATE agent_skills
SET markdown_content = $SKILL$
# Website Builder Skill

> Build full websites with designer-quality pages, shared navigation, and a shared footer.
> For single-page funnels (opt-in, sales, event pages), use funnel-builder instead.

A website is a multi-page brand ecosystem: every page reinforces the others through shared navigation, consistent design language, and interconnected content. The quality bar: it should look like a senior designer built it.

## What a Website Page Is Now

Every website page is an **HTML file bundle** (`index.html` per page plus optional page CSS/JS). Site-wide design lives in funnel-shared files:

- `shared/styles.css` — the design system: theme CSS variables, typography, buttons, cards. Loaded on every page automatically.
- `shared/nav.html` — the site navigation fragment, injected above every page.
- `shared/footer.html` — the site footer fragment, injected below every page.

No TSX, no React. Plain semantic HTML + CSS, rendered server-side and fully crawlable.

## Pre-Build Gates

1. **Theme** — `list_themes`; run theme-builder first if none exists.
2. **Brand assets** — real logo and photos via `attach_funnel_asset`; never fabricate identity assets. Ask: "Do you have team photos, office shots, or visuals for specific pages?"
3. **Anti-patterns** — read `references/anti-patterns.md`. Every section should create a new visual moment; two consecutive sections with the same structure feel generated.
4. **Design library** — read the relevant `references/design-library/` files. They are legacy TSX patterns: extract the visual ideas and re-express them as HTML + CSS.

## Build Order

1. `create_website` (one artifact; pages live inside it).
2. **Design system first**: write `shared/styles.css` with the full token set (`write_funnel_file` without `funnel_page_id`), pulled from the campaign Theme.
3. **Shared chrome**: write `shared/nav.html` and `shared/footer.html` — or pass `nav_html`/`footer_html` to `set_website_layout`. Nav links use `data-vibey-link="/about"` style paths that must exactly match each page's `path`.
4. **Home page first** (`add_website_page` with `page_type: "home"`, `path: "/"`, `files`) to set the design language, then the remaining pages.
5. Set the structured `layout` config too (`set_website_layout` with `layout.navigation.items`) so the dashboard and fallback chrome know the page map.

```json
{"action":"add_website_page","label":"Designing your Home page","data":{"funnel_id":"UUID","name":"Home","slug":"home","page_type":"home","path":"/","order_index":0,"files":[{"path":"index.html","role":"entry","content":"<!doctype html><html data-vibey-theme-native=\"true\">...</html>"}]}}
```

## Page Requirements

- Complete HTML document with `<title>` and `<meta name="description">` per page — websites live or die on SEO.
- Do NOT inline a nav/footer in page bodies; the shared fragments wrap every page automatically.
- Use the shared design-system classes from `shared/styles.css`; page-specific CSS goes in the page's own `styles.css`.
- Contact/lead forms use `data-vibey-capture` exactly like funnels (see `skills/funnel-builder/references/funnel-runtime-contract.md`).
- One `<h1>` per page; heading hierarchy intact.

## Editing

- `list_funnel_files` / `read_funnel_file` first — files are the truth.
- `patch_funnel_file` for one-place changes; `write_funnel_file` per file; shared scope (no `funnel_page_id`) for site-wide changes.
- Changing `shared/styles.css` restyles the whole site in one write — prefer it over editing each page.

Legacy note: older websites store TSX pages (`source_mode: 'tsx'`) and `navigation_tsx`/`footer_tsx` layouts. They keep working. Never write TSX for new pages.
$SKILL$
WHERE skill_key = 'website-builder' AND agent_key = 'vibey';

--------------------------------------------------------------------
-- 3. funnel-runtime-contract.md reference (all agents)
--------------------------------------------------------------------
DELETE FROM agent_skill_resources
WHERE skill_key = 'funnel-builder'
  AND file_path = 'references/funnel-runtime-contract.md';

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id, org_id)
VALUES (
  '*',
  'funnel-builder',
  'references/funnel-runtime-contract.md',
  $res_runtime_contract$# Funnel Runtime Contract

The public funnel runtime (vibeyfunnels.com and custom domains) wires behavior through data attributes in your HTML. Keep these intact — the platform depends on them.

## Lead Capture

```html
<form data-vibey-capture data-next-page="1">
  <input type="email" name="email" required placeholder="Enter your email" />
  <input type="text" name="name" placeholder="Your name" />
  <input type="tel" name="phone" placeholder="Phone (optional)" />
  <button type="submit">Get Instant Access</button>
</form>
```

- `data-vibey-capture` — marks the form. The runtime intercepts submit, posts the lead (email, name, all named fields, UTM params) to the platform, fires the Meta pixel Lead event, then navigates.
- `name="email"` — required on the email input. Other inputs are captured by their `name`.
- `data-next-page` — where to go after submit: a page `order_index` (`"1"`), a path (`"/thank-you"`), or a full URL (`"https://calendly.com/..."`). Omit it to advance to the next page by index.
- Never attach your own submit handler to a capture form and never build your own fetch to a lead endpoint.
- Email capture forms automatically register a conversion point for funnel analytics.

## Navigation

- `data-vibey-link="1"` — navigate to the page at order_index 1.
- `data-vibey-link="/pricing"` — navigate to the sibling page with that path (websites).
- `data-vibey-link="https://..."` — external URL.
- Works on any clickable element (buttons, cards, links). For plain `<a>` tags within websites, normal `href` paths also work.

## Anchors for Edits & Comments

Add `data-comment-anchor="unique-id"` to key editable elements (hero headline, primary CTA, pricing cards) so Markup-mode comments and `apply_funnel_element_edit` can target them reliably across edits.

## Assets

Reference uploaded media by bundle-relative paths and map them with `attach_funnel_asset`:

```html
<img src="assets/logo.png" alt="Brand logo" />
```

```css
@font-face { font-family: 'Brand'; src: url('fonts/brand.woff2') format('woff2'); }
```

The runtime rewrites these paths to the hosted URLs at render time.

## Tracking (automatic — do not implement)

Page views, Meta pixel page events, and lead conversions are recorded by the platform wrapper. Do not add analytics scripts, pixel snippets, or tracking code to bundles.

## Shared Files (multi-page funnels & websites)

- `shared/styles.css` — applied to every page automatically.
- `shared/nav.html` / `shared/footer.html` — fragments injected around every website page; write them without `<html>`/`<body>` wrappers.
$res_runtime_contract$,
  NULL,
  NULL
);

--------------------------------------------------------------------
-- 4. designer funnel-page-design: TSX framing -> HTML bundle framing
--------------------------------------------------------------------
UPDATE agent_skills
SET markdown_content = replace(
  replace(
    markdown_content,
    'Each page is a TSX component that renders at full width. The runtime handles rendering — the designer''s job is to produce visually compelling, conversion-optimized TSX.',
    'Each page is an HTML file bundle: a complete index.html plus styles.css, saved per page via add_funnel_page with files. The designer''s job is to produce visually compelling, conversion-optimized HTML and CSS — no TSX, no React. Follow skills/funnel-builder/SKILL.md for the bundle contract and skills/funnel-builder/references/funnel-runtime-contract.md for lead-capture/navigation attributes.'
  ),
  'conversion-optimized TSX',
  'conversion-optimized HTML'
)
WHERE skill_key = 'funnel-page-design';
