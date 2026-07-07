-- Update Atlas knowledge-intake skill with mission-triggered workflow
-- and add reference resources for brain-type-specific guides

UPDATE agent_template_skills
SET markdown_content = E'# Knowledge Intake\n\n> You are the Brain Scholar''s intake specialist. When you receive a brain ingestion mission, you pre-process the content using the right source-specific strategy, then extract and save knowledge to the specified target brain.\n\n## Mission Intake Workflow\n\nWhen you receive a mission with `input.content_type` and `input.target_brain`:\n\n### Step 1: Understand Context\n- Use `search_memory` with a preview of the content to find related existing knowledge\n- Use `get_brain_stats` to understand the user''s brain composition\n- This prevents duplicating knowledge the user already has\n\n### Step 2: Identify the Source Strategy\nUse the `input.content_type` to determine which extraction strategy to follow (see Source-Specific Strategies below).\n\n### Step 3: Use the Right Tools for the Target Brain\nThe `input.target_brain` tells you which tools to use:\n- **user** → `save_memory` for individual memories, `trigger_crystallization` for core beliefs/models\n- **agent** → `ingest_sk_text` for expert knowledge entries\n- **campaign** → `ingest_campaign_file` for campaign-specific knowledge\n\n### Step 4: Quality Control\nApply the knowledge-extraction skill''s quality tests to every piece you save.\n\n---\n\n## Source-Specific Strategies\n\n### YouTube Transcripts\n1. Identify the main topic/thesis from the first 2 minutes\n2. Identify speaker changes and topic shifts\n3. Extract by TOPIC SEGMENT, not arbitrary character splits\n4. Weight conclusions and key takeaways higher than setup/context\n5. Skip: intros, outros, sponsor segments, "like and subscribe" calls\n6. Preserve speaker attribution when multiple speakers are present\n\n### Articles & Web Pages\n1. Identify the article''s thesis from the headline and first paragraph\n2. Use headings to identify sections and their purpose\n3. Weight conclusions, recommendations, and key arguments higher\n4. Skip: navigation, sidebars, author bios, related article links\n5. Preserve section context when extracting\n\n### PDFs & Documents\n1. Use headings and chapter structure to segment content\n2. Extract per-section with section context preserved\n3. For academic papers: prioritize abstract, findings, and conclusions\n4. For business documents: prioritize executive summary and recommendations\n5. Skip: table of contents, bibliography, page headers/footers\n\n### Meeting Transcripts (Fathom / Fireflies)\n1. Identify decisions and their rationale (highest priority)\n2. Extract action items with ownership\n3. Pull insights and frameworks mentioned during discussion\n4. Skip: scheduling logistics, "can you hear me", small talk\n5. Attribute insights to speakers when possible\n6. Look for strategic shifts or new directions\n7. Capture stories and anecdotes that reveal thinking patterns\n\n### General Text\n1. Identify the main thesis or purpose of the content\n2. Use the thesis as context for extraction\n3. Split on paragraph boundaries, not arbitrary character limits\n4. Weight the introduction and conclusion sections higher\n\n## Pre-Processing Rules\n- Always identify the source''s main thesis before extracting details\n- Use the thesis as a quality filter: does this extracted piece support or extend the main argument?\n- Remove boilerplate before analysis: headers, footers, navigation, metadata\n- Preserve enough context that each extracted piece is self-contained',
    description = 'Pre-process different content types and save to the specified target brain. Use this skill when you receive a brain ingestion mission. Triggers on any content import with a known source type, or when a mission specifies skill "knowledge-intake".'
WHERE template_key = 'brain_scholar' AND skill_key = 'knowledge-intake';

-- Also update any existing per-user atlas agent skills
UPDATE agent_skills
SET markdown_content = (
  SELECT markdown_content FROM agent_template_skills
  WHERE template_key = 'brain_scholar' AND skill_key = 'knowledge-intake'
),
description = (
  SELECT description FROM agent_template_skills
  WHERE template_key = 'brain_scholar' AND skill_key = 'knowledge-intake'
)
WHERE skill_key = 'knowledge-intake'
  AND agent_key = 'atlas';

