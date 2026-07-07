-- =============================================================================
-- Skill Quality Improvements
-- =============================================================================
-- 1. Rewrites funnel-builder, offer-builder, lead-magnet-builder with
--    intent-driven style (why-framing instead of MUST/NEVER)
-- 2. Extracts heavy reference content into agent_skill_resources system rows
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Funnel Builder — Intent-Driven Rewrite
-- ---------------------------------------------------------------------------

UPDATE agent_skills
SET markdown_content = $$# Funnel Builder Skill

> Use this skill when the user wants to create ANY type of web page — landing pages, opt-in funnels, home pages, event pages, product pages, VSL funnels, checkout pages, or any conversion-focused web page.

## Pre-Build Gates

Three things must happen before generating any page code. Skipping them produces generic output that looks like every other template on the internet. Following them is how a page feels custom-built for the user's brand.

### Gate 1: Theme Check

The user's brand identity is the foundation of trust. A page without their colors and fonts feels generic — like a free template, not a professional build. The theme is the single source of truth for all visual decisions.

1. Call `list_themes` to check if the campaign has a theme
2. If theme exists — load it, use its colors/fonts for all generated TSX
3. If no theme — tell the user: "Let me set up your brand identity first so everything looks on-brand from the start." Then read `skills/theme-builder/SKILL.md` and run that flow. Come back here once saved.

### Gate 2: Media Brief

The first output should be the final quality version. When images are added after the fact, they feel bolted on. When they're woven into the design from the start, the page feels intentional and premium.

Ask the user about visual assets before generating code:

"Before I build this, let me make it jaw-dropping from the start. Do you want me to generate custom images for your page? Hero backgrounds, product shots, team imagery, or anything specific?"

- If YES — generate images via nano-banana-pro first, collect the URLs
- If user provides their own — collect the URLs
- If NO — proceed without (note: first output will be text-only)

Embed all media URLs directly into the generated TSX.

### Gate 3: Visual Effects Library

Read the visual effects library: `../../data/visual-effects.md`

This file contains 8 premium animation patterns with full TSX code. These effects are the premium layer — the difference between a page that feels like a template and one that feels like a $10,000 custom build. Incorporate at least 2 patterns: 1 background/ambient effect and 1 interaction/motion effect. Study the TSX code, understand the technique, adapt to the user's theme colors.

---

## Funnel Examples Grounding

The examples library is the most valuable part of this skill. It contains 25+ real funnel pages with full TSX source code — complete with visual effects, animations, conversion mechanics, and layout patterns that have been refined through real campaigns.

### Why Reading Full Source Code Matters

The INDEX.md descriptions tell you WHAT exists. The actual .md files show you HOW it's built — the radial gradients, IntersectionObserver animations, countdown timers, tiered pricing with progress bars, glass-morphism cards, scroll-triggered reveals. These are the techniques that make the difference between flat output and premium output. Skimming produces flat output. Reading completely produces premium output.

### Grounding Protocol

**Step 1:** Read `../../examples/funnels/INDEX.md` for the full category map.

**Step 2:** Match the user's request to a category:

| User Says | Category | Example Files |
|-----------|----------|---------------|
| "home page", "brand page", "business page" | `general-home-page` | `example-a-home.md`, `example-c-home.md`, `example-d-home.md` |
| "product page", "ecommerce", "supplement" | `ecommerce-product` | `example-e-product-page.md` |
| "webinar", "masterclass", "training registration" | `webinar` | 9 examples across opt-in, confirmation, replay, CTA |
| "event page", "live event", "conference", "seminar" | `live-event` | `example-h-event.md`, `example-i-event.md` |
| "checkout", "cart", "order page", "payment page" | `cart` | `example-g-cart.md` |
| "VSL", "video sales letter", "application", "call booking" | `vsl-call-booking` | 6 examples across VSL, application, booking, pre-call |
| "lead magnet", "freebie", "opt-in", "guide", "ebook" | `lead-magnet` | `example-a-optin.md`, `example-b-optin.md`, `example-b-delivery.md` |

**Step 3:** Select 2-3 examples from the matched category.

**Step 4:** Read the selected example files completely — every line of TSX source code. The premium patterns are distributed throughout, not concentrated at the top.

