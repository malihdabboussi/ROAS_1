-- Rewrite website-builder skill with comprehensive instructions, grounding protocol, and component library.

UPDATE agent_skills
SET
  description = $desc$Build multi-page websites with shared navigation, footer, and interconnected pages. Use when the user wants a full website with multiple connected pages — not a single landing page or funnel. Triggers for requests like build my website, create a business site, make a portfolio site, company website, multi-page web presence, or any request involving more than one interconnected page.$desc$,
  markdown_content = $skill_body$# Website Builder Skill

> Use this skill when the user wants a full website with multiple connected pages and shared layout.
> For single-page funnels (opt-in pages, sales pages, event pages), use funnel-builder instead.

A website is fundamentally different from a funnel. Funnels are single-purpose conversion machines — one page, one goal. Websites are multi-page brand ecosystems where every page reinforces the others through shared navigation, consistent design language, and interconnected content. The complexity isn't in any single page — it's in how the pages work together as a unified experience.

---

## Pre-Build Gates (MANDATORY)

### Gate 1 — Theme

The theme is the DNA of every page. Without it, 4 pages built separately will look like 4 different websites.

1. Call `list_themes` to check if the campaign has a theme
2. If theme exists — load it. Use its colors, fonts, and voice for ALL generated TSX across ALL pages
3. If no theme — tell the user: "Let me set up your brand identity first so every page feels cohesive from the start." Then read `skills/theme-builder/SKILL.md` and run that flow. Come back here once saved.

### Gate 2 — Brand Assets & Media

**Step 1 — Load existing brand assets from the theme:**

Check `logo_url` and `product_images` from the campaign theme. These are the user's real assets.

- If a logo exists — it goes in the shared nav layout. This is the single most important visual consistency element.
- If product images exist — use them on relevant pages (Home hero, Services, About).

**Step 2 — Ask for additional assets:**

"I'll use your logo and brand photos from your brand settings. Do you have any additional images — team photos, office shots, or specific visuals for certain pages?"

- Collect any URLs the user provides
- For assets the user doesn't have (team photos, office shots) — use clean icon/illustration sections instead. "I'll design clean icon-based sections for your team — you can swap in real photos later."

**Step 3 — Generate supplemental visuals (atmosphere only):**

For hero backgrounds, section textures, abstract patterns, lifestyle scenes: `generate_image` works well. These are ambient visuals, not brand-specific assets.

Generate: gradients, abstract art, lifestyle photography, nature scenes, texture overlays.
Never generate: logos, product photos, team headshots, brand marks, screenshots.

Gather all URLs before page generation.

### Gate 3 — Visual Effects Library

Read `../../data/visual-effects.md` for 8 premium animation patterns with full TSX code.

Apply at least 2 effects per page: 1 background/ambient + 1 interaction/motion.
Keep effects cohesive across pages — if the Home hero uses particle backgrounds, don't switch to aurora on About. Pick a visual language and commit to it site-wide.

### Gate 4 — Component Library

Read `references/component-library.md` for premium UI component patterns.

This file contains 15+ production-ready component patterns — animated hero sections, bento grids, testimonial walls, pricing tables, FAQ accordions, stats counters, logo marquees, and more. All patterns are self-contained TSX using only the available runtime scope (React, Framer Motion, Lucide icons, anime.js).

Select 4-6 component patterns that match the user's website type and use them consistently across pages.

---

## Layout Schema (CRITICAL)

The shared layout is what makes pages feel like one website instead of disconnected pages. The `set_website_layout` action saves this JSON, and the renderer wraps every page with it automatically.

**You MUST call `set_website_layout` after creating the funnel and BEFORE creating pages.**

### WebsiteLayout Interface

```typescript
interface WebsiteLayout {
  navigation?: {
    logo?: { url: string; alt: string }
    items?: Array<{
      label: string
      path: string            // Must match a page's path exactly
      style?: 'link' | 'button'  // 'button' renders as CTA
      children?: Array<{ label: string; path: string }>
    }>
    position?: 'sticky' | 'fixed' | 'static'  // default: 'sticky'
    style?: 'transparent' | 'solid' | 'blur'   // default: 'solid'
  }
  footer?: {
    columns?: Array<{
      title: string
      links: Array<{ label: string; path: string }>
    }>
    copyright?: string
    socials?: Array<{ platform: string; url: string }>
  }
}
```

### Layout Example (Business Website)

