import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isLoopAgentRolloutOrg, isSystemAgentKey } from '../../lib/system-agent-keys'
import { MissionSkillSeederRepository } from '../../repositories/mission-skill-seeder.repository'
import { MissionsRepository } from '../../repositories/missions.repository'
import { MissionAgentTemplateService } from '../templates/mission-agent-template.service'

@Injectable()
export class MissionSkillSeederService {
  private readonly logger = new Logger(MissionSkillSeederService.name)

  constructor(
    private readonly missionsRepository: MissionsRepository,
    private readonly missionAgentTemplateService: MissionAgentTemplateService,
    private readonly skillSeederRepository: MissionSkillSeederRepository = new MissionSkillSeederRepository(),
  ) {}

  private static readonly DEFAULT_SKILLS: Array<{
    skill_key: string
    name: string
    description: string
    markdown_content: string
  }> = [
    {
      skill_key: 'skill-creator',
      name: 'Skill Creator',
      description:
        'Create, update, and manage reusable skills for yourself or other agents. Use when the user asks to turn a workflow into a skill, save a process for reuse, teach an agent something new, or manage agent skills. Also use when the user says "remember this process", "save this as a skill", "teach X how to do Y", or after completing a multi-step workflow the user might want to repeat.',
      markdown_content: `# Skill Creator

> Capture workflows, processes, and specialized knowledge as reusable skills — for yourself or another agent on the team.

## What a Skill Is

A skill is a markdown document that teaches an agent how to perform a specific task. It contains step-by-step instructions, tool usage patterns, quality standards, and domain knowledge the agent wouldn't otherwise have.

Skills are stored in the database and synced to agent workspaces automatically.

## Permission Levels

- **Employee** — create, update, delete skills for yourself only
- **Manager** — manage your own skills + employee-level agents
- **C-Level** — manage skills for any agent on the team

## Phase 1: Discovery

Before writing anything, understand what the skill should do. If the current conversation already contains a workflow the user wants to capture, extract answers from the conversation history first.

Clarify:
1. What repeatable process does this capture?
2. When should this skill trigger? (what user phrases/contexts)
3. What's the expected output format?
4. Are there edge cases or constraints?

List existing skills first to avoid duplicates:

\`\`\`
vibey_backend({ action: "list_agent_skills", data: { "agent_key": "TARGET_AGENT_KEY" } })
\`\`\`

## Phase 2: Design

### Naming

- Lowercase, hyphens only: \`content-repurposer\`, \`weekly-report\`
- Max 64 characters
- Verb-led when possible: \`analyze-competitors\`, \`write-case-study\`
- Specific over generic: \`instagram-audit\` not \`social-helper\`

### Description

The description is the primary triggering mechanism. It determines WHEN the skill activates. Include:

- **WHAT** the skill does (capabilities)
- **WHEN** to use it (trigger scenarios, user phrases)

Write descriptions slightly "pushy" — err on the side of over-triggering rather than under-triggering. Example:

"Analyze Instagram profiles for content strategy gaps, engagement patterns, and growth opportunities. Use when the user asks for a social media audit, profile review, content analysis, or anything related to evaluating social media performance — even if they don't explicitly say 'audit'."

### Body Structure

Choose based on skill type:

**Process skill** — step-by-step workflow:
\`\`\`
# Title
> Trigger summary
## Process (numbered steps)
## Tool Usage (vibey_backend examples)
## Quality Standards
## Rules
\`\`\`

**Tool skill** — wraps specific tool actions:
\`\`\`
# Title
> Trigger summary
## When to Use
## Tool Calls (concrete examples with parameters)
## Error Handling
## Rules
\`\`\`

**Domain skill** — teaches specialized knowledge:
\`\`\`
# Title
> Trigger summary
## Core Knowledge
## Decision Framework
## Examples
## Rules
\`\`\`

## Phase 3: Write

### Writing Principles

1. **Concise is key.** The context window is shared with everything else. Only include knowledge the agent doesn't already have. Challenge each paragraph: "Does this justify its token cost?"

2. **Explain the why.** Instead of rigid ALWAYS/NEVER rules, explain reasoning so the agent understands intent and can adapt. "Descriptions should be pushy because agents tend to under-trigger skills" is better than "ALWAYS write long descriptions."

3. **Imperative form.** "Analyze the profile" not "You should analyze the profile."

4. **Match specificity to fragility:**
   - **High freedom** (text instructions) — multiple valid approaches, context-dependent
   - **Medium freedom** (templates/pseudocode) — preferred pattern with acceptable variation
   - **Low freedom** (exact scripts/formats) — fragile operations, consistency critical

5. **Under 500 lines.** If approaching this limit, split into the main skill + reference files via \`agent_skill_resources\`.

6. **Include tool call examples** when the skill uses specific \`vibey_backend\` actions — concrete examples with real parameter shapes.

### Resource Files

For skills that need reference material, templates, or detailed docs that don't need to be in the main body:

\`\`\`
vibey_backend({
  action: "create_agent_skill_resource",
  data: {
    "agent_key": "TARGET_AGENT_KEY",
    "skill_key": "skill-name",
    "file_path": "references/detailed-guide.md",
    "content": "# Full reference content here"
  }
})
\`\`\`

Reference from the main skill body: "For detailed API schemas, see references/detailed-guide.md"

## Phase 4: Description Optimization

After writing the skill, optimize the description for better triggering accuracy.

### Step 1: Generate Test Queries

Create 20 realistic test queries — the kind of thing a real user would actually type:

- **10 should-trigger**: Different phrasings of the same intent, casual/formal mix, cases where the user doesn't name the skill explicitly but clearly needs it
- **10 should-not-trigger**: Near-misses that share keywords but need something different. These should be genuinely tricky, not obviously irrelevant.

Bad test: "Write a fibonacci function" (too obviously unrelated)
Good test: "I need to write better Instagram captions" (shares keywords with an audit skill but is a copywriting task)

### Step 2: Self-Evaluate

For each test query, ask yourself: "Given this description, would I activate this skill?"

Track:
- **False negatives** (should trigger but wouldn't) — description needs broader trigger language
- **False positives** (shouldn't trigger but would) — description needs sharper scoping

### Step 3: Rewrite

Adjust the description to fix gaps. Present the before/after to the user for approval.

## Phase 5: Save

\`\`\`
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
\`\`\`

The \`markdown_content\` is the skill body only — do NOT include YAML frontmatter. Name and description are separate fields.

### Update

\`\`\`
vibey_backend({
  action: "update_agent_skill",
  data: { "agent_key": "KEY", "skill_id": "UUID", "description": "...", "markdown_content": "..." }
})
\`\`\`

### Delete

\`\`\`
vibey_backend({
  action: "delete_agent_skill",
  data: { "agent_key": "KEY", "skill_id": "UUID" }
})
\`\`\`

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

Before saving any skill:

- [ ] Listed existing skills to confirm no duplicates
- [ ] Name is kebab-case, under 64 chars, specific
- [ ] Description includes WHAT + WHEN with pushy trigger language
- [ ] Description self-tested against 20 queries (Phase 4)
- [ ] Body under 500 lines, uses imperative form
- [ ] Explains the why behind constraints (not just MUST/NEVER)
- [ ] Tool calls include concrete examples
- [ ] Target agent_key matches permission level
- [ ] User confirmed before saving

## Rules

- List existing skills before creating — duplicates waste context
- Never include YAML frontmatter in markdown_content
- Never create skills for agents above your permission level
- Confirm with the user before creating
- One skill per domain — focused skills over mega-skills that try to do everything`,
    },
  ]

