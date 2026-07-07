-- =============================================================================
-- Ad Builder: TSX Templates, Ad Type Framework, Copy Angles
-- =============================================================================
-- Adds production-quality TSX ad templates and creative frameworks as skill
-- resources, and rewrites the ad-builder skill with structured ad type system.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Skill Resource: examples/ads/INDEX.md
-- ---------------------------------------------------------------------------
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content)
VALUES (NULL, 'vibey', 'ad-builder', 'examples/ads/INDEX.md', $$# Ad Creative Framework — Index

## Ad Types

Each ad type serves a different purpose and converts differently. Choose based on the offer, available assets, and campaign goal.

### 1. Authority Ad
**Template:** `examples/ads/templates/authority-ad.tsx`
**When:** The brand owner has headshot photos uploaded in theme. Best for coaching, consulting, personal brands, high-ticket offers.
**Assets needed:** At least one headshot image from theme.
**What it does:** Places the person's face prominently with bold headline text and brand colors. Builds trust and recognition.
**Variations:** Full-bleed headshot with text overlay, side-by-side headshot + text, headshot with colored background.

### 2. Text-Only / Organic Ad
**Template:** `examples/ads/templates/text-only-ad.tsx`
**When:** No images needed. Best for offers where the copy does the heavy lifting. Looks like an organic post — high CTR because people don't immediately recognize it as an ad.
**Assets needed:** None.
**What it does:** Clean text on a solid background. Can use dark (black), light (white), or brand-colored backgrounds. Optional emojis.
**Variations:** Black bg + white text, white bg + dark text, brand color bg + white text, yellow/bright bg for attention.

### 3. Bold Offer Ad
**Template:** `examples/ads/templates/bold-offer-ad.tsx`
**When:** The offer itself is the hook — free training, discount, limited spots, webinar, etc. Best for direct response.
**Assets needed:** Optional product/brand images from theme. Works without images too.
**What it does:** High-energy, attention-grabbing design with large text, brand colors, and clear CTA messaging built into the image.
**Variations:** Gradient background, solid color with accent, product image integrated.

### 4. Split Image Ad
**Template:** `examples/ads/templates/split-image-ad.tsx`
**When:** You have a strong product image or want a before/after or dual-concept layout. Good for e-commerce, courses, transformations.
**Assets needed:** At least one product/brand image from theme. Headshot optional.
**What it does:** Clean split layout — image on one side, text on the other. Professional and modern.
**Variations:** Vertical split (left/right), horizontal split (top/bottom for 9:16), diagonal split.

## Decision Tree

```
Has headshot photos in theme?
├── YES → Authority Ad (primary choice for personal brands)
│   └── Also create: Text-Only variant + Bold Offer variant
├── NO, but has product images?
│   └── Split Image Ad or Bold Offer Ad
└── NO images at all?
    ├── Text-Only Ad (organic look)
    └── Bold Offer Ad (designed look)
```

## Multi-Ad Strategy

Always create at least 3 ad variations per ad set for A/B testing:
1. **Different ad types** — e.g., one Authority + one Text-Only + one Bold Offer
2. **Different copy angles** — same visual, different hook (see copy-angles.md)
3. **Different visual treatments** — same copy, different layout/colors

## TSX Template Contract

Every TSX template must:
- Export a named function `AdCreative` (NOT default export)
- Accept `{ width, height }` props
- Use only inline styles (no CSS classes — runs in react-runner sandbox)
- Scale proportionally based on width/height for multi-placement support
- Use `width` and `height` to calculate font sizes, padding, etc. proportionally

```tsx
function AdCreative({ width, height }) {
  const scale = width / 1080 // base scale factor
  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden' }}>
      {/* Ad content here */}
    </div>
  )
}
```
$$)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Skill Resource: examples/ads/copy-angles.md
-- ---------------------------------------------------------------------------
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content)
VALUES (NULL, 'vibey', 'ad-builder', 'examples/ads/copy-angles.md', $$# Ad Copy Angles & Frameworks

## The 5 Core Copy Angles

Every ad copy should use one of these angles. Mix angles across ad variations for testing.

### 1. Pain Agitate Solve (PAS)
**Structure:** State the pain → Make it feel urgent → Present the solution.
**Best for:** Problem-aware audiences.
**Example:**
- Pain: "You're making more money than you ever have."
- Agitate: "And you've never felt more trapped. The business runs on you."
- Solve: "This 12-week program gives you the body, marriage, and freedom you built the business for."

### 2. Curiosity Hook
**Structure:** Open loop that creates an information gap → Promise of revelation.
**Best for:** Cold audiences, scroll-stopping.
**Example:**
- "Tell me if this sounds familiar:"
- "You're making more money than most people will ever see."
- "Your employees call you the boss."
- "But your body is breaking down, your wife barely talks to you, and you haven't slept well in months."

### 3. Authority / Social Proof
**Structure:** Credential → Result → Invitation.
**Best for:** Warm audiences, high-ticket.
**Example:**
- "I run a $46M construction company across 15 states."
- "I'm 50 years old."
- "I'm in the best shape of my life."
- "Here's what changed everything..."

### 4. Direct Offer
**Structure:** What it is → Who it's for → What they get → CTA.
**Best for:** Offer-aware audiences, retargeting.
**Example:**
- "Free live training for high-earning men who've built success but sacrificed their health, marriage, and freedom."
- "In 90 minutes, discover the exact system [Name] used to..."

### 5. Contrast / Transformation
**Structure:** Before state → After state → Bridge (how to get there).
**Best for:** Transformation-based offers, coaching, fitness, business.
**Example:**
- "7-Figure Business. Breaking Body. Silent Marriage."
- "What if you could have all three without sacrificing one?"

## Headline Formulas

1. **[Result] in [Timeframe]** — "Get in the best shape of your life in 12 weeks"
2. **How [Person] [Did Result]** — "How a $46M CEO got in the best shape of his life at 50"
3. **[Number] [Things] [Audience] [Need/Want]** — "3 habits destroying high-earning men's health"
4. **[Contrasting States]** — "7-Figure Business. Breaking Body. Silent Marriage."
5. **The [Adjective] [Thing] for [Audience]** — "The unconventional program for CEOs who want their body back"
6. **[Question that hooks]** — "What if your business grew AND your marriage improved?"
7. **You Built [X]. Now Build [Y].** — "You Built the Business. Now Build the Man."

## Primary Text Structure

Keep the first 125 characters as the hook (what shows before "See more" on Facebook).

**Pattern:**
```
[Hook — first 125 chars, must stop the scroll]

[2-3 lines expanding on the hook]

[Social proof or specific result]

[What they get / the offer]

[CTA — clear action step]
```

## Description (Link Description)

Short, benefit-driven. Under 30 words. Examples:
- "Free live training for high-earning men ready to take back their health"
- "Jason Watson — $46M CEO, 50 years old — shares his 12-week transformation system"
- "Free live webinar for $500K+ entrepreneurs ready to take back their body, marriage, and freedom"

## Rules

1. NEVER use generic copy like "Transform your life today!" — be specific to the offer and audience
2. Use the offer's power statement, avatar pain points, and ICP data to write copy
3. Match the copy angle to the ad type (Authority ads use Authority angle, Text-Only uses PAS or Curiosity, etc.)
4. Primary text hook must work in 125 characters (Facebook truncation)
5. Headline must work standalone — someone should understand the offer from the headline alone
6. Always include a clear, specific CTA in the primary text
$$)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Skill Resource: TSX Template — Authority Ad
-- ---------------------------------------------------------------------------
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content)
VALUES (NULL, 'vibey', 'ad-builder', 'examples/ads/templates/authority-ad.tsx', $$// Authority Ad Template
// Uses: headshot image, brand colors, bold headline, credential text
// Best for: coaching, consulting, personal brands, high-ticket offers
//
// The agent MUST adapt: HEADSHOT_URL, colors, all text, layout proportions.
// This is a REFERENCE — never copy verbatim.

function AdCreative({ width, height }) {
  const scale = width / 1080
  const isVertical = height > width * 1.2
  const pad = Math.round(48 * scale)

  // ── Brand colors (agent replaces with theme colors) ──
  const BRAND_PRIMARY = '#c3e650'
  const BRAND_DARK = '#0a0a0a'
  const BRAND_ACCENT = '#ffffff'
  const HEADSHOT_URL = 'HEADSHOT_URL_HERE'

  // ── Responsive font sizes ──
  const headlineSize = Math.round((isVertical ? 56 : 48) * scale)
  const subSize = Math.round(22 * scale)
  const credSize = Math.round(18 * scale)
  const ctaSize = Math.round(20 * scale)

  if (isVertical) {
    // 9:16 / 4:5 — Headshot top half, text bottom half
    return (
      <div style={{
        width, height, position: 'relative', overflow: 'hidden',
        background: BRAND_DARK, fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        {/* Headshot — top 55% */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '55%',
          overflow: 'hidden',
        }}>
          <img src={HEADSHOT_URL} alt="" style={{
            width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top',
          }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
            background: 'linear-gradient(transparent, ' + BRAND_DARK + ')',
          }} />
        </div>

        {/* Text — bottom 45% */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          padding: pad, paddingTop: Math.round(pad * 2),
          gap: Math.round(16 * scale),
        }}>
          {/* Accent line */}
          <div style={{
            width: Math.round(60 * scale), height: Math.round(4 * scale),
            background: BRAND_PRIMARY, borderRadius: 2,
          }} />

          <div style={{
            fontSize: headlineSize, fontWeight: 800, color: BRAND_ACCENT,
            lineHeight: 1.05, letterSpacing: '-0.02em',
          }}>
            You Built the Business.
            <br />
            <span style={{ color: BRAND_PRIMARY }}>Now Build the Man.</span>
          </div>

          <div style={{
            fontSize: subSize, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4,
          }}>
            12-week transformation for high-earning men who want their body, marriage, and freedom back.
          </div>

          {/* CTA pill */}
          <div style={{
            display: 'inline-flex', alignSelf: 'flex-start',
            background: BRAND_PRIMARY, color: BRAND_DARK,
            padding: Math.round(12 * scale) + 'px ' + Math.round(28 * scale) + 'px',
            borderRadius: Math.round(40 * scale),
            fontSize: ctaSize, fontWeight: 700,
            marginTop: Math.round(8 * scale),
          }}>
            Learn More →
          </div>
        </div>
      </div>
    )
  }

  // 1:1 — Headshot left, text right
  return (
    <div style={{
      width, height, position: 'relative', overflow: 'hidden',
      background: BRAND_DARK, fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
    }}>
      {/* Headshot — left 45% */}
      <div style={{
        width: '45%', height: '100%', position: 'relative', overflow: 'hidden',
      }}>
        <img src={HEADSHOT_URL} alt="" style={{
          width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top',
        }} />
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: '40%',
          background: 'linear-gradient(to left, ' + BRAND_DARK + ', transparent)',
        }} />
      </div>

      {/* Text — right 55% */}
      <div style={{
        width: '55%', height: '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: pad, gap: Math.round(16 * scale),
      }}>
        <div style={{
          width: Math.round(50 * scale), height: Math.round(4 * scale),
          background: BRAND_PRIMARY, borderRadius: 2,
        }} />

        <div style={{
          fontSize: Math.round(44 * scale), fontWeight: 800, color: BRAND_ACCENT,
          lineHeight: 1.05, letterSpacing: '-0.02em',
        }}>
          You Built the Business.
          <br />
          <span style={{ color: BRAND_PRIMARY }}>Now Build the Man.</span>
        </div>

        <div style={{
          fontSize: Math.round(18 * scale), color: 'rgba(255,255,255,0.7)', lineHeight: 1.4,
        }}>
          12-week transformation for high-earning men.
        </div>

        <div style={{
          display: 'inline-flex', alignSelf: 'flex-start',
          background: BRAND_PRIMARY, color: BRAND_DARK,
          padding: Math.round(10 * scale) + 'px ' + Math.round(24 * scale) + 'px',
          borderRadius: Math.round(40 * scale),
          fontSize: Math.round(18 * scale), fontWeight: 700,
        }}>
          Learn More →
        </div>
      </div>
    </div>
  )
}
$$)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Skill Resource: TSX Template — Text-Only / Organic Ad
-- ---------------------------------------------------------------------------
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content)
VALUES (NULL, 'vibey', 'ad-builder', 'examples/ads/templates/text-only-ad.tsx', $$// Text-Only / Organic Ad Template
// Uses: NO images. Just text on a solid background.
// Meant to look like an organic post — high CTR because it doesn't look like an ad.
//
// Variations the agent should create:
//   - Dark mode: black bg + white text (most common)
//   - Light mode: white bg + dark text
//   - Brand color: brand primary bg + white/dark text
//   - Attention: yellow/bright bg + dark text
//
// The agent MUST adapt: all text, background color, text color.

function AdCreative({ width, height }) {
  const scale = width / 1080
  const isVertical = height > width * 1.2
  const pad = Math.round(64 * scale)

  // ── Colors (agent replaces based on variant) ──
  const BG_COLOR = '#000000'
  const TEXT_COLOR = '#ffffff'
  const ACCENT_COLOR = '#c3e650'

  const hookSize = Math.round((isVertical ? 44 : 40) * scale)
  const bodySize = Math.round((isVertical ? 32 : 28) * scale)

  return (
    <div style={{
      width, height, position: 'relative', overflow: 'hidden',
      background: BG_COLOR, fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: pad,
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column',
        gap: Math.round(28 * scale),
      }}>
        {/* Hook line — bold, attention-grabbing */}
        <div style={{
          fontSize: hookSize, fontWeight: 700, color: TEXT_COLOR,
          lineHeight: 1.25, letterSpacing: '-0.01em',
        }}>
          You're making more money than you ever have.
        </div>

        {/* Body lines — lighter weight, builds the story */}
        <div style={{
          fontSize: bodySize, fontWeight: 400, color: 'rgba(255,255,255,0.85)',
          lineHeight: 1.5,
        }}>
          And you've never felt more trapped.
        </div>

        <div style={{
          fontSize: bodySize, fontWeight: 400, color: 'rgba(255,255,255,0.85)',
          lineHeight: 1.5,
        }}>
          The business runs on you. Your body is breaking down. Your wife barely talks to you.
        </div>

        <div style={{
          fontSize: bodySize, fontWeight: 400, color: 'rgba(255,255,255,0.85)',
          lineHeight: 1.5,
        }}>
          You built everything for everyone else.
        </div>

        {/* Punch line — accent color */}
        <div style={{
          fontSize: Math.round((isVertical ? 40 : 36) * scale),
          fontWeight: 700, color: ACCENT_COLOR,
          lineHeight: 1.2, marginTop: Math.round(8 * scale),
        }}>
          It's time to build yourself.
        </div>
      </div>
    </div>
  )
}
$$)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Skill Resource: TSX Template — Bold Offer Ad
-- ---------------------------------------------------------------------------
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content)
VALUES (NULL, 'vibey', 'ad-builder', 'examples/ads/templates/bold-offer-ad.tsx', $$// Bold Offer Ad Template
// Uses: brand colors prominently, large text, optional product/brand image.
// High-energy, direct response design for offers, webinars, free trainings.
//
// The agent MUST adapt: all text, colors, optional image URL.

function AdCreative({ width, height }) {
  const scale = width / 1080
  const isVertical = height > width * 1.2
  const pad = Math.round(48 * scale)

  // ── Brand colors (agent replaces with theme colors) ──
  const BRAND_PRIMARY = '#c3e650'
  const BRAND_DARK = '#0a0a0a'
  const GRADIENT_START = '#1a0a2e'
  const GRADIENT_END = '#0a0a0a'

  const tagSize = Math.round(16 * scale)
  const headlineSize = Math.round((isVertical ? 52 : 46) * scale)
  const bulletSize = Math.round(22 * scale)
  const ctaSize = Math.round(22 * scale)

  return (
    <div style={{
      width, height, position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(160deg, ' + GRADIENT_START + ' 0%, ' + GRADIENT_END + ' 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex', flexDirection: 'column',
      padding: pad,
    }}>
      {/* Top tag */}
      <div style={{
        display: 'inline-flex', alignSelf: 'flex-start',
        background: BRAND_PRIMARY, color: BRAND_DARK,
        padding: Math.round(6 * scale) + 'px ' + Math.round(16 * scale) + 'px',
        borderRadius: Math.round(20 * scale),
        fontSize: tagSize, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        🔥 FREE LIVE TRAINING
      </div>

      {/* Main content — centered */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        gap: Math.round(24 * scale),
      }}>
        {/* Headline */}
        <div style={{
          fontSize: headlineSize, fontWeight: 800, color: '#ffffff',
          lineHeight: 1.1, letterSpacing: '-0.02em',
        }}>
          How a $46M CEO Got in the
          <span style={{ color: BRAND_PRIMARY }}> Best Shape </span>
          of His Life at 50
        </div>

        {/* Bullet points */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          gap: Math.round(12 * scale),
        }}>
          {[
            'The 3 mistakes killing high-earners\' health',
            'Why willpower fails (and what works instead)',
            'The exact 12-week system that changed everything',
          ].map(function(text, i) {
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start',
                gap: Math.round(10 * scale),
              }}>
                <div style={{
                  width: Math.round(24 * scale), height: Math.round(24 * scale),
                  borderRadius: '50%', background: BRAND_PRIMARY,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginTop: Math.round(2 * scale),
                }}>
                  <span style={{
                    color: BRAND_DARK, fontSize: Math.round(14 * scale), fontWeight: 700,
                  }}>✓</span>
                </div>
                <span style={{
                  fontSize: bulletSize, color: 'rgba(255,255,255,0.9)',
                  lineHeight: 1.4,
                }}>{text}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom CTA bar */}
      <div style={{
        background: BRAND_PRIMARY, color: BRAND_DARK,
        padding: Math.round(16 * scale) + 'px ' + Math.round(24 * scale) + 'px',
        borderRadius: Math.round(12 * scale),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: Math.round(8 * scale),
      }}>
        <span style={{ fontSize: ctaSize, fontWeight: 800 }}>
          Reserve Your Free Spot →
        </span>
      </div>
    </div>
  )
}
$$)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. Skill Resource: TSX Template — Split Image Ad
-- ---------------------------------------------------------------------------
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content)
VALUES (NULL, 'vibey', 'ad-builder', 'examples/ads/templates/split-image-ad.tsx', $$// Split Image Ad Template
// Uses: product image or headshot on one side, text on the other.
// Clean, modern layout for courses, products, transformations.
//
// The agent MUST adapt: IMAGE_URL, colors, all text, split ratios.

function AdCreative({ width, height }) {
  const scale = width / 1080
  const isVertical = height > width * 1.2
  const pad = Math.round(40 * scale)

  // ── Brand colors (agent replaces) ──
  const BRAND_PRIMARY = '#c3e650'
  const BRAND_DARK = '#0a0a0a'
  const SURFACE = '#111111'
  const IMAGE_URL = 'PRODUCT_IMAGE_URL_HERE'

  const headlineSize = Math.round((isVertical ? 44 : 40) * scale)
  const subSize = Math.round(20 * scale)
  const credSize = Math.round(16 * scale)
  const ctaSize = Math.round(18 * scale)

  if (isVertical) {
    // 9:16 / 4:5 — Image top, text bottom
    return (
      <div style={{
        width, height, position: 'relative', overflow: 'hidden',
        background: BRAND_DARK, fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Image — top 50% */}
        <div style={{
          width: '100%', height: '50%', position: 'relative', overflow: 'hidden',
        }}>
          <img src={IMAGE_URL} alt="" style={{
            width: '100%', height: '100%', objectFit: 'cover',
          }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: Math.round(80 * scale),
            background: 'linear-gradient(transparent, ' + BRAND_DARK + ')',
          }} />
        </div>

        {/* Text — bottom 50% */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: pad,
          gap: Math.round(16 * scale),
        }}>
          {/* Category tag */}
          <div style={{
            fontSize: credSize, fontWeight: 600, color: BRAND_PRIMARY,
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            12-WEEK PROGRAM
          </div>

          <div style={{
            fontSize: headlineSize, fontWeight: 800, color: '#ffffff',
            lineHeight: 1.1, letterSpacing: '-0.02em',
          }}>
            Build the Man Behind the Business
          </div>

          <div style={{
            fontSize: subSize, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4,
          }}>
            Body transformation • Marriage restoration • Mental clarity
          </div>

          {/* Credential bar */}
          <div style={{
            display: 'flex', alignItems: 'center',
            gap: Math.round(12 * scale),
            marginTop: Math.round(8 * scale),
            padding: Math.round(12 * scale),
            background: SURFACE, borderRadius: Math.round(8 * scale),
          }}>
            <div style={{
              width: Math.round(40 * scale), height: Math.round(40 * scale),
              borderRadius: '50%', background: BRAND_PRIMARY,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: Math.round(18 * scale), fontWeight: 800, color: BRAND_DARK,
            }}>JW</div>
            <div>
              <div style={{ fontSize: credSize, fontWeight: 700, color: '#ffffff' }}>
                Jason Watson
              </div>
              <div style={{ fontSize: Math.round(13 * scale), color: 'rgba(255,255,255,0.5)' }}>
                $46M CEO • Transformation Coach
              </div>
            </div>
          </div>

          {/* CTA */}
          <div style={{
            background: BRAND_PRIMARY, color: BRAND_DARK,
            padding: Math.round(14 * scale) + 'px',
            borderRadius: Math.round(10 * scale),
            textAlign: 'center',
            fontSize: ctaSize, fontWeight: 700,
            marginTop: Math.round(4 * scale),
          }}>
            Learn More →
          </div>
        </div>
      </div>
    )
  }

  // 1:1 — Image left, text right
  return (
    <div style={{
      width, height, position: 'relative', overflow: 'hidden',
      background: BRAND_DARK, fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
    }}>
      {/* Image — left 45% */}
      <div style={{
        width: '45%', height: '100%', position: 'relative', overflow: 'hidden',
      }}>
        <img src={IMAGE_URL} alt="" style={{
          width: '100%', height: '100%', objectFit: 'cover',
        }} />
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0,
          width: Math.round(60 * scale),
          background: 'linear-gradient(to left, ' + BRAND_DARK + ', transparent)',
        }} />
      </div>

      {/* Text — right 55% */}
      <div style={{
        width: '55%', height: '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: pad, gap: Math.round(14 * scale),
      }}>
        <div style={{
          fontSize: Math.round(14 * scale), fontWeight: 600, color: BRAND_PRIMARY,
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          12-WEEK PROGRAM
        </div>

        <div style={{
          fontSize: Math.round(38 * scale), fontWeight: 800, color: '#ffffff',
          lineHeight: 1.1, letterSpacing: '-0.02em',
        }}>
          Build the Man Behind the Business
        </div>

        <div style={{
          fontSize: Math.round(16 * scale), color: 'rgba(255,255,255,0.65)', lineHeight: 1.4,
        }}>
          Body • Marriage • Mental clarity
        </div>

        <div style={{
          display: 'inline-flex', alignSelf: 'flex-start',
          background: BRAND_PRIMARY, color: BRAND_DARK,
          padding: Math.round(10 * scale) + 'px ' + Math.round(24 * scale) + 'px',
          borderRadius: Math.round(8 * scale),
          fontSize: Math.round(16 * scale), fontWeight: 700,
        }}>
          Learn More →
        </div>
      </div>
    </div>
  )
}
$$)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. Skill Resource: AI Image Prompt Frameworks
-- ---------------------------------------------------------------------------
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content)
VALUES (NULL, 'vibey', 'ad-builder', 'examples/ads/ai-image-prompts.md', $$# AI Image Generation Prompt Frameworks

When using `generate_image` instead of TSX (no headshots/product images available, or when the ad type calls for AI-generated visuals), use these structured prompts.

## Prompt Structure

```
[STYLE DIRECTIVE] [SUBJECT] [COMPOSITION] [TEXT OVERLAY INSTRUCTIONS] [COLOR PALETTE] [MOOD] [TECHNICAL]
```

## Style Categories

### 1. Cinematic / Dramatic
For authority and high-ticket offers. Moody, dramatic lighting.
```
Cinematic photograph, dramatic side lighting, shallow depth of field,
[subject description],
dark moody atmosphere, film grain, professional color grading,
warm highlights and cool shadows, 8K quality
```

### 2. Clean / Minimal
For text-heavy ads, modern brands. Lots of negative space.
```
Minimalist design, clean composition, solid [color] background,
[subject or abstract element],
modern, editorial style, high contrast, crisp edges,
professional advertising photography
```

### 3. Bold / Graphic
For offers, events, urgency. Strong visual impact.
```
Bold graphic design style, high contrast,
[subject with strong visual impact],
saturated colors, geometric elements, modern advertising,
eye-catching composition, commercial quality
```

### 4. Vintage / Retro
For nostalgia-driven copy, lifestyle brands.
```
Vintage film photography style, warm tones, slight grain,
[subject description],
70s/80s color palette, nostalgic mood,
authentic retro feel, soft focus edges
```

## Subject Prompts by Ad Type

### Authority / Personal Brand (no real headshot available)
```
Professional [man/woman] in [setting], confident posture,
[age] years old, [build description], wearing [attire],
looking directly at camera, natural lighting,
[environment details]
```
NOTE: This produces a generic stock-looking person. ALWAYS prefer TSX with real headshot when available.

### Transformation / Before-After
```
Split composition showing contrast between
[before state description] on the left and
[after state description] on the right,
dramatic lighting transition, powerful visual metaphor
```

### Lifestyle / Aspiration
```
[Aspirational scene description],
golden hour lighting, cinematic composition,
luxury/premium feel, authentic not stock-like,
environmental storytelling
```

## Text in AI Images

Gemini can generate text within images but it's inconsistent. For text-heavy ads, ALWAYS prefer TSX templates (text-only-ad.tsx or bold-offer-ad.tsx). Only include text in AI image prompts when:
1. It's a single short word or number (e.g., "FREE", "$46M", "12")
2. The text is a design element, not the primary message

## Color Integration

Always include the theme's brand colors in the prompt:
```
Color palette: primary [hex], dark background [hex], accent [hex].
Ensure the [primary color] appears naturally in the scene through
[lighting / clothing / environment / props].
```

## Aspect Ratio Notes

Always specify aspect ratio. The image gen service handles the technical parameter.
- Feed: 1:1 — center-weighted composition
- Stories/Reels: 9:16 — vertical composition, subject in center, negative space top/bottom for text overlay
$$)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 8. Rewrite ad-builder skill markdown_content
-- ---------------------------------------------------------------------------
UPDATE agent_skills
SET
  markdown_content = $$## Ad Creative System

