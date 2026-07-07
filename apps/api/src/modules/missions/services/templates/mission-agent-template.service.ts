import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ensurePlatformToolsRuntimeGuidance, PLATFORM_TOOLS_DEFAULT_MD } from '@vibey/agent-policy'
import { MissionsRepository } from '../../repositories/missions.repository'

@Injectable()
export class MissionAgentTemplateService {
  constructor(private readonly missionsRepository: MissionsRepository) {}

  async loadLeadershipTemplatePack(
    supabase: SupabaseClient,
    archetype: string,
    styleLabel: string,
    styleDescription: string,
  ): Promise<Array<{ file_name: string; content: string }>> {
    const templateKey = 'ceo'
    const definitions = await this.loadTemplatePack(supabase, templateKey)
    return definitions.map((d) =>
      d.file_name === 'IDENTITY.md'
        ? {
            file_name: d.file_name,
            content: this.appendSelectedStyle(d.content, styleLabel, styleDescription),
          }
        : d,
    )
  }

  async loadTemplatePack(
    supabase: SupabaseClient,
    templateKey: string,
  ): Promise<Array<{ file_name: string; content: string }>> {
    const definitions = await this.missionsRepository.listTemplateDefinitions(supabase, templateKey)
    if (!definitions.length) {
      throw new Error(`Template not found in database: ${templateKey}`)
    }
    return definitions
  }

  appendSelectedStyle(content: string, styleLabel: string, styleDescription: string): string {
    return `${content.trim()}\n\n## Selected Style\n\n- **Selected Style:** ${styleLabel}\n- **Style Description:** ${styleDescription}\n`
  }

  async ensureDynamicAgentDefinitionPack(
    definitions: Array<{ file_name: string; content: string }>,
    name: string,
    role: string,
    level: string,
  ): Promise<Array<{ file_name: string; content: string }>> {
    const byFile = new Map<string, string>()
    for (const item of definitions) {
      const file = item?.file_name?.trim()
      const content = item?.content
      if (!file || !content) continue
      byFile.set(file.toUpperCase(), content)
    }

    if (!byFile.has('AGENTS.MD')) {
      byFile.set(
        'AGENTS.MD',
        '# AGENTS.md\n\nFollow ROLE.md, SOUL.md, IDENTITY.md, and TOOLS.md.\n',
      )
    }
    if (!byFile.has('TOOLS.MD')) {
      byFile.set('TOOLS.MD', PLATFORM_TOOLS_DEFAULT_MD)
    } else {
      const existingTools = byFile.get('TOOLS.MD')!
      byFile.set('TOOLS.MD', ensurePlatformToolsRuntimeGuidance(existingTools))
    }
    if (!byFile.has('IDENTITY.MD')) {
      byFile.set(
        'IDENTITY.MD',
        `# IDENTITY.md — ${name}\n\n- **Role Archetype:** ${role}\n- **Level:** ${level}\n`,
      )
    }
    if (!byFile.has('ROLE.MD')) {
      byFile.set('ROLE.MD', `# ROLE.md — ${name}\n\n## Purpose\n\n${role}\n`)
    }
    if (!byFile.has('SOUL.MD')) {
      byFile.set(
        'SOUL.MD',
        `# SOUL.md — ${name}\n\n## Who I Am\n\nI am ${name}, serving as ${role}.\n`,
      )
    }

    return ['AGENTS.md', 'IDENTITY.md', 'ROLE.md', 'SOUL.md', 'TOOLS.md'].map((fileName) => ({
      file_name: fileName,
      content: byFile.get(fileName.toUpperCase()) ?? '',
    }))
  }
}