**Step 5:** Before writing your own TSX, extract at least 7 concrete implementation patterns:
1. Visual depth technique (gradients, glows, overlays, blend modes)
2. Section transition technique (how sections are separated)
3. Animation technique (scroll, entrance, hover animations)
4. Conversion mechanic (urgency, scarcity, social proof in the UI)
5. Interactive element (beyond basic click/submit)
6. Layout pattern (structural decisions, responsive breakpoints)
7. Typography/spacing system (heading hierarchy, padding rhythm)

**Step 6:** Generate TSX using all extracted patterns plus at least 2 visual effects from `../../data/visual-effects.md`. Apply campaign theme colors and fonts to everything.

### Why This Protocol Exists

The user trusts Vibey to produce pages that compete with $5,000-$10,000 agency work. The examples library encodes that quality standard. When the protocol is followed, the output matches that standard. When shortcuts are taken — reading descriptions instead of code, using basic hero+benefits+CTA layouts, skipping visual depth — the output drops to free-template quality. The user can tell the difference immediately.

### Quality Self-Check

Before saving, verify the output has:
- Layered gradients and ambient glow effects (not flat solid-color sections)
- Scroll animations or entrance effects (not static content)
- At least 1 conversion mechanic beyond a basic form (countdown, social proof, urgency)
- Visual variety between sections (not all the same background color)
- A hero section that feels premium (min 80vh, large typography, ambient effects)
- Real images from Gate 2 embedded (no placeholder URLs)

Do not mention example names/files to the user. Keep responses focused on the final funnel.$$,
    updated_at = NOW()
WHERE skill_key = 'funnel-builder'
  AND agent_key = 'vibey'
  AND user_id IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Offer Builder — Intent-Driven Rewrite
-- ---------------------------------------------------------------------------

UPDATE agent_skills
SET markdown_content = $$# Offer Builder — 5-Step Pipeline

> Use this skill when the user wants to create, research, or refine a business offer.
> This is the foundation everything else builds on. Funnels, emails, and lead magnets all depend on a solid offer.

## Overview

The offer pipeline takes a business idea and produces a complete offer package:

1. Product & Market Analysis — what are we selling and to whom?
2. Power Offer Statement — the irresistible offer framing
3. Buyer Persona — deep psychological profile of the ideal customer
4. ICP Analysis — ideal customer profile (B2B or B2C variant)
5. Competitive Edge + Unique Mechanisms — what makes this offer unique

## How to Use

### Input Required

The user needs to provide at minimum:

- What they sell (product/service description)
- Who they sell it to (target market)
- Optionally: sales page URL, competitor URL, existing offer description

### Process

Run each step sequentially — each builds on the previous ones.

For each step:

1. **Brief the user first** (2-4 sentences) — Explain what you're about to research and why it matters for their business. The user needs context before you start working, because seeing the reasoning makes the results feel intentional rather than random.
2. **Do the research/analysis** using the step prompt in `references/step-prompts.md`
3. **Save to database** via the vibey-api skill
4. **Brief summary** (3-5 bullet highlights) — Key findings only
5. Ask if they want to refine anything

### Why Brevity Matters

The full analysis lives in the database and the user sees it in the Artifacts tab. Chat messages are for orientation — helping the user understand what happened and decide what's next. When you dump the full structured output into chat, it overwhelms rather than informs.

- Intro: 1-2 sentences max
- Summary: 3-5 bullets max
- Total visible text per step: under 150 words

Present results naturally. The user doesn't need to know about skill files, step numbers, file paths, APIs, or databases.

### Saving Results

**See `skills/vibey-api/SKILL.md` for the full reference.** Use the `vibey_backend` tool to save data.

**Step 1 — Create the offer:**

```
vibey_backend({ action: "create_offer", data: { "name": "Offer Name", "processing_status": "step_1_complete", "step1_data": { ...step 1 structured output... } } })
```

Save the returned `id` — you need it for all subsequent steps.

**Steps 2-5 — Update the offer:**

```
vibey_backend({ action: "update_offer_step", data: { "offer_id": "{OFFER_ID}", "step_number": N, "step_data": { ...step N structured output... } } })
```

### Step -> Column Mapping

| Step | Column     | Content                              |
| ---- | ---------- | ------------------------------------ |
| 1    | step1_data | Product & Market Analysis            |
| 2    | step2_data | Power Offer Statement                |
| 3    | step3_data | Buyer Persona                        |
| 4    | step4_data | ICP Analysis                         |
| 5    | step5_data | Competitive Edge + Unique Mechanisms |

