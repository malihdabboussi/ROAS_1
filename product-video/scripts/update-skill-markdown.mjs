#!/usr/bin/env node
/**
 * Updates skill_library.markdown_content (and description) for the
 * carousel-designer skill to include Type 6: Product UI Showcase.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

function loadEnv(envPath) {
  const text = fs.readFileSync(envPath, 'utf8');
  const out = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const MARKDOWN = `# Carousel Designer

> Design premium Instagram carousels. Six distinct styles, one skill.

## Type Selection

Before building, determine which carousel type fits the content:

| Signal | Type | Why |
|---|---|---|
| Product screenshots, feature demos, before/after | **Type 1: Image-Forward** | Visuals prove the claim |
| Dark mode, Vibey style, provided images | **Type 1: Image-Forward** | Visual-heavy content |
| Competitor analysis, reverse-engineering a visual carousel | **Type 1: Image-Forward** | Studying visual systems |
| "Like @thesagocreator" or "paper style" or "text-only" | **Type 2: Editorial Text** | Direct style reference |
| Thought leadership, manifesto, editorial | **Type 2: Editorial Text** | Copy IS the product |
| Comment-bait CTA, prompt reveal, opinion piece | **Type 2: Editorial Text** | Text-driven engagement |
| Alternating photo/text, cinematic editorial | **Type 2: Editorial Text** | Photo + text rhythm |
| How-to, tips, do-this-not-that, comparison | **Type 3: Comparison** | Educational contrast |
| "$5 vs $500" style, best practices, mistakes to avoid | **Type 3: Comparison** | Split-screen teaching |
| Listicle with visual examples, myth-busting | **Type 3: Comparison** | Pattern-interrupt education |
| Product launch, process walkthrough, tool demo | **Type 4: Showcase Process** | Step-by-step editorial |
| "How we use X", workflow showcase, case study | **Type 4: Showcase Process** | Warm editorial + mockups |
| @mobileeditingclub style, warm cream, UI cards | **Type 4: Showcase Process** | Direct style reference |
| Feature list, "N skills/tools/things", capability showcase | **Type 5: Skill Showcase** | Dark cinematic + terminals |
| "What X can do", AI tool demo, automation showcase | **Type 5: Skill Showcase** | Terminal card format |
| @aifornontechies style, dark warm, monospace cards | **Type 5: Skill Showcase** | Direct style reference |
| "Look at the actual Vibey app" / feature-page screenshot feel | **Type 6: Product UI Showcase** | Uses the real website components 1:1 |
| Launch carousel for a vibey.im feature page, announcing a product section | **Type 6: Product UI Showcase** | Matches the live feature-page hero + showcase blocks |
| Slide must render the app exactly as users see it (brain graph, mission table, org chart, daily digest...) | **Type 6: Product UI Showcase** | Reuses the same TSX that ships in production |

When unclear, ask: "Should this carousel lead with visuals, pure text, a comparison, an editorial process showcase, a dark feature-list format, or a pixel-exact replica of a real Vibey feature page?"

---

## Type 1: Image-Forward Carousel

Dark backgrounds, emerald accents, AI-generated images, glassmorphic cards, floating badges.

Read \`references/type1-design-system.md\`, \`references/type1-image-planning.md\`, \`references/type1-tsx-patterns.md\`, \`references/type1-visual-reference.md\`.

Key: Dark backgrounds (#161616), emerald accent (#34D399), AI-generated images, glassmorphic cards. Canvas: 1080 x 1350px.

---

## Type 2: Editorial Text Carousel

Full-bleed cinematic portrait photography alternating with clean text slides.

Read \`references/type2-editorial-text.md\`.

Key: Alternating image hero + text slides, V icon + category label, massive condensed headlines, serif body text. Canvas: 1080 x 1350px.

---

## Type 3: Comparison / Educational Carousel

Split-screen "wrong vs right" format with bold typography.

Read \`references/type3-comparison-style.md\`. See \`references/type3-*.png\`.

Key: 1080x1440 canvas, split-screen (orange problem top, teal solution bottom), AIDA 10-slide structure, high contrast.

---

## Type 4: Showcase Process Carousel

Warm cream editorial with product photography, UI mockup cards, and handwritten annotations.

Read \`references/type4-showcase-process.md\`. See \`references/type4-*.png\`.

Key: Warm cream #EDE4D5, stacked brand logo, Georgia serif headlines, white UI mockup cards, Caveat handwritten annotations, curved brown arrows, editorial product photography. 5-6 AI images per carousel. Canvas: 1080 x 1350px.

---

## Type 5: Skill Showcase Carousel

Dark cinematic backgrounds with terminal-style mockup cards showcasing individual features/skills.

Read \`references/type5-skill-showcase.md\`. See \`references/type5-*.png\`.

Key: Dark warm brown gradient + golden volumetric light, emoji + two-word headline (white sans + coral serif), macOS terminal card with monospace text, coral accent words, handwritten subheads. Only 2 AI images needed (cover scene + CTA 3D object). Canvas: 1080 x 1350px.

---

## Type 6: Product UI Showcase

> Use the real Vibey website components inside a carousel slide so each slide looks **1:1 with the live product surface** (feature-page heroes, mockup blocks, capability previews).

When to pick Type 6: the user asks for a carousel that mirrors a feature page, wants the exact UI users see on vibey.im, or is launching a specific Vibey surface (brain graph, mission table, org chart, daily digest, dynamic router, etc.). Do **not** pick Type 6 for pure typography / editorial decks — use Type 2 or Type 5 for those.

Read \`references/type6-product-ui.md\` for the overall rules and the full component index. Then open the per-component reference(s) you'll use: \`references/type6-components/<ComponentName>.md\`. Each of those files contains the full source from \`apps/website/src/components/...\` (1 reference file = 1 component).

Key rules:

1. Canvas: 1080 x 1350px (Instagram 4:5), same as Types 1/2/4/5.
2. Copy JSX **verbatim** from the component reference. Do not redraw the markup.
3. Strip \`'use client'\` and Next-specific imports that are not needed inside the slide TSX.
4. Replace any non-Tailwind project class listed under "Non-Tailwind classes referenced" with an inline style before rendering (Tailwind arbitrary values and standard utilities are fine).
5. Replace any asset path (\`/Logos/...\`, \`/images/...\`) with an explicit URL or data-URI. The marketing site serves these from \`public/\`; the carousel renderer does not.
6. Keep animated components (framer-motion, autoplay loops) only if the target is a video/reel. For static carousels, remove the motion layer and render the final frame.
7. Supply real props. \`AgentLibraryCarousel\`, \`MarketingDynamicRouterMockup\`, \`MarketingOrgChartMockup\` etc. need a \`PublicAgentLibraryRow[]\` payload — use the fallback array from \`lib/agent-library-fallback\` (also mirrored in the reference) or pass mock data that matches the shape.
8. Slide layout: typically a small logo / headline strip at the top, the component in the centered band (90% of canvas width), then a footer with handle + dot indicators. Match the carousel-wide visual language already defined in Types 1/4/5 for logo + footer so the set feels consistent.

Component catalog (summary; full list in \`references/type6-product-ui.md\`):

- **Heroes & shells:** \`FeatureHero\`, \`FeatureFloatingMockShell\`, \`FeaturePageLayout\`, \`FunnelHeroStack\`, \`FunnelStackBrowserCard\`.
- **Feature-page building blocks:** \`FeatureShowcase\`, \`CapabilityGrid\`, \`ValuePropGrid\`, \`ComparisonTable\`, \`ProofCarousel\`, \`FAQAccordion\`, \`IntegrationStrip\`, \`IntegrationsHeroMockup\`, \`StandaloneVideoShowcase\`, \`ThreeSteps\`.
- **Marketing mockups (the real app UI):** \`MarketingDailyDigestMockup\`, \`MarketingDynamicRouterMockup\`, \`MarketingOrgChartMockup\`, \`MarketingMissionExecutionMockup\`, \`MarketingMissionActivityTimelineMockup\`, \`MarketingMissionActivityScoreMockup\`, \`MarketingMissionDeliverableStacksMockup\`, \`MarketingMissionDetailModalMockup\`, \`MarketingNorthstarGuardrailMockup\`, \`MarketingHrLibraryMockup\`, \`MarketingSkillLibraryMockup\`, \`MarketingSkillStackMockup\`, \`MarketingSkillsHeroMockup\`, \`MarketingSkillBuilderMockup\`, \`MarketingMemoryStackMockup\`, \`MarketingMemoryInsightMockup\`, \`MarketingBrainGraphMockup\`, \`MarketingBrainGraphBlogBanner\`, \`MarketingAtlasVoiceMockup\`, \`MarketingRawToSignalMockup\`, \`MarketingCapabilitiesShowcaseMockups\`, \`MarketingDelegateStepsMockups\`, \`MarketingRoleEmblem\`, \`AutopilotDepthIllustration\`.
- **Integrations:** \`IntegrationKnowledgeIndexerMockup\`, \`IntegrationPermissionScoperMockup\`, \`IntegrationToolDispatcherMockup\`.
- **Agent library:** \`AgentLibraryCarousel\`, \`LibraryAgentProfileCard\`.
- **Capabilities carousel (feature-pages hero):** \`CapabilitiesCarouselMockup\`, \`CapabilitiesCarouselPreviews\`, and the per-artifact previews (\`FunnelRegisterPagePreview\`, \`SocialPostPreview\`, \`MetaAdsInstagramFeedPreview\`, \`SequenceEmailPreview\`, \`CompetitorReportPreview\`, \`PresentationDeckPreview\`, \`StudioSkillChatPreview\`).
- **Brain viz primitives:** \`ForceGraph\`, \`LegendPanel\`, \`NavControls\` (under \`components/marketing/brain-app\`).
- **Infrastructure hero:** \`MarketingInfrastructureRadar\`.
- **Feature dispatcher:** \`FeatureMockups\` (the shared catalog of \`StudioMockup\`, \`FunnelsMockup\`, etc. keyed by \`mockupKind\`).

If a needed component isn't in the list, open the site source directly at \`apps/website/src/components/...\` and add a new row to \`references/type6-components/<ComponentName>.md\` the same way.

---

## Shared Process

### Step 1: Determine Type
Use the selection table above.

### Step 2: Read the Type Reference
Read ALL reference files for the selected type before building anything.

### Step 3: Plan Images First
For Types 1, 2, 4: plan ALL images before writing TSX.
For Type 5: plan cover scene + CTA object only.
For Type 3: plan pattern-interrupt images.
For Type 6: no AI images required by default — the product component IS the visual.

### Step 4: Build
Follow the process in the type reference.

### Step 5: Save
\`\`\`
vibey_backend({
  action: "create_social_post",
  label: "Building your Instagram carousel",
  data: {
    platform: "instagram",
    post_type: "carousel",
    caption: "...",
    carousel_slides: [ ... ],
    hashtags: [...]
  }
})
\`\`\`

## Editing Existing Slides

Pick the smallest edit level:

### Level 1: Patch
\`\`\`
vibey_backend({ action: "update_social_post", data: { social_post_id: "UUID", carousel_slide_patch: { index: 1, replacements: [{ find: "OLD", replace: "NEW" }] } } })
\`\`\`

### Level 2: Rewrite one slide
\`\`\`
vibey_backend({ action: "update_social_post", data: { social_post_id: "UUID", carousel_slide_update: { index: 2, tsx: "export function SocialCreative..." } } })
\`\`\`

### Level 3: Full array (first-time creation, reordering, adding/removing slides)

Default to Patch. Escalate only when the change requires it.`;

const DESCRIPTION = `Design and produce premium Instagram carousels in multiple styles. Type 1: Image-forward with AI visuals, glassmorphic cards, dark backgrounds. Type 2: Editorial Text with cinematic portrait photography alternating with text slides. Type 3: Comparison/educational with split-screen format. Type 4: Showcase Process with warm cream editorial, product photography, UI mockup cards. Type 5: Skill Showcase with dark cinematic backgrounds, terminal mockup cards, and AI-generated hero images. Type 6: Product UI Showcase that reuses the real Vibey website feature-page components 1:1 inside the carousel slide (heroes, mockups, brain graph, mission tables, org chart, etc.). Use this skill when the user asks to create any Instagram carousel, social media slides, swipeable posts, visual storytelling, or multi-slide content.`;

async function main() {
  const env = loadEnv(path.join(ROOT, 'apps/agent-api/.env'));
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing');
  const supabaseUrl = 'https://qfrvykscoymiwwgysvsr.supabase.co';

  const res = await fetch(
    `${supabaseUrl}/rest/v1/skill_library?skill_key=eq.carousel-designer`,
    {
      method: 'PATCH',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        markdown_content: MARKDOWN,
        description: DESCRIPTION,
        updated_at: new Date().toISOString(),
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Update failed: ${res.status} ${await res.text()}`);
  }
  const [row] = await res.json();
  console.log(`Updated skill_library.carousel-designer: md=${row.markdown_content.length} chars`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