  private static readonly UNIVERSAL_LIBRARY_SKILL_KEYS = ['dylans-super-voice']

  async cloneSelectedSkills(
    supabase: SupabaseClient,
    userId: string,
    sourceAgentKey: string,
    targetAgentKey: string,
    skillKeys: string[],
  ) {
    if (isSystemAgentKey(targetAgentKey)) {
      this.logger.log(
        `Skipping clone to system agent '${targetAgentKey}' — system agents read canonical content directly.`,
      )
      return
    }
    const { rows: sourceSkills, errorMessage } =
      await this.skillSeederRepository.listCloneableSkills(
        supabase,
        userId,
        sourceAgentKey,
        skillKeys,
      )
    if (errorMessage) {
      this.logger.warn(`Failed to fetch skills from ${sourceAgentKey}: ${errorMessage}`)
      return
    }
    if (!sourceSkills?.length) return
    const sourceResources = await this.skillSeederRepository.listSourceSkillResources(
      supabase,
      userId,
      sourceAgentKey,
      skillKeys,
    )
    await Promise.all(
      sourceSkills.map(async (s) => {
        await this.missionsRepository.internalUpsertAgentSkill(
          supabase,
          userId,
          null,
          targetAgentKey,
          s.skill_key,
          s.name,
          s.description,
          s.markdown_content,
        )
        const resourcesForSkill = (sourceResources ?? []).filter((r) => r.skill_key === s.skill_key)
        if (!resourcesForSkill.length) return
        await Promise.all(
          resourcesForSkill.map((resource) =>
            this.missionsRepository.internalUpsertAgentSkillResource(
              supabase,
              userId,
              targetAgentKey,
              s.skill_key,
              resource.file_path,
              resource.content,
            ),
          ),
        )
      }),
    )
  }

