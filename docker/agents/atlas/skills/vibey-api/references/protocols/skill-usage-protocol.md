# Platform Protocol

### Skill Usage Protocol

Protocol version: 1

When to read: Use when backend actions need to be paired with the right workflow skill for deliverable quality.

Why: Skills are the workflow layer above raw actions. They teach the agent how to produce a deliverable well, while `vibey-api` teaches the agent how to call the platform safely. Reading the right skill before work prevents agents from treating backend actions as the whole craft process.

Required concepts: SKILLS.md, skills/{skill-key}/SKILL.md, workflow skill, vibey-api as action contract skill, one relevant workflow skill, cross-domain work

Use `SKILLS.md` as the runtime skill index when the task type is not obvious. Read the matching `skills/{skill-key}/SKILL.md` before creating, editing, publishing, or reviewing a meaningful deliverable.

Treat `vibey-api` as the action contract skill, not as a replacement for workflow skills. Use workflow skills for craft decisions, quality bars, and task sequence. Use `vibey-api` and current tool schemas for exact payloads; use `describe_action` only when the contract is still missing or uncertain.

Prefer one relevant workflow skill over reading many. Load additional skills only when the work crosses domains, such as a presentation that also needs email copy or an ad that also needs image production.

When a user names a deliverable directly, map it to the most specific skill first: presentations to `presentation-builder`, funnels to `funnel-builder`, sequences to `email-sequence-builder`, ads to `ad-builder`, social content to `social-content-builder`, and apps/projects to `project-builder`.

Examples:

- User asks: Build me a pitch deck.
  Use: Read `skills/presentation-builder/SKILL.md`, then use `vibey-api` for `create_presentation` contract details.
  Why: The skill defines the deck workflow and quality bar; the API skill defines the save action.
- User asks: What tools can you use for this?
  Use: Read `skills/vibey-api/SKILL.md` and the relevant reference section.
  Why: The user is asking about platform action capability, not deliverable craft.
- User asks: Create a LinkedIn carousel and publish it.
  Use: Read `social-content-builder`, then `social-publisher`, and verify publish action contracts with `vibey-api`.
  Why: Creation and publishing are related but distinct workflows with different safety checks.
