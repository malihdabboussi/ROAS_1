import { existsSync } from 'fs'
import * as fs from 'fs/promises'
import * as path from 'path'
import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isSystemTemplateKey } from '../../lib/system-agent-keys'
import { MissionsRepository } from '../../repositories/missions.repository'

@Injectable()
export class AgentTemplateCatalogSeederService {
  private readonly logger = new Logger(AgentTemplateCatalogSeederService.name)
  private seeded = false

  constructor(private readonly missionsRepository: MissionsRepository) {}

  async ensureSeeded(supabase: SupabaseClient): Promise<void> {
    if (this.seeded) return
    await this.seedMissingTemplateDefinitions(supabase)
    const count = await this.missionsRepository.countTemplateSkillAssignmentsForCatalogSeed(
      supabase,
    )
    if ((count ?? 0) > 0) {
      this.seeded = true
      return
    }

    await this.seedTemplateDefinitionsFromFilesystem(supabase)
    // Note: system-agent template skills (vibey/atlas/hr/viktor/brain_scholar/widget_builder)
    // are NOT seeded into agent_template_skills/template_skill_assignments. System agents
    // read content from the canonical (NULL,NULL) rows directly via agent-sync; there is
    // no per-user clone path for them.
    this.seeded = true
    this.logger.log('Seeded agent template catalog tables from local source files')
  }

  private async seedMissingTemplateDefinitions(supabase: SupabaseClient): Promise<void> {
    const employeeTemplates =
      await this.missionsRepository.listEnabledEmployeeTemplateKeysForCatalogSeed(supabase)
    const templateKeys = [...new Set((employeeTemplates ?? []).map((r) => r.template_key))].filter(
      (k) => !isSystemTemplateKey(k),
    )
    if (!templateKeys.length) return

    const existing = await this.missionsRepository.listExistingTemplateKeysForCatalogSeed(
      supabase,
      templateKeys,
    )
    const existingKeys = new Set((existing ?? []).map((r) => r.template_key))
    const missingKeys = templateKeys.filter((k) => !existingKeys.has(k))
    if (!missingKeys.length) return

    const templatesRoot = this.resolveExistingDir(['docker', 'agents', 'templates'])
    const requiredFiles = ['AGENTS.md', 'IDENTITY.md', 'ROLE.md', 'SOUL.md', 'TOOLS.md']
    for (const templateKey of missingKeys) {
      const dir = path.join(templatesRoot, templateKey)
      if (!existsSync(dir)) continue
      for (const fileName of requiredFiles) {
        const target = path.join(dir, fileName)
        if (!existsSync(target)) continue
        const content = await fs.readFile(target, 'utf-8')
        await this.missionsRepository.upsertTemplateDefinition(supabase, {
          template_key: templateKey,
          name: templateKey,
          role: templateKey,
          level: this.inferLevel(templateKey),
          file_name: fileName,
          content,
        })
      }
      this.logger.log(`Seeded missing template definitions for ${templateKey}`)
    }
  }

  private async seedTemplateDefinitionsFromFilesystem(supabase: SupabaseClient): Promise<void> {
    const templatesRoot = this.resolveExistingDir(['docker', 'agents', 'templates'])
    const entries = await fs.readdir(templatesRoot, { withFileTypes: true })
    const requiredFiles = ['AGENTS.md', 'IDENTITY.md', 'ROLE.md', 'SOUL.md', 'TOOLS.md']

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (isSystemTemplateKey(entry.name)) continue
      for (const fileName of requiredFiles) {
        const target = path.join(templatesRoot, entry.name, fileName)
        if (!existsSync(target)) continue
        const content = await fs.readFile(target, 'utf-8')
        await this.missionsRepository.upsertTemplateDefinition(supabase, {
          template_key: entry.name,
          name: entry.name,
          role: entry.name,
          level: this.inferLevel(entry.name),
          file_name: fileName,
          content,
        })
      }
    }

    // Note: vibey + hr template definitions are NOT seeded here; system agents
    // read directly from canonical agent_definitions (NULL,NULL) rows and do
    // not use the per-user template-clone path.
    const baseRoot = this.resolveExistingDir(['docker', 'agents'])
    for (const key of ['employee']) {
      for (const fileName of requiredFiles) {
        const target = path.join(baseRoot, key, fileName)
        if (!existsSync(target)) continue
        const content = await fs.readFile(target, 'utf-8')
        await this.missionsRepository.upsertTemplateDefinition(supabase, {
          template_key: key,
          name: key,
          role: key,
          level: 'system',
          file_name: fileName,
          content,
        })
      }
    }

    // Note: HR template definitions removed from this seeder. HR is a system agent;
    // its content lives in the canonical agent_definitions (NULL,NULL) rows shipped
    // by scripts/seed-system-agents.ts.
    const hrFiles: Array<{ file_name: string; content: string }> = [
      {
        file_name: 'AGENTS.md',
        content:
          '# AGENTS.md — HR Agent\n\nYou are the HR agent inside Vibey. You help users grow their AI team through conversation.\n',
      },
      {
        file_name: 'IDENTITY.md',
        content:
          '# IDENTITY.md — HR Agent\n\n- **Role Archetype:** HR / Recruiter\n- **Level:** System Agent (always available)\n',
      },
      {
        file_name: 'ROLE.md',
        content:
          '# ROLE.md — HR Agent\n\n## Purpose\n\nHelp users build their AI team. Interview them about their needs, propose a role and personality, and create the agent.\n',
      },
      {
        file_name: 'SOUL.md',
        content:
          '# SOUL.md — HR Agent\n\n## Who I Am\n\nI am the recruiter — the one who builds teams.\n',
      },
      {
        file_name: 'TOOLS.md',
        content:
          '# TOOLS.md — HR Agent Tools\n\nUse `vibey_backend` actions for hiring, team listing, and skill listing.\n',
      },
    ]
    // HR template definitions intentionally not seeded — HR is a system agent.
    void hrFiles
  }

  private inferLevel(templateKey: string): 'system' | 'c_level' | 'manager' | 'employee' {
    if (templateKey === 'ceo' || templateKey === 'cfo') return 'c_level'
    if (['pm_marketing', 'pm_product', 'pm_operations', 'coach'].includes(templateKey)) {
      return 'manager'
    }
    if (['vibey', 'employee', 'hr', 'shared'].includes(templateKey)) return 'system'
    if (['customer_support', 'customer_success', 'customer_coach'].includes(templateKey)) {
      return 'employee'
    }
    return 'employee'
  }

  private resolveExistingDir(parts: string[]): string {
    const candidates = [
      path.join(process.cwd(), ...parts),
      path.join(process.cwd(), 'apps', 'api', ...parts),
      path.join(path.resolve(__dirname, '../../../../../../../'), ...parts),
      path.join(path.resolve(__dirname, '../../../../../../../'), 'apps', 'api', ...parts),
    ]
    const existing = candidates.find((candidate) => existsSync(candidate))
    if (!existing) {
      throw new Error(`Could not resolve path: ${parts.join('/')}`)
    }
    return existing
  }
}