  async seedDefaultSkills(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ) {
    if (isSystemAgentKey(agentKey)) return
    const { rows: universalSkills, errorMessage } =
      await this.skillSeederRepository.listLibrarySkills(
        supabase,
        MissionSkillSeederService.UNIVERSAL_LIBRARY_SKILL_KEYS,
      )
    if (errorMessage) {
      this.logger.warn(`Failed to load universal default skills for ${agentKey}: ${errorMessage}`)
    }
    const universalResources = universalSkills.length
      ? await this.skillSeederRepository.listLibrarySkillResources(
          supabase,
          MissionSkillSeederService.UNIVERSAL_LIBRARY_SKILL_KEYS,
        )
      : []
    await Promise.all(
      [...MissionSkillSeederService.DEFAULT_SKILLS, ...universalSkills].map(async (s) => {
        await this.missionsRepository
          .internalUpsertAgentSkill(
            supabase,
            userId,
            orgId ?? null,
            agentKey,
            s.skill_key,
            s.name,
            s.description,
            s.markdown_content,
            'default',
          )
          .catch((e) =>
            this.logger.warn(
              `Failed to seed default skill "${s.skill_key}" for ${agentKey}: ${(e as Error).message}`,
            ),
          )
        const resources = universalResources.filter((row) => row.skill_key === s.skill_key)
        await Promise.all(
          resources.map((resource) =>
            this.missionsRepository.internalUpsertAgentSkillResource(
              supabase,
              userId,
              agentKey,
              resource.skill_key,
              resource.file_path,
              resource.content,
              orgId,
            ),
          ),
        )
      }),
    )
  }

  async seedTemplateSkills(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    role: string,
    orgId?: string | null,
  ) {
    if (isSystemAgentKey(agentKey)) return
    const templateKey = role
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
    const skills = await this.missionsRepository.listTemplateSkills(supabase, templateKey)
    if (!skills || skills.length === 0) return
    await Promise.all(
      skills.map(async (s) => {
        await this.missionsRepository.internalUpsertAgentSkill(
          supabase,
          userId,
          orgId ?? null,
          agentKey,
          s.skill_key,
          s.name,
          s.description,
          s.markdown_content,
          'template',
        )
        const resources = Array.isArray(s.resources) ? s.resources : []
        if (!resources.length) return
        await Promise.all(
          resources.map((resource: { file_path?: string; content?: string }) =>
            this.missionsRepository.internalUpsertAgentSkillResource(
              supabase,
              userId,
              agentKey,
              s.skill_key,
              String(resource.file_path ?? ''),
              String(resource.content ?? ''),
              orgId,
            ),
          ),
        )
      }),
    )
  }

  /**
   * Library skills every agent of a capability domain should carry regardless of
   * which template (or custom role) it was hired from. Template seeding only
   * matches known template keys, so custom-role hires (e.g. "YouTube Growth
   * Analyst") would otherwise miss domain-critical skills.
   */
  private static readonly DOMAIN_LIBRARY_SKILLS: Record<string, string[]> = {
    marketing: ['social-intel', 'seo-research'],
    analyst: ['seo-research'],
  }

