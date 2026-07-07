-- =============================================================================
-- Ecology Sections + Intent-Driven Rewrite for All System Skills
-- =============================================================================
-- Adds Ecology sections to all 15 vibey skills showing how each skill's
-- output connects to other skills in the campaign build order.
-- Rewrites remaining 12 skills with intent-driven style (why-framing).
-- Skills already rewritten (funnel-builder, offer-builder, lead-magnet-builder)
-- get only the ecology section appended.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. offer-builder — Append ecology to existing intent-driven content
-- ---------------------------------------------------------------------------
UPDATE agent_skills
SET markdown_content = markdown_content || E'\n\n---\n\n## Ecology\n\nThe offer is the foundation of the entire campaign. Every other skill depends on its output:\n\n- **avatar-builder** uses offer step 3 (buyer persona) — if the user asks for a standalone persona and an offer already exists, pull from it instead of researching from scratch\n- **theme-builder** uses the offer context to match brand voice to the audience\n- **funnel-builder** uses the power offer statement for headlines, benefits for section content, objections for FAQ sections\n- **email-sequence-builder** uses offer benefits for value emails, objections for nurture emails, and the CTA for conversion emails\n- **lead-magnet-builder** uses the offer topic and avatar pain points to create relevant content\n- **ad-builder** uses the power offer statement and key differentiators for ad copy angles\n\nWithout a completed offer, every downstream skill works blind — generating generic content instead of targeted, research-backed assets.',
    updated_at = NOW()
WHERE skill_key = 'offer-builder' AND agent_key = 'vibey' AND user_id IS NULL;

-- ---------------------------------------------------------------------------
-- 2. funnel-builder — Append ecology
-- ---------------------------------------------------------------------------
UPDATE agent_skills
SET markdown_content = markdown_content || E'\n\n---\n\n## Ecology\n\nFunnels are the conversion layer of the campaign. They sit between traffic sources (ads) and backend systems (email sequences):\n\n- **Depends on:** theme-builder (colors, fonts, voice), offer-builder (headlines, benefits, proof), avatar-builder (pain points, language), ad-builder (traffic destination)\n- **Feeds into:** email-sequence-builder (funnel opt-in triggers welcome/nurture sequences), lead-magnet-builder (the opt-in incentive lives on the funnel page)\n- **Connected to:** meta-publisher (ad destination URLs point to funnel pages), social-content-builder (organic traffic to funnel)\n\nA funnel without an offer produces generic copy. A funnel without a theme looks like a template. A funnel without an email sequence captures leads that go nowhere.',
    updated_at = NOW()
WHERE skill_key = 'funnel-builder' AND agent_key = 'vibey' AND user_id IS NULL;

-- ---------------------------------------------------------------------------
-- 3. lead-magnet-builder — Append ecology
-- ---------------------------------------------------------------------------
UPDATE agent_skills
SET markdown_content = markdown_content || E'\n\n---\n\n## Ecology\n\nThe lead magnet is the opt-in incentive that makes the funnel convert:\n\n- **Depends on:** offer-builder (topic, expertise), avatar-builder (pain points, language level), theme-builder (brand colors, fonts)\n- **Feeds into:** funnel-builder (the lead magnet is what the opt-in page promises), email-sequence-builder (email 1 delivers the lead magnet, subsequent emails build on its content)\n- **Connected to:** ad-builder (ads promote the lead magnet as the hook)\n\nA lead magnet that doesn''t match the offer topic creates a disconnect. A lead magnet without the avatar''s language feels generic. The strongest campaigns have a tight thread from ad hook → lead magnet promise → email sequence value → offer pitch.',
    updated_at = NOW()
WHERE skill_key = 'lead-magnet-builder' AND agent_key = 'vibey' AND user_id IS NULL;

-- ---------------------------------------------------------------------------
-- 4. ad-builder — Intent-driven rewrite + ecology
-- ---------------------------------------------------------------------------
UPDATE agent_skills
SET markdown_content = $$# Ad Builder — TSX First (Meta)

Use this skill when creating ad creatives for Meta (Facebook/Instagram).

## Meta Ads Structure

Meta Ads has 3 levels. Each level controls different things:

### Campaign Level — WHAT you want to achieve

| Objective | When to use | Optimizes for |
|---|---|---|
| OUTCOME_TRAFFIC | Drive visitors to a landing page/funnel | Link clicks, landing page views |
| OUTCOME_LEADS | Collect emails, phone numbers, bookings | Lead form submissions, conversions |
| OUTCOME_SALES | Sell a product or service directly | Purchases, add-to-cart, checkout |
| OUTCOME_AWARENESS | Get the brand in front of new people | Reach, impressions |
| OUTCOME_ENGAGEMENT | Get likes, comments, shares | Post engagement |

