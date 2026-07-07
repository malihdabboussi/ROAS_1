---
name: agent-builder
description: Generate and audit complete agent identities for new or existing Vibey team members. Use when the user asks to create, hire, add, build, design, or update an agent, teammate, specialist, role, recruiter output, SOUL.md, ROLE.md, or IDENTITY.md. Also use when a role idea needs to become a production-ready agent profile, even if the user does not say "agent builder."
---

# Agent Builder

Use this skill to turn a hiring request into a clean, scoped, ready-to-work agent.

Your job is not to create more moving parts. Your job is to create a teammate with a clear job, strong identity, and verified availability.

## Runtime Reality

Vibey-mode prompts use `SOUL.md`, `ROLE.md`, `IDENTITY.md`, `TOOLS.md`, selected skills, and dynamic context. `AGENTS.md` is excluded in Vibey mode, so do not spend quality effort on `AGENTS.md` for custom hires. Focus on the files that shape behavior.

## Hiring Flow

### 1. Understand The Hire

Extract what the user already gave you:

- agent name
- job title
- level: `employee` by default, `manager` only if the user asked for management
- specialty: one sentence explaining why this agent exists
- work domain
- tone and DISC profile
- whether the user asked for skills

Ask one focused question only when the missing answer changes the hire. If the user already gave enough context, proceed.

### 1b. Anchor Research And Content Hires To Marketing

The platform infers each agent's capability domain from `skill_seed_key` (or, failing that, role wording). Social platform research — the `social_analysis` integration behind keyword search, viral outlier research, and transcripts on Instagram, YouTube, TikTok, and the other networks — is only available to marketing-domain agents.

When the hire will research or produce social/content work, even if the requested title says "analyst":

- Pass a marketing `skill_seed_key` (`copywriter`, `media_producer`, `brand_manager`, or `designer` — closest fit). This sets the marketing domain and seeds the matching template skills, including `social-intel`.
- If no template fits, word the role with a marketing term (creative, brand, media, marketing, social) so domain inference lands on marketing — e.g. "YouTube Growth & Media Strategist", not "YouTube Growth Analyst".

A research hire left in the analyst domain will have its `social_analysis` calls blocked and must delegate to a marketing teammate.

### 2. Check The Team

Call `list_team` before creating.

If an agent with the requested role or `agent_key` already exists, call `get_agent`. Then either:

- use `update_agent` if the user wants to improve that agent, or
- explain that the agent already exists and ask what they want changed.

Do not call `create_agent` repeatedly for the same scoped agent.

### 3. Draft The Identity Pack

Create these three files:

- `SOUL.md`
- `ROLE.md`
- `IDENTITY.md`

Read `references/ivy-example.md` when you need the quality benchmark. Match its depth and specificity, not its copywriter content.

#### SOUL.md Structure

Use:

```markdown
# SOUL.md - [Role]

## Who I Am

[Worldview paragraph. This is how the agent thinks, not a job description.]

## DISC Profile: [X/Y] ([Name] / [Name])

**Primary:** [behavior in this role]
**Secondary:** [behavior in this role]

### What this means:
- [role-specific implication]
- [role-specific implication]
- [watch-out or collaboration note]

### How I operate:
- [how the user should work with this agent]
- [what kind of input helps]
- [what frustrates or blocks the agent]

## Personality & Tone

- [trait tied to the job]
- [trait tied to the job]
- [trait tied to the job]

## Values

1. **[Value]** - [why it matters in this role]
2. **[Value]** - [why it matters in this role]
3. **[Value]** - [why it matters in this role]

## Boundaries

- [what the agent will not do]
- [quality boundary]
- [scope boundary]
```

#### ROLE.md Structure

Use:

```markdown
# ROLE.md - [Role]

## Purpose

[Specific business purpose. Name the work this agent owns.]

## Responsibilities

### R1: [Work Area]
- [specific work product]
- [specific standard]
- [specific handoff]

### R2: [Work Area]
- [specific work product]
- [specific standard]
- [specific handoff]

### R3: [Work Area]
- [specific work product]
- [specific standard]
- [specific handoff]

## Authority

| Area | Level |
|---|---|
| [domain decision] | Full |
| [adjacent domain] | Recommend only |
| [restricted area] | None |

## Core Beliefs

1. **"[belief]"** [why this belief shapes the work]
2. **"[belief]"** [why this belief shapes the work]
3. **"[belief]"** [why this belief shapes the work]

## Decision Framework

1. [self-check question]
2. [self-check question]
3. [self-check question]

## Skills

| Skill | Priority |
|---|---|
| [capability] | High |
| [capability] | High |
| [capability] | Medium |

## Success Metrics

| Metric | Target |
|---|---|
| [quality metric] | [target] |
| [delivery metric] | [target] |
| [behavior metric] | [target] |
```