  async seedDomainSkills(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    capabilityDomain: string | null | undefined,
    orgId?: string | null,
  ) {
    if (isSystemAgentKey(agentKey)) return
    const skillKeys = MissionSkillSeederService.DOMAIN_LIBRARY_SKILLS[capabilityDomain ?? ''] ?? []
    if (!skillKeys.length) return
    const { rows: libraryRows, errorMessage } = await this.skillSeederRepository.listLibrarySkills(
      supabase,
      skillKeys,
    )
    if (errorMessage) {
      this.logger.warn(`Failed to fetch domain skills for ${agentKey}: ${errorMessage}`)
      return
    }
    if (!libraryRows?.length) return
    const resourceRows = await this.skillSeederRepository.listLibrarySkillResources(
      supabase,
      skillKeys,
    )
    await Promise.all(
      libraryRows.map(async (s) => {
        await this.missionsRepository.internalUpsertAgentSkill(
          supabase,
          userId,
          orgId ?? null,
          agentKey,
          s.skill_key,
          s.name,
          s.description,
          s.markdown_content,
          'template',
        )
        const resources = (resourceRows ?? []).filter((r) => r.skill_key === s.skill_key)
        if (!resources.length) return
        await Promise.all(
          resources.map((resource) =>
            this.missionsRepository.internalUpsertAgentSkillResource(
              supabase,
              userId,
              agentKey,
              s.skill_key,
              String(resource.file_path ?? ''),
              String(resource.content ?? ''),
              orgId,
            ),
          ),
        )
      }),
    )
  }

  async seedLeaderSkills(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    archetype: string,
  ) {
    const templateKey = 'vibey_ceo'
    const skills = await this.missionsRepository.listTemplateSkills(supabase, templateKey)
    if (!skills.length) return
    await Promise.all(
      skills.map((s) =>
        this.missionsRepository.internalUpsertAgentSkill(
          supabase,
          userId,
          null,
          agentKey,
          s.skill_key,
          s.name,
          s.description,
          s.markdown_content,
          'template',
        ),
      ),
    )
  }

  /**
   * Org scopes already verified (or created) by `ensureLoopAgent` in this
   * process. The seeder runs on every `GET /api/agents` / `/api/agents/slim`
   * — the hottest read path on the team page — so without this memo the
   * existence check costs a DB round-trip per roster fetch.
   */
  private readonly loopAgentEnsuredOrgIds = new Set<string>()

  async ensureLoopAgent(supabase: SupabaseClient, userId: string, orgId?: string | null) {
    if (!orgId || !isLoopAgentRolloutOrg(orgId)) return
    const ensuredKey = orgId
    if (this.loopAgentEnsuredOrgIds.has(ensuredKey)) return

    const existing = await this.skillSeederRepository.findLoopAgent(supabase, orgId)

    if (existing) {
      if (existing.sync_status !== 'ready') {
        await this.missionsRepository.updateAgentSyncStatus(
          supabase,
          userId,
          'loop',
          'ready',
          orgId,
        )
      }
      this.loopAgentEnsuredOrgIds.add(ensuredKey)
      return
    }

    await this.skillSeederRepository.createLoopAgent(supabase, userId, orgId)
    this.loopAgentEnsuredOrgIds.add(ensuredKey)
  }

  async seedHrAgent(supabase: SupabaseClient, userId: string, orgId?: string | null) {
    const existing = await this.skillSeederRepository.findHrAgent(supabase, userId, orgId)
    if (existing) {
      if (existing.sync_status !== 'ready') {
        await this.missionsRepository.updateAgentSyncStatus(supabase, userId, 'hr', 'ready', orgId)
      }
      return
    }

    const definitions = await this.missionAgentTemplateService.loadTemplatePack(supabase, 'hr')
    await this.missionsRepository.createAgentWithDefinitions(
      supabase,
      userId,
      orgId ?? null,
      'hr',
      'Jaime',
      'Recruiter',
      'system',
      ['hiring', 'team-building', 'agent-design', 'disc-profiling'],
      null,
      definitions,
      { capability_profile: 'system_hr', capability_domain: 'management' },
    )
    await this.seedTemplateSkills(supabase, userId, 'hr', 'hr', orgId)
    await this.seedDefaultSkills(supabase, userId, 'hr', orgId)
    await this.missionsRepository.updateAgentSyncStatus(supabase, userId, 'hr', 'ready', orgId)
  }
}