**Budget type:**
- ABO (Ad Set Budget) — each ad set has its own budget. Use when testing different audiences.
- CBO (Campaign Budget / Advantage+ Campaign Budget) — Meta distributes budget across ad sets automatically. Use when scaling a winner.
  - When CBO: set daily_budget or lifetime_budget on the campaign, not on individual ad sets.
  - Set bid_strategy: LOWEST_COST_WITHOUT_CAP (default), COST_CAP, LOWEST_COST_WITH_BID_CAP, LOWEST_COST_WITH_MIN_ROAS.

### Ad Set Level — WHO sees it, HOW MUCH you spend

**Advantage+ Audience (AI-optimized):**
Enable by setting targeting.targeting_automation.advantage_audience = 1 in targeting JSON.
Meta AI expands beyond your targeting to find better-performing audiences. Recommend for most users.

**Delivery Estimates:**
After creating ad set with targeting, call get_delivery_estimate to check predicted reach and cost.
Returns: estimated reach range, daily active users, and daily_outcomes_curve with spend/reach/actions predictions.
Share this with the user before publishing.

## Naming Convention

Consistent naming is what makes Meta Ads Manager usable at scale. When a user has 20+ campaigns, clear names are the difference between quick optimization and confusion.

### Campaign Name

```
{Objective}-{Goal}-{Creative Identifier}-{Budget Type}-{Funnel Stage} ({Funnel Name}) - {MM/DD/YYYY}
```

**Example:** `ROAS-Leads-New Graphics-ABO-TOF (Public Webinar) - 05/22/2025`

### Ad Set Name

```
AS{X} - {Targeting Type} - {Targeting Details (optional)}
```

**Example:** `AS1 - Broad Interests - Texas Only`

### Ad Name

```
AD{X} - {Creative Context} - {Creative Type} - {Offer (optional)}
```

**Examples:**
- `AD1 - How to Use C-Finance - Image`
- `AD2 - How to Use C-Finance - Image - 10% Off Offer`

When calling `create_ad_campaign`, `create_ad_set`, and `create_ad`, always set the `name` and `metadata.meta_ad_name` fields using these templates.

## Process

1. Create campaign → ad set → ad (always in this order)
2. Follow the naming convention for all three levels
3. Ask the user about budget — never assume
4. Recommend Advantage+ Audience for most users
5. After creating ad set, call get_delivery_estimate and share predictions
6. Recommend CBO when scaling proven campaigns
7. Create at least 2 ad variations per ad set for testing

---

## Ecology

Ads are the traffic engine of the campaign. They connect the brand's message to the audience and drive them to the funnel:

- **Depends on:** offer-builder (power offer statement for ad copy, key differentiators for angles), avatar-builder (pain points, desires, language for targeting and copy), theme-builder (brand colors for creative consistency)
- **Feeds into:** meta-publisher (the publishing skill that takes ad creatives live on Meta), funnel-builder (ad destination URLs point to funnel pages)
- **Connected to:** email-sequence-builder (ads drive opt-ins that trigger email sequences)

The strongest ads use the exact language from the buyer persona and the power offer statement — not generic marketing copy. When the offer research is solid, ad copy almost writes itself.$$,
    updated_at = NOW()
WHERE skill_key = 'ad-builder' AND agent_key = 'vibey' AND user_id IS NULL;

-- ---------------------------------------------------------------------------
-- 5. avatar-builder — Intent-driven rewrite + ecology
-- ---------------------------------------------------------------------------
UPDATE agent_skills
SET markdown_content = markdown_content || E'\n\n---\n\n## Ecology\n\nThe avatar is the psychological foundation that makes every other asset resonate:\n\n- **Depends on:** offer-builder (if an offer exists, step 3 already contains the buyer persona — use it instead of researching from scratch)\n- **Feeds into:** funnel-builder (pain points become section headlines, transformation becomes the hero promise), email-sequence-builder (persona language drives subject lines and copy voice), lead-magnet-builder (pain points determine content topics), ad-builder (fears and desires become ad hooks), social-content-builder (content themes come from persona interests)\n\nWithout a defined avatar, every skill generates for a generic audience. With one, every piece of copy speaks directly to one person — and that specificity is what converts.',
    updated_at = NOW()
WHERE skill_key = 'avatar-builder' AND agent_key = 'vibey' AND user_id IS NULL;

