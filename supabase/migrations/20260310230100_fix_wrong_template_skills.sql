-- =============================================================================
-- Fix Wrong Template Skill Content
-- =============================================================================
-- 5 template skills were pointing to wrong markdown_content constants.
-- This migration updates existing per-user copies where the content still
-- matches the OLD wrong content (safe: won't touch user-modified skills).
-- =============================================================================

-- direct-response-copy: was getting SKILL_DELEGATION content
UPDATE agent_skills
SET markdown_content = $$# Direct Response Copywriting

> Use this skill when writing conversion-focused messaging for landing pages, sales pages, emails, ads, or any copy where the goal is a measurable reader action.

## Why Direct Response Matters

Every word either moves the reader toward the action or away from it. Direct response copy is not about being clever — it is about being clear, specific, and emotionally resonant enough that the reader acts NOW instead of later.

## The Copy Framework

### Step 1: Understand the Buyer

Before writing a single word, answer:
- What is the reader's current painful state? (Use their exact language, not marketing jargon)
- What does their ideal outcome look like? (Specific, vivid, emotionally charged)
- What have they already tried and why did it fail?
- What objection will stop them from acting?

Pull this from the campaign's offer and avatar data. If that data does not exist, ask for it.

### Step 2: Structure the Message

Every piece of direct response copy follows this arc:

1. **Hook** — Pattern interrupt. Stop them scrolling. Lead with pain, curiosity, or a bold claim.
2. **Problem amplification** — Show you understand their situation better than they do. Use specific details and emotional language.
3. **Bridge** — Introduce the solution as the natural answer to the problem. Connect emotionally before you explain logically.
4. **Proof** — Testimonials, results, credentials, specifics. Proof is what turns interest into belief.
5. **Offer** — What they get, how it works, what it costs. Clear, specific, stacked with value.
6. **CTA** — One clear action. Tell them exactly what to do next and what happens when they do.

### Step 3: Write at Their Level

- 8th-grade reading level maximum
- Short sentences. Short paragraphs.
- Conversational — like explaining to a smart friend
- Specific numbers over vague claims ("47% improvement" not "significant results")
- Active voice. Present tense where possible.

## Copy Patterns by Asset Type

| Asset | Primary Focus | Key Element |
|-------|--------------|-------------|
| Landing page | Single conversion | One CTA, no navigation |
| Sales page | Overcome objections | Long-form proof + urgency |
| Ad creative | Stop the scroll | Hook in first 3 seconds |
| Email | Drive the click | Subject line + single CTA |
| VSL script | Build desire over time | Story arc + reveal |

## Quality Standards

- Every headline must pass the "would I click this?" test
- Every CTA must tell the reader exactly what happens next
- Every claim must be backed by proof or removed
- No filler sentences — every line must earn its place
- Read it out loud. If it sounds stiff, rewrite it.

## Rules

- Never write generic copy. Every piece must reference specific offer and avatar data.
- Never use industry jargon the reader would not use themselves.
- Never present multiple CTAs — one action per asset.
- Never submit copy without a compelling headline and a clear CTA.$$,
    updated_at = NOW()
WHERE skill_key = 'direct-response-copy'
  AND markdown_content ILIKE '%Mission Delegation%'
  AND markdown_content ILIKE '%Delegation Steps%';

-- email-sequence-copy: was getting SKILL_BRIEFING content
UPDATE agent_skills
SET markdown_content = $$# Email Sequence Copywriting

> Use this skill when writing email sequences — welcome series, nurture campaigns, launch sequences, or any automated email flow where each message must connect to the next.

## Why Sequences Are Different From Single Emails

A sequence is a relationship arc, not a collection of individual messages. Each email must stand alone (the reader might open it first) AND move the relationship forward. The sequence builds from curiosity to trust to action.

## Sequence Architecture

### Email Arc Patterns

**Welcome Series (5-7 emails):**
1. Deliver the promise + introduce yourself
2. Quick win — prove your value immediately
3. Story + credibility — why you, why this approach
4. Deep value — teach something they can use today
5. Soft pitch — "if you're ready, here's the next step"

**Nurture Sequence (7-10 emails):**
1. Set expectations — what they will get from you
2. Amplify the pain — the problem is worse than they think
3. Social proof story — someone like them who solved it
4. Teach a framework — actionable method they can apply
5. Handle the #1 objection — address what holds them back
6. Create urgency — why acting now matters
7. Direct offer — clear pitch with CTA

**Launch Sequence (5-7 emails):**
1. Seed — something big is coming
2. Story — the origin of what you are launching
3. Open — it is here, full offer reveal
4. Social proof — early results and testimonials
5. Objection handling — address hesitations
6. Last chance — urgency and scarcity
7. Final call — doors closing

## Per-Email Copy Structure

Every email follows:
1. **Subject line** — 40-60 characters. Curiosity, benefit, or personalization.
2. **Hook** (1-2 lines) — Grab attention instantly.
3. **Bridge** (2-3 paragraphs) — Connect hook to value.
4. **Value** — The actionable content.
5. **CTA** (1-2 lines) — One clear next action.
6. **Sign-off** — Name, brand tagline.

## Writing Standards

- Short paragraphs (2-3 sentences max)
- One CTA per email
- 8th-grade reading level
- Conversational tone — like texting a smart friend
- Personalize with merge tags where available
- Subject + body must align — deliver on the subject line promise

## Rules

- Every email must have a clear purpose in the sequence arc
- Every email must be self-contained (readable without context)
- Never use more than one CTA per email
- Never write filler — "I hope this email finds you well" is dead weight
- Pull language from avatar data — use the buyer's words, not yours$$,
    updated_at = NOW()
WHERE skill_key = 'email-sequence-copy'
  AND markdown_content ILIKE '%Mission Briefing%'
  AND markdown_content ILIKE '%Briefing Framework%';

-- visual-design-systems: was getting SKILL_BRIEFING content
UPDATE agent_skills
SET markdown_content = $$# Visual Design Systems

> Use this skill when creating cohesive visual direction, establishing design hierarchies, or ensuring brand-consistent visual assets across a campaign.

## Why Design Systems Matter

Visual consistency builds trust. When every asset looks like it belongs to the same brand — same colors, same typography rhythm, same spacing logic — the audience perceives professionalism and reliability. A design system is the set of repeatable rules that make this consistency automatic instead of accidental.

## Design System Components

### 1. Color System

Define a palette with clear roles:
- **Primary** — brand identity, main buttons, key accents
- **Secondary** — supporting elements, badges, secondary actions
- **Background** — page and card backgrounds (light and dark variants)
- **Text** — primary text, muted text, disabled text
- **Accent** — CTAs, alerts, highlights
- **Semantic** — success (green), warning (amber), error (red)

Every color decision must reference the palette. No ad-hoc hex codes.

### 2. Typography Scale

Establish a type scale with consistent hierarchy:
- Display / Hero: largest, used sparingly
- H1-H4: section headings with clear size steps
- Body: readable paragraph text
- Caption / Small: metadata, labels, fine print
- Font pairings: one display/heading font + one body font maximum

### 3. Spacing and Layout

- Use a base unit (4px or 8px) and build all spacing from multiples
- Content max-width for readability (typically 720-960px)
- Consistent padding rhythm between sections
- Responsive breakpoints with deliberate layout shifts

### 4. Component Patterns

Reusable visual building blocks:
- Cards (content containers with consistent border, shadow, radius)
- Buttons (primary, secondary, ghost — with hover/active states)
- Form elements (inputs, selects, checkboxes with consistent styling)
- Section dividers and transitions

## Asset Review Checklist

When reviewing any visual asset:
1. Does it use only palette colors? (No rogue hex codes)
2. Does typography follow the scale? (No arbitrary font sizes)
3. Is spacing consistent with the base unit?
4. Does it match the brand voice visually? (Premium vs playful vs minimal)
5. Is it accessible? (Contrast ratios, readable text sizes)

## Rules

- Every visual decision must trace back to the design system
- No arbitrary colors, font sizes, or spacing values
- Brand consistency is binary — it either matches or it does not
- When the system does not cover a case, extend it deliberately, do not improvise$$,
    updated_at = NOW()
WHERE skill_key = 'visual-design-systems'
  AND markdown_content ILIKE '%Mission Briefing%'
  AND markdown_content ILIKE '%Briefing Framework%';

-- conversion-design: was getting SKILL_ROUTING content
UPDATE agent_skills
SET markdown_content = $$# Conversion Design

> Use this skill when designing layouts and visual assets optimized for driving user action — landing pages, ad creatives, email templates, or any asset where design must serve a measurable conversion goal.

## Why Conversion Design Is Different

Regular design makes things look good. Conversion design makes things work. The goal is not aesthetic awards — it is measurable reader action. Every visual element either supports the conversion goal or distracts from it.

## Conversion Design Principles

### 1. Visual Hierarchy Drives the Eye

The viewer's eye follows a predictable path. Design for it:
- **Primary focal point** — the one thing you want them to see first (headline or hero image)
- **Supporting elements** — proof, benefits, context that builds the case
- **CTA** — the action point, visually distinct from everything else

Use size, color, contrast, and whitespace to create clear hierarchy. If everything is bold, nothing is bold.

### 2. Reduce Friction

Every extra element, choice, or visual distraction reduces conversion:
- One primary CTA per viewport
- Remove navigation on landing pages
- Reduce form fields to the minimum required
- Use progress indicators for multi-step flows
- Make the CTA button text specific ("Get the Free Guide" not "Submit")

### 3. Build Trust Visually

Trust signals that convert:
- Testimonials with photos and names
- Logos of known brands or publications
- Specific numbers ("2,847 customers" not "thousands")
- Security badges near payment elements
- Professional photography and consistent branding

### 4. Create Urgency Without Tricks

Legitimate urgency techniques:
- Countdown timers for real deadlines
- Limited availability indicators (when true)
- Social proof notifications ("12 people signed up today")
- Progress-based CTAs ("You are 90% there")

## Layout Patterns by Asset Type

| Asset | Layout Priority | Key Pattern |
|-------|----------------|-------------|
| Landing page | Hero > Benefits > Proof > CTA | Above-fold CTA, sticky bar |
| Ad creative | Hook > Value prop > CTA | Bold visual, minimal text |
| Email template | Subject > Hook > CTA | Single column, mobile-first |
| Checkout page | Summary > Form > Trust > Pay | Minimal distractions |

## Rules

- Every design decision must serve the conversion goal
- Test one variable at a time — do not redesign everything at once
- Mobile-first — most traffic is mobile
- Measure outcomes, not opinions — data over preferences
- If the design is beautiful but nobody clicks, the design failed$$,
    updated_at = NOW()
WHERE skill_key = 'conversion-design'
  AND markdown_content ILIKE '%Campaign-Team Routing%'
  AND markdown_content ILIKE '%Routing Protocol%';

-- execution-planning: was getting SKILL_DELEGATION content
UPDATE agent_skills
SET markdown_content = $$# Execution Planning

> Use this skill when breaking product or campaign work into actionable, sprint-ready tasks with clear dependencies and ownership.

## Why Execution Planning Matters

A great strategy without a clear execution plan is a wish list. Execution planning translates goals into tasks that a team can pick up, complete, and ship — with no ambiguity about what "done" looks like.

## Planning Framework

### Step 1: Define the Outcome

Before creating any task:
- What is the user-visible or business-measurable result?
- How will we know it worked? (Specific success criteria)
- What is explicitly out of scope?

If you cannot answer these clearly, the work is not ready for planning.

### Step 2: Break Down Into Tasks

Each task must be:
- **Self-contained** — completable without waiting on unclear dependencies
- **Specific** — clear deliverable format and acceptance criteria
- **Sized** — completable within one work session (2-4 hours ideal)
- **Ordered** — sequenced by dependency, not by preference

### Step 3: Map Dependencies

- Which tasks must complete before others can start?
- Which tasks can run in parallel?
- Where are the handoff points between team members?
- What external dependencies exist (approvals, third-party integrations)?

### Step 4: Assign Ownership

- Every task has exactly one owner
- Owner is responsible for delivery, not just execution
- If a task requires multiple people, designate a lead

### Step 5: Set Milestones

Group tasks into milestones that produce user-visible value:
- Each milestone is a shippable increment
- Never let a milestone be purely technical with no visible outcome
- Milestones should be 1-2 weeks apart maximum

## Task Template

For each task, specify:
- **Title** — action-oriented, specific
- **Owner** — single person
- **Depends on** — which tasks must complete first
- **Deliverable** — what the output looks like
- **Done criteria** — how to verify completion
- **Estimated effort** — hours or points

## Rules

- Never create tasks without clear done criteria
- Never assign a task to "the team" — one owner per task
- Never plan more than the team can complete in the sprint
- Prefer smaller tasks over larger ones — momentum matters
- If a task description requires clarifying questions, it is not ready$$,
    updated_at = NOW()
WHERE skill_key = 'execution-planning'
  AND markdown_content ILIKE '%Mission Delegation%'
  AND markdown_content ILIKE '%Delegation Steps%';