### Final Document (after all steps)

After completing all steps, save a comprehensive document. Do not add emojis to section headers or content.

```
vibey_backend({ action: "save_document", data: { "conversation_id": "CONVERSATION_ID_FROM_CONTEXT", "document_type": "offer", "title": "Offer Name - Complete Offer Package", "content": {"text": "...full markdown combining all steps..."} } })
```

This creates one document in the Docs tab. Do not create a document per step.

### Step Prompts

The detailed prompt for each step is in `references/step-prompts.md`. Read it before executing any step.

## Resuming an Incomplete Offer

If the user returns to continue an offer, check the database first:

```
vibey_backend({ action: "list_offers", data: {} })
```

Check `processing_status` to know which step to resume from.$$,
    updated_at = NOW()
WHERE skill_key = 'offer-builder'
  AND agent_key = 'vibey'
  AND user_id IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Lead Magnet Builder — Intent-Driven Rewrite
-- ---------------------------------------------------------------------------

UPDATE agent_skills
SET markdown_content = $$# Lead Magnet Builder

> Use this skill when the user wants to create a downloadable resource: PDF guide, checklist, cheat sheet, workbook, or any gated content used to capture leads.

## Overview

You build real React/tsx lead magnet pages — not markdown, not JSON slides. Real TypeScript React components with Tailwind CSS that render as beautiful, multi-slide documents in the Sandpack preview. Each slide is a full-screen section within a single component.

The output looks like a premium PDF — but it's a live, interactive React component.

## Lead Magnet Types

| Type                      | Slides | Best For                                             |
| ------------------------- | ------ | ---------------------------------------------------- |
| **Quick Guide**           | 5-8    | "The 5 Steps to X" — fast value, high opt-in rate    |
| **Checklist**             | 3-5    | "The Complete X Checklist" — actionable, scannable   |
| **Cheat Sheet**           | 1-3    | "The X Cheat Sheet" — one-page reference             |
| **Workbook**              | 8-15   | "The X Workbook" — exercises, fill-in-the-blank      |
| **Case Study**            | 5-10   | "How [Person] Achieved X" — story + proof            |
| **Toolkit/Resource List** | 3-7    | "The Ultimate X Toolkit" — curated tools + resources |

## Creating a Lead Magnet — Step by Step

**See `skills/vibey-api/SKILL.md` for the full API reference.**

### Step 0: Brief the User

Before checking data or generating code, tell the user what you're about to build. This matters because it sets expectations and gives them a chance to steer direction before you invest effort.

Tell them:
- What type of lead magnet you'll create
- How many slides/pages and the content outline
- The angle/hook and why it fits their audience

### Step 1: Gather Context

Check what campaign data exists — the offer defines what the lead magnet covers, the avatar defines the language and pain points, the funnel determines if this is an opt-in incentive, and the theme provides brand colors and fonts.

```
vibey_backend({ action: "list_offers", data: {} })
```

### Theme Usage

If campaign context contains `ACTIVE_THEME`, treat it as the single source of truth for brand styling. Apply theme colors, typography, and image style. Do not fall back to default lime/emerald theme when an active theme exists. Only use defaults when no theme is available.

### Step 2: Plan Image Generation

Images are what separate amateur lead magnets from premium ones. A cover image alone transforms the perceived quality. Generate images using `[IMAGE_GEN]` markers — the backend handles the actual generation.

Cover image: landscape/wide format (16:9). Section images: conceptual illustrations. Use brand colors from the theme. Generate 2-4 images per lead magnet. Use gradient placeholders in tsx until images are generated.

### Step 3: Design the Slide Structure

Plan the content before writing code:

1. **Cover slide** — Title, subtitle, brand name, hero image
2. **Problem slide** — Why they need this (pain points from avatar)
3. **Content slides** (3-10) — Steps, tips, frameworks — the actual value
4. **Summary/Action slide** — Key takeaways + what to do next
5. **CTA slide** — Book a call, join the program, visit the funnel

### Step 4: Write the tsx Component

Create one React component containing all slides. The full TSX template structure and visual design patterns are in `references/tsx-template.md` — read it before writing code.