-- Add reference resources for the knowledge-intake skill
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content)
SELECT
  ask.user_id,
  ask.agent_key,
  'knowledge-intake',
  r.file_path,
  r.content
FROM agent_skills ask
CROSS JOIN (VALUES
  ('references/user-brain-guide.md', E'# User Brain Guide\n\n## What Belongs Here\nKnowledge that reveals how the user THINKS — shared across all agents and campaigns.\n\n## Content Types\n- **preference** — Business beliefs, personal values, opinions\n- **decision** — Strategic choices WITH reasoning\n- **story** — Personal experiences that shaped thinking\n- **framework** — Repeatable mental models or methodologies\n- **insight** — Non-obvious realizations about business or life\n- **fact** — ONLY significant milestones (not routine metrics)\n\n## Tools\n- `save_memory` — Save individual memories\n- `trigger_crystallization` — Create a Neural Snapshot for core beliefs/models/rules\n\n## Quality Criteria\n- 6-Month Test: Would this still matter in 6 months?\n- Coffee Test: Would the user tell a friend this over coffee?\n- Significance >= 0.6\n\n## What NOT to Save\n- Config/infrastructure details\n- Routine operations\n- Things stored elsewhere (SOPs, wikis, task trackers)\n- Ephemeral/time-bound info\n- UI/Implementation specs'),
  ('references/agent-brain-guide.md', E'# Agent Brain (Scholar Knowledge) Guide\n\n## What Belongs Here\nExpert content that makes one agent strong in its role. NOT shared between agents.\n\n## Content Types\n- concept, framework, protocol, principle, technique, quote, case_study, definition\n\n## Tools\n- `ingest_sk_text` — Add text content to agent brain\n- `ingest_sk_link` — Add content from a URL\n\n## Quality Criteria\n- Must be actionable expert knowledge\n- Each entry must be self-contained\n- Significance >= 0.5\n- Classify by domain and complexity level'),
  ('references/campaign-brain-guide.md', E'# Campaign Brain Guide\n\n## What Belongs Here\nProject-specific knowledge for one campaign. Used by agents working on that campaign.\n\n## Content Types\n- Offer details and positioning\n- Customer avatar insights\n- Brand theme and visual direction\n- Documents, SOPs, checklists\n- Reference content and competitor research\n- Past deliverables\n\n## Tools\n- `ingest_campaign_file` — Add file content to campaign brain\n- `ingest_campaign_url` — Add URL content to campaign brain\n\n## Quality Criteria\n- Must be relevant to the specific campaign\n- Keep campaign work consistent and on-brand'),
  ('references/meeting-analysis-guide.md', E'# Meeting Analysis Guide\n\n## Priority Order for Meeting Transcripts\n\n1. **Decisions** — What was decided and why (highest priority)\n2. **Action Items** — Commitments made, with ownership\n3. **Strategic Shifts** — New directions or pivots discussed\n4. **Insights** — Non-obvious realizations from the discussion\n5. **Frameworks** — Mental models or methodologies mentioned\n6. **Stories** — Anecdotes that reveal thinking patterns\n7. **Disagreements** — How they were resolved (valuable signal)\n\n## What to Skip\n- Scheduling logistics\n- "Can you hear me" / technical issues\n- Small talk and pleasantries\n- Repetitive points already captured\n\n## Speaker Attribution\n- Always note who said what when possible\n- Decisions should include who made them\n- Action items should include who owns them')
) AS r(file_path, content)
WHERE ask.skill_key = 'knowledge-intake'
  AND ask.agent_key = 'atlas'
ON CONFLICT (agent_key, skill_key, file_path, user_id) DO UPDATE
SET content = EXCLUDED.content;
