import type { FeaturePageDefinition } from './types'

export const funnelsFeaturePage: FeaturePageDefinition = {
  slug: 'funnels',
  metaTitle: 'Funnel Builder | ROAS',
  metaDescription:
    'Landing pages from conversation-custom code preview, publish, and iterate without drag-and-drop grids.',
  mockupKind: 'funnels',
  heroBadges: ['Landing pages', 'Lead capture', 'Custom domains', 'Analytics', 'A/B variants'],
  hero: {
    kicker: '',
    title: 'CONVERSATION-FIRST LANDING PAGES',
    subtitle:
      'No component library fatigue. ROAS generates structured pages you preview live, then publish with one click. Iterate by talking, not clicking.',
    primaryCta: { href: '/waitlist', label: 'Join Waitlist' },
    secondaryCta: { href: '/features/studio', label: 'See Studio' },
  },
  comparison: {
    title: 'Why ROAS funnels?',
    subtitle:
      'Traditional builders require you to learn their interface. ROAS lets you describe what you want and ships it.',
    columns: ['ROAS', 'Classic builders'],
    rows: [
      {
        label: 'Creation method',
        cells: ['Describe the outcome; AI drafts layout + copy', 'Drag sections onto a grid'],
      },
      {
        label: 'Underlying tech',
        cells: ['Structured page output you can preview live', 'Opaque proprietary widgets'],
      },
      {
        label: 'Iteration',
        cells: ['Refine copy and structure in the same thread', 'Click each block in the editor'],
      },
      {
        label: 'Speed to first page',
        cells: ['Minutes to a live preview', 'Hours of templating and wiring'],
      },
      {
        label: 'Publishing',
        cells: [
          'One-click publish on ROAS; custom domain + SSL/DNS handled',
          'Publish inside the vendor stack; domain rules vary',
        ],
      },
      {
        label: 'Lead capture',
        cells: ['Forms and opt-ins wired to your workspace', 'Often needs Zapier or manual export'],
      },
    ],
  },
  showcase: {
    title: 'What you actually get',
    subtitle:
      'Every feature below is shipped and working. Describe your offer in Studio, preview the page live, and publish it: all from one conversation.',
    blocks: [
      {
        mockupKind: 'studio',
        title: 'Build from conversation, not from templates',
        features: [
          {
            title: 'Prompt to page',
            description:
              'Tell Pixel your product, audience, and goal. It generates a complete landing page with headline, body, social proof, and CTA: no drag-and-drop editor.',
          },
          {
            title: 'Brand-aware copy',
            description:
              'ROAS reads voice and positioning from The Workspace Brain so the first draft already sounds like your brand.',
          },
          {
            title: 'Live preview in Studio',
            description:
              'See the exact page visitors will land on while ROAS assembles it. Edit by continuing the conversation.',
          },
        ],
      },
      {
        mockupKind: 'funnels',
        title: 'Publish and capture leads: no extra tools',
        features: [
          {
            title: 'One-click publish',
            description:
              'Hit publish in Studio. ROAS handles slug generation, hosting, and theme CSS. Your page is live immediately.',
          },
          {
            title: 'Custom domain',
            description:
              'Connect your own domain from the publish dropdown. SSL certificate and DNS verification are handled automatically.',
          },
          {
            title: 'Built-in lead capture',
            description:
              'Forms and opt-ins on the page feed directly into your workspace lead list: no Zapier, no CSV exports, no middleware.',
          },
        ],
      },
      {
        mockupKind: 'funnels',
        title: 'SEO, analytics, and tracking included',
        features: [
          {
            title: 'SEO meta tags and sitemap',
            description:
              'Every published page ships with title, Open Graph image, dynamic OG route, and an auto-generated sitemap so search engines can index your funnel.',
          },
          {
            title: 'Page view tracking',
            description:
              'Visitor hashes, referrer, and UTM fields are recorded on every page load. Data rolls up to your campaign dashboard.',
          },
          {
            title: 'Meta Pixel support',
            description:
              'Connect your Meta Pixel ID and ROAS injects the tracking script on every published page: no code editing required.',
          },
        ],
      },
    ],
    ctaHref: '/waitlist',
    ctaLabel: 'Start Building',
  },
  valuePropGrid: {
    title: 'How it works under the hood',
    subtitle: 'No black boxes. Here is exactly what powers your funnels.',
    items: [
      {
        title: 'Conversation-driven edits',
        description:
          'Every revision happens in the same Studio thread. Ask Pixel to change copy, layout, or structure: no separate editor.',
      },
      {
        title: 'Custom domains',
        description:
          'Connect your own domain with one click. SSL certificate and DNS verification handled automatically.',
      },
      {
        title: 'Workspace Brain context',
        description:
          'ROAS pulls your brand voice, audience, and positioning from The Workspace Brain so every page matches your brand.',
      },
      {
        title: 'Lead list integration',
        description:
          'Every form submission lands in your workspace lead list with email, name, UTM source, and funnel reference.',
      },
      {
        title: 'Campaign analytics',
        description:
          'Page views, visitor tracking, referrer, and UTM data are recorded automatically and visible in your dashboard.',
      },
      {
        title: 'Blog and content pages',
        description:
          'Publish blog posts tied to your funnel with RSS feed and sitemap: all managed from Studio.',
      },
    ],
  },
  steps: {
    title: 'Go from idea to live page in three steps',
    items: [
      {
        title: 'Prompt',
        description:
          'Describe your funnel idea in plain English. Tell Pixel your offer, audience, and conversion goal.',
      },
      {
        title: 'Build',
        description:
          'ROAS generates the page structure, writes copy, designs the layout, and wires lead capture-automatically.',
      },
      {
        title: 'Launch & grow',
        description:
          'Deploy instantly, track analytics, collect leads, and iterate continuously. Your funnel grows with your business.',
      },
    ],
  },
  proof: {
    title: 'Real funnels built by real teams',
    quotes: [
      {
        quote:
          'We shipped a webinar registration page in 12 minutes. Our previous tool took two days.',
        name: 'Growth lead',
        role: 'EdTech startup',
      },
      {
        quote: 'The AI-generated copy was better than what our freelancer delivered.',
        name: 'Founder',
        role: 'DTC brand',
      },
      {
        quote: 'Custom domain, SSL, analytics-all handled. I just talked about the offer.',
        name: 'Solo operator',
        role: 'Coaching business',
      },
    ],
  },
  faq: {
    title: 'Frequently asked questions',
    items: [
      {
        q: 'What is ROAS Funnel Builder?',
        a: 'A conversational tool that generates complete landing pages from natural language. Describe your offer, and ROAS builds the page with copy, layout, and lead capture-no drag-and-drop.',
      },
      {
        q: 'Do I need coding experience?',
        a: 'No. Describe what you want in your own words. ROAS handles all the technical implementation.',
      },
      {
        q: 'What types of funnels can I build?',
        a: 'Lead gen pages, webinar registrations, waitlists, product launches, multi-step opt-ins, and more.',
      },
      {
        q: 'Do I get the raw code?',
        a: 'Yes. Export your page code at any time for reference or hand it to developers. Hosting runs through ROAS with your custom domain.',
      },
      {
        q: 'Can I split-test pages?',
        a: 'Duplicate a funnel from Studio, change the variant through conversation, and route traffic externally. Deeper native experiments are on the roadmap.',
      },
      {
        q: 'How does SEO work?',
        a: 'ROAS automatically generates meta tags, structured data, semantic HTML, and clean URLs. Your pages are crawlable out of the box.',
      },
      {
        q: 'Can I connect my own domain?',
        a: 'Yes. One-click domain mapping with automatic SSL and DNS configuration.',
      },
      {
        q: 'What about analytics?',
        a: 'Built-in tracking for page views, conversions, and engagement. Data rolls up to your workspace dashboard.',
      },
      {
        q: 'How fast can I ship a page?',
        a: 'Minutes. Describe your offer, approve the preview, and publish. No waiting for design reviews.',
      },
      {
        q: 'How is this different from ClickFunnels?',
        a: 'ClickFunnels centers drag-and-drop editing. ROAS centers conversation-describe what you want, see it built, and iterate by talking.',
      },
    ],
  },
  finalCta: {
    title: 'Ready to build your first funnel?',
    subtitle: 'Stop templating. Start shipping conversion pages from a single conversation.',
    ctaHref: '/waitlist',
    ctaLabel: 'Join Waitlist',
  },
}
