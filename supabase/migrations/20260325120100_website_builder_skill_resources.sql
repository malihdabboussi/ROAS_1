-- Insert website-builder skill resources (layout schema, component library, page architecture, examples).

-- Clean up old resources first
DELETE FROM agent_skill_resources WHERE agent_key = 'vibey' AND skill_key = 'website-builder';

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id)
VALUES (
  'vibey',
  'website-builder',
  'references/layout-schema.md',
  $res_references_layout-schema_md$# Website Layout Schema — Complete Reference

The `set_website_layout` action stores a JSON object on the funnel row. The funnels renderer reads this layout and wraps every page with a shared header (navigation) and footer. Pages do NOT need to include their own header/footer — the renderer handles it.

---

## Full TypeScript Interface

```typescript
interface WebsiteNavItem {
  label: string                // Display text in the nav
  path: string                 // Must match a page's path exactly (e.g., "/about")
  style?: 'link' | 'button'   // 'link' = text nav item, 'button' = CTA button style
  children?: Array<{           // Dropdown children (rendered as submenu)
    label: string
    path: string
  }>
}

interface WebsiteLayout {
  navigation?: {
    logo?: {
      url: string              // Logo image URL (from theme logo_url)
      alt: string              // Alt text for accessibility
    }
    items?: WebsiteNavItem[]   // Nav menu items
    position?: 'sticky' | 'fixed' | 'static'  // Nav scroll behavior (default: 'sticky')
    style?: 'transparent' | 'solid' | 'blur'   // Nav background style (default: 'solid')
  }
  footer?: {
    columns?: Array<{          // Footer link columns (renders in a responsive grid)
      title: string            // Column heading
      links: Array<{
        label: string          // Link text
        path: string           // Internal path or external URL
      }>
    }>
    copyright?: string         // Copyright line at bottom
    socials?: Array<{          // Social media links
      platform: string         // Platform name (displayed as text label)
      url: string              // Full URL to social profile
    }>
  }
}
```

---

## Navigation Style Guide

| Style | When to Use | Visual |
|-------|-------------|--------|
| `solid` | Default. Works for all website types. Clean white background with subtle bottom border. | White bg, `border-b border-black/5` |
| `blur` | Modern/premium feel. Great for sites with hero images or dark sections at top. | `bg-white/80 backdrop-blur border-b border-black/5` |
| `transparent` | Only when the hero section has a strong visual background (gradient, image, video). Content must be readable without nav background. | `bg-transparent` |

| Position | When to Use |
|----------|-------------|
| `sticky` | Default. Nav sticks to top on scroll. Best for most websites. |
| `fixed` | Nav always visible, overlays content. Use only with `transparent` style. |
| `static` | Nav scrolls with content. Use for minimal/editorial designs. |

---

## Complete Layout Examples

### Example 1: Business / Corporate Website

```json
{
  "navigation": {
    "logo": { "url": "https://example.com/logo.png", "alt": "Meridian Consulting" },
    "items": [
      { "label": "Home", "path": "/" },
      { "label": "About", "path": "/about" },
      { "label": "Services", "path": "/services" },
      { "label": "Case Studies", "path": "/portfolio" },
      { "label": "Get Started", "path": "/contact", "style": "button" }
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
          { "label": "Our Team", "path": "/about" },
          { "label": "Careers", "path": "/about" }
        ]
      },
      {
        "title": "Services",
        "links": [
          { "label": "Strategy Consulting", "path": "/services" },
          { "label": "Business Development", "path": "/services" },
          { "label": "Market Analysis", "path": "/services" }
        ]
      },
      {
        "title": "Get In Touch",
        "links": [
          { "label": "Contact Us", "path": "/contact" },
          { "label": "Book a Call", "path": "/contact" },
          { "label": "LinkedIn", "path": "https://linkedin.com/company/meridian" }
        ]
      }
    ],
    "copyright": "© 2026 Meridian Consulting. All rights reserved.",
    "socials": [
      { "platform": "LinkedIn", "url": "https://linkedin.com/company/meridian" },
      { "platform": "Twitter", "url": "https://twitter.com/meridian" }
    ]
  }
}
```

### Example 2: SaaS / Startup Website

```json
{
  "navigation": {
    "logo": { "url": "https://example.com/logo.svg", "alt": "FlowStack" },
    "items": [
      { "label": "Features", "path": "/features" },
      { "label": "Pricing", "path": "/pricing" },
      { "label": "About", "path": "/about" },
      { "label": "Blog", "path": "/blog" },
      { "label": "Get Started Free", "path": "/contact", "style": "button" }
    ],
    "position": "sticky",
    "style": "solid"
  },
  "footer": {
    "columns": [
      {
        "title": "Product",
        "links": [
          { "label": "Features", "path": "/features" },
          { "label": "Pricing", "path": "/pricing" },
          { "label": "Integrations", "path": "/features" },
          { "label": "Changelog", "path": "/blog" }
        ]
      },
      {
        "title": "Company",
        "links": [
          { "label": "About", "path": "/about" },
          { "label": "Blog", "path": "/blog" },
          { "label": "Careers", "path": "/about" },
          { "label": "Contact", "path": "/contact" }
        ]
      },
      {
        "title": "Resources",
        "links": [
          { "label": "Documentation", "path": "https://docs.flowstack.io" },
          { "label": "API Reference", "path": "https://api.flowstack.io" },
          { "label": "Status", "path": "https://status.flowstack.io" }
        ]
      }
    ],
    "copyright": "© 2026 FlowStack Inc. All rights reserved.",
    "socials": [
      { "platform": "Twitter", "url": "https://twitter.com/flowstack" },
      { "platform": "GitHub", "url": "https://github.com/flowstack" },
      { "platform": "Discord", "url": "https://discord.gg/flowstack" }
    ]
  }
}
```

### Example 3: Creative / Portfolio Website

```json
{
  "navigation": {
    "logo": { "url": "https://example.com/monogram.svg", "alt": "Studio Noir" },
    "items": [
      { "label": "Work", "path": "/portfolio" },
      { "label": "About", "path": "/about" },
      { "label": "Services", "path": "/services" },
      { "label": "Let's Talk", "path": "/contact", "style": "button" }
    ],
    "position": "fixed",
    "style": "transparent"
  },
  "footer": {
    "columns": [
      {
        "title": "Studio",
        "links": [
          { "label": "Our Work", "path": "/portfolio" },
          { "label": "About", "path": "/about" },
          { "label": "Services", "path": "/services" }
        ]
      },
      {
        "title": "Connect",
        "links": [
          { "label": "hello@studionoir.co", "path": "/contact" },
          { "label": "Instagram", "path": "https://instagram.com/studionoir" },
          { "label": "Dribbble", "path": "https://dribbble.com/studionoir" }
        ]
      }
    ],
    "copyright": "© 2026 Studio Noir",
    "socials": [
      { "platform": "Instagram", "url": "https://instagram.com/studionoir" },
      { "platform": "Dribbble", "url": "https://dribbble.com/studionoir" },
      { "platform": "Behance", "url": "https://behance.net/studionoir" }
    ]
  }
}
```

### Example 4: Consultant / Coach Website

```json
{
  "navigation": {
    "logo": { "url": "https://example.com/headshot-logo.png", "alt": "Sarah Mitchell" },
    "items": [
      { "label": "About", "path": "/about" },
      { "label": "Programs", "path": "/services" },
      { "label": "Testimonials", "path": "/testimonials" },
      { "label": "Book a Call", "path": "/contact", "style": "button" }
    ],
    "position": "sticky",
    "style": "blur"
  },
  "footer": {
    "columns": [
      {
        "title": "Work With Me",
        "links": [
          { "label": "1:1 Coaching", "path": "/services" },
          { "label": "Group Program", "path": "/services" },
          { "label": "Free Resources", "path": "/about" }
        ]
      },
      {
        "title": "Connect",
        "links": [
          { "label": "Book a Discovery Call", "path": "/contact" },
          { "label": "Instagram", "path": "https://instagram.com/sarahmitchell" },
          { "label": "Podcast", "path": "https://podcast.sarahmitchell.com" }
        ]
      }
    ],
    "copyright": "© 2026 Sarah Mitchell Coaching. All rights reserved.",
    "socials": [
      { "platform": "Instagram", "url": "https://instagram.com/sarahmitchell" },
      { "platform": "YouTube", "url": "https://youtube.com/@sarahmitchell" },
      { "platform": "LinkedIn", "url": "https://linkedin.com/in/sarahmitchell" }
    ]
  }
}
```

### Example 5: Restaurant / Local Business

```json
{
  "navigation": {
    "logo": { "url": "https://example.com/logo.png", "alt": "Ember Kitchen" },
    "items": [
      { "label": "Menu", "path": "/menu" },
      { "label": "About", "path": "/about" },
      { "label": "Gallery", "path": "/gallery" },
      { "label": "Reserve a Table", "path": "/contact", "style": "button" }
    ],
    "position": "sticky",
    "style": "solid"
  },
  "footer": {
    "columns": [
      {
        "title": "Visit Us",
        "links": [
          { "label": "123 Main Street, NYC", "path": "/contact" },
          { "label": "Open: Tue-Sun, 5pm-11pm", "path": "/contact" },
          { "label": "Reservations", "path": "/contact" }
        ]
      },
      {
        "title": "Explore",
        "links": [
          { "label": "Our Menu", "path": "/menu" },
          { "label": "Our Story", "path": "/about" },
          { "label": "Photo Gallery", "path": "/gallery" }
        ]
      }
    ],
    "copyright": "© 2026 Ember Kitchen",
    "socials": [
      { "platform": "Instagram", "url": "https://instagram.com/emberkitchen" },
      { "platform": "Yelp", "url": "https://yelp.com/biz/ember-kitchen" }
    ]
  }
}
```

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Nav path `/services` but page path is `services` (no slash) | Always use leading slash: `/services` |
| Inline header/footer in page TSX | Remove them — the renderer wraps pages automatically |
| CTA button in nav without `style: "button"` | Set `style: "button"` on the last/primary nav item |
| Footer links to pages that don't exist | Only link to pages you've created or external URLs |
| No copyright in footer | Always include copyright with year and business name |
| Layout set before funnel creation | Create funnel first, then set layout, then create pages |
$res_references_layout-schema_md$,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id)
VALUES (
  'vibey',
  'website-builder',
  'references/page-architecture.md',
  $res_references_page-architecture_md$# Page Architecture — What Each Page Type Needs

Every page type has a specific purpose, required sections, and common pitfalls. Use this as a structural blueprint before generating any page.

---

## Home Page (`page_type: "home"`, `path: "/"`)

The home page is the most important page. It sets the visual language for the entire site and must immediately communicate who the business is, what they do, and why it matters.

### Required Sections (in order)

1. **Hero** (min 80vh)
   - Headline: Clear value proposition (what the business does + for whom)
   - Subheadline: Supporting context (1-2 sentences)
   - Primary CTA button (links to Contact or Services)
   - Secondary CTA (links to About or Services)
   - Visual: hero image, gradient background, or ambient effect
   - Optional: trust badges, client count, or social proof snippet

2. **Social Proof Bar** (optional but recommended)
   - "Trusted by 500+ clients" or "Featured in..." with logo row
   - Logo marquee/ticker for partner or client logos
   - Keep it subtle — one horizontal strip

3. **Services/Features Overview** (3-6 items)
   - Card grid or bento layout
   - Each card: icon + title + short description
   - Links to Services page for full details
   - Use consistent card component across all cards

4. **About Snippet**
   - 2-3 sentences about the company/person
   - Team photo or founder photo
   - "Learn More" CTA linking to About page

5. **Testimonials/Social Proof**
   - 2-3 client testimonials with names and roles
   - Star ratings or result metrics if available
   - Carousel or grid layout

6. **CTA Section**
   - Strong closing headline
   - Primary CTA button (Contact or Get Started)
   - Optional: urgency element or secondary benefit

### Do NOT Include
- Duplicate navigation (renderer provides the nav)
- Inline footer
- Long-form content (save for About/Services)
- Pricing details (save for Pricing page)

---

## About Page (`page_type: "about"`, `path: "/about"`)

The about page builds trust and human connection. It answers: "Who are these people and why should I trust them?"

### Required Sections

1. **Page Header**
   - H2 headline ("About Us" or something more distinctive)
   - 1-2 sentence intro

2. **Story Section**
   - Company origin / founder story
   - Mission and values
   - Image: team photo, office, or founder
   - Use alternating text-image layout (text left / image right, then swap)

3. **Values or Mission Grid**
   - 3-4 core values as cards with icons
   - Brief description for each

4. **Team Section** (if applicable)
   - Grid of team members
   - Each: photo (or icon placeholder), name, role, brief bio
   - Hover effect for interactivity

5. **Stats/Achievements** (optional)
   - Animated counters: years in business, clients served, projects completed
   - Horizontal bar with 3-4 metrics

6. **CTA Section**
   - "Ready to work with us?" + Contact CTA

### Do NOT Include
- Service details (link to Services instead)
- Pricing
- Generic stock bios — better to use placeholder icons and invite user to add real info later

---

## Services Page (`page_type: "services"`, `path: "/services"`)

The services page converts interest into action. Each service must be clearly defined with a path to the next step.

### Required Sections

1. **Page Header**
   - H2 headline
   - Brief overview of what you offer

2. **Services Grid or List**
   - Each service gets its own card or section
   - Icon + title + description + optional price/tier
   - If detailed: use alternating layout (image + text blocks)
   - If compact: use card grid (3-column on desktop, 1-column mobile)

3. **Process/How It Works**
   - 3-5 step timeline or numbered cards
   - Shows the client journey from contact to delivery
   - Reduces uncertainty — people need to know what happens after they reach out

4. **Differentiators/Why Choose Us**
   - 3-4 reasons with icons
   - Focus on outcomes, not features

5. **Testimonial** (1-2 specific to services)
   - Client result story
   - Quote with attribution

6. **CTA Section**
   - Per-service "Get Started" buttons OR global "Contact Us" CTA
   - Clear next step

### Do NOT Include
- Lengthy case studies (save for Portfolio page)
- Pricing unless user explicitly wants it on this page

---

## Contact Page (`page_type: "contact"`, `path: "/contact"`)

The contact page must make it as easy as possible to reach out. Every unnecessary field or confusing layout costs leads.

### Required Sections

1. **Page Header**
   - H2 headline ("Let's Talk" or "Get In Touch")
   - Short intro: what happens after they reach out

2. **Contact Form** (MUST include `data-vibey-capture` attribute)
   - Fields: Name, Email (required), Phone (optional), Message
   - The form element MUST have `data-vibey-capture` attribute for lead capture
   - Submit button with clear CTA text ("Send Message" not "Submit")
   - Optional: `data-next-page` attribute on the form for redirect after submission

3. **Contact Information Sidebar**
   - Email address
   - Phone number (if applicable)
   - Office address (if applicable)
   - Business hours (if applicable)
   - Social media links

4. **Map or Location** (optional, for local businesses)
   - Google Maps embed or static map image
   - Address with directions link

### Contact Form Code Pattern

```tsx
<form data-vibey-capture data-next-page="/thank-you" className="space-y-4">
  <div>
    <label className="block text-sm font-medium mb-1">Name</label>
    <input name="name" type="text" required className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none" />
  </div>
  <div>
    <label className="block text-sm font-medium mb-1">Email</label>
    <input name="email" type="email" required className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none" />
  </div>
  <div>
    <label className="block text-sm font-medium mb-1">Message</label>
    <textarea name="message" rows={4} className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none" />
  </div>
  <button type="submit" className="w-full py-3 px-6 bg-primary text-white font-semibold rounded-lg hover:opacity-90 transition-opacity">
    Send Message
  </button>
</form>
```

### Do NOT Include
- Too many form fields (name + email + message is enough for most businesses)
- CAPTCHAs or complex validation
- Missing `data-vibey-capture` — this is the most common mistake and breaks lead capture entirely

---

## Portfolio Page (`page_type: "portfolio"`, `path: "/portfolio"`)

### Required Sections

1. **Page Header** — headline + brief intro
2. **Portfolio Grid** — project cards with image, title, category. Hover overlay with brief description.
3. **Project Detail Pattern** — expandable or modal view with full description, images, results
4. **Client Testimonial** — relevant to the showcased work
5. **CTA** — "Start Your Project" linking to Contact

---

## Pricing Page (`page_type: "pricing"`, `path: "/pricing"`)

### Required Sections

1. **Page Header** — headline + subtext
2. **Pricing Toggle** — monthly/annual if applicable
3. **Pricing Cards** — 2-4 tiers in a row. Each: tier name, price, feature list, CTA button. Highlight the recommended tier.
4. **Feature Comparison Table** — detailed feature-by-tier matrix (for complex offerings)
5. **FAQ Section** — 5-8 common pricing questions as accordion
6. **CTA** — "Not sure which plan? Contact us" linking to Contact

---

## Testimonials Page (`page_type: "testimonials"`, `path: "/testimonials"`)

### Required Sections

1. **Page Header** — headline + intro
2. **Featured Testimonial** — large, prominent, with photo and full quote
3. **Testimonial Grid/Wall** — masonry or card grid with all testimonials
4. **Stats Bar** — aggregate metrics (clients served, satisfaction rate, years)
5. **CTA** — "Join our happy clients" linking to Contact

---

## FAQ Page (`page_type: "faq"`, `path: "/faq"`)

### Required Sections

1. **Page Header** — headline + intro
2. **FAQ Categories** — grouped by topic if many questions
3. **Accordion Items** — question/answer with smooth expand/collapse animation
4. **Contact CTA** — "Still have questions?" linking to Contact

---

## Blog Listing Page (`page_type: "blog-listing"`, `path: "/blog"`)

This page is auto-populated by the renderer with blog posts. The TSX should provide the layout shell.

### Required Sections

1. **Page Header** — "Blog" headline + intro
2. **Blog grid layout** — the renderer injects blog post cards via the `blogPosts` prop
3. **Pagination** — the renderer handles this via `blogPagination`

---

## Universal Rules for All Pages

1. Never include inline header or footer — the renderer provides them from the layout
2. Every page should have at least one CTA linking to another page
3. Use consistent section padding site-wide (`py-20 md:py-28` or similar)
4. Use consistent container width (`max-w-7xl mx-auto px-6`)
5. Alternate section backgrounds for visual rhythm (white → light gray → white)
6. All internal navigation must use `data-vibey-link` attributes, not `<a href>`
7. Images should use `loading="lazy"` except hero images (`loading="eager"`)
$res_references_page-architecture_md$,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id)
VALUES (
  'vibey',
  'website-builder',
  'references/component-library.md',
  $res_references_component-library_md$# Premium Component Library

Production-ready component patterns for website pages. Every pattern uses only the available runtime scope: **React, Framer Motion, Lucide icons, anime.js**. No external imports needed.

Study these patterns the same way you study website examples — read the full TSX, understand the technique, adapt to the user's theme colors. Never use hardcoded colors — always reference the theme.

---

## 1. Split Hero with Floating Card

**Best for:** Home pages, landing pages. Two-column layout with text left and floating visual element right.

```tsx
const SplitHero = ({ theme }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden" style={{ background: `linear-gradient(135deg, ${theme.bg} 0%, ${theme.bgAlt} 100%)` }}>
      <div className="absolute inset-0 opacity-30">
        <div className="absolute w-[600px] h-[600px] rounded-full blur-[120px]" style={{ background: theme.primary, top: '-20%', right: '-10%', opacity: 0.15 }} />
        <div className="absolute w-[400px] h-[400px] rounded-full blur-[100px]" style={{ background: theme.secondary, bottom: '-10%', left: '10%', opacity: 0.1 }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(30px)', transition: 'all 0.8s cubic-bezier(0.22, 1, 0.36, 1)' }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6" style={{ background: `${theme.primary}15`, color: theme.primary }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: theme.primary }} />
            Trusted by 500+ businesses
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6" style={{ color: theme.text }}>
            Transform Your Business With Strategic Growth
          </h1>
          <p className="text-lg md:text-xl mb-8 max-w-lg" style={{ color: theme.textMuted }}>
            We help ambitious companies scale through proven frameworks and hands-on execution.
          </p>
          <div className="flex flex-wrap gap-4">
            <button data-vibey-link="/contact" className="px-8 py-4 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer" style={{ background: theme.primary }}>
              Get Started
            </button>
            <button data-vibey-link="/services" className="px-8 py-4 rounded-xl font-semibold border-2 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer" style={{ borderColor: theme.border, color: theme.text }}>
              Our Services
            </button>
          </div>
        </div>

        <div className="relative hidden lg:block" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(40px)', transition: 'all 1s cubic-bezier(0.22, 1, 0.36, 1) 0.2s' }}>
          <div className="relative rounded-2xl p-8 shadow-2xl" style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.3)' }}>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${theme.primary}15` }}>
                  <TrendingUp size={24} style={{ color: theme.primary }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.textMuted }}>Revenue Growth</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text }}>+247%</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${theme.secondary}15` }}>
                  <Users size={24} style={{ color: theme.secondary }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.textMuted }}>Active Clients</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text }}>500+</p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-32 h-32 rounded-2xl opacity-50 blur-sm" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }} />
        </div>
      </div>
    </section>
  );
};
```

