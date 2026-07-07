# Verification: Delete Skill Content, Template Skills, and Employee Library (DB as Source of Truth)

## Files to Delete

| File                                                                          | Purpose                                                                          |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `apps/api/src/modules/missions/services/data/mission-skill-content.data.ts`   | Skill markdown bodies (SKILL_KNOWLEDGE_EXTRACTION, SKILL_BRAIN_OPERATIONS, etc.) |
| `apps/api/src/modules/missions/services/data/mission-template-skills.data.ts` | TEMPLATE_SKILLS map (template_key → skills with markdown_content)                |
| `apps/api/src/modules/missions/services/data/ready-employee-library.data.ts`  | READY_EMPLOYEE_LIBRARY (employee profiles for hire flow)                         |

## Consumers (Code Only)

**Single consumer:** `apps/api/src/modules/missions/services/templates/agent-template-catalog-seeder.service.ts`

| Import                                | Used In                            | Purpose                                                          |
| ------------------------------------- | ---------------------------------- | ---------------------------------------------------------------- |
| READY_EMPLOYEE_LIBRARY                | seedEmployeeTemplatesFromConstants | Seeds agent_employee_templates when count = 0                    |
| TEMPLATE_SKILLS                       | seedTemplateSkillsFromConstants    | Seeds agent_template_skills when count = 0                       |
| SKILL_ROUTING, SKILL_DELEGATION, etc. | seedLeaderAndHrTemplateSkills      | Seeds vibey_ceo, vibey_coo, hr skills into agent_template_skills |

## Runtime Flow (Already DB-First)

- **listReadyEmployeeLibrary** → reads from `agent_employee_templates` + `agent_template_skills` (DB)
- **hireReadyEmployee** → reads from `agent_employee_templates` (DB), copies from `agent_template_skills` (DB) via missionSkillSeederService.seedTemplateSkills
- **MissionSkillSeederService.seedTemplateSkills** → reads from `agent_template_skills` (DB), writes to `agent_skills` (DB)

The constants are **only** used by the seeder for initial bootstrap when tables are empty.

## DB State

- **agent_employee_templates**: Seeded by migration `20260312143000_agent_employee_templates.sql` (includes brain_scholar)
- **agent_template_skills**: NOT seeded by migration. Populated by seeder on first run (when count = 0). Production DB already has data from prior seeding.

## Prerequisites Before Deletion

1. **Migration required** for `agent_template_skills` — fresh installs need initial data. Current migration only creates the table.
2. **Modify seeder** — remove seedTemplateSkillsFromConstants, seedEmployeeTemplatesFromConstants, seedLeaderAndHrTemplateSkills; remove imports.

## Conclusion

**Nothing else uses these files.** Only the seeder does. Safe to delete after:

- Adding migration to seed agent_template_skills (for fresh installs)
- Updating agent-template-catalog-seeder to remove constant-based seeding
