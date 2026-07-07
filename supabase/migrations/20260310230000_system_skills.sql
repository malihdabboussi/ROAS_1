-- =============================================================================
-- System Skills Migration
-- =============================================================================
-- Converts Vibey core skills from per-user duplicates (284 rows) to system-level
-- singleton rows (user_id IS NULL). All Docker agents read from these system rows.
-- Users can add NEW custom skills but cannot override system skills.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Phase 1: Schema changes on agent_skills
-- ---------------------------------------------------------------------------

-- Allow NULL user_id for system skills
ALTER TABLE agent_skills ALTER COLUMN user_id DROP NOT NULL;

-- Drop and recreate FK to allow NULL
ALTER TABLE agent_skills DROP CONSTRAINT agent_skills_user_id_fkey;
ALTER TABLE agent_skills ADD CONSTRAINT agent_skills_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Replace the single unique constraint with two partial indexes
ALTER TABLE agent_skills DROP CONSTRAINT agent_skills_user_id_agent_key_skill_key_key;
CREATE UNIQUE INDEX agent_skills_system_unique
  ON agent_skills (agent_key, skill_key) WHERE user_id IS NULL;
CREATE UNIQUE INDEX agent_skills_user_unique
  ON agent_skills (user_id, agent_key, skill_key) WHERE user_id IS NOT NULL;

-- RLS: all authenticated users can read system skills
CREATE POLICY agent_skills_read_system ON agent_skills FOR SELECT
  USING (user_id IS NULL);

-- ---------------------------------------------------------------------------
-- Phase 1b: Schema changes on agent_skill_resources
-- ---------------------------------------------------------------------------

ALTER TABLE agent_skill_resources ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE agent_skill_resources DROP CONSTRAINT agent_skill_resources_user_id_fkey;
ALTER TABLE agent_skill_resources ADD CONSTRAINT agent_skill_resources_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE agent_skill_resources DROP CONSTRAINT agent_skill_resources_user_id_agent_key_skill_key_file_path_key;
CREATE UNIQUE INDEX agent_skill_resources_system_unique
  ON agent_skill_resources (agent_key, skill_key, file_path) WHERE user_id IS NULL;
CREATE UNIQUE INDEX agent_skill_resources_user_unique
  ON agent_skill_resources (user_id, agent_key, skill_key, file_path) WHERE user_id IS NOT NULL;

CREATE POLICY agent_skill_resources_read_system ON agent_skill_resources FOR SELECT
  USING (user_id IS NULL);

-- ---------------------------------------------------------------------------
-- Phase 2: Insert system rows for all vibey skills
-- ---------------------------------------------------------------------------
-- Uses content from the most recently updated per-user row for each skill.
-- Strips embedded YAML frontmatter from markdown_content where present
-- (the sync service adds frontmatter from DB columns, so embedded frontmatter
-- would cause duplication).
-- ---------------------------------------------------------------------------

INSERT INTO agent_skills (user_id, agent_key, skill_key, name, description, markdown_content, is_enabled)
SELECT
  NULL,
  'vibey',
  t.skill_key,
  t.name,
  t.description,
  -- Strip leading YAML frontmatter if present (---\n...\n---\n pattern, possibly repeated)
  regexp_replace(
    src.markdown_content,
    '^(---\n([^-]|-[^-]|--[^-])*---\n+)+',
    ''
  ),
  true
