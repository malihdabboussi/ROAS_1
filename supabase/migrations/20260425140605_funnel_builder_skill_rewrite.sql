-- Rewrite funnel-builder SKILL.md as execution flow with WHY reasoning.
-- Fix INDEX.md broken base path that causes ENOENT on every example read.

--------------------------------------------------------------------
-- 1. Rewrite SKILL.md (agent_skills.markdown_content)
--------------------------------------------------------------------
UPDATE agent_skills
SET markdown_content = $SKILL$
# Funnel Builder

## Why Quality Matters

Vibey users compare your output to pages built by $5K-$10K agencies. A page that looks like a free Wix template kills trust and makes the user question every other tool in the platform. A page with visual depth, conversion mechanics, and brand integration makes the user screenshot it and show their friends. That word-of-mouth is how Vibey grows.

This skill encodes that quality standard. Every step exists to close the gap between "AI-generated page" and "agency-built page." Follow the steps in order. The order matters.

---

## Step 1: Understand Intent

Before building anything, understand what the user actually needs:

- What type of page? (opt-in, sales, webinar, event, VSL, checkout, home, thank-you)
- What's the conversion goal? (email capture, call booking, purchase, registration)
- Is this a standalone page or part of a multi-page funnel?

Map the request to one of these categories -- you'll use this to pick reference examples in Step 3:

| User Says | Category |
|-----------|----------|
| "home page", "brand page", "business page" | `general-home-page` |
| "product page", "ecommerce", "supplement" | `ecommerce-product` |
| "webinar", "masterclass", "training registration" | `webinar` |
| "event page", "live event", "conference", "seminar" | `live-event` |
| "checkout", "cart", "order page", "payment page" | `cart` |
| "VSL", "video sales letter", "application", "call booking" | `vsl-call-booking` |
| "lead magnet", "freebie", "opt-in", "guide", "ebook" | `lead-magnet` |

---

## Step 2: Pre-Build Gates

Three things must happen before generating any code. Skipping them produces generic output.

### 2a. Theme Check

The user's brand identity is the foundation. A page without their colors and fonts feels like a template.

1. Call `list_themes` to check if the campaign has a theme.
2. If theme exists -- load it, use its colors/fonts for all generated TSX.
3. If no theme -- tell the user: "Let me set up your brand identity first so everything looks on-brand." Then read `skills/theme-builder/SKILL.md` and run that flow. Come back here once saved.

### 2b. Brand Assets & Media

Use the user's real assets. A real logo builds more trust than a generated one that doesn't match their business cards.

1. Check the theme for `logo_url` and `product_images`. If they exist, use them.
2. If the theme has neither -- don't fabricate them. Say: "I don't have a logo or product images on file yet. I'll design this with strong typography and visuals instead."
3. For hero backgrounds, lifestyle scenes, abstract patterns -- AI generation is perfect. Generate mood, not identity. A sweeping gradient background? Great. A fake logo? Never. Use nano-banana-pro for supplemental imagery.

### 2c. Design Library

Read the relevant design library components under `skills/funnel-builder/references/design-library/`:

| File | What It Contains |
|------|-----------------|
| `heroes.md` | 5 hero patterns (cybercore grid, centered media, shader atmosphere, SaaS product shot, brutalist technical) |
| `cta-sections.md` | CTA section patterns with urgency and conversion mechanics |
| `testimonials.md` | Social proof layouts, testimonial cards, star ratings |
| `features.md` | Feature grids, benefit cards, comparison tables |
| `stats.md` | Animated counters, stat bars, metric displays |
| `navigation.md` | Header and nav patterns |
| `pricing.md` | Pricing cards, tier comparisons |
| `faq.md` | Accordion FAQ patterns |
| `footer.md` | Footer layouts |
| `team.md` | Team sections, bio cards |
| `utility.md` | Utility components (scroll-to-top, modals, etc.) |

These contain production-ready TSX patterns with premium visual effects: radial gradients, ambient glow, scroll reveals, keyframe animations, backdrop-filter glass effects, hover transitions, and layered depth techniques.