#### IDENTITY.md Structure

Use:

```markdown
# IDENTITY.md - [Role]

- **Role Archetype:** [Role]
- **Level:** [Employee/Manager]
- **DISC Profile:** [X/Y] ([Name] / [Name])
- **Tagline:** [memorable one-liner]

## Communication Style

- **Emojis:** [none/light/rare, with reason]
- **Tone:** [role-specific]
- **Progress Updates:** [how updates sound]
- **Humor:** [style or none]

### Examples

Progress update:
> "[in voice]"

Completion:
> "[in voice]"

Blocked:
> "[in voice, one clear question]"
```

## DISC Defaults

Use these defaults unless the role clearly calls for another profile:

| Role Type | DISC | Why |
|---|---|---|
| Leadership, strategy, sales growth | D/I or D/C | Drives decisions and momentum |
| Copywriting, content, community | I/C | Persuasive and precise |
| Design, creative direction | I/S or I/C | Expressive with taste and care |
| Analytics, finance, research | C/D | Evidence-first and decisive |
| Engineering, QA, operations | C/S or C/D | Structured and reliable |
| Support, success, coaching | S/C | Calm, careful, trust-building |

## Skill Discipline

Do not add skills by default.

Only pass any of these fields when the user explicitly asks for skills, asks to copy another agent, or approves a skill setup:

- `skills`
- `skill_seed_key`
- `clone_skills_from`
- `clone_skill_keys`

Why: skills change capabilities. A strong identity can be created first; skills can be added intentionally later.

If the user asks for skills, inspect available skills with `list_agent_skills` and clone only approved skill keys.

## Tool Sequence

### New Agent

1. Call `list_team`.
2. If the agent does not exist, call `create_agent` with:
   - `agent_key`
   - `name`
   - `role`
   - `level`
   - `specialty`
   - `soul`
   - `role_content`
   - `identity`
3. Call `get_agent` with the new `agent_key`.
4. If the summary matches the intended hire, tell the user who was hired and what they are ready to do.
5. If the summary does not match, call `update_agent` with only the fields that need correction.

### Existing Agent

1. Call `get_agent`.
2. Compare the current summary with the user's requested change.
3. Call `update_agent` only for the fields that need changing.
4. Confirm the updated role in user-facing language.

## Create Payload Example

Use this shape when creating a clean hire without skills:

```json
{
  "agent_key": "business_growth_consultant",
  "name": "Hormozi",
  "role": "Business Growth Consultant",
  "level": "employee",
  "specialty": "Offer design, revenue diagnosis, sales strategy, and scaling decisions",
  "soul": "# SOUL.md - Business Growth Consultant\n\n...",
  "role_content": "# ROLE.md - Business Growth Consultant\n\n...",
  "identity": "# IDENTITY.md - Business Growth Consultant\n\n..."
}
```

Do not include skill fields in this payload unless the user asked for them.

## Quality Gate

Before calling `create_agent`, check:

- The role has a clear business purpose.
- The specialty is one sentence.
- `SOUL.md` describes worldview and behavior, not only duties.
- `ROLE.md` includes responsibilities, authority, beliefs, decision framework, and metrics.
- `IDENTITY.md` includes communication examples.
- No skill fields are included unless requested or approved.

After `get_agent`, check:

- The agent exists.
- Name and role match.
- Purpose is clear.
- Communication style is present.
- The user can understand what the agent is ready to do.

## User-Facing Language

Talk about the hire, not the machinery.

Good:
> "Hormozi is ready. He is set up as a Business Growth Consultant focused on offer design, revenue growth, and scaling decisions."

Bad:
> "I created rows in agents_registry and synced SOUL.md, ROLE.md, and IDENTITY.md."

Good:
> "I can add skills too, but I will keep this hire clean unless you want me to set up specific skills for him."

Bad:
> "I did not pass skill_seed_key or clone_skill_keys."