---

## 2. Bento Grid Features

**Best for:** Home and Services pages. Asymmetric grid with mixed sizes for visual interest.

```tsx
const BentoGrid = ({ features, theme }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {features.map((f, i) => {
        const isLarge = i === 0 || i === 3;
        return (
          <div
            key={i}
            className={`relative rounded-2xl p-8 overflow-hidden group ${isLarge ? 'md:col-span-2' : ''}`}
            style={{
              background: i % 2 === 0 ? `${theme.primary}08` : `${theme.secondary}06`,
              border: `1px solid ${theme.border}`,
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(30px)',
              transition: `all 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${i * 100}ms`,
            }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-0 group-hover:opacity-20 transition-opacity duration-500" style={{ background: theme.primary }} />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: `${theme.primary}12` }}>
                {f.icon}
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ color: theme.text }}>{f.title}</h3>
              <p className="text-base leading-relaxed" style={{ color: theme.textMuted }}>{f.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

---

## 3. Logo Marquee / Trust Bar

**Best for:** Below the hero on any page. Continuous scrolling logo strip showing social proof.

```tsx
const LogoMarquee = ({ logos, theme }) => (
  <section className="py-12 overflow-hidden" style={{ borderTop: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}` }}>
    <p className="text-center text-sm font-medium mb-8 uppercase tracking-widest" style={{ color: theme.textMuted }}>
      Trusted by industry leaders
    </p>
    <div className="relative">
      <div className="flex animate-marquee gap-16 items-center">
        {[...logos, ...logos].map((logo, i) => (
          <div key={i} className="flex-shrink-0 opacity-40 hover:opacity-80 transition-opacity duration-300 grayscale hover:grayscale-0">
            <img src={logo.url} alt={logo.name} className="h-8 w-auto" />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 30s linear infinite; width: max-content; }
      `}</style>
    </div>
  </section>
);
```

---

## 4. Animated Stats Counter

**Best for:** About pages, Home pages. Counts up from 0 to target value on scroll.

```tsx
const StatsCounter = ({ stats, theme }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [counts, setCounts] = useState(stats.map(() => 0));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !visible) {
        setVisible(true);
        stats.forEach((stat, i) => {
          const duration = 2000;
          const steps = 60;
          const increment = stat.value / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= stat.value) {
              current = stat.value;
              clearInterval(timer);
            }
            setCounts(prev => { const next = [...prev]; next[i] = Math.floor(current); return next; });
          }, duration / steps);
        });
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible]);

  return (
    <section ref={ref} className="py-16" style={{ background: `${theme.primary}05` }}>
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <div key={i} className="text-center">
            <p className="text-4xl md:text-5xl font-bold mb-2" style={{ color: theme.primary }}>
              {counts[i]}{stat.suffix || ''}
            </p>
            <p className="text-sm uppercase tracking-wider font-medium" style={{ color: theme.textMuted }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
```

**Usage:**
```tsx
<StatsCounter stats={[
  { value: 500, suffix: '+', label: 'Clients Served' },
  { value: 12, suffix: '+', label: 'Years Experience' },
  { value: 98, suffix: '%', label: 'Satisfaction Rate' },
  { value: 50, suffix: 'M+', label: 'Revenue Generated' },
]} theme={theme} />
```

---

## 5. Testimonial Wall

**Best for:** Home, Testimonials pages. Masonry-style grid of testimonial cards with various heights.

```tsx
const TestimonialWall = ({ testimonials, theme }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
      {testimonials.map((t, i) => (
        <div
          key={i}
          className="break-inside-avoid rounded-2xl p-6 group hover:shadow-lg transition-all duration-300"
          style={{
            background: theme.cardBg || '#fff',
            border: `1px solid ${theme.border}`,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            transition: `all 0.5s ease ${i * 80}ms`,
          }}
        >
          <div className="flex gap-1 mb-4">
            {[1,2,3,4,5].map(star => (
              <Star key={star} size={16} fill={theme.primary} style={{ color: theme.primary }} />
            ))}
          </div>
          <p className="text-base leading-relaxed mb-4" style={{ color: theme.text }}>"{t.quote}"</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: theme.primary }}>
              {t.name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: theme.text }}>{t.name}</p>
              <p className="text-xs" style={{ color: theme.textMuted }}>{t.role}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
```

---

## 6. Process Timeline (Vertical)

**Best for:** Services, About pages. Shows how a process or journey works step by step.

```tsx
const ProcessTimeline = ({ steps, theme }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative max-w-2xl mx-auto">
      <div className="absolute left-8 top-0 bottom-0 w-px" style={{ background: theme.border }} />
      {steps.map((step, i) => (
        <div
          key={i}
          className="relative flex gap-6 mb-12 last:mb-0"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateX(0)' : 'translateX(-20px)',
            transition: `all 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${i * 150}ms`,
          }}
        >
          <div className="relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold text-lg text-white shadow-lg" style={{ background: theme.primary }}>
            {String(i + 1).padStart(2, '0')}
          </div>
          <div className="pt-2">
            <h3 className="text-xl font-bold mb-2" style={{ color: theme.text }}>{step.title}</h3>
            <p className="text-base leading-relaxed" style={{ color: theme.textMuted }}>{step.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
```

---

## 7. Pricing Table with Toggle

**Best for:** Pricing pages. Monthly/annual toggle with tier cards.

```tsx
const PricingTable = ({ tiers, theme }) => {
  const [annual, setAnnual] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-center gap-4 mb-12">
        <span className="text-sm font-medium" style={{ color: annual ? theme.textMuted : theme.text }}>Monthly</span>
        <button
          onClick={() => setAnnual(!annual)}
          className="relative w-14 h-7 rounded-full transition-colors duration-300 cursor-pointer"
          style={{ background: annual ? theme.primary : theme.border }}
        >
          <div className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300" style={{ left: annual ? '30px' : '4px' }} />
        </button>
        <span className="text-sm font-medium" style={{ color: annual ? theme.text : theme.textMuted }}>
          Annual <span className="text-xs px-2 py-0.5 rounded-full ml-1" style={{ background: `${theme.primary}15`, color: theme.primary }}>Save 20%</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((tier, i) => (
          <div
            key={i}
            className={`relative rounded-2xl p-8 transition-all duration-300 ${tier.featured ? 'shadow-xl scale-[1.02]' : 'hover:shadow-lg'}`}
            style={{
              background: tier.featured ? theme.primary : (theme.cardBg || '#fff'),
              border: tier.featured ? 'none' : `1px solid ${theme.border}`,
            }}
          >
            {tier.featured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white" style={{ background: theme.secondary }}>
                Most Popular
              </div>
            )}
            <h3 className="text-lg font-bold mb-2" style={{ color: tier.featured ? '#fff' : theme.text }}>{tier.name}</h3>
            <p className="text-sm mb-6" style={{ color: tier.featured ? 'rgba(255,255,255,0.8)' : theme.textMuted }}>{tier.description}</p>
            <div className="mb-6">
              <span className="text-4xl font-bold" style={{ color: tier.featured ? '#fff' : theme.text }}>
                ${annual ? tier.annualPrice : tier.monthlyPrice}
              </span>
              <span className="text-sm" style={{ color: tier.featured ? 'rgba(255,255,255,0.7)' : theme.textMuted }}>/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              {tier.features.map((f, j) => (
                <li key={j} className="flex items-center gap-3 text-sm" style={{ color: tier.featured ? 'rgba(255,255,255,0.9)' : theme.text }}>
                  <Check size={16} style={{ color: tier.featured ? '#fff' : theme.primary }} />
                  {f}
                </li>
              ))}
            </ul>
            <button
              data-vibey-link="/contact"
              className="w-full py-3 rounded-xl font-semibold transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
              style={{
                background: tier.featured ? '#fff' : theme.primary,
                color: tier.featured ? theme.primary : '#fff',
              }}
            >
              {tier.cta || 'Get Started'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 8. FAQ Accordion

**Best for:** Pricing, Contact, FAQ pages. Smooth expand/collapse with plus/minus icon.

```tsx
const FAQAccordion = ({ items, theme }) => {
  const [open, setOpen] = useState(null);

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="rounded-xl overflow-hidden transition-all duration-300"
          style={{ background: theme.cardBg || '#fff', border: `1px solid ${open === i ? theme.primary + '30' : theme.border}` }}
        >
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-6 py-5 text-left cursor-pointer"
          >
            <span className="font-semibold pr-4" style={{ color: theme.text }}>{item.question}</span>
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300" style={{ background: open === i ? `${theme.primary}15` : `${theme.border}40`, transform: open === i ? 'rotate(45deg)' : 'rotate(0)' }}>
              <Plus size={18} style={{ color: open === i ? theme.primary : theme.textMuted }} />
            </div>
          </button>
          <div style={{ maxHeight: open === i ? '300px' : '0', overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
            <p className="px-6 pb-5 leading-relaxed" style={{ color: theme.textMuted }}>{item.answer}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
```

---

## 9. Team Grid with Hover

**Best for:** About page. Team member cards with hover overlay showing bio.

```tsx
const TeamGrid = ({ members, theme }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    {members.map((m, i) => (
      <div key={i} className="group relative rounded-2xl overflow-hidden cursor-pointer" style={{ aspectRatio: '3/4' }}>
        {m.image ? (
          <img src={m.image} alt={m.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-white" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}>
            {m.name.charAt(0)}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
          <h3 className="text-white font-bold text-lg">{m.name}</h3>
          <p className="text-white/80 text-sm">{m.role}</p>
          {m.bio && <p className="text-white/60 text-sm mt-2 line-clamp-3">{m.bio}</p>}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 group-hover:opacity-0 transition-opacity duration-300" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}>
          <h3 className="text-white font-bold">{m.name}</h3>
          <p className="text-white/70 text-sm">{m.role}</p>
        </div>
      </div>
    ))}
  </div>
);
```

---

## 10. Alternating Content Blocks

**Best for:** About, Services pages. Text + image blocks that alternate left-right.

```tsx
const AlternatingBlocks = ({ blocks, theme }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="space-y-24">
      {blocks.map((block, i) => (
        <div
          key={i}
          className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${i % 2 === 1 ? 'lg:direction-rtl' : ''}`}
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(30px)',
            transition: `all 0.6s ease ${i * 150}ms`,
            direction: i % 2 === 1 ? 'rtl' : 'ltr',
          }}
        >
          <div style={{ direction: 'ltr' }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 uppercase tracking-wider" style={{ background: `${theme.primary}10`, color: theme.primary }}>
              {block.tag}
            </div>
            <h3 className="text-3xl font-bold mb-4" style={{ color: theme.text }}>{block.title}</h3>
            <p className="text-lg leading-relaxed mb-6" style={{ color: theme.textMuted }}>{block.description}</p>
            {block.cta && (
              <button data-vibey-link={block.cta.path} className="inline-flex items-center gap-2 font-semibold hover:gap-3 transition-all cursor-pointer" style={{ color: theme.primary }}>
                {block.cta.label} <ArrowRight size={18} />
              </button>
            )}
          </div>
          <div className="rounded-2xl overflow-hidden shadow-lg" style={{ direction: 'ltr' }}>
            {block.image ? (
              <img src={block.image} alt={block.title} className="w-full h-auto" loading="lazy" />
            ) : (
              <div className="aspect-video flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${theme.primary}15, ${theme.secondary}10)` }}>
                {block.icon || <Layers size={48} style={{ color: theme.primary, opacity: 0.5 }} />}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
```

---

## 11. CTA Banner Section

**Best for:** Bottom of any page. Full-width banner with compelling CTA.

```tsx
const CTABanner = ({ headline, subtext, ctaLabel, ctaPath, theme }) => (
  <section className="relative py-20 md:py-28 overflow-hidden">
    <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary}dd)` }} />
    <div className="absolute inset-0">
      <div className="absolute w-[400px] h-[400px] rounded-full blur-[100px] opacity-20" style={{ background: '#fff', top: '-20%', right: '10%' }} />
      <div className="absolute w-[300px] h-[300px] rounded-full blur-[80px] opacity-15" style={{ background: '#fff', bottom: '-10%', left: '20%' }} />
    </div>
    <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">{headline}</h2>
      <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">{subtext}</p>
      <button data-vibey-link={ctaPath} className="px-10 py-4 rounded-xl font-bold text-lg bg-white shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer" style={{ color: theme.primary }}>
        {ctaLabel}
      </button>
    </div>
  </section>
);
```

---

## 12. Feature Comparison Table

**Best for:** Pricing, Services pages. Side-by-side feature comparison.

```tsx
const ComparisonTable = ({ features, plans, theme }) => (
  <div className="overflow-x-auto rounded-2xl" style={{ border: `1px solid ${theme.border}` }}>
    <table className="w-full text-left">
      <thead>
        <tr style={{ background: `${theme.primary}08` }}>
          <th className="px-6 py-4 text-sm font-semibold" style={{ color: theme.textMuted }}>Features</th>
          {plans.map((plan, i) => (
            <th key={i} className="px-6 py-4 text-center">
              <span className="text-sm font-bold" style={{ color: theme.text }}>{plan.name}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {features.map((feature, i) => (
          <tr key={i} style={{ borderTop: `1px solid ${theme.border}` }}>
            <td className="px-6 py-4 text-sm" style={{ color: theme.text }}>{feature.name}</td>
            {feature.values.map((val, j) => (
              <td key={j} className="px-6 py-4 text-center">
                {val === true ? <Check size={18} className="mx-auto" style={{ color: theme.primary }} /> :
                 val === false ? <X size={18} className="mx-auto" style={{ color: theme.textMuted, opacity: 0.3 }} /> :
                 <span className="text-sm font-medium" style={{ color: theme.text }}>{val}</span>}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
```

---

## 13. Gallery Grid with Lightbox

**Best for:** Portfolio, Gallery pages. Responsive image grid with click-to-expand.

```tsx
const GalleryGrid = ({ images, theme }) => {
  const [selected, setSelected] = useState(null);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((img, i) => (
          <div
            key={i}
            className="relative rounded-xl overflow-hidden cursor-pointer group"
            style={{ aspectRatio: i % 3 === 0 ? '1/1' : '4/3' }}
            onClick={() => setSelected(i)}
          >
            <img src={img.url} alt={img.alt || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
              <Maximize2 size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </div>
        ))}
      </div>

      {selected !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6" onClick={() => setSelected(null)}>
          <button className="absolute top-6 right-6 text-white/80 hover:text-white cursor-pointer" onClick={() => setSelected(null)}>
            <X size={32} />
          </button>
          <img src={images[selected].url} alt={images[selected].alt || ''} className="max-w-full max-h-[85vh] rounded-lg shadow-2xl" />
        </div>
      )}
    </>
  );
};
```

---

## 14. Gradient Text Heading

**Best for:** Hero sections, page titles. Gradient color on text.

```tsx
const GradientHeading = ({ text, from, to, className = '' }) => (
  <h2
    className={`font-bold bg-clip-text text-transparent ${className}`}
    style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
  >
    {text}
  </h2>
);
```

**Usage:**
```tsx
<GradientHeading text="Build Something Amazing" from={theme.primary} to={theme.secondary} className="text-4xl md:text-6xl" />
```

---

## 15. Magnetic CTA Button

**Best for:** Hero sections, CTA sections. Button that subtly follows the cursor.

```tsx
const MagneticButton = ({ label, path, theme }) => {
  const ref = useRef(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouse = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.2;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.2;
    setOffset({ x, y });
  };

  return (
    <button
      ref={ref}
      data-vibey-link={path}
      onMouseMove={handleMouse}
      onMouseLeave={() => setOffset({ x: 0, y: 0 })}
      className="relative px-10 py-4 rounded-xl font-bold text-lg text-white shadow-lg hover:shadow-xl cursor-pointer"
      style={{
        background: theme.primary,
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        transition: offset.x === 0 ? 'transform 0.4s ease' : 'none',
      }}
    >
      {label}
    </button>
  );
};
```

---

## Combining Patterns

Premium websites combine multiple patterns per page. Here's a typical structure:

| Page | Recommended Patterns |
|------|---------------------|
| Home | Split Hero (1) → Logo Marquee (3) → Bento Grid (2) → Stats Counter (4) → Testimonials (5) → CTA Banner (11) |
| About | Alternating Blocks (10) → Team Grid (9) → Stats Counter (4) → Process Timeline (6) → CTA Banner (11) |
| Services | Bento Grid (2) → Process Timeline (6) → Comparison Table (12) → Testimonials (5) → CTA Banner (11) |
| Contact | Contact Form (from page-architecture) + Contact Info sidebar |
| Pricing | Pricing Table (7) → Comparison Table (12) → FAQ Accordion (8) → CTA Banner (11) |
| Portfolio | Gallery Grid (13) → Testimonials (5) → CTA Banner (11) |

Adapt ALL color values to the user's theme. Never use hardcoded colors.
$res_references_component-library_md$,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id)
VALUES (
  'vibey',
  'website-builder',
  'references/examples/INDEX.md',
  $res_references_examples_INDEX_md$# Website Examples Library — Master Index

Complete website page examples with full source code. Every example contains production-ready TSX with visual effects, animations, responsive layout, and premium patterns.

**Base path:** `references/examples/`

---

## Business / Corporate (4-page complete set)

The flagship example. Shows how a complete business website works together — consistent design language, cross-page CTAs, shared section patterns.

| Page | Description | File |
|------|-------------|------|
| Home | Split hero with stats card, logo marquee, bento features grid, animated stats counter, testimonial wall, gradient CTA banner | `business/home.md` |
| About | Brand story with alternating blocks, core values grid, team section with hover, timeline history, stats bar, CTA | `business/about.md` |
| Services | Services bento grid, process timeline, why-choose-us cards, client testimonial, CTA banner | `business/services.md` |
| Contact | Two-column layout — form with `data-vibey-capture` on left, contact details + map on right, FAQ accordion below | `business/contact.md` |

**Study this set to understand:** Cross-page consistency, shared design tokens (same padding, same card styles, same button patterns), how CTAs connect pages to each other.

---

## SaaS / Startup

| Page | Description | File |
|------|-------------|------|
| Home | Dark theme hero with gradient text and code preview, feature grid with icons, social proof bar, pricing preview, testimonial carousel, CTA | `saas/home.md` |

**Study this to understand:** Dark theme execution, tech-focused design, gradient effects, badge/pill patterns, feature comparison previews.

---

## Portfolio / Creative Agency

| Page | Description | File |
|------|-------------|------|
| Home | Full-bleed hero with text overlay, project gallery grid with hover overlays, about strip with stats, services list, client logos, contact CTA | `portfolio/home.md` |

**Study this to understand:** Visual-first design, image-heavy layouts, minimal text, dramatic hover effects, editorial typography.

---

## Consultant / Coach

| Page | Description | File |
|------|-------------|------|
| Home | Personal brand hero with headshot, credibility bar, programs/offerings cards, transformation stories, booking CTA with urgency | `consultant/home.md` |

**Study this to understand:** Personal brand design, trust-building patterns, transformation-focused copy structure, booking CTAs.

---

## How to Use These Examples

1. Match the user's request to a category above
2. Read the relevant example files completely — every line of TSX
3. Extract implementation patterns (section structures, animation timings, color usage, responsive breakpoints)
4. Generate new TSX using extracted patterns + component library + visual effects + user's theme
5. Never copy examples verbatim — adapt to the user's specific business, brand, and content
$res_references_examples_INDEX_md$,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id)
VALUES (
  'vibey',
  'website-builder',
  'references/examples/business/home.md',
  $res_references_examples_business_home_md$# Business Home Page Example

Full TSX source for a corporate consulting firm's home page. Split hero with floating stats card, logo marquee, bento features grid, animated stats counter, testimonial wall, and gradient CTA banner. Uses scroll-triggered animations, ambient gradient orbs, and responsive breakpoints throughout.

## Source Code

```tsx
const { useRef, useState, useEffect, useCallback } = React;

const theme = {
  primary: '#2563eb',
  secondary: '#7c3aed',
  bg: '#ffffff',
  bgAlt: '#f8fafc',
  text: '#0f172a',
  textMuted: '#64748b',
  border: '#e2e8f0',
  cardBg: '#ffffff',
};

const useScrollReveal = (threshold = 0.15) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
};

/* ───────────────────── 1. HERO ───────────────────── */

const Hero = () => {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setLoaded(true); }, []);

  const stats = [
    { icon: <TrendingUp size={22} style={{ color: theme.primary }} />, label: 'Revenue Growth', value: '+247%', accent: theme.primary },
    { icon: <Users size={22} style={{ color: theme.secondary }} />, label: 'Active Clients', value: '500+', accent: theme.secondary },
    { icon: <Award size={22} style={{ color: theme.primary }} />, label: 'Satisfaction', value: '98%', accent: theme.primary },
  ];

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden" style={{ background: `linear-gradient(160deg, ${theme.bg} 0%, ${theme.bgAlt} 100%)` }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-[700px] h-[700px] rounded-full blur-[140px]" style={{ background: theme.primary, top: '-25%', right: '-12%', opacity: 0.08 }} />
        <div className="absolute w-[500px] h-[500px] rounded-full blur-[120px]" style={{ background: theme.secondary, bottom: '-15%', left: '5%', opacity: 0.06 }} />
        <div className="absolute w-[300px] h-[300px] rounded-full blur-[80px]" style={{ background: theme.primary, top: '40%', left: '35%', opacity: 0.04 }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center py-20">
        <div style={{ opacity: loaded ? 1 : 0, transform: loaded ? 'translateY(0)' : 'translateY(36px)', transition: 'all 0.9s cubic-bezier(0.22, 1, 0.36, 1)' }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8" style={{ background: `${theme.primary}12`, color: theme.primary, border: `1px solid ${theme.primary}20` }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: theme.primary }} />
            Trusted by 500+ businesses
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight mb-6" style={{ color: theme.text }}>
            Strategic Growth{' '}
            <span style={{ backgroundImage: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              That Delivers
            </span>{' '}
            Real Results
          </h1>

          <p className="text-lg md:text-xl leading-relaxed mb-10 max-w-lg" style={{ color: theme.textMuted }}>
            We partner with ambitious companies to unlock revenue, streamline operations, and build lasting competitive advantages.
          </p>

          <div className="flex flex-wrap gap-4">
            <button data-vibey-link="/contact" className="px-8 py-4 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer" style={{ background: theme.primary }}>
              Get Started
            </button>
            <button data-vibey-link="/services" className="px-8 py-4 rounded-xl font-semibold border-2 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer" style={{ borderColor: theme.border, color: theme.text }}>
              Our Services
            </button>
          </div>
        </div>

        <div className="relative hidden lg:flex justify-center" style={{ opacity: loaded ? 1 : 0, transform: loaded ? 'translateY(0) rotate(0deg)' : 'translateY(50px) rotate(2deg)', transition: 'all 1.1s cubic-bezier(0.22, 1, 0.36, 1) 0.15s' }}>
          <div className="absolute -bottom-6 -right-6 w-full h-full rounded-3xl opacity-40" style={{ background: `linear-gradient(135deg, ${theme.primary}30, ${theme.secondary}20)`, filter: 'blur(2px)' }} />
          <div className="relative rounded-2xl p-8 shadow-2xl w-full max-w-md" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.5)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-6" style={{ color: theme.textMuted }}>Client Performance</p>
            <div className="space-y-6">
              {stats.map((s, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl transition-colors duration-200" style={{ background: `${s.accent}06` }}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${s.accent}12` }}>{s.icon}</div>
                  <div className="flex-1">
                    <p className="text-xs font-medium" style={{ color: theme.textMuted }}>{s.label}</p>
                    <p className="text-2xl font-bold tracking-tight" style={{ color: theme.text }}>{s.value}</p>
                  </div>
                  <ChevronRight size={16} style={{ color: theme.textMuted, opacity: 0.4 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ───────────────────── 2. LOGO MARQUEE ───────────────────── */

const LogoMarquee = () => {
  const logos = [
    { name: 'Meridian Corp', initials: 'MC' },
    { name: 'Atlas Group', initials: 'AG' },
    { name: 'Vertex Labs', initials: 'VL' },
    { name: 'Prism Finance', initials: 'PF' },
    { name: 'Horizon Tech', initials: 'HT' },
    { name: 'Nova Dynamics', initials: 'ND' },
    { name: 'Skyline Partners', initials: 'SP' },
    { name: 'Forge Industries', initials: 'FI' },
  ];
  const doubled = [...logos, ...logos];

  return (
    <section className="py-14 overflow-hidden" style={{ borderTop: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}`, background: theme.bg }}>
      <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] mb-10" style={{ color: theme.textMuted }}>
        Trusted by industry leaders
      </p>
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-24 z-10" style={{ background: `linear-gradient(to right, ${theme.bg}, transparent)` }} />
        <div className="absolute right-0 top-0 bottom-0 w-24 z-10" style={{ background: `linear-gradient(to left, ${theme.bg}, transparent)` }} />
        <div className="flex animate-marquee gap-16 items-center">
          {doubled.map((logo, i) => (
            <div key={i} className="flex-shrink-0 flex items-center gap-3 opacity-40 hover:opacity-90 transition-all duration-300 grayscale hover:grayscale-0 cursor-default select-none">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: theme.primary }}>{logo.initials}</div>
              <span className="text-sm font-semibold whitespace-nowrap" style={{ color: theme.text }}>{logo.name}</span>
            </div>
          ))}
        </div>
        <style>{`
          @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
          .animate-marquee { animation: marquee 40s linear infinite; width: max-content; }
          .animate-marquee:hover { animation-play-state: paused; }
        `}</style>
      </div>
    </section>
  );
};

/* ───────────────────── 3. FEATURES BENTO GRID ───────────────────── */

const FeaturesBento = () => {
  const [ref, visible] = useScrollReveal(0.1);

  const features = [
    { icon: <Target size={24} />, title: 'Growth Strategy', description: 'Data-driven roadmaps that align your vision with market opportunity and measurable milestones.' },
    { icon: <BarChart3 size={24} />, title: 'Revenue Optimization', description: 'Unlock hidden revenue streams and maximize your existing customer lifetime value.' },
    { icon: <Lightbulb size={24} />, title: 'Innovation Labs', description: 'Rapid prototyping and validation frameworks to test new ideas before full investment.' },
    { icon: <Shield size={24} />, title: 'Risk & Compliance', description: 'Proactive risk management paired with regulatory compliance that keeps you ahead of changes, not behind.' },
    { icon: <Zap size={24} />, title: 'Digital Transformation', description: 'Modernize legacy systems and workflows with technology that drives real productivity gains.' },
    { icon: <Globe size={24} />, title: 'Market Expansion', description: 'Enter new geographies and verticals with confidence through localized go-to-market strategies.' },
  ];

  return (
    <section className="py-20 md:py-28" style={{ background: theme.bgAlt }}>
      <div ref={ref} className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: theme.primary }}>What We Do</p>
          <h2 className="text-3xl md:text-4xl font-bold" style={{ color: theme.text }}>End-to-End Business Solutions</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => {
            const isLarge = i === 0 || i === 3;
            return (
              <div
                key={i}
                className={`relative rounded-2xl p-8 overflow-hidden group cursor-default ${isLarge ? 'md:col-span-2' : ''}`}
                style={{
                  background: theme.cardBg,
                  border: `1px solid ${theme.border}`,
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(28px)',
                  transition: `all 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${i * 90}ms`,
                }}
              >
                <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-[70px] opacity-0 group-hover:opacity-15 transition-opacity duration-500" style={{ background: theme.primary }} />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: `${theme.primary}10`, color: theme.primary }}>
                    {f.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2" style={{ color: theme.text }}>{f.title}</h3>
                  <p className="text-base leading-relaxed" style={{ color: theme.textMuted }}>{f.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/* ───────────────────── 4. STATS COUNTER ───────────────────── */

const StatsCounter = () => {
  const ref = useRef(null);
  const [triggered, setTriggered] = useState(false);

  const stats = [
    { value: 500, suffix: '+', label: 'Clients Served' },
    { value: 12, suffix: '+', label: 'Years Experience' },
    { value: 98, suffix: '%', label: 'Satisfaction Rate' },
    { value: 50, prefix: '$', suffix: 'M+', label: 'Revenue Generated' },
  ];

  const [counts, setCounts] = useState(stats.map(() => 0));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !triggered) {
        setTriggered(true);
        stats.forEach((stat, i) => {
          const steps = 50;
          const inc = stat.value / steps;
          let cur = 0;
          const timer = setInterval(() => {
            cur += inc;
            if (cur >= stat.value) { cur = stat.value; clearInterval(timer); }
            setCounts(prev => { const n = [...prev]; n[i] = Math.floor(cur); return n; });
          }, 1600 / steps);
        });
      }
    }, { threshold: 0.35 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [triggered]);

  return (
    <section ref={ref} className="py-20 md:py-28" style={{ background: theme.bg }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-3" style={{ color: theme.primary }}>
                {stat.prefix || ''}{counts[i]}{stat.suffix}
              </p>
              <p className="text-sm uppercase tracking-wider font-medium" style={{ color: theme.textMuted }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ───────────────────── 5. TESTIMONIALS ───────────────────── */

const Testimonials = () => {
  const [ref, visible] = useScrollReveal(0.08);

  const testimonials = [
    { quote: 'They didn\'t just give us a strategy — they rolled up their sleeves and helped us execute. Revenue jumped 3x in 18 months.', name: 'Sarah Chen', role: 'CEO, Vertex Labs', rating: 5 },
    { quote: 'The clarity they brought to our operations was transformational. Processes that used to take weeks now take days.', name: 'Marcus Rivera', role: 'COO, Atlas Group', rating: 5 },
    { quote: 'Working with this team felt like adding a senior leadership layer overnight. Their market analysis was flawless.', name: 'Amara Okafor', role: 'VP Growth, Prism Finance', rating: 5 },
    { quote: 'From compliance headaches to clean, auditable processes — they modernized our entire risk framework in under 6 months.', name: 'David Kim', role: 'CFO, Horizon Tech', rating: 5 },
    { quote: 'Our international expansion would not have happened without their go-to-market expertise. They genuinely care about results.', name: 'Elena Vasquez', role: 'Founder, Nova Dynamics', rating: 5 },
  ];

  return (
    <section className="py-20 md:py-28" style={{ background: theme.bgAlt }}>
      <div ref={ref} className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: theme.primary }}>Testimonials</p>
          <h2 className="text-3xl md:text-4xl font-bold" style={{ color: theme.text }}>What Our Clients Say</h2>
        </div>

        <div className="columns-1 md:columns-2 lg:columns-3 gap-5 space-y-5">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="break-inside-avoid rounded-2xl p-7 hover:shadow-lg transition-all duration-300"
              style={{
                background: theme.cardBg,
                border: `1px solid ${theme.border}`,
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(24px)',
                transition: `all 0.55s cubic-bezier(0.22, 1, 0.36, 1) ${i * 90}ms`,
              }}
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, s) => (
                  <Star key={s} size={15} fill={theme.primary} style={{ color: theme.primary }} />
                ))}
              </div>
              <p className="text-base leading-relaxed mb-5" style={{ color: theme.text }}>"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}>
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: theme.text }}>{t.name}</p>
                  <p className="text-xs" style={{ color: theme.textMuted }}>{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ───────────────────── 6. CTA BANNER ───────────────────── */

const CTABanner = () => (
  <section className="relative py-20 md:py-28 overflow-hidden">
    <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }} />
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute w-[500px] h-[500px] rounded-full blur-[120px] opacity-20" style={{ background: '#fff', top: '-30%', right: '5%' }} />
      <div className="absolute w-[350px] h-[350px] rounded-full blur-[100px] opacity-15" style={{ background: '#fff', bottom: '-20%', left: '15%' }} />
    </div>
    <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
        Ready to Transform Your Business?
      </h2>
      <p className="text-lg text-white/80 mb-10 max-w-xl mx-auto leading-relaxed">
        Join 500+ companies that accelerated their growth with our proven consulting frameworks. Let's build your roadmap.
      </p>
      <button data-vibey-link="/contact" className="px-10 py-4 rounded-xl font-bold text-lg bg-white shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer" style={{ color: theme.primary }}>
        Get Your Free Consultation
      </button>
    </div>
  </section>
);

/* ───────────────────── PAGE COMPOSITION ───────────────────── */

const Page = () => (
  <div style={{ background: theme.bg, color: theme.text, fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
    <Hero />
    <LogoMarquee />
    <FeaturesBento />
    <StatsCounter />
    <Testimonials />
    <CTABanner />
  </div>
);

render(<Page />);
```
$res_references_examples_business_home_md$,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id)
VALUES (
  'vibey',
  'website-builder',
  'references/examples/business/about.md',
  $res_references_examples_business_about_md$# Business About Page Example

Full TSX source for a corporate consulting firm's about page. Matches the home page design language — same spacing (`py-20 md:py-28`), same card borders and shadows, same animation easing (`cubic-bezier(0.22, 1, 0.36, 1)`), same theme object pattern.

## Source Code

```tsx
const { useRef, useState, useEffect, useCallback } = React;
const { Target, Shield, Zap, Heart, ArrowRight } = LucideIcons;

const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';

function useScrollReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function useCountUp(target, duration = 2000, active = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [active, target, duration]);
  return value;
}

render(
  (() => {
    const theme = typeof campaignTheme !== 'undefined' ? campaignTheme : {
      primary: '#2563EB', secondary: '#7C3AED', bg: '#FFFFFF', bgAlt: '#F8FAFC',
      text: '#0F172A', textMuted: '#64748B', border: '#E2E8F0', cardBg: '#FFFFFF',
    };

    const storyBlocks = [
      { tag: 'Our Origin', title: 'Born from a Simple Belief', description: 'We started in 2012 with one conviction — every business deserves access to the strategic thinking that drives industry leaders. What began as a two-person advisory firm has grown into a team of specialists who live and breathe growth strategy.', cta: { label: 'Meet the Team', path: '/about#team' } },
      { tag: 'Our Mission', title: 'Empowering Ambitious Companies', description: 'We exist to close the gap between where businesses are and where they could be. Through rigorous analysis, tailored frameworks, and hands-on execution, we turn potential into measurable performance — quarter after quarter.', cta: null },
      { tag: 'Our Approach', title: 'Strategy Meets Execution', description: 'We don\'t hand you a 200-page report and walk away. Our consultants embed into your team, challenge assumptions, build systems, and stay until the metrics move. Every engagement is a partnership, not a transaction.', cta: { label: 'See Our Services', path: '/services' } },
    ];

    const values = [
      { icon: Target, label: 'Precision', desc: 'Data-driven decisions. Every recommendation backed by evidence, every strategy built on real numbers.' },
      { icon: Shield, label: 'Trust', desc: 'Radical transparency in everything we do — from pricing to progress reports to honest feedback.' },
      { icon: Zap, label: 'Innovation', desc: 'We challenge conventional playbooks and find the unconventional levers that unlock outsized results.' },
      { icon: Heart, label: 'Dedication', desc: 'Your success is our reputation. We stay engaged long after the strategy deck is delivered.' },
    ];

    const team = [
      { name: 'Alexandra Chen', role: 'Managing Partner', bio: '15 years leading Fortune 500 transformations across technology, healthcare, and financial services.' },
      { name: 'Marcus Rivera', role: 'Head of Strategy', bio: 'Former McKinsey principal. Specializes in market entry, competitive positioning, and M&A advisory.' },
      { name: 'Priya Kapoor', role: 'Operations Director', bio: 'Process optimization expert who has streamlined operations for 200+ mid-market companies.' },
      { name: 'James Okafor', role: 'Client Success Lead', bio: 'The glue between our team and yours. 98% client retention rate under his watch.' },
    ];

    const stats = [
      { value: 12, suffix: '+', label: 'Years of Experience' },
      { value: 500, suffix: '+', label: 'Clients Served' },
      { value: 50, suffix: '+', label: 'Industries' },
      { value: 98, suffix: '%', label: 'Client Retention' },
    ];

    const milestones = [
      { year: '2012', title: 'The Beginning', desc: 'Founded as a two-person advisory firm focused on startup growth strategy.' },
      { year: '2015', title: 'First Major Win', desc: 'Helped a Series B startup scale to $50M ARR — our reputation took off.' },
      { year: '2018', title: 'Team Expansion', desc: 'Grew to 20+ consultants across strategy, operations, and digital transformation.' },
      { year: '2021', title: 'Global Reach', desc: 'Opened offices in London and Singapore. Served clients on four continents.' },
      { year: '2024', title: '500+ Clients', desc: 'Hit the 500-client milestone with a 98% retention rate and counting.' },
    ];

    const [heroRef, heroVisible] = useScrollReveal(0.1);
    const [valuesRef, valuesVisible] = useScrollReveal(0.1);
    const [teamRef, teamVisible] = useScrollReveal(0.1);
    const [statsRef, statsVisible] = useScrollReveal(0.25);
    const [timelineRef, timelineVisible] = useScrollReveal(0.1);

    const c0 = useCountUp(stats[0].value, 2000, statsVisible);
    const c1 = useCountUp(stats[1].value, 2000, statsVisible);
    const c2 = useCountUp(stats[2].value, 2000, statsVisible);
    const c3 = useCountUp(stats[3].value, 2000, statsVisible);
    const counts = [c0, c1, c2, c3];

    return (
      <div style={{ background: theme.bg, color: theme.text }}>

        {/* ── Page Header ── */}
        <section className="relative py-20 md:py-28 overflow-hidden" style={{ background: `linear-gradient(160deg, ${theme.bg} 0%, ${theme.bgAlt} 50%, ${theme.primary}08 100%)` }}>
          <div className="absolute w-[500px] h-[500px] rounded-full blur-[140px] opacity-10" style={{ background: theme.primary, top: '-15%', right: '-5%' }} />
          <div ref={heroRef} className="relative z-10 max-w-7xl mx-auto px-6 text-center" style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(30px)', transition: `all 0.8s ${ease}` }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6" style={{ background: `${theme.primary}12`, color: theme.primary }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: theme.primary }} />
              Established 2012
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6" style={{ color: theme.text }}>Our Story</h2>
            <p className="text-lg md:text-xl max-w-2xl mx-auto leading-relaxed" style={{ color: theme.textMuted }}>
              We help ambitious companies close the gap between potential and performance through strategic consulting that actually moves the needle.
            </p>
          </div>
        </section>

        {/* ── Story Blocks (alternating) ── */}
        <section className="py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-6 space-y-24">
            {storyBlocks.map((block, i) => {
              const [ref, vis] = useScrollReveal(0.15);
              const reversed = i % 2 === 1;
              return (
                <div key={i} ref={ref} className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center`} style={{ opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(30px)', transition: `all 0.7s ${ease}`, direction: reversed ? 'rtl' : 'ltr' }}>
                  <div style={{ direction: 'ltr' }}>
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4" style={{ background: `${theme.primary}10`, color: theme.primary }}>{block.tag}</span>
                    <h3 className="text-3xl font-bold mb-4" style={{ color: theme.text }}>{block.title}</h3>
                    <p className="text-lg leading-relaxed mb-6" style={{ color: theme.textMuted }}>{block.description}</p>
                    {block.cta && (
                      <button data-vibey-link={block.cta.path} className="inline-flex items-center gap-2 font-semibold hover:gap-3 transition-all duration-300 cursor-pointer" style={{ color: theme.primary, background: 'none', border: 'none', padding: 0 }}>
                        {block.cta.label} <ArrowRight size={18} />
                      </button>
                    )}
                  </div>
                  <div className="rounded-2xl overflow-hidden" style={{ direction: 'ltr', aspectRatio: '16/10', background: `linear-gradient(135deg, ${theme.primary}${i === 1 ? '12' : '08'}, ${theme.secondary || theme.primary}${i === 2 ? '15' : '06'})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="text-6xl font-bold opacity-20" style={{ color: theme.primary }}>{String(i + 1).padStart(2, '0')}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Values Grid ── */}
        <section className="py-20 md:py-28" style={{ background: theme.bgAlt }}>
          <div ref={valuesRef} className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16" style={{ opacity: valuesVisible ? 1 : 0, transform: valuesVisible ? 'translateY(0)' : 'translateY(20px)', transition: `all 0.6s ${ease}` }}>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: theme.text }}>What We Stand For</h2>
              <p className="text-lg max-w-xl mx-auto" style={{ color: theme.textMuted }}>Four principles that guide every engagement, every decision, every deliverable.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((v, i) => {
                const Icon = v.icon;
                return (
                  <div key={i} className="rounded-2xl p-8 group hover:-translate-y-1 transition-all duration-300" style={{ background: theme.cardBg || '#fff', border: `1px solid ${theme.border}`, opacity: valuesVisible ? 1 : 0, transform: valuesVisible ? 'translateY(0)' : 'translateY(25px)', transition: `all 0.6s ${ease} ${i * 100}ms` }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300" style={{ background: `${theme.primary}12` }}>
                      <Icon size={24} style={{ color: theme.primary }} />
                    </div>
                    <h3 className="text-lg font-bold mb-2" style={{ color: theme.text }}>{v.label}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: theme.textMuted }}>{v.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Team Section ── */}
        <section className="py-20 md:py-28" id="team">
          <div ref={teamRef} className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16" style={{ opacity: teamVisible ? 1 : 0, transform: teamVisible ? 'translateY(0)' : 'translateY(20px)', transition: `all 0.6s ${ease}` }}>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: theme.text }}>The People Behind the Strategy</h2>
              <p className="text-lg max-w-xl mx-auto" style={{ color: theme.textMuted }}>Senior practitioners — not junior analysts. You work directly with the experts.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {team.map((m, i) => (
                <div key={i} className="group relative rounded-2xl overflow-hidden cursor-pointer" style={{ aspectRatio: '3/4', opacity: teamVisible ? 1 : 0, transform: teamVisible ? 'translateY(0)' : 'translateY(30px)', transition: `all 0.6s ${ease} ${i * 100}ms` }}>
                  <div className="w-full h-full flex items-center justify-center text-6xl font-bold text-white" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary}cc)` }}>
                    {m.name.charAt(0)}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                    <h3 className="text-white font-bold text-lg">{m.name}</h3>
                    <p className="text-white/80 text-sm">{m.role}</p>
                    <p className="text-white/60 text-sm mt-2">{m.bio}</p>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5 group-hover:opacity-0 transition-opacity duration-300" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)' }}>
                    <h3 className="text-white font-bold">{m.name}</h3>
                    <p className="text-white/70 text-sm">{m.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Stats Bar ── */}
        <section ref={statsRef} className="py-16 md:py-20" style={{ background: `${theme.primary}05` }}>
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <div key={i} className="text-center" style={{ opacity: statsVisible ? 1 : 0, transition: `opacity 0.5s ${ease} ${i * 100}ms` }}>
                <p className="text-4xl md:text-5xl font-bold mb-2" style={{ color: theme.primary }}>{counts[i]}{s.suffix}</p>
                <p className="text-sm uppercase tracking-wider font-medium" style={{ color: theme.textMuted }}>{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Timeline ── */}
        <section className="py-20 md:py-28" style={{ background: theme.bgAlt }}>
          <div ref={timelineRef} className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16" style={{ opacity: timelineVisible ? 1 : 0, transform: timelineVisible ? 'translateY(0)' : 'translateY(20px)', transition: `all 0.6s ${ease}` }}>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: theme.text }}>Our Journey</h2>
              <p className="text-lg max-w-xl mx-auto" style={{ color: theme.textMuted }}>Key milestones that shaped who we are today.</p>
            </div>
            <div className="relative max-w-2xl mx-auto">
              <div className="absolute left-8 top-0 bottom-0 w-px" style={{ background: theme.border }} />
              {milestones.map((ms, i) => (
                <div key={i} className="relative flex gap-6 mb-12 last:mb-0" style={{ opacity: timelineVisible ? 1 : 0, transform: timelineVisible ? 'translateX(0)' : 'translateX(-20px)', transition: `all 0.6s ${ease} ${i * 150}ms` }}>
                  <div className="relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold text-sm text-white shadow-lg" style={{ background: theme.primary }}>{ms.year}</div>
                  <div className="pt-2">
                    <h3 className="text-xl font-bold mb-1" style={{ color: theme.text }}>{ms.title}</h3>
                    <p className="text-base leading-relaxed" style={{ color: theme.textMuted }}>{ms.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA Section ── */}
        <section className="relative py-20 md:py-28 overflow-hidden">
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary}dd)` }} />
          <div className="absolute inset-0">
            <div className="absolute w-[400px] h-[400px] rounded-full blur-[100px] opacity-20" style={{ background: '#fff', top: '-20%', right: '10%' }} />
            <div className="absolute w-[300px] h-[300px] rounded-full blur-[80px] opacity-15" style={{ background: '#fff', bottom: '-10%', left: '20%' }} />
          </div>
          <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">Let's Build Something Great Together</h2>
            <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">Ready to turn strategy into results? Let's start a conversation about your next move.</p>
            <button data-vibey-link="/contact" className="px-10 py-4 rounded-xl font-bold text-lg bg-white shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer" style={{ color: theme.primary }}>
              Get In Touch
            </button>
          </div>
        </section>

      </div>
    );
  })()
);
```
$res_references_examples_business_about_md$,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id)
VALUES (
  'vibey',
  'website-builder',
  'references/examples/business/services.md',
  $res_references_examples_business_services_md$# Business Services Page Example

Full TSX source for a corporate consulting firm's services page. Sections: page header, 5-service bento grid with hover glow, vertical process timeline, why-choose-us cards, featured testimonial, gradient CTA banner.

## Source Code

```tsx
const { useState, useEffect, useRef } = React;
const { Briefcase, BarChart3, Users, Lightbulb, Megaphone, Search, Rocket, Settings, ShieldCheck, Clock, Award, Star, ArrowRight } = lucide;

const theme = {
  primary: '#2563eb',
  secondary: '#7c3aed',
  bg: '#ffffff',
  bgAlt: '#f8fafc',
  text: '#0f172a',
  textMuted: '#64748b',
  border: '#e2e8f0',
  cardBg: '#ffffff',
};

const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';

const useReveal = (threshold = 0.15) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
};

const services = [
  { icon: <Briefcase size={26} />, title: 'Business Strategy', description: 'Align your vision with actionable roadmaps that drive sustainable growth and competitive advantage.' },
  { icon: <BarChart3 size={26} />, title: 'Financial Advisory', description: 'Data-driven financial modeling, forecasting, and optimization to maximize profitability.' },
  { icon: <Users size={26} />, title: 'Organizational Development', description: 'Build high-performance teams through leadership coaching, culture design, and talent strategy.' },
  { icon: <Megaphone size={26} />, title: 'Market Positioning', description: 'Craft compelling brand narratives and go-to-market strategies that resonate with your audience.' },
  { icon: <Settings size={26} />, title: 'Operational Excellence', description: 'Streamline workflows, reduce waste, and implement systems that scale with your business.' },
];

const steps = [
  { title: 'Discovery', description: 'We immerse ourselves in your business — stakeholder interviews, data audits, and competitive analysis to uncover the full picture.' },
  { title: 'Strategy', description: 'Synthesize findings into a prioritized roadmap with clear milestones, KPIs, and resource requirements.' },
  { title: 'Execution', description: 'Hands-on implementation alongside your team — we don\'t just advise, we build with you.' },
  { title: 'Optimization', description: 'Continuous measurement and iteration to ensure results compound over time.' },
];

const differentiators = [
  { icon: <ShieldCheck size={28} />, title: 'Proven Track Record', description: '12+ years and 500+ engagements across industries — from startups to Fortune 500.' },
  { icon: <Clock size={28} />, title: 'Speed to Impact', description: 'Most clients see measurable results within the first 90 days of engagement.' },
  { icon: <Award size={28} />, title: 'Dedicated Partners', description: 'Senior consultants embedded in your team — no hand-offs to junior staff.' },
];

const ServicesPage = () => {
  const [headerRef, headerVisible] = useReveal();
  const [gridRef, gridVisible] = useReveal(0.1);
  const [timelineRef, timelineVisible] = useReveal(0.1);
  const [diffRef, diffVisible] = useReveal();
  const [testRef, testVisible] = useReveal();

  return (
    <div style={{ background: theme.bg }}>
      {/* Page Header */}
      <section ref={headerRef} className="py-20 md:py-28" style={{ background: `linear-gradient(180deg, ${theme.bgAlt} 0%, ${theme.bg} 100%)` }}>
        <div className="max-w-7xl mx-auto px-6 text-center" style={{ opacity: headerVisible ? 1 : 0, transform: headerVisible ? 'translateY(0)' : 'translateY(24px)', transition: `all 0.7s ${ease}` }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6" style={{ background: `${theme.primary}10`, color: theme.primary }}>
            <Lightbulb size={16} /> Our Expertise
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4" style={{ color: theme.text }}>What We Do</h2>
          <p className="text-lg md:text-xl max-w-2xl mx-auto" style={{ color: theme.textMuted }}>
            We partner with ambitious organizations to solve complex challenges and unlock their next stage of growth.
          </p>
        </div>
      </section>

      {/* Services Bento Grid */}
      <section className="py-20 md:py-28">
        <div ref={gridRef} className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((s, i) => {
              const isWide = i === 0 || i === 3;
              return (
                <div
                  key={i}
                  className={`relative rounded-2xl p-8 overflow-hidden group ${isWide ? 'md:col-span-2 lg:col-span-2' : ''}`}
                  style={{
                    background: i % 2 === 0 ? `${theme.primary}06` : `${theme.secondary}05`,
                    border: `1px solid ${theme.border}`,
                    opacity: gridVisible ? 1 : 0,
                    transform: gridVisible ? 'translateY(0)' : 'translateY(30px)',
                    transition: `all 0.6s ${ease} ${i * 100}ms`,
                  }}
                >
                  <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-[80px] opacity-0 group-hover:opacity-20 transition-opacity duration-500" style={{ background: theme.primary }} />
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: `${theme.primary}12`, color: theme.primary }}>{s.icon}</div>
                    <h3 className="text-xl font-bold mb-2" style={{ color: theme.text }}>{s.title}</h3>
                    <p className="text-base leading-relaxed" style={{ color: theme.textMuted }}>{s.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Process Timeline */}
      <section className="py-20 md:py-28" style={{ background: theme.bgAlt }}>
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ color: theme.text }}>How We Work</h2>
          <p className="text-lg text-center mb-16 max-w-xl mx-auto" style={{ color: theme.textMuted }}>A proven four-phase framework that turns insight into impact.</p>
          <div ref={timelineRef} className="relative max-w-2xl mx-auto">
            <div className="absolute left-8 top-0 bottom-0 w-px" style={{ background: `${theme.border}` }} />
            {steps.map((step, i) => (
              <div
                key={i}
                className="relative flex gap-6 mb-14 last:mb-0"
                style={{ opacity: timelineVisible ? 1 : 0, transform: timelineVisible ? 'translateX(0)' : 'translateX(-20px)', transition: `all 0.6s ${ease} ${i * 150}ms` }}
              >
                <div className="relative z-10 w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-lg text-white shadow-lg" style={{ background: theme.primary }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="pt-3">
                  <h3 className="text-xl font-bold mb-2" style={{ color: theme.text }}>{step.title}</h3>
                  <p className="text-base leading-relaxed" style={{ color: theme.textMuted }}>{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ color: theme.text }}>Why Choose Us</h2>
          <p className="text-lg text-center mb-14 max-w-xl mx-auto" style={{ color: theme.textMuted }}>What sets us apart from the rest.</p>
          <div ref={diffRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {differentiators.map((d, i) => (
              <div
                key={i}
                className="rounded-2xl p-8 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300"
                style={{
                  background: theme.cardBg,
                  border: `1px solid ${theme.border}`,
                  opacity: diffVisible ? 1 : 0,
                  transform: diffVisible ? 'translateY(0)' : 'translateY(24px)',
                  transition: `all 0.6s ${ease} ${i * 120}ms`,
                }}
              >
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-5" style={{ background: `${theme.primary}10`, color: theme.primary }}>{d.icon}</div>
                <h3 className="text-lg font-bold mb-2" style={{ color: theme.text }}>{d.title}</h3>
                <p className="text-base leading-relaxed" style={{ color: theme.textMuted }}>{d.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20 md:py-28" style={{ background: theme.bgAlt }}>
        <div ref={testRef} className="max-w-3xl mx-auto px-6 text-center" style={{ opacity: testVisible ? 1 : 0, transform: testVisible ? 'translateY(0)' : 'translateY(20px)', transition: `all 0.7s ${ease}` }}>
          <div className="text-6xl font-serif leading-none mb-6" style={{ color: `${theme.primary}25` }}>"</div>
          <p className="text-xl md:text-2xl leading-relaxed mb-8" style={{ color: theme.text }}>
            They didn't just give us a strategy deck — they rolled up their sleeves and helped us execute. Revenue grew 140% in the first year.
          </p>
          <div className="flex justify-center gap-1 mb-4">
            {[1,2,3,4,5].map(s => <Star key={s} size={20} fill={theme.primary} style={{ color: theme.primary }} />)}
          </div>
          <p className="font-bold" style={{ color: theme.text }}>Sarah Mitchell</p>
          <p className="text-sm" style={{ color: theme.textMuted }}>CEO, Apex Dynamics</p>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary}dd)` }} />
        <div className="absolute inset-0">
          <div className="absolute w-[400px] h-[400px] rounded-full blur-[100px] opacity-20" style={{ background: '#fff', top: '-20%', right: '10%' }} />
          <div className="absolute w-[300px] h-[300px] rounded-full blur-[80px] opacity-15" style={{ background: '#fff', bottom: '-10%', left: '20%' }} />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">Ready to Get Started?</h2>
          <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">Let's discuss how we can help your business reach its full potential.</p>
          <button data-vibey-link="/contact" className="px-10 py-4 rounded-xl font-bold text-lg bg-white shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer" style={{ color: theme.primary }}>
            Contact Us <ArrowRight size={20} className="inline ml-2" />
          </button>
        </div>
      </section>
    </div>
  );
};

render(<ServicesPage />);
```
$res_references_examples_business_services_md$,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id)
VALUES (
  'vibey',
  'website-builder',
  'references/examples/business/contact.md',
  $res_references_examples_business_contact_md$# Business Contact Page Example

Full TSX source for a corporate consulting firm's contact page. Sections: page header, two-column layout with `data-vibey-capture` form and info cards, FAQ accordion with smooth expand/collapse.

## Source Code

```tsx
const { useState, useEffect, useRef } = React;
const { Mail, Phone, MapPin, Clock, Plus, Send, ChevronDown } = lucide;

const theme = {
  primary: '#2563eb',
  secondary: '#7c3aed',
  bg: '#ffffff',
  bgAlt: '#f8fafc',
  text: '#0f172a',
  textMuted: '#64748b',
  border: '#e2e8f0',
  cardBg: '#ffffff',
};

const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';

const useReveal = (threshold = 0.15) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
};

const contactInfo = [
  { icon: <Mail size={22} />, label: 'Email', value: 'hello@acmeconsulting.com' },
  { icon: <Phone size={22} />, label: 'Phone', value: '+1 (555) 234-5678' },
  { icon: <MapPin size={22} />, label: 'Location', value: '350 Fifth Avenue, Suite 4200\nNew York, NY 10118' },
  { icon: <Clock size={22} />, label: 'Hours', value: 'Mon – Fri: 9 AM – 6 PM EST' },
];

const faqs = [
  { question: 'How long does a typical engagement last?', answer: 'Most engagements run 3–6 months depending on scope. We start with a focused discovery phase and build a timeline around your goals — no unnecessary padding.' },
  { question: 'What industries do you specialize in?', answer: 'We work across technology, healthcare, financial services, and consumer goods. Our frameworks are industry-agnostic, but our consultants bring deep vertical expertise to every project.' },
  { question: 'How is pricing structured?', answer: 'We offer project-based and retainer models. After the discovery call we provide a transparent proposal with fixed pricing — no surprise invoices.' },
  { question: 'Can you work with remote teams?', answer: 'Absolutely. Over half our engagements are fully remote. We use async workflows, shared dashboards, and weekly syncs to keep alignment tight regardless of time zones.' },
  { question: 'What happens after I submit this form?', answer: 'You\'ll receive a confirmation email within minutes. A senior consultant will follow up within 24 hours to schedule a free 30-minute discovery call.' },
];

const serviceOptions = ['Business Strategy', 'Financial Advisory', 'Organizational Development', 'Market Positioning', 'Operational Excellence', 'Not Sure Yet'];

const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '12px',
  border: `1px solid ${theme.border}`,
  background: theme.bg,
  color: theme.text,
  fontSize: '15px',
  outline: 'none',
  transition: `border-color 0.2s ease`,
};

const ContactPage = () => {
  const [headerRef, headerVisible] = useReveal();
  const [formRef, formVisible] = useReveal(0.1);
  const [faqRef, faqVisible] = useReveal(0.1);
  const [openFaq, setOpenFaq] = useState(null);
  const [focused, setFocused] = useState(null);

  return (
    <div style={{ background: theme.bg }}>
      {/* Page Header */}
      <section ref={headerRef} className="py-20 md:py-28" style={{ background: `linear-gradient(180deg, ${theme.bgAlt} 0%, ${theme.bg} 100%)` }}>
        <div className="max-w-7xl mx-auto px-6 text-center" style={{ opacity: headerVisible ? 1 : 0, transform: headerVisible ? 'translateY(0)' : 'translateY(24px)', transition: `all 0.7s ${ease}` }}>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4" style={{ color: theme.text }}>Let's Talk</h2>
          <p className="text-lg md:text-xl max-w-xl mx-auto" style={{ color: theme.textMuted }}>
            We typically respond within 24 hours. No pressure, no spam — just a real conversation about your goals.
          </p>
        </div>
      </section>

      {/* Form + Contact Info */}
      <section className="py-20 md:py-28">
        <div ref={formRef} className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">
          {/* Left — Form */}
          <div className="lg:col-span-3" style={{ opacity: formVisible ? 1 : 0, transform: formVisible ? 'translateY(0)' : 'translateY(24px)', transition: `all 0.6s ${ease}` }}>
            <h3 className="text-2xl font-bold mb-6" style={{ color: theme.text }}>Send Us a Message</h3>
            <form data-vibey-capture className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: theme.text }}>Name *</label>
                  <input name="name" type="text" required placeholder="Jane Smith" style={{ ...inputStyle, borderColor: focused === 'name' ? theme.primary : theme.border }} onFocus={() => setFocused('name')} onBlur={() => setFocused(null)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: theme.text }}>Email *</label>
                  <input name="email" type="email" required placeholder="jane@company.com" style={{ ...inputStyle, borderColor: focused === 'email' ? theme.primary : theme.border }} onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: theme.text }}>Phone <span style={{ color: theme.textMuted }}>(optional)</span></label>
                  <input name="phone" type="tel" placeholder="+1 (555) 000-0000" style={{ ...inputStyle, borderColor: focused === 'phone' ? theme.primary : theme.border }} onFocus={() => setFocused('phone')} onBlur={() => setFocused(null)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: theme.text }}>Service Interest</label>
                  <select name="service" style={{ ...inputStyle, borderColor: focused === 'service' ? theme.primary : theme.border, appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }} onFocus={() => setFocused('service')} onBlur={() => setFocused(null)}>
                    <option value="">Select a service…</option>
                    {serviceOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: theme.text }}>Message *</label>
                <textarea name="message" rows={5} required placeholder="Tell us about your project or challenge…" style={{ ...inputStyle, resize: 'none', borderColor: focused === 'message' ? theme.primary : theme.border }} onFocus={() => setFocused('message')} onBlur={() => setFocused(null)} />
              </div>
              <button type="submit" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer" style={{ background: theme.primary }}>
                <Send size={18} /> Send Message
              </button>
            </form>
          </div>

          {/* Right — Contact Info Cards */}
          <div className="lg:col-span-2 space-y-4" style={{ opacity: formVisible ? 1 : 0, transform: formVisible ? 'translateY(0)' : 'translateY(24px)', transition: `all 0.6s ${ease} 0.15s` }}>
            <h3 className="text-2xl font-bold mb-6" style={{ color: theme.text }}>Contact Info</h3>
            {contactInfo.map((info, i) => (
              <div
                key={i}
                className="flex items-start gap-4 rounded-xl p-5 hover:shadow-md transition-all duration-300"
                style={{ background: theme.bgAlt, border: `1px solid ${theme.border}` }}
              >
                <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${theme.primary}10`, color: theme.primary }}>
                  {info.icon}
                </div>
                <div>
                  <p className="text-sm font-medium mb-0.5" style={{ color: theme.textMuted }}>{info.label}</p>
                  <p className="text-base font-semibold whitespace-pre-line" style={{ color: theme.text }}>{info.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-20 md:py-28" style={{ background: theme.bgAlt }}>
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ color: theme.text }}>Frequently Asked Questions</h2>
          <p className="text-lg text-center mb-14 max-w-xl mx-auto" style={{ color: theme.textMuted }}>Everything you need to know before reaching out.</p>
          <div ref={faqRef} className="max-w-3xl mx-auto space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl overflow-hidden transition-all duration-300"
                style={{
                  background: theme.cardBg,
                  border: `1px solid ${openFaq === i ? theme.primary + '30' : theme.border}`,
                  opacity: faqVisible ? 1 : 0,
                  transform: faqVisible ? 'translateY(0)' : 'translateY(16px)',
                  transition: `opacity 0.5s ${ease} ${i * 80}ms, transform 0.5s ${ease} ${i * 80}ms, border-color 0.3s ease`,
                }}
              >
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between px-6 py-5 text-left cursor-pointer">
                  <span className="font-semibold pr-4" style={{ color: theme.text }}>{faq.question}</span>
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: openFaq === i ? `${theme.primary}15` : `${theme.border}40`, transition: `all 0.3s ${ease}`, transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0)' }}>
                    <Plus size={18} style={{ color: openFaq === i ? theme.primary : theme.textMuted }} />
                  </div>
                </button>
                <div style={{ maxHeight: openFaq === i ? '300px' : '0', overflow: 'hidden', transition: `max-height 0.35s ${ease}` }}>
                  <p className="px-6 pb-5 leading-relaxed" style={{ color: theme.textMuted }}>{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

render(<ContactPage />);
```
$res_references_examples_business_contact_md$,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id)
VALUES (
  'vibey',
  'website-builder',
  'references/examples/saas/home.md',
  $res_references_examples_saas_home_md$# SaaS Home Page Example

Full TSX source for a dark-themed SaaS/startup home page with gradient text hero, floating code preview, social proof, feature grid, animated metrics, pricing tiers, testimonials, and email capture CTA.

## Source Code

```tsx
const theme = {
  bg: '#0A0A0F',
  bgCard: '#12121A',
  bgCardHover: '#1A1A25',
  border: '#1E1E2E',
  borderGlow: '#6C5CE7',
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  accent: '#00D2FF',
  text: '#E8E8ED',
  textMuted: '#8888A0',
  textDim: '#55556A',
  white: '#FFFFFF',
  gradientPrimary: 'linear-gradient(135deg, #6C5CE7 0%, #00D2FF 100%)',
  gradientText: 'linear-gradient(135deg, #FFFFFF 0%, #A29BFE 50%, #00D2FF 100%)',
  gradientCard: 'linear-gradient(180deg, rgba(108,92,231,0.08) 0%, rgba(0,210,255,0.04) 100%)',
  gradientCTA: 'linear-gradient(135deg, #6C5CE7 0%, #5A4BD1 50%, #00D2FF 100%)',
  radius: '12px',
  radiusLg: '20px',
  font: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
};

const Section = ({ children, style, ...props }) => (
  <section style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto', ...style }} {...props}>
    {children}
  </section>
);

const GradientText = ({ children, style }) => (
  <span style={{
    background: theme.gradientText,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    ...style,
  }}>{children}</span>
);

const Button = ({ children, variant = 'primary', style, ...props }) => {
  const [hovered, setHovered] = React.useState(false);
  const base = variant === 'primary'
    ? { background: theme.gradientPrimary, color: theme.white, border: 'none' }
    : { background: 'transparent', color: theme.text, border: `1px solid ${theme.border}` };
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...base,
        padding: '14px 32px',
        borderRadius: theme.radius,
        fontSize: 16,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        opacity: hovered ? 0.9 : 1,
        fontFamily: theme.font,
        ...style,
      }}
      {...props}
    >{children}</button>
  );
};

const Counter = ({ end, label, suffix = '' }) => {
  const [count, setCount] = React.useState(0);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0;
        const duration = 2000;
        const step = (ts) => {
          if (!start) start = ts;
          const progress = Math.min((ts - start) / duration, 1);
          setCount(Math.floor(progress * end));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);
  return (
    <div ref={ref} style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 48, fontWeight: 800, color: theme.white, fontFamily: theme.font }}>
        {count.toLocaleString()}{suffix}
      </div>
      <div style={{ fontSize: 14, color: theme.textMuted, marginTop: 8, fontFamily: theme.font }}>{label}</div>
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, desc }) => {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? theme.bgCardHover : theme.bgCard,
        border: `1px solid ${hovered ? theme.borderGlow + '60' : theme.border}`,
        borderRadius: theme.radiusLg,
        padding: 32,
        transition: 'all 0.35s ease',
        boxShadow: hovered ? `0 0 30px ${theme.borderGlow}15` : 'none',
      }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        background: theme.gradientPrimary, display: 'flex',
        alignItems: 'center', justifyContent: 'center', marginBottom: 20,
      }}>
        <Icon size={24} color={theme.white} />
      </div>
      <h3 style={{ fontSize: 20, fontWeight: 700, color: theme.white, margin: '0 0 10px', fontFamily: theme.font }}>{title}</h3>
      <p style={{ fontSize: 15, color: theme.textMuted, lineHeight: 1.6, margin: 0, fontFamily: theme.font }}>{desc}</p>
    </div>
  );
};

const PricingCard = ({ name, price, annual, features, featured }) => {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div style={{
      background: featured ? theme.gradientCard : theme.bgCard,
      border: `1px solid ${featured ? theme.primary + '50' : theme.border}`,
      borderRadius: theme.radiusLg,
      padding: 36,
      position: 'relative',
      transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
      transition: 'all 0.35s ease',
      boxShadow: featured ? `0 20px 60px ${theme.primary}20` : 'none',
      flex: 1,
    }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {featured && (
        <div style={{
          position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
          background: theme.gradientPrimary, color: theme.white, fontSize: 12,
          fontWeight: 700, padding: '6px 20px', borderRadius: 20, fontFamily: theme.font,
        }}>MOST POPULAR</div>
      )}
      <h3 style={{ fontSize: 22, fontWeight: 700, color: theme.white, margin: '0 0 8px', fontFamily: theme.font }}>{name}</h3>
      <div style={{ marginBottom: 24 }}>
        <span style={{ fontSize: 44, fontWeight: 800, color: theme.white, fontFamily: theme.font }}>${annual ? price.annual : price.monthly}</span>
        <span style={{ fontSize: 15, color: theme.textMuted, fontFamily: theme.font }}>/mo</span>
      </div>
      {features.map((f, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <lucide.Check size={16} color={theme.primary} />
          <span style={{ fontSize: 14, color: theme.textMuted, fontFamily: theme.font }}>{f}</span>
        </div>
      ))}
      <Button variant={featured ? 'primary' : 'secondary'} style={{ width: '100%', marginTop: 16 }}>
        Get Started
      </Button>
    </div>
  );
};

function HomePage() {
  const [annual, setAnnual] = React.useState(true);

  const features = [
    { icon: lucide.Zap, title: 'Instant Deploys', desc: 'Push to production in under 10 seconds with zero-downtime deployments.' },
    { icon: lucide.Shield, title: 'Enterprise Security', desc: 'SOC 2 compliant with end-to-end encryption and role-based access.' },
    { icon: lucide.GitBranch, title: 'Git-native Workflow', desc: 'Every branch gets a preview URL. Merge to deploy automatically.' },
    { icon: lucide.BarChart3, title: 'Real-time Analytics', desc: 'Track performance, errors, and usage with built-in dashboards.' },
    { icon: lucide.Puzzle, title: '100+ Integrations', desc: 'Connect your stack — Slack, GitHub, Jira, Datadog, and more.' },
    { icon: lucide.Globe, title: 'Edge Network', desc: '300+ PoPs worldwide. Your app loads fast everywhere, every time.' },
  ];

  const tiers = [
    { name: 'Starter', price: { monthly: 0, annual: 0 }, features: ['5 projects', '1 GB storage', 'Community support', 'Basic analytics'] },
    { name: 'Pro', price: { monthly: 29, annual: 24 }, features: ['Unlimited projects', '50 GB storage', 'Priority support', 'Advanced analytics', 'Custom domains', 'Team collaboration'], featured: true },
    { name: 'Enterprise', price: { monthly: 99, annual: 79 }, features: ['Everything in Pro', '500 GB storage', 'Dedicated support', 'SSO & SAML', 'SLA guarantee', 'Custom integrations'] },
  ];

  const testimonials = [
    { quote: "FlowStack cut our deploy times by 90%. We ship features daily now instead of weekly.", name: 'Sarah Chen', role: 'CTO, NovaTech', avatar: 'SC' },
    { quote: "The developer experience is unmatched. Our team was productive from day one.", name: 'Marcus Rivera', role: 'Lead Engineer, Dataform', avatar: 'MR' },
    { quote: "We migrated 200+ microservices in a weekend. The edge network is insanely fast.", name: 'Aiko Tanaka', role: 'VP Engineering, ScaleAI', avatar: 'AT' },
  ];

  const logos = ['Stripe', 'Vercel', 'Linear', 'Notion', 'Figma'];

  return (
    <div style={{ background: theme.bg, color: theme.text, fontFamily: theme.font, overflow: 'hidden' }}>
      {/* HERO */}
      <Section style={{ paddingTop: 120, paddingBottom: 60, textAlign: 'center', position: 'relative', minHeight: '90vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, -50%)', width: 600, height: 600, background: `radial-gradient(circle, ${theme.primary}15 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <h1 style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 900, lineHeight: 1.05, margin: '0 0 24px', position: 'relative' }}>
          Ship faster with<br /><GradientText>FlowStack</GradientText>
        </h1>
        <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: theme.textMuted, maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.7 }}>
          The modern developer platform for building, deploying, and scaling production applications — without the infrastructure headaches.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button data-vibey-link="/contact">Start Free</Button>
          <Button variant="secondary">
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <lucide.Play size={16} /> Watch Demo
            </span>
          </Button>
        </div>
        {/* Floating code card */}
        <div style={{
          marginTop: 64, background: theme.bgCard, border: `1px solid ${theme.border}`,
          borderRadius: theme.radiusLg, padding: '20px 24px', maxWidth: 520, margin: '64px auto 0',
          textAlign: 'left', position: 'relative',
          boxShadow: `0 40px 80px ${theme.primary}10`,
        }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FEBC2E' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840' }} />
          </div>
          <pre style={{ margin: 0, fontSize: 14, lineHeight: 1.8, overflowX: 'auto' }}>
            <code>
              <span style={{ color: theme.primary }}>import</span>{' '}
              <span style={{ color: theme.accent }}>{'{ deploy }'}</span>{' '}
              <span style={{ color: theme.primary }}>from</span>{' '}
              <span style={{ color: '#E8B86D' }}>'flowstack'</span>;{'\n\n'}
              <span style={{ color: theme.primary }}>await</span>{' '}
              <span style={{ color: theme.accent }}>deploy</span>({'{'}
              {'\n'}{'  '}name: <span style={{ color: '#E8B86D' }}>'my-app'</span>,
              {'\n'}{'  '}region: <span style={{ color: '#E8B86D' }}>'auto'</span>,
              {'\n'}{'  '}scale: <span style={{ color: theme.accent }}>true</span>
              {'\n'}{'}'});
              {'\n\n'}
              <span style={{ color: theme.textDim }}>// → Deployed to 300+ edge locations in 8s</span>
            </code>
          </pre>
        </div>
      </Section>

      {/* SOCIAL PROOF */}
      <div style={{ borderTop: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}`, padding: '40px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: theme.textDim, marginBottom: 28, fontFamily: theme.font }}>TRUSTED BY 10,000+ DEVELOPERS AT</p>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 48, flexWrap: 'wrap' }}>
            {logos.map((name) => (
              <span key={name} style={{ fontSize: 18, fontWeight: 700, color: theme.textDim, letterSpacing: 1, fontFamily: theme.font }}>{name}</span>
            ))}
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <Section>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: theme.white, margin: '0 0 16px' }}>
            Everything you need to <GradientText>ship with confidence</GradientText>
          </h2>
          <p style={{ fontSize: 17, color: theme.textMuted, maxWidth: 520, margin: '0 auto' }}>Built for teams who care about speed, security, and developer experience.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {features.map((f, i) => <FeatureCard key={i} {...f} />)}
        </div>
      </Section>

      {/* METRICS */}
      <div style={{ background: theme.bgCard, borderTop: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}` }}>
        <Section style={{ padding: '64px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 40 }}>
            <Counter end={10000} suffix="+" label="Developers" />
            <Counter end={2} suffix="M+" label="Deploys / Month" />
            <Counter end={99} suffix=".99%" label="Uptime SLA" />
            <Counter end={300} suffix="+" label="Edge Locations" />
          </div>
        </Section>
      </div>

      {/* PRICING */}
      <Section>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: theme.white, margin: '0 0 16px' }}>Simple, transparent pricing</h2>
          <div style={{ display: 'inline-flex', background: theme.bgCard, borderRadius: 30, padding: 4, border: `1px solid ${theme.border}` }}>
            <button onClick={() => setAnnual(false)} style={{ padding: '10px 24px', borderRadius: 26, border: 'none', background: !annual ? theme.primary : 'transparent', color: !annual ? theme.white : theme.textMuted, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: theme.font, transition: 'all 0.2s' }}>Monthly</button>
            <button onClick={() => setAnnual(true)} style={{ padding: '10px 24px', borderRadius: 26, border: 'none', background: annual ? theme.primary : 'transparent', color: annual ? theme.white : theme.textMuted, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: theme.font, transition: 'all 0.2s' }}>Annual <span style={{ fontSize: 11, opacity: 0.8 }}>Save 20%</span></button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {tiers.map((t, i) => <PricingCard key={i} {...t} annual={annual} />)}
        </div>
      </Section>

      {/* TESTIMONIALS */}
      <Section style={{ background: theme.bgCard, borderRadius: theme.radiusLg, margin: '0 24px', maxWidth: 'none', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: theme.white, textAlign: 'center', margin: '0 0 56px' }}>
            Loved by engineering teams
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {testimonials.map((t, i) => (
              <div key={i} style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: theme.radiusLg, padding: 32 }}>
                <p style={{ fontSize: 16, color: theme.text, lineHeight: 1.7, margin: '0 0 24px', fontStyle: 'italic' }}>"{t.quote}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: theme.gradientPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: theme.white }}>{t.avatar}</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: theme.white }}>{t.name}</div>
                    <div style={{ fontSize: 13, color: theme.textMuted }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* CTA */}
      <Section style={{ textAlign: 'center', paddingBottom: 120 }}>
        <div style={{
          background: theme.gradientCTA, borderRadius: theme.radiusLg, padding: 'clamp(40px, 6vw, 80px)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.08) 0%, transparent 60%)', pointerEvents: 'none' }} />
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: theme.white, margin: '0 0 16px', position: 'relative' }}>Start building for free</h2>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.8)', margin: '0 0 36px', position: 'relative' }}>No credit card required. Deploy your first app in under 5 minutes.</p>
          <div style={{ display: 'flex', gap: 0, justifyContent: 'center', maxWidth: 460, margin: '0 auto', position: 'relative' }}>
            <input
              type="email" placeholder="you@company.com"
              style={{
                flex: 1, padding: '16px 20px', borderRadius: `${theme.radius} 0 0 ${theme.radius}`,
                border: '2px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)',
                color: theme.white, fontSize: 15, outline: 'none', fontFamily: theme.font,
                backdropFilter: 'blur(10px)',
              }}
            />
            <button style={{
              padding: '16px 28px', borderRadius: `0 ${theme.radius} ${theme.radius} 0`,
              background: theme.white, color: theme.primary, border: 'none',
              fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: theme.font,
              whiteSpace: 'nowrap',
            }}>Get Started</button>
          </div>
        </div>
      </Section>
    </div>
  );
}