-- ---------------------------------------------------------------------------
-- 6. email-sequence-builder — Append ecology
-- ---------------------------------------------------------------------------
UPDATE agent_skills
SET markdown_content = markdown_content || E'\n\n---\n\n## Ecology\n\nEmail sequences are the nurture layer that turns leads into customers:\n\n- **Depends on:** offer-builder (benefits, objections, and CTA drive email content), avatar-builder (pain language, desires, and voice), funnel-builder (the opt-in page promise determines what email 1 delivers), lead-magnet-builder (email 1 typically delivers the lead magnet)\n- **Feeds into:** The email sequence is the bridge between the funnel opt-in and the offer pitch. It builds trust, delivers value, and overcomes objections over time.\n- **Connected to:** theme-builder (brand voice carries through email tone)\n\nA sequence disconnected from the offer sounds generic. A sequence that doesn''t reference the lead magnet promise breaks trust immediately. The strongest sequences create a tight narrative arc from ''I just opted in'' to ''I''m ready to buy''.',
    updated_at = NOW()
WHERE skill_key = 'email-sequence-builder' AND agent_key = 'vibey' AND user_id IS NULL;

-- ---------------------------------------------------------------------------
-- 7. theme-builder — Append ecology
-- ---------------------------------------------------------------------------
UPDATE agent_skills
SET markdown_content = markdown_content || E'\n\n---\n\n## Ecology\n\nThe theme is the visual and verbal DNA that every asset inherits:\n\n- **Feeds into:** funnel-builder (page colors, fonts, visual style), website-builder (consistent branding across all pages), lead-magnet-builder (cover design, slide colors, typography), email-sequence-builder (brand voice for copy tone), ad-builder (creative colors and brand consistency), social-content-builder (post visual style), pdf-builder (document branding)\n- **Connected to:** offer-builder (industry context helps match the right visual direction)\n\nWithout a theme, every skill picks its own colors and fonts — the result looks like assets from 5 different brands instead of one cohesive campaign. The theme is why a user''s funnel, emails, and ads all feel like they belong together.',
    updated_at = NOW()
WHERE skill_key = 'theme-builder' AND agent_key = 'vibey' AND user_id IS NULL;

-- ---------------------------------------------------------------------------
-- 8. meta-publisher — Append ecology
-- ---------------------------------------------------------------------------
UPDATE agent_skills
SET markdown_content = markdown_content || E'\n\n---\n\n## Ecology\n\nMeta Publisher is the go-live step that connects creative work to real advertising:\n\n- **Depends on:** ad-builder (requires a completed ad creative with image, copy, and metadata), integrations (requires an active Meta connection)\n- **Connected to:** funnel-builder (the ad destination URL must point to an existing funnel page), theme-builder (creative must match brand identity)\n\nThis skill is the final checkpoint before money gets spent. The naming convention from ad-builder must carry through to the campaign/ad set/ad names in Ads Manager for clean reporting.',
    updated_at = NOW()
WHERE skill_key = 'meta-publisher' AND agent_key = 'vibey' AND user_id IS NULL;

-- ---------------------------------------------------------------------------
-- 9. brain-memory — Append ecology
-- ---------------------------------------------------------------------------
UPDATE agent_skills
SET markdown_content = markdown_content || E'\n\n---\n\n## Ecology\n\nBrain Memory is the cross-cutting skill that makes every other skill smarter over time:\n\n- **Feeds into:** All skills benefit from remembered context — offer-builder uses business facts, theme-builder uses stated preferences, funnel-builder uses past design decisions, email-sequence-builder uses voice preferences\n- **Connected to:** Every conversation. Memories persist across sessions and inform how you approach new tasks for this user.\n\nThe difference between a first-session experience and a tenth-session experience should be dramatic. By session ten, you know their business model, their audience, their design preferences, their communication style, and their strategic priorities — all from the Brain.',
    updated_at = NOW()
WHERE skill_key = 'brain-memory' AND agent_key = 'vibey' AND user_id IS NULL;

-- ---------------------------------------------------------------------------
-- 10. vibey-api — Append ecology
-- ---------------------------------------------------------------------------
UPDATE agent_skills
SET markdown_content = markdown_content || E'\n\n---\n\n## Ecology\n\nVibey API is the persistence layer that all other skills depend on:\n\n- **Used by:** Every skill that creates, reads, or updates campaign artifacts — offer-builder, avatar-builder, funnel-builder, lead-magnet-builder, email-sequence-builder, ad-builder, theme-builder, pdf-builder, social-content-builder, meta-publisher\n- **Why it matters:** Without saving to the database, work disappears. The user sees artifacts in the Artifacts tab, documents in the Docs tab, and funnels in the Funnels tab — all powered by vibey-api calls.\n\nThis skill is the plumbing. Every other skill is the architecture built on top of it.',
    updated_at = NOW()