Pick components relevant to the page type and adapt them to the user's theme colors. Incorporate at least 2 premium patterns: 1 background/ambient effect and 1 interaction/motion effect.

---

## Step 3: Study Reference Examples

This is the most important step. It's the difference between flat output and premium output.

### Why This Step Exists

The reference library contains 25 real funnel pages with full TSX source code -- visual effects, animations, conversion mechanics, and layout patterns refined through real campaigns. These encode techniques you won't produce from training data alone: IntersectionObserver animations, countdown timers with urgency, tiered pricing with progress bars, glass-morphism cards, scroll-triggered content reveals, confetti celebrations, exit-intent popups, progressive content unlocking.

Skimming descriptions produces flat hero+benefits+CTA layouts. Reading the actual source code completely produces premium output. The user can tell the difference immediately.

### How to Use the Examples

1. Read `skills/funnel-builder/references/examples/INDEX.md` for the full catalog organized by category.
2. Find the category you mapped in Step 1.
3. Pick 2-3 examples from that category.
4. Read the selected example files **completely** -- every line of source code. The premium patterns are distributed throughout, not concentrated at the top.
5. Before writing your own TSX, extract at least 5 concrete patterns you'll use:
   - Visual depth technique (gradients, glows, overlays, blend modes)
   - Animation technique (scroll, entrance, hover animations)
   - Conversion mechanic (urgency, scarcity, social proof in the UI)
   - Layout pattern (structural decisions, responsive breakpoints)
   - Typography/spacing system (heading hierarchy, padding rhythm)

### Adaptation Note

The examples are from production codebases. They use `import` statements, multi-file component architecture, and `@/` path aliases. Your output must be a **single self-contained component with no imports** (see TSX Runtime below). Extract the visual patterns, layout structures, and conversion mechanics from the examples -- then implement them as a single component using the global runtime libraries.

---

## Step 4: Generate TSX

### TSX Runtime

The preview and published-site runtime pre-injects these libraries as globals -- they are available without any import statements:

- **React** -- all hooks (`useState`, `useEffect`, `useRef`, `useMemo`, `useCallback`)
- **Framer Motion** -- `motion`, `AnimatePresence`, `useInView`, `useScroll`, `useTransform`, `useSpring`
- **Lucide icons** -- all icons as globals (e.g. `ArrowRight`, `Check`, `Menu`, `X`)
- **anime.js** -- `animejs`
- **Tailwind CSS** -- all utility classes

Do not write `import` statements for any of the above. Re-declaring them with an import causes a "duplicate identifier" parse error that breaks the preview.

**Correct:**
```tsx
const Hero = () => {
  const [open, setOpen] = useState(false)
  return <motion.div animate={{ opacity: 1 }}>...</motion.div>
}
export default Hero
```

**Wrong -- breaks the preview:**
```tsx
import { useState } from "react"
import { motion } from "framer-motion"
```

### Component Structure

Two principles keep the browser transpiler reliable:

1. **Data arrays hold strings and numbers, not JSX.** Put JSX inside component return statements or `.map()` callbacks, not as values in module-scope arrays.

   Works reliably:
   ```tsx
   const features = [
     { icon: 'Star', title: 'Fast' },
     { icon: 'Shield', title: 'Secure' },
   ]
   export default function Page() {
     const Icons = { Star, Shield }
     return (
       <div>
         {features.map(f => {
           const I = Icons[f.icon]
           return <div key={f.title}><I className="w-5 h-5" />{f.title}</div>
         })}
       </div>
     )
   }
   ```

   Fragile -- JSX inside a data array:
   ```tsx
   const features = [
     { icon: <Star className="w-5 h-5" />, title: 'Fast' },
   ]
   ```

2. **One default export, defined as a function.** `export default function PageName()` is the most reliable shape.

### Lead Capture Form Pattern

Every opt-in page must include a form with these attributes:

```tsx
<form
  data-vibey-capture
  data-funnel-id="{FUNNEL_ID}"
  data-next-page="1"
  onSubmit={(e) => { e.preventDefault(); setSubmitted(true) }}
  className="space-y-4"
>
  <input type="email" name="email" required placeholder="Enter your email" ... />
  <input type="text" name="name" placeholder="Your name" ... />
  <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} ...>
    {submitted ? 'Success!' : 'Get Instant Access'}
  </motion.button>
</form>
```

Required attributes:
- `data-vibey-capture` on every lead capture form
- `name="email"` on the email input (required)
- `data-funnel-id` with the funnel UUID
- `data-next-page` with the target page order_index

Navigation attributes for any clickable element:
- `data-next-page="1"` -- navigate to page at order_index 1
- `data-next-page="https://calendly.com/..."` -- navigate to external URL
- `data-vibey-link="2"` -- navigate to page at order_index 2

---

## Step 5: Quality Self-Check

Before saving, verify the output has:

- Layered gradients and ambient glow effects (not flat solid-color sections)
- Scroll animations or entrance effects (not static content)
- At least 1 conversion mechanic beyond a basic form (countdown, social proof, urgency)
- Visual variety between sections (not all the same background color)
- A hero section that feels premium (min 80vh, large typography, ambient effects)
- Real brand images from Step 2 embedded (no placeholder URLs)
- Theme colors applied throughout (not default gray/lime)

Do not mention example names, file paths, or technical details to the user. Keep responses focused on the final funnel.

---

## Step 6: Save via vibey_backend

Use the `vibey_backend` tool to persist the funnel and pages. See `skills/vibey-api/SKILL.md` for full API reference.

Quick reference:
```json
{"action": "create_funnel", "label": "Setting up your funnel", "data": {"name": "...", "slug": "...", "funnel_type": "lead-magnet"}}
```

Then for each page:
```json
{"action": "add_funnel_page", "label": "Designing your page", "data": {"funnel_id": "UUID", "name": "...", "slug": "...", "page_type": "opt-in", "generated_html": "...TSX source...", "generated_css": "", "order_index": 0, "generation_mode": "generated"}}
```

---

## Page Naming

Name every page based on the campaign offer and page purpose. The name appears in the funnel editor tabs and the dashboard.

Pattern: `[Offer or Campaign Topic] [Page Type]`

Examples:
- Opt-in page for a weight loss guide -> `"name": "Weight Loss Guide Opt-in"`
- Thank-you page after that opt-in -> `"name": "Weight Loss Guide Thank You"`
- Sales page for a coaching program -> `"name": "Coaching Program Sales Page"`

Derive the topic from the campaign context, the user's prompt, or the theme name. Never prefix with 'Untitled'.

---

## Ecology

Funnels are the conversion layer of the campaign. They sit between traffic sources (ads) and backend systems (email sequences):

- **Depends on:** theme-builder (colors, fonts, voice), offer-builder (headlines, benefits, proof), avatar-builder (pain points, language), ad-builder (traffic destination)
- **Feeds into:** email-sequence-builder (funnel opt-in triggers welcome/nurture sequences), lead-magnet-builder (the opt-in incentive lives on the funnel page)
- **Connected to:** meta-publisher (ad destination URLs point to funnel pages), social-content-builder (organic traffic to funnel)

A funnel without an offer produces generic copy. A funnel without a theme looks like a template. A funnel without an email sequence captures leads that go nowhere.
$SKILL$
WHERE skill_key = 'funnel-builder' AND agent_key = 'vibey';


--------------------------------------------------------------------
-- 2. Fix INDEX.md -- remove stale "Base path" that causes ENOENT
--------------------------------------------------------------------
UPDATE agent_skill_resources
SET content = replace(
  content,
  E'**Base path:** `examples/funnels/`\n',
  ''
)
WHERE skill_key = 'funnel-builder'
  AND agent_key = 'vibey'
  AND file_path = 'references/examples/INDEX.md';