render(<HomePage />);
```
$res_references_examples_saas_home_md$,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id)
VALUES (
  'vibey',
  'website-builder',
  'references/examples/portfolio/home.md',
  $res_references_examples_portfolio_home_md$# Portfolio Home Page Example

Full TSX source for a visual-first, editorial creative agency home page with typographic hero, selected work grid, about strip, expandable services, client logos, and contact CTA.

## Source Code

```tsx
const theme = {
  bg: '#FAFAF8',
  bgDark: '#111111',
  bgCard: '#FFFFFF',
  bgAccent: '#F0EDE6',
  border: '#E5E2DA',
  borderDark: '#2A2A2A',
  primary: '#111111',
  accent: '#C8553D',
  text: '#333333',
  textMuted: '#777770',
  textLight: '#AAAAAA',
  white: '#FFFFFF',
  font: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  fontDisplay: "'Georgia', 'Times New Roman', serif",
  radius: '8px',
  radiusLg: '16px',
};

const Section = ({ children, style, dark, ...props }) => (
  <section style={{
    padding: '100px 24px',
    maxWidth: 1200,
    margin: '0 auto',
    ...(dark ? { background: theme.bgDark, color: theme.white, maxWidth: 'none', padding: '100px 24px' } : {}),
    ...style,
  }} {...props}>
    {dark ? <div style={{ maxWidth: 1200, margin: '0 auto' }}>{children}</div> : children}
  </section>
);

