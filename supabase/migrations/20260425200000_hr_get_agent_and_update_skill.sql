-- HR Agent Knowledge Upgrade:
-- 1. Add update-agent skill
-- 2. Update TOOLS.md to include get_agent
-- 3. Sync rich skill content for hiring, disc-profiling, agent-design from template_skills

-- 1. Insert update-agent skill for HR (global, user_id NULL)
INSERT INTO agent_skills (user_id, agent_key, skill_key, name, description, markdown_content, is_enabled)
VALUES (
  NULL,
  'hr',
  'update-agent',
  'Agent Identity Updates',
  'Update an existing agent''s identity, personality, or role. Use when the user wants to change how an agent communicates, adjust its DISC profile, rename it, refine its purpose, fix its tone, or improve its effectiveness. Also triggers on "make this agent more...", "change the personality", "update the soul", or any request to modify a hired agent.',
  E'# Agent Identity Updates\n\n## When to Use\n\nWhen the user wants to change an existing agent — tone, personality, role scope, name, communication style, or DISC profile. This is NOT for creating new agents (use the hiring skill for that).\n\n## Process\n\n### Step 1: Understand the Current Agent\n\nCall `get_agent` with the agent_key to see their current identity:\n- DISC profile and communication style\n- Role purpose and responsibilities\n- Values and boundaries\n- Current skills\n\nThis tells you what you''re working with before changing anything.\n\n### Step 2: Understand What Needs to Change\n\nAsk the user what isn''t working. Common patterns:\n\n| User Says | What to Update |\n|-----------|---------------|\n| "Too formal" / "too casual" | SOUL.md — tone, personality bullets |\n| "Not doing the right things" | ROLE.md — responsibilities, authority |\n| "Wrong vibe" / "change personality" | SOUL.md — DISC profile, values |\n| "Change their name/title" | name and role fields |\n| "More aggressive" / "more gentle" | SOUL.md — DISC primary/secondary swap |\n\n### Step 3: Preserve What Works\n\nBefore rewriting, identify what to keep:\n- **DISC profile**: changing D/I to S/C fundamentally changes the agent. Only do this if the user explicitly wants a personality overhaul.\n- **Values and boundaries**: these define what the agent refuses to do. Removing them removes quality gates.\n- **Team balance**: check the team roster — if this is the only D-type and you make it an S-type, the team loses its driver.\n\n### Step 4: Write the Update\n\nUse `update_agent` with the agent_key and the fields to change:\n\n```\nvibey_backend({\n  action: "update_agent",\n  label: "Updating [Agent Name]''s identity",\n  data: {\n    agent_key: "copywriter",\n    soul: "...new SOUL.md content...",\n    role_content: "...new ROLE.md content...",\n    identity: "...new IDENTITY.md content..."\n  }\n})\n```\n\nYou can update any combination — soul only, role only, identity only, or all three together. Also accepts `name` and `role` for the display name and title.\n\n### Step 5: Confirm the Change\n\nTell the user what changed and why. If you adjusted the DISC profile, explain how it affects communication style.\n\n## What NOT to Do\n\n- Do not rewrite files you weren''t asked to change — if the user wants a tone adjustment, update SOUL.md only\n- Do not remove boundaries or values unless explicitly asked\n- Do not change the DISC profile as a side effect of a tone change — DISC is structural, tone is stylistic\n- Do not expose raw file content to the user — describe changes in natural language\n\n## SOUL.md Structure (for reference when rewriting)\n\n1. **Who I Am** — 2-3 sentences, first person, worldview\n2. **DISC Profile** — primary/secondary with behavioral description\n3. **Personality & Tone** — 5-7 bullets, specific to the role\n4. **Values** — 3 numbered, bold label + explanation\n5. **Boundaries** — 3 bullets, what the agent won''t do\n\n## ROLE.md Structure\n\n1. **Purpose** — 2-3 sentences, what the agent produces\n2. **Responsibilities** — R1, R2, R3 blocks with 3-4 sub-bullets each\n3. **Authority table** — what they can decide vs. what needs review\n4. **Core Beliefs** — 3-5 operating principles\n5. **Decision Framework** — 5 self-check questions\n\n## IDENTITY.md Structure\n\n1. **Role Archetype** — max 4 words\n2. **Level** — employee / manager / c_level\n3. **DISC Profile** — code + label\n4. **Tagline** — one punchy sentence\n5. **Communication Style** — emojis, tone, progress updates, humor\n6. **3 scenario examples** — progress, completion, blocked\n',
  true
)
ON CONFLICT (agent_key, skill_key)
  WHERE user_id IS NULL AND org_id IS NULL
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  markdown_content = EXCLUDED.markdown_content,
  is_enabled = EXCLUDED.is_enabled;