Key principles:
- Each slide is a `min-h-screen` section element
- Use `export default function LeadMagnetName()` as the component
- Tailwind CSS for all styling (CDN is available)
- Self-contained — no external imports except React
- Responsive with `md:` and `lg:` breakpoints
- Navigation dot onClick must call `setCurrentSlide(i)` before scrollIntoView
- Every word must be real content based on offer/avatar data — no placeholders

### Step 5: Save to Database

```
vibey_backend({ action: "create_lead_magnet", data: {
  "name": "The 5-Step Sleep Recovery Guide",
  "offer_id": "{OFFER_ID or null}",
  "status": "draft",
  "slides": [
    {
      "title": "Cover",
      "content": "{FULL_TSX_SOURCE_CODE}",
      "type": "tsx"
    }
  ]
}})
```

The entire tsx component goes in the first slide's `content` field with `type: "tsx"`.

### Step 6: Present Summary

Show the user: title, number of slides, key topics covered. Don't dump code or mention technical details — the lead magnet is ready in the Artifacts tab.

---

## Content Quality

### Why Quality Standards Exist

The user's lead magnet is the first impression their audience gets. A generic guide full of obvious advice ("drink more water", "set goals") makes the user look amateur. A specific, data-driven guide that uses the buyer's own language makes the user look like the authority they are.

- Pull pain points from the buyer persona (offer step 3)
- Use specific numbers ("58% reduction" not "significant improvement")
- Make every slide actionable — the reader should be able to DO something
- Write at 8th grade reading level
- Use the power offer statement as the throughline
- Match the user's brand colors and voice from their theme

### Title Patterns That Convert

- "The [Number]-Step [Method] for [Result]"
- "How to [Achieve X] Without [Pain Y]"
- "The [Audience]'s Guide to [Outcome]"
- "[Number] [Things] Every [Audience] Needs to Know About [Topic]"
- "The Complete [Topic] Checklist"

### Slide Limits

Keep slides under 150 words each — slides are visual, not essays. Keep total slides under 15 — attention drops after 10. Always generate at least a cover image.

## Image Generation

For image prompt patterns and the full tsx template structure, read `references/tsx-template.md`.$$,
    updated_at = NOW()
WHERE skill_key = 'lead-magnet-builder'
  AND agent_key = 'vibey'
  AND user_id IS NULL;

-- ---------------------------------------------------------------------------
-- 4. Insert system resource rows for extracted references
-- ---------------------------------------------------------------------------