const ProjectCard = ({ title, category, color }) => {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', overflow: 'hidden', borderRadius: theme.radiusLg, cursor: 'pointer' }}
    >
      <div style={{
        aspectRatio: '16/10',
        background: color,
        transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        transform: hovered ? 'scale(1.05)' : 'scale(1)',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: hovered ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)',
        transition: 'background 0.4s ease',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      }}>
        <span style={{
          color: theme.white, fontSize: 13, fontWeight: 600, letterSpacing: 2,
          textTransform: 'uppercase', fontFamily: theme.font,
          opacity: hovered ? 1 : 0, transform: hovered ? 'translateY(0)' : 'translateY(12px)',
          transition: 'all 0.4s ease', marginBottom: 8,
        }}>{category}</span>
        <span style={{
          color: theme.white, fontSize: 28, fontWeight: 300, fontFamily: theme.fontDisplay,
          fontStyle: 'italic',
          opacity: hovered ? 1 : 0, transform: hovered ? 'translateY(0)' : 'translateY(12px)',
          transition: 'all 0.4s ease 0.05s',
        }}>{title}</span>
        <div style={{
          marginTop: 20, display: 'flex', alignItems: 'center', gap: 8,
          opacity: hovered ? 1 : 0, transform: hovered ? 'translateY(0)' : 'translateY(12px)',
          transition: 'all 0.4s ease 0.1s',
        }}>
          <span style={{ color: theme.white, fontSize: 14, fontWeight: 500, fontFamily: theme.font }}>View Project</span>
          <lucide.ArrowRight size={16} color={theme.white} />
        </div>
      </div>
      {/* Resting state label */}
      <div style={{
        position: 'absolute', bottom: 24, left: 24,
        opacity: hovered ? 0 : 1, transition: 'opacity 0.3s ease',
      }}>
        <span style={{ background: theme.white, color: theme.primary, fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 1, fontFamily: theme.font }}>{category}</span>
      </div>
    </div>
  );
};