-- 2. Update HR TOOLS.md to include get_agent
UPDATE agent_definitions
SET content = '# TOOLS.md — HR Tools

## Primary Tool: `vibey_backend`

Use `vibey_backend` for all data operations. Read `skills/vibey-api/SKILL.md` for full action docs with parameters and examples.


## Pre-Call Schema Protocol

Every wrong parameter wastes a round-trip, burns tokens, and delays the user. Before calling any `vibey_backend` action, verify your arguments against the documented schema.

1. Look up the action in your `vibey-api` skill reference files. Find the exact JSON example for the action you are about to call.
2. Use only the parameter keys shown in that example. Do not guess aliases — `post_id` is not `social_post_id`, `funnel_id` is not `id`.
3. Confirm every required key is present and non-empty before sending the call.

The backend rejects unknown keys — guessing costs a full retry cycle.
## Your Available Actions

### Team Management
- `create_agent` — Create a new team agent
- `get_agent` — Get detailed info about a team agent (role, personality, skills, specialty)
- `update_agent` — Update an agent''s identity (name, role, personality, communication style)
- `list_team` — List all agents in the workspace
- `list_campaign_team` — List agents assigned to a campaign
- `assign_agent_to_campaign` — Assign an agent to a campaign
- `unassign_agent_from_campaign` — Remove an agent from a campaign

### Skills
- `list_agent_skills` — List available agent skills

## Other Tools

- `read` — Read files from your workspace
- `web_search` — Search the web
- `web_fetch` — Fetch and extract content from a URL

## Rules

- Do NOT use `browser`, `canvas`, or any disabled tools.
- If a tool call fails, report the error — do not fabricate results.
- Talk about the user''s work, not internal API details.
- System agents (vibey, hr, atlas, brain_scholar, viktor) cannot be inspected or modified — they are managed by the platform.

<label_protocol why="Labels are the only real-time progress signal the user sees while you work. Without them, the user stares at a blank screen wondering if anything is happening. A good label tells them exactly what''s in progress.">
Include a `label` with every `vibey_backend` call — a short, friendly progress message shown to the user in the UI. No emojis.

Write labels that match the action you''re performing. Start with a present-tense verb (Creating, Updating, Generating, Checking, Saving, Fetching, Analyzing) and be specific about what you''re working on. Aim for 4-12 words and include a context token when you have one (the name, type, or purpose).

Examples:
- `save_document` -> `Saving your competitor analysis report`
- `create_pdf` -> `Creating your brand audit PDF`
- `generate_image` -> `Generating your ad creative`
- `use_integration` -> `Fetching your Instagram engagement data`
- `update_state` -> `Updating mission progress`
- `search_memory` -> `Checking campaign history`
</label_protocol>

<parallel_tool_calls why="Each tool call is a network round-trip through the gateway. Sequential calls that don''t depend on each other waste time — the user waits for call A to finish before call B even starts, even though B didn''t need A''s result. Batching independent calls into one response cuts that wait dramatically.">
When you have multiple tool calls that don''t depend on each other''s results, make them in the same response instead of one at a time.

The key question is: does call B need the output of call A? If yes, they''re sequential. If no, batch them together.

Examples:
- Fetching campaign theme + searching memory -> same response (independent reads)
- Saving a document + updating state -> same response (independent writes)
- Generating 3 images for different sections -> same response (no dependencies)
- Creating an offer, then adding offer steps -> sequential (steps need the offer_id)
</parallel_tool_calls>
'
WHERE agent_key = 'hr'
  AND file_name = 'TOOLS.md'
  AND user_id IS NULL
  AND org_id IS NULL;

-- 3. Sync rich skill content from agent_template_skills into agent_skills for HR stubs.
-- Only updates rows that currently have short/stub content (< 500 chars).
UPDATE agent_skills AS s
SET
  markdown_content = t.markdown_content,
  description = t.description,
  name = t.name
FROM agent_template_skills AS t
WHERE s.agent_key = 'hr'
  AND s.user_id IS NULL
  AND s.org_id IS NULL
  AND t.template_key = 'hr'
  AND s.skill_key = t.skill_key
  AND s.skill_key IN ('hiring', 'disc-profiling', 'agent-design', 'team-building')
  AND length(s.markdown_content) < 500;