WHERE skill_key = 'vibey-api' AND agent_key = 'vibey' AND user_id IS NULL;

-- ---------------------------------------------------------------------------
-- 11. website-builder — Append ecology
-- ---------------------------------------------------------------------------
UPDATE agent_skills
SET markdown_content = markdown_content || E'\n\n---\n\n## Ecology\n\nWebsites are the multi-page brand presence, distinct from single-page funnels:\n\n- **Depends on:** theme-builder (consistent branding across all pages), offer-builder (service/product information for content)\n- **Feeds into:** funnel-builder (website pages can link to dedicated funnel landing pages for specific conversions), email-sequence-builder (contact page leads trigger sequences)\n- **Connected to:** social-content-builder (organic content drives traffic to website), ad-builder (ads can point to website pages)\n\nA website without a theme looks inconsistent across pages. A website without offer data produces generic service descriptions. The contact page must include a data-vibey-capture form to connect with the email system.',
    updated_at = NOW()
WHERE skill_key = 'website-builder' AND agent_key = 'vibey' AND user_id IS NULL;

-- ---------------------------------------------------------------------------
-- 12. social-content-builder — Append ecology
-- ---------------------------------------------------------------------------
UPDATE agent_skills
SET markdown_content = markdown_content || E'\n\n---\n\n## Ecology\n\nOrganic social content drives awareness and engagement without paid spend:\n\n- **Depends on:** theme-builder (visual consistency with brand), offer-builder (content topics from expertise area), avatar-builder (content themes from audience interests and pain points)\n- **Feeds into:** social-publisher (the publishing step that posts content to connected accounts), funnel-builder (organic content drives traffic to funnels)\n- **Connected to:** ad-builder (top-performing organic content can be repurposed as paid ads)\n\nSocial content works best when it mirrors the same pain/desire language from the avatar and ties back to the offer''s expertise area.',
    updated_at = NOW()
WHERE skill_key = 'social-content-builder' AND agent_key = 'vibey' AND user_id IS NULL;

-- ---------------------------------------------------------------------------
-- 13. social-publisher — Append ecology
-- ---------------------------------------------------------------------------
UPDATE agent_skills
SET markdown_content = markdown_content || E'\n\n---\n\n## Ecology\n\nSocial Publisher is the go-live step for organic content:\n\n- **Depends on:** social-content-builder (requires created content), integrations (requires connected LinkedIn or Instagram accounts)\n- **Connected to:** theme-builder (published content should match brand visual identity)\n\nThis is the distribution end of the organic content pipeline. Content must be created first via social-content-builder before it can be published.',
    updated_at = NOW()
WHERE skill_key = 'social-publisher' AND agent_key = 'vibey' AND user_id IS NULL;

-- ---------------------------------------------------------------------------
-- 14. pdf-builder — Append ecology
-- ---------------------------------------------------------------------------
UPDATE agent_skills
SET markdown_content = markdown_content || E'\n\n---\n\n## Ecology\n\nPDF Builder creates branded documents that extend the campaign''s professional image:\n\n- **Depends on:** theme-builder (brand colors, fonts, and voice for document styling), offer-builder (content source for offer packages and summaries)\n- **Feeds into:** Documents appear in the Docs tab and can be shared with clients or team members\n- **Connected to:** offer-builder (the final offer package document), avatar-builder (persona summary documents)\n\nEvery PDF should look like it came from the same brand that built the funnel and sent the emails — the theme makes this automatic.',
    updated_at = NOW()
WHERE skill_key = 'pdf-builder' AND agent_key = 'vibey' AND user_id IS NULL;

-- ---------------------------------------------------------------------------
-- 15. integrations — Append ecology
-- ---------------------------------------------------------------------------
UPDATE agent_skills
SET markdown_content = markdown_content || E'\n\n---\n\n## Ecology\n\nIntegrations connect Vibey to the external platforms where the campaign operates:\n\n- **Feeds into:** meta-publisher (requires Meta connection for ad publishing), social-publisher (requires LinkedIn/Instagram connection for posting)\n- **Connected to:** email-sequence-builder (email provider integrations for sequence delivery), ad-builder (Meta connection for audience data)\n\nWithout active integrations, publishing skills cannot function. This skill is the gateway between campaign planning (inside Vibey) and campaign execution (on external platforms).',
    updated_at = NOW()
WHERE skill_key = 'integrations' AND agent_key = 'vibey' AND user_id IS NULL;