const ServiceRow = ({ title, desc, detail, index }) => {
  const [expanded, setExpanded] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderBottom: `1px solid ${theme.border}`,
        cursor: 'pointer',
        background: hovered ? theme.bgAccent : 'transparent',
        transition: 'background 0.3s ease',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '28px 0', paddingLeft: 24, paddingRight: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <span style={{ fontSize: 14, color: theme.textLight, fontWeight: 500, fontFamily: theme.font, minWidth: 24 }}>0{index + 1}</span>
          <h3 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 400, fontFamily: theme.fontDisplay, fontStyle: 'italic', margin: 0, color: theme.primary }}>{title}</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontSize: 14, color: theme.textMuted, fontFamily: theme.font, display: 'none' }}>{desc}</span>
          <lucide.ChevronDown
            size={20} color={theme.textMuted}
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s ease' }}
          />
        </div>
      </div>
      <div style={{
        maxHeight: expanded ? 200 : 0, overflow: 'hidden',
        transition: 'max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <div style={{ padding: '0 24px 28px 80px' }}>
          <p style={{ fontSize: 15, color: theme.textMuted, lineHeight: 1.8, margin: '0 0 8px', fontFamily: theme.font, maxWidth: 560 }}>{desc}</p>
          <p style={{ fontSize: 14, color: theme.textLight, lineHeight: 1.7, margin: 0, fontFamily: theme.font, maxWidth: 560 }}>{detail}</p>
        </div>
      </div>
    </div>
  );
};