-- Offer builder: step prompts reference
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content)
VALUES (NULL, 'vibey', 'offer-builder', 'references/step-prompts.md', $$# Offer Builder — Step Prompts

Each step below contains the production prompt. Use these as system instructions when generating each step's output.

---

## Step 1: Product & Market Analysis

**Temperature:** 0.7

Act as an Expert in Marketing and Advertising and analyze the provided information about a brand and its product(s). This information may include brand/product descriptions, websites, landing pages, LinkedIn profiles, YouTube transcripts, pitch decks, VSL transcripts, or other marketing materials.

Your task is to extract and rewrite this information into clear, conversational language that anyone can understand — even someone with zero prior knowledge of the industry or product.

Analyze and provide:
- Product: Describe what someone gets when they buy this. Explain it like you're talking to a neighbor who's never heard of it. Include: what the product/service is, how it's delivered, what's included, what outcomes it creates, and what it DOESN'T include. Use concrete numbers and specifics wherever possible.
- Target Market: Describe the specific group who buys this. Include: their profession/industry, business size or life stage, the main problem driving them to look for solutions, what they've likely tried before, and their readiness to invest. Be specific enough that someone could spot these people at a networking event.
- What Do We Sell: Summarize the product in one simple sentence.
- Who We Sell It To: Summarize the target market in one simple sentence.

Quality Standards:
- Write at a 12th-grade reading level or below
- No jargon, buzzwords, or industry terms without explanation
- Use specific numbers instead of vague quantities
- Focus on benefits and outcomes, not features
- Each sentence must add new, essential information

Output as JSON with all values as arrays of strings.

---

## Step 2: Power Offer Statement

**Temperature:** 0.7

Use the following information on my product and target market to craft a Joel Erway Power Offer that follows this framework:

**If I could show you how to [MAJOR BENEFIT], [SECONDARY BENEFIT], and [TERTIARY BENEFIT] [VEHICLE], without [COMMON OBJECTION], would you [CALL TO ACTION]?**

Components to generate:
1. Power Offer Statement — the complete statement
2. Major Benefit — primary, most compelling outcome
3. Secondary Benefit — additional valuable outcome
4. Tertiary Benefit — third valuable outcome
5. Vehicle — the method or system
6. Common Objection — typical concern addressed
7. Call to Action — immediate next step (soft, conversational)

Output as JSON with all values as arrays of strings.

---

## Step 3: Buyer Persona

**Temperature:** 0.7

You are an elite consumer psychology expert. Create a detailed buyer persona covering:

- Demographic Foundation (name, age, career, family, lifestyle, frustrations)
- Core Problem (deepest pain point in 2-3 visceral sentences in buyer's voice)
- Powerful Emotions (5 strongest emotions with vivid examples)
- Biggest Fears (5 deep, private fears — specific and brutal)
- Fear Impact on Relationships (5 relationship impacts)
- Hurtful Comments (5 stinging comments from close people)
- Past Attempts to Solve (5 failed attempts)
- Avoidance Behaviors (5 things they don't want to do)
- Perfect Outcomes (dream transformation in buyer's voice + 5 outcomes)
- Transformation Impact (5 specific life shifts)
- Success Markers (concrete milestone = "made it")
- Secondary Gains (hidden comforts from the problem)
- Blame Targets (5 external scapegoats)
- Main Objections (5 general objections — NOT product-specific)
- Background Profile (2-3 sentences in buyer's voice)
- Psychological Drivers (short/mid/long-term goals)
- Internal Voice (unspoken thoughts and phrases)
- Content Preferences (tone, themes, triggers)
- Comprehensive Summary (detailed summary combining all above)

Make everything visceral, dimensional, and emotionally resonant. Write in the buyer's voice where indicated.

Output as JSON with all values as arrays of strings.

---

## Step 4: ICP Analysis

**Temperature:** 0.7

Use Step 4a (B2B) or Step 4b (B2C) depending on the offer type.

**B2B variant** covers: company size, revenue, tech stack, pain points, decision-makers, buying triggers, messaging angles, competitive landscape.

**B2C variant** covers: expanded demographics, digital behavior, purchase patterns, pain urgency, community mapping, conversion triggers, psychographic depth.

Output as JSON with all values as arrays of strings.

---

## Step 5: Competitive Edge + Unique Mechanisms

**Temperature:** 0.7

Conduct competitive research and identify:

1. Company Overview — what the company offers, who it serves, core value proposition
2. What's Included — core features, benefits, components (results-driven)
3. Challenges Solved — pain points from customer perspective
4. Competitive Advantages — why this is the best choice
5. Key Differentiating Factors — what's impossible to find elsewhere
6. Direct Competitors Analysis — key competitors and why this is superior
7. Results & Success Stories — real-world proof (only if verified)
8. Credibility & Social Proof — awards, media, endorsements (only if verified)

Then identify:
- Unique Mechanisms — proprietary processes, exclusive tools, insider knowledge
- Differential Mechanisms — better/faster solutions, superior experience, stronger guarantees

Output as JSON with all values as arrays of strings.
$$);

-- Lead magnet builder: tsx template + visual patterns + image prompts reference
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content)
VALUES (NULL, 'vibey', 'lead-magnet-builder', 'references/tsx-template.md', $$# Lead Magnet TSX Template & Visual Patterns

## TSX Template Structure

```tsx
import { useState } from 'react'

export default function LeadMagnetName() {
  const [currentSlide, setCurrentSlide] = useState(0)

  const slides = [
    // Slide 0: Cover
    <section
      key="cover"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-8 text-white md:p-16"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(163,255,18,0.08),transparent_50%)]" />
      <div className="relative z-10 max-w-3xl text-center">
        <p className="mb-6 text-sm font-semibold tracking-widest text-lime-400 uppercase">Free Guide</p>
        <h1 className="mb-6 text-4xl leading-tight font-bold md:text-6xl">The Title Goes Here</h1>
        <p className="text-xl leading-relaxed text-gray-300 md:text-2xl">Subtitle that expands on the promise</p>
        <div className="mt-12 text-sm text-gray-500">By Brand Name</div>
      </div>
    </section>,

    // Slide 1: Problem
    <section key="problem" className="flex min-h-screen items-center bg-gray-950 p-8 text-white md:p-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-8 text-3xl font-bold text-lime-400 md:text-5xl">Why This Matters</h2>
        <div className="space-y-6 text-lg leading-relaxed text-gray-300">
          <p>Problem description pulled from avatar pain points...</p>
        </div>
      </div>
    </section>,

    // Final: CTA slide
    <section key="cta" className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-950 to-emerald-950 p-8 text-white">
      <div className="max-w-2xl text-center">
        <h2 className="mb-6 text-3xl font-bold md:text-5xl">Ready to Get Started?</h2>
        <p className="mb-10 text-xl text-gray-300">Your next step description</p>
        <a href="#" className="inline-block rounded-lg bg-lime-400 px-10 py-4 text-lg font-bold text-gray-950 transition-colors hover:bg-lime-300">Take Action Now</a>
      </div>
    </section>,
  ]

  return (
    <div className="bg-gray-950">
      <nav className="fixed top-1/2 right-4 z-50 flex -translate-y-1/2 flex-col gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setCurrentSlide(i)
              document.querySelectorAll('section')[i]?.scrollIntoView({ behavior: 'smooth' })
            }}
            className={`h-3 w-3 rounded-full transition-colors $${'{'}i === currentSlide ? 'bg-lime-400' : 'bg-white/20 hover:bg-white/40'}`}
          />
        ))}
      </nav>
      {slides}
    </div>
  )
}
```

## Visual Design Standards

### Layout
- Each slide: `min-h-screen`
- Max content width: `max-w-3xl`
- Generous padding: `p-8 md:p-16`
- Content vertically centered with flexbox

### Typography
- Cover title: `text-4xl md:text-6xl font-bold`
- Section titles: `text-3xl md:text-5xl font-bold`
- Body text: `text-lg md:text-xl leading-relaxed`
- Labels/tags: `text-sm tracking-widest uppercase`

### Colors (Default — override with brand theme)
- Background: `gray-950`, `gray-900` gradients
- Text: `white`, `gray-300` for body
- Accent: `lime-400`, `emerald-500`
- Decorations: `white/5`, `white/10` borders

### Visual Effects
- Radial gradient overlays: `bg-[radial-gradient(...)]`
- Glass-morphism cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Shadows: `shadow-2xl shadow-black/20`
- Number badges for steps, emoji or SVG icon bullets

## Content Slide Visual Patterns

### Steps/Process
```tsx
<div className="grid gap-6">
  {steps.map((step, i) => (
    <div key={i} className="flex items-start gap-6">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-lime-400/10 text-xl font-bold text-lime-400">{i + 1}</div>
      <div>
        <h3 className="mb-2 text-xl font-bold">{step.title}</h3>
        <p className="text-gray-400">{step.description}</p>
      </div>
    </div>
  ))}
</div>
```

### Checklist
```tsx
<div className="space-y-4">
  {items.map((item, i) => (
    <div key={i} className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mt-0.5 h-6 w-6 flex-shrink-0 rounded-md border-2 border-lime-400" />
      <div>
        <p className="font-semibold">{item.title}</p>
        <p className="mt-1 text-sm text-gray-400">{item.detail}</p>
      </div>
    </div>
  ))}
</div>
```

### Stats/Data Points
```tsx
<div className="grid grid-cols-2 gap-6 md:grid-cols-3">
  {stats.map((stat, i) => (
    <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
      <div className="mb-2 text-3xl font-bold text-lime-400 md:text-4xl">{stat.value}</div>
      <div className="text-sm text-gray-400">{stat.label}</div>
    </div>
  ))}
</div>
```

## Image Generation Prompts

### Cover images
```
Professional editorial cover design. [TOPIC VISUAL]. Clean, modern, dark premium background with subtle [BRAND COLOR] accent lighting. Sophisticated, minimal, high-end feel. No text in image.
```

### Section illustrations
```
Minimalist conceptual illustration: [CONCEPT]. Clean geometric shapes, [BRAND COLORS] color palette, dark background, modern flat design style. Abstract, not literal. No text.
```

### Data/stats visualizations
```
Abstract data visualization graphic. Glowing [BRAND COLOR] lines and nodes on dark background. Represents [CONCEPT]. Futuristic, clean, editorial quality. No text.
```

### Using Images in tsx
Use `[IMAGE_GEN]` markers:
```
[IMAGE_GEN prompt="Professional cover for sleep recovery guide" aspect_ratio="16:9" target="lead_magnet" target_id="{LM_ID}" slide_index="0" label="Generating cover image"]
```
$$);
