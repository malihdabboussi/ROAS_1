# Theme Design Guidelines

**Purpose:** Universal formula for creating themes that work across all Vibe OS templates without code changes. Follow these rules to create 50+ themes that scale consistently.

**Last Updated:** 2025-11-05

---

## DESIGN SYSTEM PHILOSOPHY

**Semantic Naming:** Colors are named by PURPOSE, not appearance  
**Contrast-First:** All color combinations must pass WCAG AA (4.5:1 minimum)  
**Scalability:** New theme = fill 15 color slots, templates automatically work  
**Universality:** Rules apply to ANY color palette (blue, purple, orange, etc.)

---

## THE 15 REQUIRED COLOR SLOTS

Every theme MUST define exactly 15 color slots. Templates expect all 15 to exist.

### 1. PRIMARY COLORS (Brand/CTA) - 4 slots

| Slot                | Purpose                        | Usage                  | Contrast Rule                             |
| ------------------- | ------------------------------ | ---------------------- | ----------------------------------------- |
| `primary`           | Main CTA buttons, highlights   | All CTAs, key actions  | Must contrast 4.5:1 with `pageBackground` |
| `primaryForeground` | Text ON primary buttons        | Button text            | Must contrast 4.5:1 with `primary`        |
| `primaryLight`      | Hover state, subtle highlights | Button hover, accents  | Lighter than `primary` by 10-20%          |
| `primaryDark`       | Pressed state, strong emphasis | Button active, borders | Darker than `primary` by 10-20%           |

**How to Choose:**

- Start with your brand color → this becomes `primary`
- Choose text color that passes 4.5:1 contrast → `primaryForeground`
- Create lighter variant (HSL lightness +10-20%) → `primaryLight`
- Create darker variant (HSL lightness -10-20%) → `primaryDark`

---

### 2. SECONDARY COLORS (Accents) - 2 slots

| Slot               | Purpose                | Usage                         |
| ------------------ | ---------------------- | ----------------------------- |
| `secondaryAccent1` | Secondary CTAs, badges | Secondary buttons, highlights |
| `secondaryAccent2` | Tertiary highlights    | Borders, subtle CTAs          |

**How to Choose:**

- **Option A (Monochromatic):** Use `primary` variants (same hue, different lightness)
- **Option B (Complementary):** Use complementary color from color wheel
- **Option C (Analogous):** Use adjacent hue on color wheel

**Rule:** Both must contrast 3:1 minimum with backgrounds.

---

### 3. TEXT COLORS - 2 slots

| Slot      | Purpose               | Usage                    | Contrast Rule                    |
| --------- | --------------------- | ------------------------ | -------------------------------- |
| `heading` | Headlines, titles     | H1, H2, H3, strong text  | 7:1 with `pageBackground` (AAA)  |
| `body`    | Body text, paragraphs | Paragraphs, descriptions | 4.5:1 with `pageBackground` (AA) |

**How to Choose:**

- **Light backgrounds:** Use very dark colors (near black)
- **Dark backgrounds:** Use very light colors (near white)
- **Rule:** `heading` should be darker/lighter than `body` for hierarchy

---

### 4. BACKGROUND COLORS - 2 slots

| Slot             | Purpose         | Usage           | Rule                                            |
| ---------------- | --------------- | --------------- | ----------------------------------------------- |
| `pageBackground` | Page body       | Body background | Base layer                                      |
| `cardBackground` | Cards, sections | Content cards   | Must be visually distinct from `pageBackground` |

**How to Choose:**

- **Light theme:** `pageBackground` = off-white, `cardBackground` = pure white
- **Dark theme:** `pageBackground` = very dark, `cardBackground` = slightly lighter
- **Rule:** 5%+ luminosity difference between the two

---

### 5. ELEMENT COLORS - 2 slots

| Slot     | Purpose                 | Usage                  |
| -------- | ----------------------- | ---------------------- |
| `border` | Dividers, input borders | Borders, separators    |
| `input`  | Input field backgrounds | Text inputs, textareas |

**How to Choose:**

- `border`: Subtle contrast from `pageBackground` (10-15% difference)
- `input`: Between `pageBackground` and `cardBackground` in luminosity

---

### 6. SEMANTIC COLORS - 3 slots