const ScrollArrow = () => {
  const [bounce, setBounce] = React.useState(false);
  React.useEffect(() => {
    const id = setInterval(() => setBounce(b => !b), 1500);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{
      position: 'absolute', bottom: 48, left: '50%', transform: `translateX(-50%) translateY(${bounce ? '6px' : '0px'})`,
      transition: 'transform 0.6s ease',
    }}>
      <lucide.ChevronDown size={28} color={theme.textLight} />
    </div>
  );
};

function HomePage() {
  const projects = [
    { title: 'Lumina Rebrand', category: 'Branding', color: 'linear-gradient(135deg, #2D2D3A 0%, #4A4A5A 100%)' },
    { title: 'Solstice App', category: 'Digital Product', color: 'linear-gradient(135deg, #C8553D 0%, #E88D7A 100%)' },
    { title: 'Meridian Identity', category: 'Identity', color: 'linear-gradient(135deg, #3A5A4A 0%, #6B8F7A 100%)' },
    { title: 'Onyx Platform', category: 'Web Design', color: 'linear-gradient(135deg, #1A1A2E 0%, #3A3A5E 100%)' },
  ];

  const services = [
    { title: 'Brand Strategy', desc: 'We define your positioning, voice, and visual language to stand apart.', detail: 'Market research, competitive analysis, brand architecture, messaging frameworks, and brand guidelines that last.' },
    { title: 'Digital Design', desc: 'Interfaces that feel effortless and look stunning on every screen.', detail: 'UI/UX design, design systems, responsive layouts, prototyping, and user testing.' },
    { title: 'Web Development', desc: 'Performance-first builds with modern frameworks and clean code.', detail: 'React, Next.js, headless CMS, e-commerce, and custom web applications.' },
    { title: 'Creative Direction', desc: 'Guiding the visual narrative across campaigns and touchpoints.', detail: 'Art direction, photo shoots, video production, motion design, and campaign creative.' },
  ];

  const clients = ['Spotify', 'Airbnb', 'Nike', 'Stripe', 'Dropbox', 'Slack'];

  return (
    <div style={{ background: theme.bg, color: theme.text, fontFamily: theme.font }}>
      {/* HERO — 100vh typographic */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', textAlign: 'center',
        padding: '0 24px', position: 'relative',
      }}>
        <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', color: theme.textLight, marginBottom: 32, fontFamily: theme.font }}>
          STUDIO / SINCE 2012
        </p>
        <h1 style={{
          fontSize: 'clamp(48px, 8vw, 110px)', fontWeight: 300, lineHeight: 1.0,
          fontFamily: theme.fontDisplay, fontStyle: 'italic', margin: '0 0 28px',
          color: theme.primary, maxWidth: 900,
        }}>
          We craft digital experiences
        </h1>
        <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: theme.textMuted, maxWidth: 420, lineHeight: 1.7, margin: 0 }}>
          A design studio specializing in brand, digital product, and creative direction for ambitious companies.
        </p>
        <ScrollArrow />
      </section>

      {/* SELECTED WORK */}
      <Section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: theme.textLight, margin: '0 0 12px' }}>SELECTED WORK</p>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 300, fontFamily: theme.fontDisplay, fontStyle: 'italic', margin: 0, color: theme.primary }}>Projects we're proud of</h2>
          </div>
          <span data-vibey-link="/work" style={{ fontSize: 14, fontWeight: 600, color: theme.accent, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: theme.font }}>
            View All Work <lucide.ArrowRight size={14} />
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
          {projects.map((p, i) => <ProjectCard key={i} {...p} />)}
        </div>
      </Section>

      {/* ABOUT STRIP */}
      <div style={{ borderTop: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}` }}>
        <Section style={{ padding: '80px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 64, alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: theme.textLight, margin: '0 0 16px' }}>ABOUT THE STUDIO</p>
              <p style={{ fontSize: 'clamp(18px, 2.5vw, 22px)', color: theme.text, lineHeight: 1.8, margin: 0, fontFamily: theme.fontDisplay, fontStyle: 'italic' }}>
                We're a small team of designers and engineers obsessed with craft. Every pixel has purpose, every interaction tells a story. We partner with companies who believe design is a competitive advantage.
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 48, flexWrap: 'wrap' }}>
              {[
                { num: '15+', label: 'Years' },
                { num: '200+', label: 'Projects' },
                { num: '12', label: 'Awards' },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 48, fontWeight: 300, fontFamily: theme.fontDisplay, color: theme.primary, lineHeight: 1 }}>{s.num}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: theme.textLight, marginTop: 8 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>

      {/* SERVICES */}
      <Section>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: theme.textLight, margin: '0 0 12px' }}>WHAT WE DO</p>
        <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 300, fontFamily: theme.fontDisplay, fontStyle: 'italic', margin: '0 0 48px', color: theme.primary }}>Our services</h2>
        <div style={{ borderTop: `1px solid ${theme.border}` }}>
          {services.map((s, i) => <ServiceRow key={i} index={i} {...s} />)}
        </div>
      </Section>

      {/* CLIENT LOGOS */}
      <div style={{ borderTop: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}`, padding: '48px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: theme.textLight, margin: '0 0 32px' }}>CLIENTS WE'VE WORKED WITH</p>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 48, flexWrap: 'wrap' }}>
            {clients.map((c) => (
              <span key={c} style={{ fontSize: 16, fontWeight: 600, color: theme.textLight, letterSpacing: 1, fontFamily: theme.font }}>{c}</span>
            ))}
          </div>
        </div>
      </div>

      {/* CONTACT CTA */}
      <Section style={{ textAlign: 'center', paddingTop: 120, paddingBottom: 120 }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: theme.textLight, margin: '0 0 24px' }}>LET'S TALK</p>
        <h2 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 300, fontFamily: theme.fontDisplay, fontStyle: 'italic', margin: '0 0 40px', color: theme.primary, lineHeight: 1.1 }}>
          Have a project<br />in mind?
        </h2>
        <div
          data-vibey-link="/contact"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            background: theme.primary, color: theme.white,
            padding: '18px 40px', borderRadius: 40, fontSize: 16,
            fontWeight: 600, cursor: 'pointer', fontFamily: theme.font,
            transition: 'transform 0.3s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.04)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          Start a Conversation <lucide.ArrowRight size={18} />
        </div>
      </Section>
    </div>
  );
}