FROM (VALUES
  ('ad-builder',
   'Ad Builder',
   'Generate and save Meta ad creatives with TSX-first visual design and full campaign structure. Use this skill for any Facebook or Instagram advertising — ad creative design, campaign setup, ad set configuration, audience targeting, A/B testing, budget allocation, or ad copy writing. Triggers whenever the user mentions ads, advertising, Meta, Facebook ads, Instagram ads, paid social, or wants to promote something.'),

  ('avatar-builder',
   'Avatar Builder',
   'Build deep psychological buyer personas, customer avatars, and ideal customer profiles. Use this skill whenever the user mentions target audience, buyer persona, ICP, ideal customer, pain points, customer psychology, audience research, who they sell to, or wants to understand their buyer better — even if they do not explicitly say avatar or persona.'),

  ('brain-memory',
   'Brain Memory',
   'Save and recall meaningful knowledge about the user to their Brain for long-term relationship building. Use this proactively whenever the user shares business facts, personal preferences, strategic decisions, lessons learned, or frameworks they follow — without being asked. The Brain is what separates you from a generic chatbot.'),

  ('email-sequence-builder',
   'Email Sequence Builder',
   'Create production-ready email sequences and automated nurture campaigns. Use this skill for welcome series, nurture sequences, launch sequences, re-engagement campaigns, post-purchase flows, drip campaigns, or any automated email series — even if the user just says write some emails or set up email automation.'),

  ('funnel-builder',
   'Funnel Builder',
   'Build high-converting landing pages, sales funnels, and any conversion-focused web pages with premium visual quality. Use this skill for any single-page creation — opt-in pages, sales pages, event pages, webinar pages, checkout pages, VSL pages, thank-you pages, or single landing pages. Triggers whenever the user wants to create or edit any web page, even if they just say page or landing page.'),

  ('integrations',
   'Integrations',
   'Connect and manage third-party service integrations. Use this skill when the user wants to connect external services, check available integrations, or perform actions through connected platforms like Shopify, Instagram, GitHub, Google Drive, Stripe, or email providers.'),

  ('lead-magnet-builder',
   'Lead Magnet Builder',
   'Create premium downloadable lead magnets and gated content as interactive React components. Use this skill for PDF guides, checklists, cheat sheets, workbooks, case studies, toolkits, ebooks, freebies, or any opt-in incentive the user wants to offer their audience — even if they just say create something to capture emails or make a freebie.'),

  ('meta-publisher',
   'Meta Publisher',
   'Publish existing ad creatives to Meta (Facebook and Instagram) using interactive clarification cards for account, page, and campaign configuration. Use this skill when the user wants to publish, launch, or go live with an ad on Meta — including selecting ad accounts, Facebook pages, Instagram accounts, campaign objectives, and budgets.'),

  ('offer-builder',
   'Offer Builder',
   'Research and build irresistible business offers using a structured multi-step pipeline. Use this skill whenever the user wants to create, refine, or analyze a business offer, value proposition, pricing strategy, product positioning, or competitive analysis — including market research, power offer statements, buyer personas, ICP analysis, and unique selling mechanisms.'),

  ('pdf-builder',
   'PDF Builder',
   'Create branded PDF reports and deliverables using the active campaign theme. Use this skill when the user wants a downloadable PDF document — branded reports, summaries, proposals, or any formatted document that should look professional and match their brand identity.'),

  ('social-content-builder',
   'Social Content Builder',
   'Create organic social media content for LinkedIn and Instagram with TSX-first visual design. Use this skill when the user wants to create social media posts, carousels, visual content cards, or any organic social content — not paid ads. Triggers for requests about social media content, LinkedIn posts, Instagram posts, or content creation.'),

  ('social-publisher',
   'Social Publisher',
   'Publish organic social content to LinkedIn and Instagram via connected platform integrations. Use this skill when the user wants to post, schedule, or publish social content to their connected social accounts. Requires an active integration connection.'),

  ('theme-builder',
   'Theme Builder',
   'Define brand identity including colors, fonts, and voice with industry-matched design intelligence. Use this skill when the user mentions branding, brand identity, color palette, typography, visual identity, brand voice, look and feel, or wants consistent styling across their assets — even if they just say make it look professional or match my brand.'),

  ('vibey-api',
   'Vibey API',
   'Save and manage artifacts in the Vibey database — the only persistence layer for offers, funnels, sequences, lead magnets, ads, themes, avatars, and documents. Use this skill for every data operation: creating, reading, updating, and listing campaign artifacts.'),

  ('website-builder',
   'Website Builder',
   'Build multi-page websites with shared navigation, footer, and interconnected pages. Use this skill when the user wants a full website with multiple connected pages — not a single landing page or funnel. Triggers for requests like build my website, create a business site, make a portfolio site, or any multi-page web presence.')
) AS t(skill_key, name, description)
JOIN LATERAL (
  SELECT markdown_content
  FROM agent_skills existing
  WHERE existing.agent_key = 'vibey'
    AND existing.skill_key = t.skill_key
    AND existing.user_id IS NOT NULL
  ORDER BY existing.updated_at DESC
  LIMIT 1
) src ON true;

-- ---------------------------------------------------------------------------
-- Phase 2b: Delete all per-user vibey skill duplicates
-- ---------------------------------------------------------------------------

DELETE FROM agent_skills
WHERE agent_key = 'vibey'
  AND user_id IS NOT NULL
  AND skill_key IN (
    'ad-builder', 'avatar-builder', 'brain-memory', 'email-sequence-builder',
    'funnel-builder', 'integrations', 'lead-magnet-builder', 'meta-publisher',
    'offer-builder', 'pdf-builder', 'social-content-builder', 'social-publisher',
    'theme-builder', 'vibey-api', 'website-builder'
  );

-- Also clean up any per-user resources for these skills (currently 0 rows but future-proof)
DELETE FROM agent_skill_resources
WHERE agent_key = 'vibey'
  AND user_id IS NOT NULL
  AND skill_key IN (
    'ad-builder', 'avatar-builder', 'brain-memory', 'email-sequence-builder',
    'funnel-builder', 'integrations', 'lead-magnet-builder', 'meta-publisher',
    'offer-builder', 'pdf-builder', 'social-content-builder', 'social-publisher',
    'theme-builder', 'vibey-api', 'website-builder'
  );
