-- First-class Website artifact contract and skill guidance.
-- Grounded in local /claude-skills guidance: DB agent_skills/agent_skill_resources are canonical.
-- Grounded in context-engineering guidance: make intent, constraints, examples, and storage relationships explicit.

UPDATE public.agent_skills
SET markdown_content = replace(
  markdown_content,
  '| "lead magnet", "freebie", "opt-in", "guide", "ebook" | `lead-magnet` |

---',
  '| "lead magnet", "freebie", "opt-in", "guide", "ebook" | `lead-magnet` |

`general-home-page` is an example-library category only. It is not a persisted `funnel_type`.
When saving:

- Existing full website/homepage edit -> use `list_websites`, then `add_website_page` or `update_website_page` with `page_type: "home"` and `path: "/"`.
- New business/company/full website -> use `create_website`, then `add_website_page`.
- Standalone single-page homepage artifact -> use `create_funnel` with `funnel_type: "home-page"`.
- Never retry a homepage or website failure as `lead-magnet`; use `lead-magnet` only for explicit lead capture/freebie/opt-in requests.

---'
)
WHERE skill_key = 'funnel-builder'
  AND markdown_content LIKE '%| "home page", "brand page", "business page" | `general-home-page` |%'
  AND markdown_content NOT LIKE '%general-home-page` is an example-library category only%';

UPDATE public.agent_skills
SET markdown_content = replace(
  markdown_content,
  'Quick reference:
```json
{"action": "create_funnel", "label": "Setting up your funnel", "data": {"name": "...", "slug": "...", "funnel_type": "lead-magnet"}}
```',
  'Valid persisted `funnel_type` values are: `lead-magnet`, `call-booking`, `webinar`, `home-page`, `live-event`, `ecommerce-product`, `cart-checkout`, `vsl`, `custom`, `website`.

Quick reference:
```json
{"action": "create_funnel", "label": "Setting up your funnel", "data": {"name": "...", "slug": "...", "funnel_type": "lead-magnet"}}
```'
)
WHERE skill_key = 'funnel-builder'
  AND markdown_content LIKE '%## Step 6: Save via vibey_backend%'
  AND markdown_content NOT LIKE '%Valid persisted `funnel_type` values are:%';

UPDATE public.agent_skills
SET markdown_content = replace(
  markdown_content,
  '### Step 1 — Create Website',
  '### Step 1 — Resolve Website Target

For homepage/site requests, call `list_websites` first.

- If a website exists, use that `funnel_id` and add or update the Home page there.
- If no website exists and the user asked for a business/company/full website or brand homepage, call `create_website`.
- If the user only asked for a standalone single-page homepage artifact, use funnel-builder with `create_funnel` and `funnel_type: "home-page"`.
- Never create a `lead-magnet` unless the user explicitly asks for lead capture/freebie/opt-in.

Website is first-class in API/UX but shared-storage in DB: it is stored in `funnels` with `funnel_type: "website"`, website pages live in `funnel_pages`, and blog posts attach through `blog_posts.funnel_id`.

### Step 2 — Create Website'
)
WHERE skill_key = 'website-builder'
  AND markdown_content LIKE '%### Step 1 — Create Website%'
  AND markdown_content NOT LIKE '%### Step 1 — Resolve Website Target%';

UPDATE public.agent_skill_resources
SET content = replace(
  content,
  'The blog system attaches **content posts** to a **website** (funnel).',
  'The blog system attaches **content posts** to a **website** through `blog_posts.funnel_id`. Website is first-class in API/UX, but storage is shared: the website row lives in `funnels` with `funnel_type = "website"`, website pages live in `funnel_pages`, and blog posts reference that same website/funnel id.'
)
WHERE skill_key = 'website-builder'
  AND file_path = 'references/blog-integration.md'
  AND content LIKE '%The blog system attaches **content posts** to a **website** (funnel).%';

UPDATE public.agent_skill_resources
SET content = replace(
  content,
  'Agent workflows use **create_blog_post**, **list_blog_posts**, **update_blog_post**, and **delete_blog_post** so content stays tied to the same funnel_id as the site.',
  'Agent workflows use **create_blog_post**, **list_blog_posts**, **update_blog_post**, and **delete_blog_post** so content stays tied to the same `funnel_id` as the website. Do not create or look for a separate `websites` table.'
)
WHERE skill_key = 'website-builder'
  AND file_path = 'references/blog-integration.md'
  AND content LIKE '%content stays tied to the same funnel_id as the site.%';

UPDATE public.agent_skill_resources
SET content = replace(
  content,
  '**Use when:** Create a funnel artifact in the active campaign or an explicit campaign_id.

**Do not use when:** Reading existing funnels; use list_funnels or get_funnel instead.',
  '**Allowed `funnel_type` values:** `lead-magnet`, `call-booking`, `webinar`, `home-page`, `live-event`, `ecommerce-product`, `cart-checkout`, `vsl`, `custom`, `website`

**Aliases:** `general-home-page` maps only to `home-page` or website intent. It is an example category, not a DB enum.

**Use when:** Create a single-purpose funnel or standalone single-page artifact.

**Do not use when:** Reading existing funnels; use list_funnels or get_funnel instead. Do not use for full websites, business sites, or homepage edits inside an existing website; use `list_websites`, `get_website`, `create_website`, or `add_website_page`.'
)
WHERE skill_key = 'vibey-api'
  AND file_path = 'references/funnels.md'
  AND content LIKE '%**Use when:** Create a funnel artifact in the active campaign or an explicit campaign_id.%';

UPDATE public.agent_skill_resources
SET content = replace(
  content,
  'Creates a new funnel. User sees: funnel card in Studio > Funnels with live preview. When: user needs a landing page, opt-in page, or multi-page site. Add pages with add_funnel_page after creation.',
  'Creates a new funnel. User sees: funnel card in Studio > Funnels with live preview. When: user needs a landing page, opt-in page, event page, VSL, checkout, or standalone single-page home artifact. Add pages with add_funnel_page after creation.

Retry safety: if the database rejects a type, do not choose an unrelated valid type. `general-home-page` must never be retried as `lead-magnet`.'
)
WHERE skill_key = 'vibey-api'
  AND file_path = 'references/funnels.md'
  AND content LIKE '%multi-page site. Add pages with add_funnel_page after creation.%';

UPDATE public.agent_skill_resources
SET content = replace(
  content,
  '## create_website
Creates a new multi-page website with shared navigation and footer. Use this when building a full website — not a single landing page or funnel. Add pages with add_website_page and set the shared layout with set_website_layout.',
  '## create_website
**Optional keys:** `campaign_id`, `space_id`, `name`, `slug`, `status`, `theme_id`

Creates a first-class website artifact. Internally this stores a row in `funnels` with `funnel_type: "website"`; do not create a `websites` table. Use this when building a full website, business site, company site, web presence, or brand homepage when no website exists. Add pages with add_website_page and set the shared layout with set_website_layout.

For "make the homepage": call `list_websites` first. If a website exists, add or update the Home page there. Only create a new website when no website exists and the request is for a brand/site homepage. Never fall back to `lead-magnet`.'
)
WHERE skill_key = 'vibey-api'
  AND file_path = 'references/website.md'
  AND content LIKE '%Creates a new multi-page website with shared navigation and footer.%';