render(<HomePage />);
```
$res_references_examples_portfolio_home_md$,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id)
VALUES (
  'vibey',
  'website-builder',
  'references/examples/consultant/home.md',
  $res_references_examples_consultant_home_md$# Consultant Home Page Example

Full TSX source for a warm-toned personal brand / consultant / coach home page with gradient hero, credibility bar, program cards, transformation section, testimonials with metrics, and urgency booking CTA.

## Source Code

```tsx
const theme = {
  bg: '#FBF8F4',
  bgWarm: '#F5EDE3',
  bgDark: '#1C1917',
  bgCard: '#FFFFFF',
  border: '#E8DFD3',
  primary: '#B45309',
  primaryDark: '#92400E',
  primaryLight: '#F59E0B',
  accent: '#D97706',
  text: '#292524',
  textMuted: '#78716C',
  textLight: '#A8A29E',
  white: '#FFFFFF',
  gradientWarm: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 30%, #FBBF24 60%, #F59E0B 100%)',
  gradientHero: 'linear-gradient(160deg, #FBF8F4 0%, #FEF3C7 40%, #FDE68A 100%)',
  gradientAccent: 'linear-gradient(135deg, #B45309 0%, #D97706 100%)',
  font: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  fontDisplay: "'Georgia', 'Times New Roman', serif",
  radius: '12px',
  radiusLg: '20px',
};