```json
{
  "navigation": {
    "logo": { "url": "https://...", "alt": "Acme Inc" },
    "items": [
      { "label": "Home", "path": "/" },
      { "label": "About", "path": "/about" },
      { "label": "Services", "path": "/services" },
      { "label": "Contact", "path": "/contact", "style": "button" }
    ],
    "position": "sticky",
    "style": "blur"
  },
  "footer": {
    "columns": [
      {
        "title": "Company",
        "links": [
          { "label": "About Us", "path": "/about" },
          { "label": "Services", "path": "/services" },
          { "label": "Contact", "path": "/contact" }
        ]
      },
      {
        "title": "Services",
        "links": [
          { "label": "Consulting", "path": "/services" },
          { "label": "Strategy", "path": "/services" },
          { "label": "Training", "path": "/services" }
        ]
      },
      {
        "title": "Connect",
        "links": [
          { "label": "Email Us", "path": "/contact" },
          { "label": "LinkedIn", "path": "https://linkedin.com/company/..." },
          { "label": "Instagram", "path": "https://instagram.com/..." }
        ]
      }
    ],
    "copyright": "© 2026 Acme Inc. All rights reserved.",
    "socials": [
      { "platform": "LinkedIn", "url": "https://linkedin.com/company/..." },
      { "platform": "Instagram", "url": "https://instagram.com/..." },
      { "platform": "Twitter", "url": "https://twitter.com/..." }
    ]
  }
}
```

Read `references/layout-schema.md` for 4 more complete layout examples (SaaS, Portfolio, Restaurant, Consultant) and all field descriptions.

### Critical Layout Rules

- Nav `path` values MUST exactly match the `path` you set on each `add_funnel_page` call
- The last nav item should usually be `style: "button"` (the primary CTA — typically Contact or Get Started)
- Footer link paths must also match actual page paths
- External URLs (social links) work as-is — the renderer handles them
- The renderer automatically adds the header above and footer below each page's TSX — do NOT inline header/footer in page TSX

---

## Build Flow

### Step 1 — Create Site Container

```json
{"action": "create_funnel", "label": "Setting up your website", "data": {
  "name": "User's Business Name — Website",
  "slug": "business-name",
  "funnel_type": "website"
}}
```

### Step 2 — Plan the Sitemap

Define the page map. Minimum viable website: Home, About, Services, Contact. The user may want more — Portfolio, Pricing, Team, Blog, FAQ, Testimonials.

Tell the user: "Here's the sitemap I'm planning for your website: [list pages]. Does this look right, or do you want to add/remove any pages?"

### Step 3 — Set Shared Layout

Call `set_website_layout` with the full layout JSON. Use the logo from the theme. Map nav items to your planned pages. Set footer columns, copyright, and socials.

### Step 4 — Generate Pages (Home First)

Always create Home first (`page_type: "home"`, `path: "/"`). It sets the design language for the entire site.

Then create remaining pages in logical order:
- About (`page_type: "about"`, `path: "/about"`)
- Services (`page_type: "services"`, `path: "/services"`)
- Contact (`page_type: "contact"`, `path: "/contact"`)
- etc.

Each page's `path` MUST match what you set in the nav layout.

### Step 5 — Verify Navigation

After all pages are created, mentally verify:
- Every nav item path matches a created page's path
- Every footer link path matches a created page's path or is an external URL
- The home page path is exactly "/"
- Contact page includes `data-vibey-capture` form

### Step 6 — Blog (Optional)

After creating pages, ask: "Would you like me to add a few blog posts to get your content started?"
If yes, generate 3-5 posts using `create_blog_post` that match the website topic and audience.

---

## Website Examples Grounding Protocol

The examples library contains full TSX source code for real website pages — complete with visual effects, animations, responsive layouts, and premium patterns refined through real use.

### Why Full Source Code Matters

The INDEX descriptions tell you WHAT exists. The actual .md files show you HOW it's built — the section transitions, responsive breakpoints, animation timings, typography hierarchies, color layering, interactive elements. Skimming descriptions produces generic output. Reading complete code produces premium output.

### Grounding Steps

**Step 1:** Read `references/examples/INDEX.md` for the full category map.

**Step 2:** Match the user's request to a category:

| User Says | Category | Key Examples |
|-----------|----------|--------------|
| "business website", "company site", "corporate" | `business` | Home, About, Services, Contact (full 4-page set) |
| "portfolio", "creative", "agency", "showcase" | `portfolio` | Portfolio home with gallery grid, project showcases |
| "SaaS", "startup", "app website", "product site" | `saas` | SaaS home with feature grids, pricing, social proof |
| "consultant", "coach", "personal brand" | `consultant` | Consultant home with credibility, booking, testimonials |
| "restaurant", "cafe", "local business" | `local-business` | Local business with menu, location, hours, gallery |
| "pricing page" | `pricing` | Pricing page with toggle, comparison, FAQ |

**Step 3:** Select 2-3 examples from the matched category.

**Step 4:** Read the selected example files completely — every line of TSX.

**Step 5:** Before writing your own TSX, extract at least 7 concrete implementation patterns:
1. Section composition technique (how sections are structured and separated)
2. Responsive layout strategy (breakpoints, mobile-first patterns)
3. Animation/motion technique (scroll reveals, entrance effects, hover states)
4. Typography hierarchy (heading sizes, font weights, spacing rhythm)
5. Color layering (backgrounds, gradients, overlays, accent usage)
6. Interactive elements (hover cards, expandable sections, tabs)
7. Content density (whitespace balance, section padding rhythm)

**Step 6:** Generate TSX using all extracted patterns + visual effects + component library patterns. Apply campaign theme to everything.

---

## Multi-Page Coordination Protocol

A website's quality is judged not by its best page but by how consistent ALL pages feel together.

### Design Tokens (Apply Identically Across All Pages)

- **Section padding:** Use the same vertical padding rhythm site-wide (e.g., `py-20 md:py-28`)
- **Max width:** Same container width everywhere (e.g., `max-w-7xl mx-auto px-6`)
- **Heading hierarchy:** H1 only on Home hero. H2 for page titles and major sections. H3 for cards/features.
- **Button styles:** Same primary/secondary button patterns on every page
- **Card styles:** Same border radius, shadow, hover effect across all card-based sections
- **Color palette:** Primary for CTAs and key accents. Secondary for supporting elements. Neutral for text and backgrounds.
- **Animation timing:** Same easing curve and duration for all scroll reveals

### Cross-Page Content Connections

- Home page features should link to Services page for details
- About page should have a CTA linking to Contact
- Services page should have per-service CTAs linking to Contact
- Contact page should reference services/about for context
- Every page should have at least one CTA that links to another page

### Page-Specific Content Architecture

Read `references/page-architecture.md` for detailed structural requirements for each page type: what sections to include, what content each section needs, what NOT to include, and common pitfalls.

---

## Quality Self-Check

Before saving each page, verify:

- [ ] Page uses theme colors and fonts (no hardcoded hex values)
- [ ] At least 2 visual effects applied (1 ambient + 1 motion)
- [ ] Responsive design works (mobile-first, tested at md: and lg: breakpoints)
- [ ] Section padding is consistent with other pages (same py- values)
- [ ] Heading hierarchy is correct (no orphan H1s, proper H2→H3 nesting)
- [ ] All internal links use `data-vibey-link` attribute (not `<a href>`)
- [ ] At least one CTA links to another page (cross-page connection)
- [ ] Real images from Gate 2 embedded (no placeholder URLs)
- [ ] Visual variety between sections (alternating light/dark backgrounds)
- [ ] Contact page has `data-vibey-capture` on the form element

Before saving the ENTIRE website, verify:

- [ ] `set_website_layout` was called with complete nav and footer
- [ ] Every nav item path matches a created page's path
- [ ] Every footer link resolves to a real page or external URL
- [ ] Design language is consistent across all pages (buttons, cards, spacing)
- [ ] No page has inline header/footer (the renderer handles this)
- [ ] Home hero is premium (min 80vh, large typography, visual depth)
- [ ] Every page has a clear purpose and doesn't duplicate another page's content

---

## Ecology

Websites are the multi-page brand presence, distinct from single-page funnels:

- **Depends on:** theme-builder (consistent branding across all pages), offer-builder (service/product information for content), avatar-builder (audience language for copy)
- **Feeds into:** funnel-builder (website pages can link to dedicated funnel landing pages for specific conversions), email-sequence-builder (contact page leads trigger sequences)
- **Connected to:** social-content-builder (organic content drives traffic to website), ad-builder (ads can point to website pages), blog posts (content marketing layer on top of the website)

A website without a theme looks inconsistent across pages. A website without offer data produces generic service descriptions. The contact page must include a `data-vibey-capture` form to connect with the email system.$skill_body$,
  updated_at = NOW()
WHERE skill_key = 'website-builder'
  AND agent_key = 'vibey';
