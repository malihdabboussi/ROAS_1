---
name: skill-creator
description: Create, update, and manage reusable skills for yourself or other agents. Use when the user asks to turn a workflow into a skill, save a process for reuse, teach an agent something new, or manage agent skills. Also use when the user says "remember this process", "save this as a skill", "teach X how to do Y", or after completing a multi-step workflow the user might want to repeat.
---

# Skill Creator

> Capture workflows, processes, and specialized knowledge as reusable skills — for yourself or another agent on the team.

## What a Skill Is

A skill is a markdown document that teaches an agent how to perform a specific task. It lives in the database and syncs to agent workspaces automatically.

A skill has two parts:
- **Main body** (`agent_skills` table) — the core instructions, under 500 lines
- **Reference files** (`agent_skill_resources` table) — supporting material like design systems, templates, code samples, or detailed guides that the main body points to

Reference files exist so skills can carry deep knowledge without bloating the main instruction set. The agent reads the main body every time the skill triggers, but only reads reference files when it needs them.

## Permission Levels

- **Employee** — create, update, delete skills for yourself only
- **Manager** — manage your own skills + employee-level agents
- **C-Level** — manage skills for any agent on the team

## Phase 1: Discovery

Before writing anything, understand what the skill should do. If the current conversation already contains a workflow the user wants to capture, extract answers from context first.

Clarify:
1. What repeatable process does this capture?
2. When should this skill trigger? (what user phrases/contexts)
3. What's the expected output format?
4. Are there edge cases or constraints?

List existing skills first to avoid duplicates:

```
vibey_backend({ action: "list_agent_skills", data: { "agent_key": "TARGET_AGENT_KEY" } })
```

## Phase 2: Design

### Naming

- Lowercase, hyphens only: `content-repurposer`, `weekly-report`
- Max 64 characters
- Verb-led when possible: `analyze-competitors`, `write-case-study`
- Specific over generic: `instagram-audit` not `social-helper`

### Description

The description determines when the skill activates — it's the primary triggering mechanism. Include both WHAT and WHEN, and lean slightly "pushy" so the skill triggers when needed rather than staying dormant.

Example:

"Analyze Instagram profiles for content strategy gaps, engagement patterns, and growth opportunities. Use when the user asks for a social media audit, profile review, content analysis, or anything related to evaluating social media performance — even if they don't explicitly say 'audit'."

### Body Structure

Choose based on skill type:

**Process skill** — step-by-step workflow:
```
# Title
> Trigger summary
## Process (numbered steps)
## Tool Usage (vibey_backend examples)
## Quality Standards
## Rules
```

**Domain skill** — teaches specialized knowledge:
```
# Title
> Trigger summary
## Core Knowledge
## Decision Framework
## Examples
## Rules
```

## Phase 3: Write

### Writing Principles

1. **Concise is key.** The context window is shared with everything else. Only include knowledge the agent doesn't already have.

2. **Explain the why.** Instead of rigid rules, explain reasoning so the agent can adapt to novel situations.

3. **Imperative form.** "Analyze the profile" not "You should analyze the profile."

4. **Include 2-3 concrete examples** — a single example often communicates more than a paragraph of rules.

5. **Under 500 lines for the main body.** Move supporting material to reference files.

6. **Include tool call examples** when the skill uses `vibey_backend` actions — show real parameter shapes.

### Reference Files

Use reference files for content that supports the skill but doesn't need to be read on every invocation: design systems, brand specs, code templates, visual analysis, detailed guides.

Reference files are stored separately from the skill body using `create_agent_skill_resource`. They sync to the agent workspace as files under the skill directory, so the agent can read them on demand.

**When to use reference files:**
- Content exceeds ~100 lines and isn't needed on every invocation
- Brand specs, design tokens, typography rules
- Code templates or working examples to copy from
- Detailed analysis or research notes
- Visual reference breakdowns

**Save order: main skill first, then reference files.**