const Section = ({ children, style, ...props }) => (
  <section style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto', ...style }} {...props}>
    {children}
  </section>
);

const Button = ({ children, variant = 'primary', style, ...props }) => {
  const [hovered, setHovered] = React.useState(false);
  const styles = variant === 'primary'
    ? { background: theme.gradientAccent, color: theme.white, border: 'none' }
    : { background: 'transparent', color: theme.primary, border: `2px solid ${theme.primary}` };
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...styles, padding: '16px 36px', borderRadius: 40, fontSize: 16,
        fontWeight: 700, cursor: 'pointer', fontFamily: theme.font,
        transition: 'all 0.3s ease',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered && variant === 'primary' ? '0 12px 32px rgba(180,83,9,0.25)' : 'none',
        ...style,
      }}
      {...props}
    >{children}</button>
  );
};

const ProgramCard = ({ icon: Icon, title, desc, price, cta }) => {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: theme.bgCard,
        border: `1px solid ${hovered ? theme.primary + '40' : theme.border}`,
        borderRadius: theme.radiusLg,
        padding: 36,
        transition: 'all 0.35s ease',
        boxShadow: hovered ? '0 20px 48px rgba(180,83,9,0.08)' : '0 2px 8px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        flex: 1, minWidth: 260,
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: theme.gradientWarm, display: 'flex',
        alignItems: 'center', justifyContent: 'center', marginBottom: 24,
      }}>
        <Icon size={26} color={theme.primaryDark} />
      </div>
      <h3 style={{ fontSize: 22, fontWeight: 700, color: theme.text, margin: '0 0 12px', fontFamily: theme.font }}>{title}</h3>
      <p style={{ fontSize: 15, color: theme.textMuted, lineHeight: 1.7, margin: '0 0 20px', fontFamily: theme.font, flex: 1 }}>{desc}</p>
      <p style={{ fontSize: 14, color: theme.textLight, margin: '0 0 20px', fontFamily: theme.font }}>{price}</p>
      <Button variant="secondary" style={{ padding: '12px 24px', fontSize: 14, width: '100%' }} data-vibey-link="/services">{cta}</Button>
    </div>
  );
};

const TestimonialCard = ({ quote, name, role, metric }) => (
  <div style={{
    background: theme.bgCard, border: `1px solid ${theme.border}`,
    borderRadius: theme.radiusLg, padding: 32,
  }}>
    {metric && (
      <div style={{
        display: 'inline-block', background: theme.gradientWarm,
        padding: '6px 16px', borderRadius: 20, marginBottom: 16,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: theme.primaryDark, fontFamily: theme.font }}>{metric}</span>
      </div>
    )}
    <p style={{ fontSize: 16, color: theme.text, lineHeight: 1.7, margin: '0 0 24px', fontStyle: 'italic', fontFamily: theme.fontDisplay }}>
      "{quote}"
    </p>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%', background: theme.gradientAccent,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15, fontWeight: 700, color: theme.white,
      }}>{name.split(' ').map(n => n[0]).join('')}</div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: theme.text, fontFamily: theme.font }}>{name}</div>
        <div style={{ fontSize: 13, color: theme.textMuted, fontFamily: theme.font }}>{role}</div>
      </div>
    </div>
  </div>
);

function HomePage() {
  const programs = [
    { icon: lucide.User, title: '1:1 Executive Coaching', desc: 'Personalized coaching for senior leaders ready to break through their ceiling. Weekly sessions, unlimited async support, and a tailored growth framework.', price: 'Starting at $2,500/month', cta: 'Learn More' },
    { icon: lucide.Users, title: 'Group Leadership Program', desc: 'A 12-week intensive for leadership teams. Build alignment, communication, and execution rhythm that lasts long after the program ends.', price: '$8,000 per team', cta: 'See Details' },
    { icon: lucide.BookOpen, title: 'Online Course', desc: 'Self-paced leadership fundamentals — frameworks, exercises, and templates refined over 15 years of working with 500+ leaders.', price: '$497 one-time', cta: 'Explore Course' },
  ];

  const testimonials = [
    { quote: "Within 90 days my leadership team went from constant conflict to our highest revenue quarter ever. This coaching changed everything.", name: 'Rachel Torres', role: 'CEO, ScaleWorks', metric: 'Doubled revenue in 6 months' },
    { quote: "I went from dreading Mondays to genuinely loving the work. The clarity I gained about my leadership style was transformative.", name: 'David Okonkwo', role: 'VP Operations, Meridian', metric: '40% improvement in team retention' },
    { quote: "The group program aligned our entire exec team in ways that 3 years of offsites never could. Worth every penny.", name: 'Priya Sharma', role: 'COO, Nexus Health', metric: 'Team alignment score: 92%' },
  ];

  const press = ['Forbes', 'Harvard Business Review', 'Inc. Magazine', 'Fast Company', 'Entrepreneur'];

  return (
    <div style={{ background: theme.bg, color: theme.text, fontFamily: theme.font }}>
      {/* HERO */}
      <section style={{
        background: theme.gradientHero,
        padding: '100px 24px 80px',
        minHeight: '85vh',
        display: 'flex', alignItems: 'center',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 64, alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: theme.primary, margin: '0 0 20px' }}>
              LEADERSHIP COACHING
            </p>
            <h1 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 800, lineHeight: 1.1, margin: '0 0 24px', color: theme.text }}>
              Helping Leaders Build{' '}
              <span style={{ color: theme.primary, fontFamily: theme.fontDisplay, fontStyle: 'italic', fontWeight: 400 }}>
                Unstoppable Teams
              </span>
            </h1>
            <p style={{ fontSize: 'clamp(16px, 2vw, 19px)', color: theme.textMuted, lineHeight: 1.7, margin: '0 0 36px', maxWidth: 480 }}>
              Executive coaching and leadership programs for founders and senior leaders who want to scale their impact — not just their company.
            </p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <Button data-vibey-link="/contact">Book a Discovery Call</Button>
              <Button variant="secondary" data-vibey-link="/services">See Programs</Button>
            </div>
          </div>
          {/* Headshot placeholder */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{
              width: 'clamp(240px, 28vw, 340px)', height: 'clamp(240px, 28vw, 340px)',
              borderRadius: '50%', background: theme.gradientAccent,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 32px 64px rgba(180,83,9,0.15)',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0%, transparent 60%)' }} />
              <span style={{ fontSize: 'clamp(56px, 7vw, 80px)', fontWeight: 300, color: theme.white, fontFamily: theme.fontDisplay, fontStyle: 'italic', position: 'relative' }}>JM</span>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', position: 'relative', fontFamily: theme.font }}>Jessica Morgan</span>
            </div>
          </div>
        </div>
      </section>

      {/* CREDIBILITY BAR */}
      <div style={{ borderBottom: `1px solid ${theme.border}`, padding: '36px 24px', background: theme.bgCard }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: theme.textLight, margin: '0 0 24px' }}>AS FEATURED IN</p>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 40, flexWrap: 'wrap' }}>
            {press.map((p) => (
              <span key={p} style={{ fontSize: 15, fontWeight: 600, color: theme.textLight, fontFamily: theme.fontDisplay, fontStyle: 'italic' }}>{p}</span>
            ))}
          </div>
        </div>
      </div>

      {/* PROGRAMS */}
      <Section>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: theme.primary, margin: '0 0 12px' }}>PROGRAMS</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: theme.text, margin: '0 0 16px' }}>
            Choose your path to growth
          </h2>
          <p style={{ fontSize: 17, color: theme.textMuted, maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
            Every leader's journey is different. Find the program that fits where you are right now.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {programs.map((p, i) => <ProgramCard key={i} {...p} />)}
        </div>
      </Section>

      {/* TRANSFORMATION */}
      <div style={{ background: theme.bgWarm, borderTop: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}` }}>
        <Section style={{ padding: '80px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: theme.text, margin: '0 0 16px' }}>The transformation</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 40, alignItems: 'start' }}>
            {/* Before */}
            <div style={{ background: theme.bgCard, borderRadius: theme.radiusLg, padding: 36, border: `1px solid ${theme.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <lucide.X size={18} color="#DC2626" />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: theme.text, margin: 0 }}>Where you are now</h3>
              </div>
              {[
                'Overwhelmed by decisions nobody else can make',
                'Team depends on you for every answer',
                'Growth has stalled despite working harder',
                'Conflict avoidance creating hidden dysfunction',
                'No time to think strategically',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
                  <lucide.Minus size={16} color={theme.textLight} style={{ marginTop: 3, flexShrink: 0 }} />
                  <span style={{ fontSize: 15, color: theme.textMuted, lineHeight: 1.6 }}>{item}</span>
                </div>
              ))}
            </div>
            {/* After */}
            <div style={{ background: theme.bgCard, borderRadius: theme.radiusLg, padding: 36, border: `2px solid ${theme.primary}30`, boxShadow: `0 12px 32px ${theme.primary}08` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <lucide.Check size={18} color="#059669" />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: theme.text, margin: 0 }}>Where you'll be</h3>
              </div>
              {[
                'Team makes great decisions without you',
                'Clear framework for delegation and trust',
                'Revenue growing while you work fewer hours',
                'Healthy conflict that drives innovation',
                '50% of calendar freed for strategic thinking',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
                  <lucide.Check size={16} color="#059669" style={{ marginTop: 3, flexShrink: 0 }} />
                  <span style={{ fontSize: 15, color: theme.text, lineHeight: 1.6 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>

      {/* TESTIMONIALS */}
      <Section>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: theme.primary, margin: '0 0 12px' }}>CLIENT STORIES</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: theme.text, margin: 0 }}>Real results from real leaders</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {testimonials.map((t, i) => <TestimonialCard key={i} {...t} />)}
        </div>
      </Section>

      {/* BOOKING CTA */}
      <div style={{ background: theme.bgDark }}>
        <Section style={{ textAlign: 'center', padding: '100px 24px' }}>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, color: theme.white, margin: '0 0 20px', lineHeight: 1.1 }}>
            Ready to Start Your Transformation?
          </h2>
          <p style={{ fontSize: 18, color: '#A8A29E', margin: '0 0 12px', lineHeight: 1.7, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
            Book a free 30-minute discovery call. No pressure, no pitch — just an honest conversation about where you are and where you want to be.
          </p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 20, padding: '8px 20px', marginBottom: 36,
          }}>
            <lucide.Clock size={14} color={theme.primaryLight} />
            <span style={{ fontSize: 14, fontWeight: 600, color: theme.primaryLight, fontFamily: theme.font }}>
              Only 3 spots available this month
            </span>
          </div>
          <br />
          <Button data-vibey-link="/contact" style={{ marginTop: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              Book Your Free Call <lucide.ArrowRight size={18} />
            </span>
          </Button>
        </Section>
      </div>
    </div>
  );
}

render(<HomePage />);
```
$res_references_examples_consultant_home_md$,
  NULL
);