| Slot      | Purpose             | Usage                        | Recommended Colors                   |
| --------- | ------------------- | ---------------------------- | ------------------------------------ |
| `success` | Success states      | Success messages, checkmarks | Green spectrum (#2E7D32 to #4CAF50)  |
| `warning` | Warning states      | Warning alerts, cautions     | Orange spectrum (#F57C00 to #FF9800) |
| `danger`  | Error/urgent states | Errors, countdown timers     | Red spectrum (#C62828 to #F44336)    |

**Rule:** Use universally recognized colors (green = good, red = danger). These should stay consistent across your theme family for instant recognition.

---

## CONTRAST REQUIREMENTS (WCAG)

### Minimum Ratios

| Combination                     | Minimum Ratio | Level | Test It                |
| ------------------------------- | ------------- | ----- | ---------------------- |
| `primary` ↔ `primaryForeground` | 4.5:1         | AA    | Button text readable?  |
| `heading` ↔ `pageBackground`    | 7:1           | AAA   | Headlines strong?      |
| `body` ↔ `pageBackground`       | 4.5:1         | AA    | Paragraphs readable?   |
| `heading` ↔ `cardBackground`    | 7:1           | AAA   | Card headlines strong? |
| `body` ↔ `cardBackground`       | 4.5:1         | AA    | Card text readable?    |

**Testing Tool:** https://webaim.org/resources/contrastchecker/

**Formula:**

1. Input foreground color (text)
2. Input background color
3. Verify ratio meets minimum
4. If fails → adjust lightness until passes

---

## LIGHT VS DARK THEME STRATEGY

### Light Theme Formula

```
pageBackground: Very light (90-98% lightness)
cardBackground: Pure or near-white (95-100% lightness)
heading: Very dark (0-15% lightness)
body: Medium dark (40-50% lightness)
primary: Medium to dark (40-60% lightness for contrast)
primaryForeground: Very dark or black (readable on primary)
border: Light gray (80-85% lightness)
input: Very light gray (90-95% lightness)
```

**Why:** Dark colors stand out on light backgrounds.

---

### Dark Theme Formula

```
pageBackground: Very dark (5-15% lightness)
cardBackground: Slightly lighter than page (10-20% lightness)
heading: Pure or near-white (95-100% lightness)
body: Light gray (70-80% lightness)
primary: Bright to medium (60-80% lightness for pop)
primaryForeground: Very dark or black (readable on bright primary)
border: Dark gray (20-30% lightness)
input: Dark gray (15-25% lightness)
```

**Why:** Bright colors pop on dark backgrounds.

---

## CSS VARIABLE MAPPING

**Generated CSS variables (auto-created by `generateThemeCSS`):**

```css
:root {
  /* Primary */
  --color-primary: [from DB] --color-primary-foreground: [from DB] --color-primary-light: [from DB]
    --color-primary-dark: [from DB] --color-primary-rgb: [auto-converted] /* Accents */
    --color-secondary-accent-1: [from DB] --color-secondary-accent-2: [from DB]
    --color-secondary-accent-1-rgb: [auto-converted]
    --color-secondary-accent-2-rgb: [auto-converted] /* Text */ --color-heading: [from DB]
    --color-body: [from DB] --color-foreground: [alias for heading] --color-muted-foreground: [alias
    for body] /* Backgrounds */ --color-background: [from DB pageBackground]
    --color-page-background: [from DB pageBackground] --color-card: [from DB cardBackground]
    --color-card-background: [from DB cardBackground] --color-background-rgb: [auto-converted]
    --color-card-rgb: [auto-converted] /* Elements */ --color-border: [from DB] --color-input: [from
    DB] /* Semantic */ --color-success: [from DB] --color-warning: [from DB] --color-danger: [from
    DB] --color-danger-rgb: [auto-converted];
}
```

---

## TEMPLATE USAGE RULES

### ✅ CORRECT PATTERNS

**1. Use CSS Variables (Preferred)**

```tsx
<button className="bg-primary text-primary-foreground">Click Me</button>
```

**2. Use Inline Styles When Dynamic**

```tsx
<div style={{ backgroundColor: 'var(--color-primary)' }}>Dynamic content</div>
```

**3. Use Tailwind Semantic Classes**

```tsx
<p className="text-body">Body text uses theme color</p>
<h1 className="text-heading">Headline uses theme color</h1>
```

---

### ❌ FORBIDDEN PATTERNS

**1. Never Hardcode Colors**

```tsx
// ❌ WRONG
<button className="bg-lime-500 text-white">Click</button>
<div style={{ backgroundColor: '#d9fc67' }}>Bad</div>
```

**2. Never Use Non-Semantic Tailwind**

```tsx
// ❌ WRONG - "white" doesn't adapt to theme
<button className="bg-green-400 text-white">Bad</button>
```

**3. Never Skip Foreground Colors**

```tsx
// ❌ WRONG - Missing text color
<button className="bg-primary">No text color defined!</button>

// ✅ CORRECT
<button className="bg-primary text-primary-foreground">Good</button>
```

**4. Never Use Same-Color Buttons on Same-Color Backgrounds**

```tsx
// ❌ WRONG - Button uses same color as background bar
<div className="bg-primary">
  <button style={{ backgroundColor: 'var(--color-secondary-accent-1)' }}>
    Click Me
  </button>
</div>

// ✅ CORRECT - Button uses contrasting color
<div className="bg-primary">
  <button style={{ backgroundColor: 'var(--color-card-background)', color: 'var(--color-heading)' }}>
    Click Me
  </button>
</div>
```

---

## SPECIAL PATTERNS

### Buttons on Colored Backgrounds

**Rule:** When placing buttons on colored backgrounds (like a `primary` top bar), use `cardBackground` + `heading` for maximum contrast.

**Pattern:**

```tsx
{
  /* Top bar with primary background */
}
;<div className="bg-primary text-primary-foreground">
  <p>Some text</p>

  {/* Button needs to stand out */}
  <button
    className="shadow-lg"
    style={{
      backgroundColor: 'var(--color-card-background)',
      color: 'var(--color-heading)',
    }}
  >
    Click Here
  </button>
</div>
```

**Why This Works:**

- `cardBackground` is always visually distinct from `primary`
- `heading` text provides strong contrast on `cardBackground`
- Creates clear visual hierarchy (text → button)
- Works in both Light and Dark themes

**Testing:**

- [ ] Button stands out from background bar
- [ ] Button text is highly readable
- [ ] Visual hierarchy is clear (not blending in)

---

## CONTRAST REQUIREMENTS

### WCAG AA Compliance (Minimum)

| Text Type          | Minimum Ratio | Example                  |
| ------------------ | ------------- | ------------------------ |
| Large text (18px+) | 3:1           | Headlines on backgrounds |
| Normal text (16px) | 4.5:1         | Body text, buttons       |
| Small text (14px-) | 7:1           | Footnotes, captions      |

### Testing Contrast

**Online tool:** https://webaim.org/resources/contrastchecker/

**Test combinations:**

- `primary` ↔ `primaryForeground`
- `heading` ↔ `pageBackground`
- `body` ↔ `pageBackground`
- `heading` ↔ `cardBackground`

---

## LIGHT VS DARK THEME STRATEGY

### **Light Themes = Darker Accents**

```
pageBackground: #FAFAFA (very light)
primary: #c3e650 (darker green - readable)
primaryForeground: #000000 (black text)
heading: #0F0F0F (very dark)
body: #5C5C5C (medium dark)
```

**Why:** Dark colors provide contrast on light backgrounds.

---

### **Dark Themes = Brighter Accents**

```
pageBackground: #161616 (very dark)
primary: #d9fc67 (bright green - pops)
primaryForeground: #000000 (black text)
heading: #FFFFFF (white)
body: #B3B3B3 (light gray)
```

**Why:** Bright colors pop on dark backgrounds.

---

## STEP-BY-STEP: CREATING A NEW THEME

### Step 1: Choose Your Brand Color

Pick your primary brand color (any color).

**Example:** Your brand is ocean blue (#0077BE)

---

### Step 2: Decide Light or Dark

Will backgrounds be light or dark?

**Light:** White/off-white backgrounds  
**Dark:** Black/very dark backgrounds

---

### Step 3: Fill the 15 Slots

Use this worksheet:

```
THEME NAME: [Your Theme Name]

PRIMARY COLORS:
├─ primary: [Your brand color]
├─ primaryForeground: [Text color that contrasts 4.5:1 with primary]
├─ primaryLight: [10-20% lighter than primary]
└─ primaryDark: [10-20% darker than primary]

SECONDARY ACCENTS:
├─ secondaryAccent1: [Complementary or primary variant]
└─ secondaryAccent2: [Another accent or primary variant]

TEXT COLORS:
├─ heading: [Very dark if light bg, very light if dark bg - 7:1 contrast]
└─ body: [Softer than heading - 4.5:1 contrast]

BACKGROUNDS:
├─ pageBackground: [Base layer - very light or very dark]
└─ cardBackground: [5%+ different from page]

ELEMENTS:
├─ border: [Subtle contrast from page - 10-15% difference]
└─ input: [Between page and card in luminosity]

SEMANTIC:
├─ success: [Green tone #2E7D32 to #4CAF50]
├─ warning: [Orange tone #F57C00 to #FF9800]
└─ danger: [Red tone #C62828 to #F44336]
```

---

### Step 4: Test All Contrasts

Use https://webaim.org/resources/contrastchecker/

**Required tests (must pass):**

- [ ] `primary` vs `primaryForeground` → 4.5:1 ✅
- [ ] `heading` vs `pageBackground` → 7:1 ✅
- [ ] `body` vs `pageBackground` → 4.5:1 ✅
- [ ] `heading` vs `cardBackground` → 7:1 ✅
- [ ] `body` vs `cardBackground` → 4.5:1 ✅

**If any fail:** Adjust lightness until they pass.

---

### Step 5: Add to Database

Insert into `branding_themes` table:

```sql
INSERT INTO branding_themes (name, colors, user_id) VALUES (
  'Your Theme Name',
  '{
    "primary": "#XXXXXX",
    "primaryForeground": "#XXXXXX",
    "primaryLight": "#XXXXXX",
    "primaryDark": "#XXXXXX",
    "secondaryAccent1": "#XXXXXX",
    "secondaryAccent2": "#XXXXXX",
    "heading": "#XXXXXX",
    "body": "#XXXXXX",
    "pageBackground": "#XXXXXX",
    "cardBackground": "#XXXXXX",
    "border": "#XXXXXX",
    "input": "#XXXXXX",
    "success": "#XXXXXX",
    "warning": "#XXXXXX",
    "danger": "#XXXXXX"
  }',
  'user-id-here'
);
```

---

### Step 6: Test in All Templates

Preview your theme in:

- Lead Magnet (opt-in, confirmation)
- Call Booking (opt-in, confirmation, pre-call)
- Webinar (opt-in, confirmation, replay)

**Check for:**

- Buttons readable?
- Headlines strong?
- Text clear?
- No color clashes?

---

### Step 7: Launch 🚀

Theme is ready! Templates automatically use your colors via CSS variables.

**No code changes needed.**

---

## COMMON MISTAKES & HOW TO AVOID THEM

### Mistake 1: Forgetting `primaryForeground`

**Problem:** Button text is white on light primary = unreadable  
**Fix:** Always test primary vs primaryForeground contrast first

### Mistake 2: Using Same Color for Text & Background

**Problem:** Heading same luminosity as pageBackground = invisible  
**Fix:** Use contrast checker before finalizing

### Mistake 3: Too Many Accent Colors

**Problem:** Theme looks chaotic with 5 different accent colors  
**Fix:** Use primary variants for accents (monochromatic harmony)

### Mistake 4: Ignoring Semantic Colors

**Problem:** Red for success, green for errors = confusing  
**Fix:** Stick to universal meanings (green=good, red=bad)

### Mistake 5: Extreme Saturation

**Problem:** Neon colors at 100% saturation = eye strain  
**Fix:** Keep saturation 50-80% for comfortable viewing

---

## REAL-WORLD EXAMPLE WALKTHROUGH

**Goal:** Create "Ocean Breeze" theme (blue palette, light backgrounds)

**Step 1:** Brand color = Ocean Blue (#0077BE)

**Step 2:** Light theme (white backgrounds)

**Step 3:** Fill slots:

```
primary: #0077BE (ocean blue)
primaryForeground: #FFFFFF (white - passes 4.5:1 with blue)
primaryLight: #2196F3 (lighter blue)
primaryDark: #005A8A (darker blue)
secondaryAccent1: #0077BE (reuse primary)
secondaryAccent2: #00BCD4 (cyan accent)
heading: #1A1A1A (almost black)
body: #4A4A4A (dark gray)
pageBackground: #F5F5F5 (light gray)
cardBackground: #FFFFFF (white)
border: #E0E0E0 (light border)
input: #FAFAFA (very light input)
success: #2E7D32 (green)
warning: #F57C00 (orange)
danger: #C62828 (red)
```

**Step 4:** Test contrasts (all pass ✅)

**Step 5:** Add to DB → Theme ready!

**Result:** Professional blue theme that works across all templates.

---

## QUICK REFERENCE CHECKLIST

**Before submitting a theme:**

- [ ] All 15 color slots filled
- [ ] `primaryForeground` exists (not missing!)
- [ ] All contrast tests passed (use checker tool)
- [ ] Light theme uses dark primary (or vice versa)
- [ ] Semantic colors follow universal meanings
- [ ] Tested in 3+ templates
- [ ] No hardcoded colors in templates
- [ ] Database entry created

**If all checked → Theme ready for production!**

---

## MAINTENANCE PROTOCOL

### When to Update This Document

- ✅ Adding new required color slots (breaking change)
- ✅ Changing CSS variable naming conventions
- ✅ Adding new contrast requirements
- ✅ Discovering template usage violations

### When NOT to Update

- ❌ Adding individual themes (that's data, not guidelines)
- ❌ Changing existing theme colors (update DB, not doc)
- ❌ Adding new templates that follow existing rules

---

**This document defines the universal formula. Follow it to create unlimited themes that work everywhere.**