```
vibey_backend({
  action: "create_agent_skill",
  label: "Teaching you a new skill",
  data: {
    "agent_key": "vibey",
    "skill_key": "instagram-carousel-design",
    "name": "Instagram Carousel Design",
    "description": "Design premium Instagram carousels...",
    "markdown_content": "# Instagram Carousel Design

> ...

## Process
...

For brand specs, read references/design-system.md
For code templates, read references/tsx-patterns.md"
  }
})
```

Then save each reference file separately:

```
vibey_backend({
  action: "create_agent_skill_resource",
  label: "Adding design system reference",
  data: {
    "agent_key": "vibey",
    "skill_key": "instagram-carousel-design",
    "file_path": "references/design-system.md",
    "content": "# Carousel Design System

## Typography
..."
  }
})
```

```
vibey_backend({
  action: "create_agent_skill_resource",
  label: "Adding code templates reference",
  data: {
    "agent_key": "vibey",
    "skill_key": "instagram-carousel-design",
    "file_path": "references/tsx-patterns.md",
    "content": "# TSX Pattern Library

## Slide 1 — Hook
..."
  }
})
```

**Reference file naming:** use `references/` prefix with descriptive kebab-case names. Keep references one level deep — no reference files that point to other reference files.

**In the main skill body,** tell the agent when to read each reference: "For the full brand spec, read references/design-system.md before starting slide layout."

## Phase 4: Description Optimization

After writing the skill, optimize the description for triggering accuracy.

1. **Generate 20 test queries** — 10 should-trigger (varied phrasings, casual/formal), 10 should-not-trigger (tricky near-misses, not obviously unrelated)
2. **Self-evaluate** — for each query, would this description trigger? Track false negatives and false positives.
3. **Rewrite** — adjust to fix gaps. Present before/after to the user.

## Phase 5: Save

Save the main skill first, then any reference files. The `markdown_content` is the skill body only — name and description are separate fields, no YAML frontmatter.

### Create

```
vibey_backend({
  action: "create_agent_skill",
  label: "Teaching you a new skill",
  data: {
    "agent_key": "TARGET_AGENT_KEY",
    "skill_key": "skill-name",
    "name": "Skill Display Name",
    "description": "Optimized description from Phase 4",
    "markdown_content": "# Full markdown body without frontmatter"
  }
})
```

### Add Reference File

```
vibey_backend({
  action: "create_agent_skill_resource",
  label: "Adding reference file",
  data: {
    "agent_key": "TARGET_AGENT_KEY",
    "skill_key": "skill-name",
    "file_path": "references/file-name.md",
    "content": "# Reference content"
  }
})
```

### Update

```
vibey_backend({
  action: "update_agent_skill",
  data: { "agent_key": "KEY", "skill_id": "UUID", "description": "...", "markdown_content": "..." }
})
```

### Delete

```
vibey_backend({
  action: "delete_agent_skill",
  data: { "agent_key": "KEY", "skill_id": "UUID" }
})
```

## When to Proactively Offer

After completing a multi-step workflow the user might want to repeat, offer:

"That was a solid process — want me to save it as a skill so I can follow the same steps next time?"

Good candidates:
- A research-then-produce workflow refined through feedback
- A specific output format the user liked
- A multi-tool sequence that worked well
- Domain-specific knowledge the agent learned

Skip for: one-off tasks, simple single-step actions, workflows already covered by existing skills.

## Quality Checklist

Before saving:

- [ ] Listed existing skills to confirm no duplicates
- [ ] Name is kebab-case, under 64 chars, specific
- [ ] Description includes WHAT + WHEN with broad trigger language
- [ ] Description self-tested against 20 queries
- [ ] Body under 500 lines, imperative form
- [ ] Supporting material in reference files (not crammed into body)
- [ ] Reference files saved via `create_agent_skill_resource` (not as separate skills)
- [ ] Tool calls include concrete examples
- [ ] Target agent_key matches permission level
- [ ] User confirmed before saving

## Rules

- List existing skills before creating — duplicates waste context
- Never include YAML frontmatter in markdown_content
- Never create skills for agents above your permission level
- Save reference files with `create_agent_skill_resource`, not `create_agent_skill`
- Confirm with the user before creating
- One skill per domain — focused skills over mega-skills