You create high-converting Meta ad creatives using a structured type system. Every ad must look professional, branded, and intentional — never generic or stock-like.

## MANDATORY: Read Before Creating Any Ad

Before generating any ad creative or writing any ad copy:
1. Read `examples/ads/INDEX.md` — understand all ad types and when to use each
2. Read `examples/ads/copy-angles.md` — use proven copy frameworks
3. Check if theme has headshot images and/or product images (from campaign context)
4. Choose the right ad type based on available assets and offer

## Ad Types & Template Selection

### When theme has HEADSHOT images → Authority Ad (primary)
- Read `examples/ads/templates/authority-ad.tsx`
- Place the person's real headshot prominently
- Overlay bold headline + brand colors
- Save as `generated_tsx` in `create_ad`

### When theme has PRODUCT/BRAND images → Split Image Ad
- Read `examples/ads/templates/split-image-ad.tsx`
- Use the product image with clean text layout
- Save as `generated_tsx` in `create_ad`

### When NO images available or want organic look → Text-Only Ad
- Read `examples/ads/templates/text-only-ad.tsx`
- Pure text on solid background (black, white, brand color, or yellow)
- Save as `generated_tsx` in `create_ad`

### For direct response / offer-focused → Bold Offer Ad
- Read `examples/ads/templates/bold-offer-ad.tsx`
- Brand colors, large headline, bullet points, CTA
- Save as `generated_tsx` in `create_ad`

