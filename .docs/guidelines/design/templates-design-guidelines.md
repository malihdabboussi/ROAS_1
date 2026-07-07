# Template Design Guidelines

**Funnel Page Template Standards - Layout, Spacing, Typography, Components**

_Analysis based on 9 production templates (Webinar, Lead Magnet, Call Booking)_

---

## 📖 Table of Contents

1. [Page Structure & Layout](#1-page-structure--layout) ........................ Line ~21
2. [Vertical Spacing System](#2-vertical-spacing-system) ....................... Line ~114
3. [Typography Standards](#3-typography-standards) ............................. Line ~241
4. [Width Constraints & Containers](#4-width-constraints--containers) .......... Line ~352
5. [Color & Theme Tokens](#5-color--theme-tokens) .............................. Line ~425
6. [Component Patterns](#6-component-patterns) ................................. Line ~503
7. [Code Quality & Enforcement Rules](#7-code-quality--enforcement-rules) ...... Line ~1001
8. [Responsive Design](#8-responsive-design) ................................... Line ~1324
9. [Quick Reference](#9-quick-reference) ....................................... Line ~1389

---

## 1. Page Structure & Layout

### **Universal Page Wrapper**

**CRITICAL: Every template follows this exact structure.**

```tsx
<section className="bg-background text-foreground relative flex min-h-screen w-full flex-col overflow-hidden">
  {/* 1. Background Layers */}
  <div className="tpl-layer tpl-layer--spotlight pointer-events-none" />
  <div className="tpl-layer tpl-layer--blobs pointer-events-none" />
  <div className="tpl-layer tpl-layer--vignette pointer-events-none" />

  {/* 2. Main Content Container */}
  <div className="px-spacing-6 py-spacing-10 relative z-10 flex w-full flex-1 flex-col items-center">
    {/* All page content here */}
  </div>
</section>
```

### **Required Patterns**

**Section Element:**

- `relative` - Position context
- `w-full min-h-screen` - Full viewport coverage
- `flex flex-col` - Vertical flex container
- `overflow-hidden` - Prevent scroll on backgrounds
- `bg-background text-foreground` - Theme-aware colors

**Background Layers (Always in this order):**

1. `tpl-layer--spotlight` - Radial gradient from center (12% green)
2. `tpl-layer--blobs` - Two blurred circles (top-left + bottom-right)
3. `tpl-layer--vignette` - Edge darkening (6% opacity)

- ALL layers: `tpl-layer` base + `pointer-events-none`

**Main Container:**

- `relative z-10` - Above backgrounds
- `w-full flex-1` - Full width, flexible height
- `flex flex-col items-center` - Center content horizontally
- `px-spacing-6 py-spacing-10` - Standard page padding (24px horizontal, 40px vertical)

---

### **Special Page Variants**

**Centered Content (Lead Magnet Opt-In):**

```tsx
<section className="tpl-reset relative w-full min-h-screen flex flex-col items-start justify-start md:items-center md:justify-center overflow-hidden bg-background text-foreground">
```

- `items-start justify-start` - Mobile: top-aligned
- `md:items-center md:justify-center` - Desktop: vertically centered

**Full Height (Call Booking Confirmation):**

```tsx
<section className="tpl-reset relative w-screen h-screen overflow-auto flex flex-col bg-background text-foreground">
```

- `h-screen` - Exact viewport height (no min)
- `overflow-auto` - Enable scroll if needed

---

### **Top Bar Pattern (Webinar Opt-In)**

**Use for:** Time-sensitive announcements (LIVE badge, date/time, sticky CTA)

```tsx
<div className="bg-primary text-primary-foreground relative z-10 w-full">
  <div className="px-spacing-4 md:px-spacing-6 py-spacing-2 md:py-spacing-3 w-full">
    <div className="gap-spacing-4 flex items-center justify-between">
      {/* Left: LIVE + Date/Time */}
      <div className="gap-spacing-2 md:gap-spacing-3 flex items-center">
        <span className="body-2 md:body-1 font-bold uppercase tracking-wider">LIVE</span>
        <span>|</span>
        <span className="body-2 md:body-1 font-semibold">
          {webinarDate} {webinarTime} {timezone}
        </span>
      </div>

      {/* Right: Button */}
      <button className="px-spacing-4 md:px-spacing-6 py-spacing-2 rounded-spacing-2 body-3 md:body-2 font-bold uppercase">
        CTA TEXT
      </button>
    </div>
  </div>
</div>
```

**Specs:**

- Full-width bar with `bg-primary text-primary-foreground`
- Padding: `py-spacing-2 md:py-spacing-3` (8px → 12px)
- Horizontal: `px-spacing-4 md:px-spacing-6` (16px → 24px)
- Typography: `body-2 md:body-1` responsive scaling

---

## 2. Vertical Spacing System

### **Section Rhythm Hierarchy**

**CRITICAL: Consistent vertical spacing creates visual flow and hierarchy.**

| Spacing Level   | Token           | Pixels | Use Case                       | Example                    |
| --------------- | --------------- | ------ | ------------------------------ | -------------------------- |
| **Micro**       | `mt-spacing-1`  | 4px    | Inline elements, icon-text gap | Countdown label offset     |
| **Tight**       | `mb-spacing-2`  | 8px    | Related elements               | Title → subtitle           |
| **Compact**     | `mb-spacing-3`  | 12px   | Component internal spacing     | Bullet title → description |
| **Standard**    | `mb-spacing-4`  | 16px   | Between related items          | Between form fields        |
| **Medium**      | `mb-spacing-6`  | 24px   | Between components             | Headline → CTA             |
| **Large**       | `mb-spacing-8`  | 32px   | Between sections               | Logo → headline            |
| **Extra Large** | `mb-spacing-10` | 40px   | Major section gaps             | Video → next section       |
| **Section**     | `mb-spacing-16` | 64px   | Between major sections         | Testimonials → FAQ         |
| **Feature**     | `mb-spacing-20` | 80px   | Between key features           | Step 1 → Step 2            |

---

### **Standard Vertical Rhythm**

**Page Structure (Top to Bottom):**

```tsx
{
  /* 1. Logo */
}
;<div className="mb-spacing-10">
  {' '}
  {/* 40px */}
  {/* Logo centered */}
</div>

{
  /* 2. Main Headline */
}
;<div className="mb-spacing-6">
  {' '}
  {/* 24px */}
  <h1 className="title-h1">{headline}</h1>
</div>

{
  /* 3. Subheadline */
}
;<div className="mb-spacing-10">
  {' '}
  {/* 40px */}
  <p className="title-h3">{subheadline}</p>
</div>

{
  /* 4. CTA Button */
}
;<div className="mb-spacing-6">
  {' '}
  {/* 24px */}
  <button>Primary CTA</button>
</div>

{
  /* 5. Countdown Timer */
}
;<div className="mb-spacing-16">
  {' '}
  {/* 64px - Major section break */}
  {/* Timer component */}
</div>

{
  /* 6. Next Section */
}
;<div className="mb-spacing-20">
  {' '}
  {/* 80px - Feature break */}
  {/* New feature/section */}
</div>
```

---

### **Inside Card/Section Spacing**

**Card Content Hierarchy:**

```tsx
<div className="p-spacing-10">
  {' '}
  {/* Card padding: 40px */}
  {/* Step header bar */}
  <div className="mb-spacing-8">
    {' '}
    {/* 32px below header */}
    <h2 className="title-h2">STEP 1</h2>
  </div>
  {/* Description */}
  <div className="mb-spacing-6">
    {' '}
    {/* 24px */}
    <p className="body-1">Description text</p>
  </div>
  {/* Grid items */}
  <div className="gap-spacing-6 grid">
    {' '}
    {/* 24px between grid items */}
    {/* Grid content */}
  </div>
</div>
```

---

### **List & Bullet Spacing**

**Bullet Points:**

```tsx
<ul className="space-y-spacing-6">
  {' '}
  {/* 24px between bullets */}
  <li className="gap-spacing-3 flex items-start">
    {' '}
    {/* 12px icon-to-text */}
    <span className="flex-shrink-0">{/* Icon */}</span>
    <span className="body-1">{text}</span>
  </li>
</ul>
```

**FAQ Items:**

```tsx
<div className="space-y-spacing-3">
  {' '}
  {/* 12px between FAQ items */}
  <details className="p-spacing-4">
    <summary className="title-h4">{question}</summary>
    <p className="mt-spacing-3 body-1">{answer}</p> {/* 12px above answer */}
  </details>
</div>
```

---

### **Grid Spacing**

**2-Column (Benefits):**

```tsx
<div className="gap-spacing-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
  {/* 24px gap between items */}
</div>
```

**3-Column (Lessons):**

```tsx
<div className="gap-spacing-6 grid grid-cols-1 md:grid-cols-3">{/* 24px gap */}</div>
```

**Rule:** Always use `gap-spacing-6` (24px) for standard grid gaps. Use `gap-spacing-4` (16px) for tighter grids.

---

## 3. Typography Standards

### **Heading Hierarchy**

**Display Headings (Hero Pages):**

- `display-1` - 7rem (mobile) → 5rem (tablet) → 8.125rem (desktop)
- `display-2` - 4.5rem (mobile) → 4.5rem (tablet) → 4.5rem (desktop)
- **Use:** Main page headlines, hero text
- **Always:** Uppercase (`!important` enforced)
- **Font:** `var(--font-heading-condensed)`

**Title Headings (Sections):**

- `title-h1` - 2rem → 2.75rem → 2.25rem (36px)
- `title-h2` - 1.5rem → 2rem → 1.875rem (30px)
- `title-h3` - 1.25rem → 1.25rem → 1.5rem (24px)
- `title-h4` - 1rem → 1.125rem → 1.25rem (20px)
- `title-h5` - 0.875rem → 0.875rem → 1.125rem (18px)
- **Use:** Section headers, card titles, component headings
- **title-h1:** ALWAYS uppercase
- **Font:** `var(--font-heading)`

**Body Text:**

- `body-1` - 1rem (16px) - Primary content
- `body-2` - 0.875rem (14px) - Secondary content
- `body-3` - 0.75rem (12px) - Small text, captions
- **Font:** `var(--font-body)`

---

### **Typography Rules by Context**

**Main Page Headline:**

```tsx
<h1 className="display-1 max-w-headline mx-auto" data-field-path="headline">
  {headline}
</h1>
```

- Always `display-1` or `display-2`
- Always constrain with `max-w-headline` (1000px)
- Always uppercase (enforced by class)
- Always centered (`mx-auto` + `text-center` on parent)

**Subheadline:**

```tsx
<p className="title-h3 max-w-subheadline mx-auto" data-field-path="subheadline">
  {subheadline}
</p>
```

- Always `title-h3` (NOT display or title-h2)
- Always constrain with `max-w-subheadline` (850px)
- Always centered

**Section Headings:**

```tsx
<h2 className="title-h1 mb-spacing-8 text-center">SECTION TITLE</h2>
```

- Use `title-h1` for major sections
- Always uppercase (manually or via text-transform)
- Standard gap: `mb-spacing-8` (32px)

**Step Headers:**

```tsx
<h2 className="title-h2 text-center font-bold uppercase">STEP 1 - ADD EVENT TO YOUR CALENDAR</h2>
```

- Always `title-h2` in step header bars
- Always `font-bold uppercase`
- Always `text-center`

**Card Titles:**

```tsx
<h3 className="title-h3 mb-spacing-3 font-bold">{lesson1Title}</h3>
```

- Use `title-h3` for card/component titles
- `font-bold` for emphasis
- Gap below: `mb-spacing-3` (12px)

**Descriptions:**

```tsx
<p className="body-1 text-muted-foreground">{description}</p>
```

- Always `body-1` (16px) for primary descriptions
- Use `text-muted-foreground` for secondary text
- Use `text-on-dark` for text on colored backgrounds

---

### **Responsive Typography**

**Standard Scaling Pattern:**

```tsx
{/* Mobile → Tablet → Desktop */}
<span className="body-3 md:body-2">{text}</span>
<button className="text-xl md:text-2xl lg:text-3xl">{cta}</button>
<h1 className="title-h1">{/* Auto-scales via CSS */}</h1>
```

**Display/Title Classes Auto-Scale:**

- `display-1`, `display-2`, `title-h1` → `title-h5` - Built-in responsive scaling
- NO manual responsive classes needed
- Container queries handle editor preview scaling

---

## 4. Width Constraints & Containers

### **Max-Width Utilities**

**CRITICAL: Always constrain content width for readability.**

| Utility             | Width  | Use Case                              | Example                       |
| ------------------- | ------ | ------------------------------------- | ----------------------------- |
| `max-w-headline`    | 1000px | Main headlines (display-1, display-2) | Hero titles                   |
| `max-w-subheadline` | 850px  | Subheadlines, secondary headlines     | Hero subtitles                |
| `max-w-body`        | 600px  | Short body text, descriptions         | Social proof text             |
| `max-w-3xl`         | 768px  | Forms, CTAs, narrow content           | Email capture, buttons        |
| `max-w-4xl`         | 896px  | Medium content sections               | Descriptions, text blocks     |
| `max-w-5xl`         | 1024px | Wide content, videos                  | Video embeds, host section    |
| `max-w-6xl`         | 1152px | Full-width sections                   | Testimonials wall, offer grid |

---

### **Content Width Patterns**

**Hero Section:**

```tsx
{
  /* Headline */
}
;<div className="mb-spacing-6 w-full max-w-5xl text-center">
  <h1 className="display-2 mx-auto" data-field-path="webinarTitle">
    {webinarTitle}
  </h1>
</div>

{
  /* Subheadline */
}
;<div className="mb-spacing-10 w-full max-w-5xl text-center">
  <p className="title-h3 mx-auto" data-field-path="webinarSubheadline">
    {webinarSubheadline}
  </p>
</div>
```

**CTA Button:**

```tsx
<div className="mb-spacing-6 px-spacing-4 w-full max-w-3xl">
  <button className="rounded-spacing-3 px-spacing-6 md:px-spacing-10 py-spacing-4 md:py-spacing-6 w-full">
    {ctaText}
  </button>
</div>
```

- Container: `max-w-3xl` (768px)
- Button: `w-full` (fills container)
- Extra padding: `px-spacing-4` on container for mobile spacing

**Video Embeds:**

```tsx
<div className="mb-spacing-10 w-full max-w-5xl">
  <div className="rounded-spacing-3 aspect-video w-full overflow-hidden">
    <iframe src={embedUrl} className="h-full w-full" />
  </div>
</div>
```

- Outer: `max-w-5xl` (1024px)
- Inner: `aspect-video w-full` (16:9 ratio)
- Rounded: `rounded-spacing-3` (12px)

**Text Content:**

```tsx
<div className="mb-spacing-10 w-full max-w-4xl text-center">
  <p className="title-h3 text-on-dark">{webinarDescription}</p>
</div>
```

- Use `max-w-4xl` (896px) for medium-length text blocks

---

## 5. Color & Theme Tokens

### **Text Colors (Theme-Aware)**

**Primary Text:**

- `text-foreground` - Default text (black in light, white in dark)
- `text-on-dark` - Light text on dark/colored backgrounds
- `text-heading` - Heading text (stronger contrast)
- `text-body` - Body text

**Secondary Text:**

- `text-muted-foreground` - Muted/secondary text

**Accent Text:**

- `text-primary` - Brand accent (green)
- `text-danger` - Urgency/countdown (red)

**Always Use:**

```tsx
{/* ✅ CORRECT - Theme tokens */}
<h1 className="title-h1 text-on-dark">HEADLINE</h1>
<p className="body-1 text-muted-foreground">Description</p>
<span className="text-primary font-bold">Highlighted</span>

{/* ❌ WRONG - Hardcoded */}
<h1 className="text-white">HEADLINE</h1>
<p className="text-gray-600">Description</p>
```

---

### **Background Colors (Inline Styles)**

**Why Inline:** Templates use dynamic theme colors that must reference CSS variables.

**Button Backgrounds:**

```tsx
style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
style={{ background: 'var(--color-secondary-accent-1)', color: 'var(--color-primary-foreground)' }}
```

- Use `background` property (supports gradients)
- Always pair with `color` for text
- Primary: main CTA
- Secondary accent: alternative actions

**Semi-Transparent Cards:**

```tsx
style={{ backgroundColor: 'rgba(var(--color-card-rgb), 0.95)' }}
```

- 95% opacity for cards over backgrounds
- Uses RGB token for transparency control

**Tinted Backgrounds:**

```tsx
style={{ backgroundColor: 'rgba(var(--color-secondary-accent-1-rgb), 0.1)' }}
style={{ backgroundColor: 'rgba(var(--color-primary-rgb), 0.05)' }}
```

- 5-10% opacity for subtle tints
- Use accent RGB tokens

---

### **Border Colors**

**Utility Classes:**

```tsx
<div className="border border-border"> {/* Theme-aware gray */}
<div className="border-2 border-dashed border-border"> {/* Placeholder style */}
```

**Inline Styles (Accent Colors):**

```tsx
style={{ borderColor: 'rgba(var(--color-primary-rgb), 0.2)' }} {/* 20% primary */}
style={{ borderColor: 'var(--color-secondary-accent-2)' }} {/* Solid accent */}
```

---

## 6. Component Patterns

### **A. Buttons (CTAs)**

**Large Primary CTA:**

```tsx
<button
  className="rounded-spacing-3 px-spacing-6 md:px-spacing-10 py-spacing-4 md:py-spacing-6 w-full cursor-pointer text-center text-xl font-bold uppercase tracking-wide transition-all hover:scale-[1.02] md:text-2xl lg:text-3xl"
  style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
  data-field-path="ctaText"
>
  {ctaText || 'SAVE MY SPOT ≫'}
</button>
```

**Specs:**

- Width: `w-full` (fills container)
- Rounded: `rounded-spacing-3` (12px)
- Padding: `px-spacing-6 md:px-spacing-10` (24px → 40px)
- Vertical: `py-spacing-4 md:py-spacing-6` (16px → 24px)
- Font: `text-xl md:text-2xl lg:text-3xl` (20px → 24px → 30px)
- Weight: `font-bold`
- Transform: `uppercase tracking-wide`
- Hover: `hover:scale-[1.02]` (subtle grow)
- Arrow: Often includes `≫` symbol

**Medium CTA:**

```tsx
<button
  className="px-spacing-8 py-spacing-4 rounded-spacing-3 font-bold uppercase tracking-wide"
  style={{
    background: 'var(--color-secondary-accent-1)',
    color: 'var(--color-primary-foreground)',
    fontSize: '1.25rem',
  }}
>
  ADD TO CALENDAR
</button>
```

**Specs:**

- Padding: `px-spacing-8 py-spacing-4` (32px horizontal, 16px vertical)
- Font: `fontSize: '1.25rem'` (20px) inline
- Same style pattern as large

---

### **Countdown Timers**

**Standard Pattern (All Templates):**

```tsx
<div className="mb-spacing-16 px-spacing-4 w-full max-w-2xl">
  <div className="rounded-spacing-3 p-spacing-3 text-center">
    {/* Label */}
    <p className="body-2 mb-spacing-2 text-danger font-bold uppercase tracking-wider">
      WE START IN:
    </p>

    {/* Timer */}
    <div className="gap-spacing-3 flex items-center justify-center">
      {/* Day */}
      <div className="flex flex-col items-center">
        <span className="text-danger text-2xl font-bold leading-none md:text-3xl">
          {String(countdown.days).padStart(2, '0')}
        </span>
        <span className="body-3 text-danger mt-1 uppercase">DAYS</span>
      </div>

      {/* Separator */}
      <span className="text-danger text-xl font-bold leading-none md:text-2xl">:</span>

      {/* Repeat for hours, mins, seconds */}
    </div>
  </div>
</div>
```

**Specs:**

- Container: `max-w-2xl` (672px)
- Padding: `p-spacing-3` (12px)
- Label: `body-2 font-bold uppercase tracking-wider text-danger`
- Gap: `mb-spacing-2` (8px) between label and timer
- Numbers: `text-2xl md:text-3xl font-bold text-danger`
- Labels: `body-3 uppercase mt-1 text-danger`
- Separator: `text-xl md:text-2xl font-bold text-danger`
- Unit gap: `gap-spacing-3` (12px)

**Color:** ALWAYS `text-danger` (red) for urgency.

---

### **Video Embeds**

**Standard Pattern:**

```tsx
<div className="mb-spacing-10 w-full max-w-5xl">
  <div
    className="rounded-spacing-3 aspect-video w-full overflow-hidden shadow-2xl"
    data-field-path="replayVideoUrl"
  >
    <iframe
      src={embedUrl}
      className="h-full w-full border-none"
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
      title="Video Title"
    />
  </div>
</div>
```

**Specs:**

- Outer: `max-w-5xl` (1024px)
- Inner: `aspect-video` (16:9 ratio enforced)
- Rounded: `rounded-spacing-3` (12px)
- Shadow: `shadow-2xl` (depth)
- iframe: `w-full h-full border-none`

**Placeholder (No Video):**

```tsx
<div
  className="rounded-spacing-3 border-border flex aspect-video items-center justify-center border-2 border-dashed text-center"
  style={{ backgroundColor: 'rgba(var(--color-card-rgb), 0.5)' }}
>
  <div>
    <p className="title-h3 text-muted-foreground mb-spacing-2">🎬 Video Placeholder</p>
    <p className="body-2 text-muted-foreground">Add your URL</p>
  </div>
</div>
```

---

### **Step Header Bars**

**Standard Pattern (Confirmation, Pre-Call):**

```tsx
<div
  className="py-spacing-4 px-spacing-6 rounded-spacing-3 mb-spacing-8 w-full"
  style={{
    background: 'var(--color-secondary-accent-1)',
    color: 'var(--color-primary-foreground)',
  }}
>
  <h2 className="title-h2 text-center font-bold uppercase">STEP 1: WATCH THE TRAINING VIDEO NOW</h2>
</div>
```

**Specs:**

- Background: `var(--color-secondary-accent-1)` (accent color)
- Text: `var(--color-primary-foreground)` (white/light)
- Padding: `py-spacing-4 px-spacing-6` (16px vertical, 24px horizontal)
- Rounded: `rounded-spacing-3` (12px)
- Gap below: `mb-spacing-8` (32px) or `mb-spacing-6` (24px)
- Typography: `title-h2 text-center font-bold uppercase`

**Step Numbering:**

- Include step number: "STEP 1", "STEP 2", etc.
- Dynamic numbering based on optional sections:
  ```tsx
  {
    hasTraining ? `STEP 2: ${title}` : `STEP 1: ${title}`
  }
  ```

---

### **Bullet Lists with Icons**

**Standard Pattern:**

```tsx
<ul className="space-y-spacing-6 text-left">
  <li className="gap-spacing-3 flex items-start">
    {/* Icon */}
    <span className="flex-shrink-0">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-on-dark">
        <circle cx="10" cy="10" r="10" fill="var(--color-secondary-accent-1)" />
        <path
          d="M6 10L9 13L14 7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>

    {/* Text */}
    <span className="body-1 flex-1">{bullet1}</span>
  </li>
</ul>
```

**Specs:**

- List gap: `space-y-spacing-6` (24px between bullets)
- Icon-text gap: `gap-spacing-3` (12px)
- Icon: 18-20px circle checkmark
- Icon container: `flex-shrink-0` (prevent squish)
- Text: `body-1 flex-1` (fills available space)
- Layout: `flex items-start` (top-align icon with text)

**Icon Colors:**

- Circle fill: `var(--color-secondary-accent-1)` or `var(--color-primary)`
- Check stroke: `currentColor` (inherits from text color)

**Alternative Pattern (Offer Benefits):**

```tsx
<div className="gap-spacing-3 p-spacing-4 rounded-spacing-2 bg-primary/5 flex items-start">
  <div className="mt-1 flex-shrink-0">
    <svg width="20" height="20">
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2" />
      <path d="M8 12.5L10.5 15L16 9.5" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  </div>
  <span className="body-1 font-medium">{benefit}</span>
</div>
```

- Includes background: `bg-primary/5` (5% tint)
- Padding: `p-spacing-4` (16px)
- Rounded: `rounded-spacing-2` (8px)

---

### **Card Sections**

**Standard Card:**

```tsx
<div
  className="rounded-spacing-3 p-spacing-10 border-border border"
  style={{
    backgroundColor: 'rgba(var(--color-card-rgb), 0.95)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
  }}
>
  {/* Card content */}
</div>
```

**Specs:**

- Rounded: `rounded-spacing-3` (12px)
- Padding: `p-spacing-10` (40px) for spacious, `p-spacing-8` (32px) for compact, `p-spacing-6` (24px) for dense
- Border: `border border-border` (optional)
- Background: `rgba(var(--color-card-rgb), 0.95)` (95% opacity)
- Shadow: `boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)'` (subtle depth)

**Lesson Cards (Grid):**

```tsx
<div className="gap-spacing-6 grid grid-cols-1 md:grid-cols-3">
  <div
    className="rounded-spacing-3 p-spacing-8 shadow-lg"
    style={{
      backgroundColor: 'rgba(var(--color-card-rgb), 0.95)',
      boxShadow: '0 8px 32px rgba(var(--color-primary-rgb), 0.15), 0 4px 16px rgba(0, 0, 0, 0.3)',
    }}
  >
    {/* Lesson badge */}
    <div className="px-spacing-3 py-spacing-1 bg-primary text-primary-foreground rounded-spacing-1 mb-spacing-4 inline-block">
      <span className="body-2 font-bold">LESSON #1</span>
    </div>

    {/* Title */}
    <h3 className="title-h3 text-primary mb-spacing-3 font-bold">{lesson1Title}</h3>

    {/* Description */}
    <p className="body-2 text-on-dark">{lesson1Description}</p>
  </div>
</div>
```

**Specs:**

- Grid: 3 columns on desktop (`md:grid-cols-3`)
- Gap: `gap-spacing-6` (24px)
- Card padding: `p-spacing-8` (32px)
- Shadow: Double shadow (primary glow + dark shadow)
- Badge: `px-spacing-3 py-spacing-1` with `bg-primary text-primary-foreground`

---

### **FAQ Accordions**

**Standard Pattern:**

```tsx
<div className="space-y-spacing-3">
  <details
    className="border-border p-spacing-4 text-foreground rounded-lg border"
    style={{ backgroundColor: 'rgba(var(--color-secondary-accent-2-rgb), 0.2)' }}
  >
    <summary className="title-h4 text-on-dark cursor-pointer">{faqQuestion}</summary>
    <p className="body-1 mt-spacing-3 text-on-dark">{faqAnswer}</p>
  </details>
</div>
```

**Specs:**

- Container gap: `space-y-spacing-3` (12px between items)
- Padding: `p-spacing-4` (16px)
- Rounded: `rounded-lg` (8px - Tailwind default)
- Background: `rgba(var(--color-secondary-accent-2-rgb), 0.2)` (20% tint)
- Summary: `title-h4 cursor-pointer`
- Answer: `body-1 mt-spacing-3` (12px gap above)
- Border: `border border-border`

---

### **Logo Placement**

**Centered Logo (Standard):**

```tsx
<div className="mb-spacing-10 w-full max-w-5xl text-center">
  {logoUrl ? (
    <img
      src={logoUrl}
      alt={logoAlt || 'Logo'}
      data-field-path="logoUrl"
      className="mx-auto"
      style={{ height: `${logoWidth}px` }}
    />
  ) : (
    <div
      data-field-path="logoUrl"
      className="px-spacing-6 py-spacing-3 border-border rounded-spacing-2 text-muted-foreground inline-block border-2 border-dashed"
    >
      YOUR LOGO HERE
    </div>
  )}
</div>
```

**Specs:**

- Height: `logoWidth` prop (default 32px)
- Width: `w-auto` (maintains aspect ratio)
- Center: `mx-auto` with `text-center` on parent
- Placeholder: Dashed border box with text
- Gap below: `mb-spacing-10` (40px)

---

### **Testimonials Wall**

**Pattern (Replay Template):**

```tsx
<div className="mb-spacing-16 w-full max-w-6xl">
  <div
    className="rounded-spacing-3 p-spacing-10 border-border border"
    style={{ backgroundColor: 'rgba(var(--color-card-rgb), 0.95)' }}
  >
    {/* Section title */}
    <h2 className="title-h2 text-on-dark mb-spacing-10 mt-spacing-16 text-center font-bold uppercase">
      See What Attendees Are Saying
    </h2>

    {/* Masonry layout */}
    <div className="column-gap-spacing-4 columns-2">
      {testimonialImages.map((imageUrl, index) => (
        <div key={index} className="mb-spacing-4 break-inside-avoid">
          <img
            src={imageUrl}
            alt={`Testimonial ${index + 1}`}
            className="rounded-spacing-2 border-border mx-auto w-full max-w-sm border"
            style={{ boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)' }}
          />
        </div>
      ))}
    </div>
  </div>
</div>
```

**Specs:**

- Width: `max-w-6xl` (1152px)
- Layout: `columns-2` (CSS multi-column)
- Column gap: `column-gap-spacing-4` (16px)
- Image: `w-full max-w-sm mx-auto` (centered in column)
- Image rounded: `rounded-spacing-2` (8px)
- Break: `break-inside-avoid` (prevents column break inside image)
- Gap between images: `mb-spacing-4` (16px)

---

### **Modal Popups (Email Capture)**

**Pattern (Webinar Opt-In):**

```tsx
{
  isModalOpen && (
    <div
      className="p-spacing-4 md:p-spacing-6 animate-fade-in fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
      onClick={() => setIsModalOpen(false)}
    >
      {/* Modal card */}
      <div
        className="rounded-spacing-3 p-spacing-8 md:p-spacing-12 animate-slide-up relative w-full max-w-3xl shadow-2xl"
        style={{ backgroundColor: 'rgba(var(--color-card-rgb), 0.95)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={() => setIsModalOpen(false)}
          className="absolute right-4 top-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 text-2xl"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent' }}
        >
          ✕
        </button>

        {/* Modal content */}
        <div className="mb-spacing-4 text-center">
          <h2 className="title-h1 text-on-dark">ENTER YOUR INFO BELOW</h2>
        </div>

        {/* Form */}
        <EmailCaptureForm onSubmit={handleCapture} />
      </div>
    </div>
  )
}
```

**Specs:**

- Backdrop: `fixed inset-0 z-50` with `backgroundColor: 'rgba(0, 0, 0, 0.85)'` (85% black)
- Modal: `max-w-3xl` (768px)
- Padding: `p-spacing-8 md:p-spacing-12` (32px → 48px)
- Background: `rgba(var(--color-card-rgb), 0.95)` (95% card color)
- Animation: `animate-fade-in` on backdrop, `animate-slide-up` on modal
- Close: `absolute top-4 right-4` positioned X button

---

### **Host Section (Two-Column)**

**Pattern (Webinar Opt-In):**

```tsx
<div
  style={{
    display: 'flex',
    flexDirection: 'row',
    gap: '32px',
    alignItems: 'flex-start',
    maxWidth: '1200px',
    margin: '0 auto',
  }}
>
  {/* LEFT: Photo */}
  <div style={{ flexShrink: 0, width: '400px', height: '400px' }}>
    <img
      src={hostPhotoUrl}
      alt={hostName}
      style={{
        borderRadius: 'var(--spacing-3)',
        objectFit: 'cover',
        width: '100%',
        height: '100%',
      }}
    />
  </div>

  {/* RIGHT: Card (same height) */}
  <div
    style={{
      flex: 1,
      border: '2px dashed var(--color-secondary-accent-2)',
      borderRadius: 'var(--spacing-3)',
      padding: 'var(--spacing-8)',
      height: '400px',
      backgroundColor: 'rgba(var(--color-secondary-accent-1-rgb), 0.1)',
    }}
    className="text-foreground"
  >
    <h3 className="title-h2 text-primary font-bold">{hostName}</h3>
    <p className="body-1 mb-spacing-2 text-on-dark font-semibold uppercase tracking-wide">
      {hostTitle}
    </p>
    <div className="body-2 space-y-spacing-3 text-on-dark leading-relaxed">
      {hostBio.split('\n\n').map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  </div>
</div>
```

**Specs:**

- Container: `maxWidth: '1200px', margin: '0 auto'` (centered)
- Gap: `gap: '32px'` (between columns)
- Photo: Fixed `400px × 400px`
- Card: `flex: 1` (fills remaining space), same `400px` height
- Card background: 10% tint of accent
- Card border: `2px dashed` accent color

---

### **As Seen On (Media Logos)**

**Standard Pattern:**

```tsx
<div className="mb-spacing-10 text-center">
  <p className="title-h3 mb-spacing-4 text-foreground">AS SEEN ON</p>
  <div className="gap-spacing-4 md:gap-spacing-8 flex flex-wrap items-center justify-center">
    {mediaLogo1Url && (
      <img
        src={mediaLogo1Url}
        alt="Media Logo"
        className="h-8 w-auto opacity-50 transition-opacity hover:opacity-70 md:h-12"
        style={{ filter: 'grayscale(1) brightness(1.4) contrast(1.2)' }}
      />
    )}
    {/* Repeat for logo2, logo3, logo4 */}
  </div>
</div>
```

**Specs:**

- Title: `title-h3 mb-spacing-4` (uppercase in text content)
- Gap: `gap-spacing-4 md:gap-spacing-8` (16px → 32px)
- Logo height: `h-8 md:h-12` (32px → 48px)
- Width: `w-auto` (maintain ratio)
- Filter: `grayscale(1) brightness(1.4) contrast(1.2)` (desaturate + lighten)
- Opacity: `opacity-50` default, `hover:opacity-70`
- Flex: `flex-wrap` (allow multi-row)

---

## 7. Code Quality & Enforcement Rules

### **A. data-field-path Attribution (CRITICAL)**

**Every editable element MUST have `data-field-path` for CMS integration:**

```tsx
// ✅ CORRECT - All editable content tagged
<h1 data-field-path="headline">{headline}</h1>
<p data-field-path="description">{description}</p>
<img src={hostPhotoUrl} data-field-path="hostPhotoUrl" />
<button data-field-path="ctaText">{ctaText}</button>

// ❌ WRONG - Missing data-field-path
<h1>{headline}</h1> // How will editor know this is editable?
```

**Rules:**

- Every text field that uses a variable → Add `data-field-path`
- Every image that uses a prop → Add `data-field-path`
- Every button with variable text → Add `data-field-path`
- Static elements (labels, helper text) → No need

**Field Path Naming:**

```tsx
// Use exact variable name as path
const { headline, description, ctaText } = pageData
<h1 data-field-path="headline">{headline}</h1> // ✅
<p data-field-path="description">{description}</p> // ✅
<button data-field-path="ctaText">{ctaText}</button> // ✅
```

---

### **B. UTL Classes vs Inline Styles**

**Use UTL classes (from `globals.css`) whenever possible. Use inline styles ONLY when:**

1. **Dynamic theme colors** (CSS variables)
2. **Dynamic dimensions** (calculated sizes)
3. **Complex gradients/shadows** (not in UTL system)

```tsx
// ✅ CORRECT - Use UTL classes for static styles
<div className="px-spacing-6 py-spacing-4 rounded-spacing-3 shadow-lg">

// ✅ CORRECT - Inline for theme colors
<button style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>

// ❌ WRONG - Inline for spacing (use UTL)
<div style={{ padding: '24px', borderRadius: '12px' }}> // Should use UTL classes

// ❌ WRONG - Hardcoded colors (use theme tokens)
<div style={{ backgroundColor: '#10B981' }}> // Should use var(--color-primary)
```

**UTL Classes Available (Check `apps/website/src/app/globals.css`):**

- Spacing: `px-spacing-X`, `py-spacing-X`, `p-spacing-X`, `gap-spacing-X`, `mb-spacing-X`
- Rounding: `rounded-spacing-X`
- Typography: `display-X`, `title-hX`, `body-X`, `text-on-dark`
- Width: `max-w-headline`, `max-w-subheadline`, `max-w-body-text`
- Colors: `bg-primary`, `text-primary`, `border-border`, etc. (via theme tokens)

---

### **C. Theme Token Usage (MANDATORY)**

**NEVER hardcode colors. ALWAYS use CSS variables:**

```tsx
// ✅ CORRECT - Theme tokens
style={{
  background: 'var(--color-primary)',
  color: 'var(--color-primary-foreground)',
  borderColor: 'var(--color-border)'
}}

// ❌ WRONG - Hardcoded hex
style={{
  backgroundColor: '#10B981',
  color: '#FFFFFF',
  borderColor: '#E5E7EB'
}}
```

**Available Theme Tokens:**

```css
/* Primary Colors (supports gradients) */
--color-primary
--color-primary-foreground
--color-primary-light
--color-primary-dark

/* Secondary Accents */
--color-secondary-accent-1
--color-secondary-accent-2

/* Text Colors */
--color-heading
--color-body
--color-muted-foreground

/* Background Colors */
--color-page-background
--color-card-background
--color-muted

/* Element Colors */
--color-border
--color-input

/* Semantic Colors */
--color-success
--color-warning
--color-danger

/* RGB Variants (for alpha) */
--color-primary-rgb
--color-card-rgb
--color-secondary-accent-1-rgb
```

**Alpha Transparency Pattern:**

```tsx
// ✅ Use RGB variants for transparency
style={{
  backgroundColor: 'rgba(var(--color-card-rgb), 0.95)',
  borderColor: 'rgba(var(--color-primary-rgb), 0.3)'
}}

// ❌ Can't use alpha with hex tokens
style={{
  backgroundColor: 'var(--color-card-background) / 95%' // Won't work
}}
```

---

### **D. Dark Overlay Text Color**

**Always use `text-on-dark` class for text on colored backgrounds:**

```tsx
// ✅ CORRECT - text-on-dark ensures readability
<div style={{ backgroundColor: 'var(--color-primary)' }}>
  <h1 className="title-h1 text-on-dark">Headline</h1>
  <p className="body-1 text-on-dark">Description</p>
</div>

// ❌ WRONG - Default text color may not be readable
<div style={{ backgroundColor: 'var(--color-primary)' }}>
  <h1 className="title-h1">Headline</h1> // May be invisible!
</div>
```

**When to use:**

- Text inside colored boxes/cards
- Text on gradient backgrounds
- Text on accent-colored sections
- Countdown timer digits

**`text-on-dark` definition:**

```css
.text-on-dark {
  color: #ffffff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}
```

---

### **E. background vs backgroundColor**

**CRITICAL: Use `background` property for gradients, `backgroundColor` for solid colors only:**

```tsx
// ✅ CORRECT - background supports gradients AND solids
<button style={{
  background: 'var(--color-primary)', // Works for both gradient and solid
  color: 'var(--color-primary-foreground)'
}} />

// ❌ WRONG - backgroundColor ignores gradients
<button style={{
  backgroundColor: 'var(--color-primary)', // Gradient won't show!
  color: 'var(--color-primary-foreground)'
}} />
```

**Rule:** Always use `background` when applying `--color-primary` or `--color-secondary-accent-X` because they can be gradients.

---

### **F. Responsive Typography**

**Use responsive text classes for headlines and CTAs:**

```tsx
// ✅ CORRECT - Scales from mobile to desktop
<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold">

// ✅ CORRECT - CTA button scales
<button className="text-xl md:text-2xl lg:text-3xl font-bold">

// ❌ WRONG - Fixed size (too small on desktop or too large on mobile)
<h1 className="text-5xl font-bold">
```

**Standard Scale:**

- Display headline: `text-4xl md:text-5xl lg:text-6xl`
- Large headline: `text-3xl md:text-4xl lg:text-5xl`
- CTA button: `text-xl md:text-2xl lg:text-3xl`
- Body text: `body-1` (18px, no scaling needed)

---

### **G. Placeholder Image Pattern**

**All image fields must have placeholders for empty states:**

```tsx
// ✅ CORRECT - Placeholder for missing image
{
  imageUrl ? (
    <img src={imageUrl} alt="Product" data-field-path="imageUrl" />
  ) : (
    <div
      data-field-path="imageUrl"
      className="border-border rounded-spacing-3 flex items-center justify-center border-2 border-dashed"
      style={{ minHeight: '300px', color: 'var(--color-muted-foreground)' }}
    >
      PRODUCT IMAGE
    </div>
  )
}

// ❌ WRONG - No placeholder, broken layout if empty
{
  imageUrl && <img src={imageUrl} alt="Product" />
}
```

**Placeholder Specs:**

- Border: `border-2 border-dashed border-border`
- Text: `color: 'var(--color-muted-foreground)'` (muted gray)
- Min height: Match expected image size
- Centered: `flex items-center justify-center`
- **MUST have `data-field-path`** for CMS to know it's an image field

---

### **H. Fallback Values for Optional Fields**

**Always provide fallback text for optional fields:**

```tsx
// ✅ CORRECT - Fallback prevents empty elements
<h1 data-field-path="headline">
  {headline || 'Your Headline Here'}
</h1>
<button data-field-path="ctaText">
  {ctaText || 'Get Started'}
</button>

// ❌ WRONG - Empty elements break layout
<h1 data-field-path="headline">{headline}</h1> // What if headline is null?
```

**Standard Fallbacks:**

- Headline: `'Your Headline Here'`
- Description: `'Add your description here'`
- CTA: `'Get Started'` or `'Click Here'`
- Host name: `'Host Name'`
- Countdown: Show example time (e.g., `'24:00:00'`)

---

### **I. Video Embed Pattern**

**Use iframe with responsive container:**

```tsx
// ✅ CORRECT - Responsive 16:9 container
<div className="relative w-full" style={{ paddingTop: '56.25%' }}>
  <iframe
    src={videoUrl}
    className="absolute inset-0 w-full h-full rounded-spacing-3"
    allow="autoplay; encrypted-media; picture-in-picture"
    allowFullScreen
  />
</div>

// ❌ WRONG - Fixed height breaks on mobile
<iframe src={videoUrl} style={{ width: '100%', height: '500px' }} />
```

**16:9 Aspect Ratio:**

- Padding-top: `56.25%` (9/16 = 0.5625)
- Parent: `relative w-full`
- Child iframe: `absolute inset-0 w-full h-full`

---

### **J. Conditional Rendering (Component-Level)**

**Hide entire sections if all fields are empty (for cleaner editor view):**

```tsx
// ✅ CORRECT - Don't render section if empty
{
  ;(testimonial1 || testimonial2 || testimonial3) && (
    <div className="py-spacing-24">
      <h2 className="title-h2">What Others Are Saying</h2>
      {testimonial1 && <TestimonialCard text={testimonial1} />}
      {testimonial2 && <TestimonialCard text={testimonial2} />}
      {testimonial3 && <TestimonialCard text={testimonial3} />}
    </div>
  )
}

// ❌ WRONG - Empty section wastes space
;<div className="py-spacing-24">
  <h2 className="title-h2">What Others Are Saying</h2>
  {testimonial1 && <TestimonialCard text={testimonial1} />}
  {testimonial2 && <TestimonialCard text={testimonial2} />}
</div>
```

**Rule:** If section title depends on dynamic content, wrap entire section in conditional.

---

## 8. Responsive Design

### **Breakpoint Strategy**

**Mobile-First Approach:**

- Base styles = Mobile (< 640px)
- `md:` = Tablet (≥ 640px)
- `lg:` = Desktop (≥ 1024px)

**Standard Breakpoints:**

- 640px (`md:`) - Tablet
- 1024px (`lg:`) - Desktop

---

### **Responsive Patterns**

**Padding:**

```tsx
px-spacing-4 md:px-spacing-6     {/* 16px → 24px */}
py-spacing-2 md:py-spacing-3     {/* 8px → 12px */}
px-spacing-6 md:px-spacing-10    {/* 24px → 40px */}
py-spacing-4 md:py-spacing-6     {/* 16px → 24px */}
```

**Typography:**

```tsx
body-3 md:body-2                 {/* 12px → 14px */}
text-xl md:text-2xl lg:text-3xl  {/* 20px → 24px → 30px */}
title-h1                          {/* Auto-scales via CSS media queries */}
```

**Grid Columns:**

```tsx
grid-cols-1 md:grid-cols-2 lg:grid-cols-3  {/* 1 → 2 → 3 columns */}
grid-cols-1 md:grid-cols-3                 {/* Skip medium breakpoint */}
grid-cols-1 lg:grid-cols-2                 {/* 1 → skip → 2 columns */}
```

**Gaps:**

```tsx
gap-spacing-3 md:gap-spacing-6              {/* 12px → 24px */}
gap-spacing-4 md:gap-spacing-8              {/* 16px → 32px */}
```

---

### **Conditional Layouts**

**Mobile Stack → Desktop Side-by-Side:**

```tsx
{
  /* Mobile: vertical, Desktop: horizontal */
}
;<div className="gap-spacing-8 grid grid-cols-1 lg:grid-cols-2">
  {/* LEFT COLUMN */}
  <div>Product info</div>

  {/* RIGHT COLUMN */}
  <div className="lg:sticky lg:top-6 lg:self-start">Checkout form (sticky on desktop)</div>
</div>
```

---

## 9. Quick Reference

### **Spacing Scale (Most Used)**

| Token        | Pixels | Primary Use                   |
| ------------ | ------ | ----------------------------- |
| `spacing-1`  | 4px    | Micro gaps, inline spacing    |
| `spacing-2`  | 8px    | Tight spacing, small buttons  |
| `spacing-3`  | 12px   | Icon-text gaps, small padding |
| `spacing-4`  | 16px   | Standard gaps, medium padding |
| `spacing-6`  | 24px   | Section spacing, card padding |
| `spacing-8`  | 32px   | Large padding, section gaps   |
| `spacing-10` | 40px   | Page padding, major gaps      |
| `spacing-16` | 64px   | Section breaks                |
| `spacing-20` | 80px   | Feature breaks                |

---

### **Component Quick Patterns**

**Page Wrapper:**

```tsx
<section className="relative w-full min-h-screen flex flex-col overflow-hidden bg-background text-foreground">
  <div className="tpl-layer tpl-layer--spotlight pointer-events-none" />
  <div className="tpl-layer tpl-layer--blobs pointer-events-none" />
  <div className="tpl-layer tpl-layer--vignette pointer-events-none" />
  <div className="relative z-10 w-full flex-1 flex flex-col items-center px-spacing-6 py-spacing-10">
```

**Large CTA Button:**

```tsx
<button
  className="rounded-spacing-3 px-spacing-6 md:px-spacing-10 py-spacing-4 md:py-spacing-6 w-full text-xl font-bold uppercase tracking-wide md:text-2xl lg:text-3xl"
  style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
>
  CTA TEXT ≫
</button>
```

**Video Embed:**

```tsx
<div className="rounded-spacing-3 aspect-video w-full overflow-hidden">
  <iframe src={embedUrl} className="h-full w-full" allowFullScreen />
</div>
```

**Step Header:**

```tsx
<div
  className="py-spacing-4 px-spacing-6 rounded-spacing-3 mb-spacing-8"
  style={{
    background: 'var(--color-secondary-accent-1)',
    color: 'var(--color-primary-foreground)',
  }}
>
  <h2 className="title-h2 text-center font-bold uppercase">STEP 1</h2>
</div>
```

**Countdown Timer:**

```tsx
<div className="rounded-spacing-3 p-spacing-3">
  <p className="body-2 text-danger mb-spacing-2 font-bold uppercase">WE START IN:</p>
  <div className="gap-spacing-3 flex justify-center">
    <div className="flex flex-col items-center">
      <span className="text-danger text-2xl font-bold md:text-3xl">{days}</span>
      <span className="body-3 text-danger mt-1 uppercase">DAYS</span>
    </div>
    <span className="text-danger text-xl font-bold md:text-2xl">:</span>
    {/* Repeat for hours, mins, secs */}
  </div>
</div>
```

---

### **Checklist for New Templates**

**Structure:**

- [ ] Page wrapper: `relative w-full min-h-screen flex flex-col overflow-hidden`
- [ ] Background layers: spotlight → blobs → vignette
- [ ] Main container: `relative z-10 w-full flex-1 flex flex-col items-center px-spacing-6 py-spacing-10`
- [ ] Theme colors: `bg-background text-foreground`

**Spacing:**

- [ ] Logo: `mb-spacing-10` (40px)
- [ ] Headline: `mb-spacing-6` (24px)
- [ ] Subheadline: `mb-spacing-10` (40px)
- [ ] CTA: `mb-spacing-6` (24px)
- [ ] Major sections: `mb-spacing-16` or `mb-spacing-20` (64-80px)

**Typography:**

- [ ] Hero: `display-1` or `display-2` with `max-w-headline`
- [ ] Subheadline: `title-h3` with `max-w-subheadline`
- [ ] Section headers: `title-h1` or `title-h2` (uppercase)
- [ ] Body: `body-1` (primary), `body-2` (secondary)

**Components:**

- [ ] CTAs use `background: var(--color-primary)` (NOT `backgroundColor`)
- [ ] Videos in `aspect-video` containers
- [ ] Step headers with `var(--color-secondary-accent-1)` background
- [ ] Countdown timers use `text-danger` color
- [ ] Cards use `rgba(var(--color-card-rgb), 0.95)` backgrounds

**Responsive:**

- [ ] Padding scales: `px-spacing-4 md:px-spacing-6`
- [ ] Typography scales: `body-3 md:body-2` or `text-xl md:text-2xl lg:text-3xl`
- [ ] Grids collapse: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- [ ] Gaps increase: `gap-spacing-4 md:gap-spacing-8`

**Colors:**

- [ ] NO hardcoded hex colors
- [ ] Text: `text-on-dark`, `text-foreground`, `text-muted-foreground`, `text-primary`
- [ ] Backgrounds: Use CSS variable inline styles with RGB tokens for opacity
- [ ] Buttons: `background` property (supports gradients)

---

**For code architecture patterns, see:**

- `.docs/guidelines/development/code-guidelines.md` - API routes, services, authentication
- `.docs/guidelines/design/design-guidelines.md` - App UI patterns, tokens, components