### For AI-generated imagery → generate_image
- Read `examples/ads/ai-image-prompts.md`
- Use ONLY when ad type specifically needs AI-generated visuals (not for text-heavy ads)
- Use structured prompts from the framework, not freeform descriptions
- Include brand colors and image style prompt from theme context

## TSX Creative Rules

1. Template function must be named `AdCreative` (not default export)
2. Must accept `{ width, height }` props
3. Use `const scale = width / 1080` for proportional sizing
4. Use `const isVertical = height > width * 1.2` for layout switching
5. Use ONLY inline styles (no CSS classes)
6. Replace ALL placeholder values: colors from theme, text from offer/copy, image URLs from theme assets
7. Test readability: headlines must be readable at a glance, body text must be legible

## Copy Rules

1. Use copy angles from `examples/ads/copy-angles.md`
2. Primary text hook: first 125 characters must stop the scroll
3. Headline must work standalone — someone should understand the offer from headline alone
4. Match copy angle to ad type (Authority ads → Authority/Social Proof angle, Text-Only → PAS/Curiosity)
5. Use offer data (power statement, avatar pain points, ICP) — never write generic copy
6. Always include specific CTA

## Color Integration

Always use the user's brand colors from theme context:
- `primary` → accent color, CTA buttons, highlights
- `pageBackground` or `heading` → background colors
- `body` → secondary text color
- Never use hardcoded colors that clash with the brand

## Multi-Ad Strategy

When creating ads for an ad set, always create at least 3 variations:
1. Different ad types (e.g., Authority + Text-Only + Bold Offer)
2. Different copy angles for each
3. Save each with `generated_tsx` for multi-placement support

## Placement Handling

TSX templates automatically adapt to all placements via width/height props:
- Feed: 1080×1080 (1:1)
- Feed (Instagram): 1440×1800 (4:5)
- Story/Reels: 1080×1920 (9:16)

When saving `generated_tsx`, the same TSX renders correctly at all sizes — no need for separate placement_images unless using AI-generated images.
$$,
  description = 'Generate and save Meta ad creatives with TSX-first visual design, structured ad types, and proven copy frameworks. Use this skill for any Facebook or Instagram advertising — ad creative design, campaign setup, ad set configuration, audience targeting, A/B testing, budget allocation, or ad copy writing.',
  updated_at = NOW()
WHERE skill_key = 'ad-builder'
  AND user_id IS NULL;
