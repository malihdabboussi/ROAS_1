#!/usr/bin/env tsx
/**
 * Generates supabase/migrations/*_webinar_pipeline_skills.sql from docker
 * template skill folders (skill_library + template_skill_assignments +
 * system agent_skills dual-write). Binary assets get NULL storage_url rows —
 * run scripts/seed-webinar-pipeline-skills.ts to upload them.
 *
 * Apply to ROAS with:
 *   ./scripts/roas/apply-via-supabase-api.sh supabase/migrations/<file>.sql
 */
import { existsSync, writeFileSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import * as path from 'node:path'

const REPO_ROOT = path.resolve(__dirname, '..')
const OUT = path.join(
  REPO_ROOT,
  'supabase/migrations/20260716251000_webinar_pipeline_skills_with_emails.sql',
)

const BINARY_EXT = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.ttf',
  '.otf',
  '.woff',
  '.woff2',
])

type SkillSeed = {
  skillKey: string
  templateKeys: string[]
  /** Docker folder owner (first template with the skill on disk). */
  diskAgent: string
  category: string
  /** Existing skill that identifies already-hired agents needing this new skill. */
  existingAgentMarkerSkillKey?: string
}

const SKILLS: SkillSeed[] = [
  {
    skillKey: 'roas-market-research',
    templateKeys: ['ads_manager', 'strategist'],
    diskAgent: 'ads_manager',
    category: 'agency_research',
  },
  {
    skillKey: 'roas-ad-kit',
    templateKeys: ['ads_manager'],
    diskAgent: 'ads_manager',
    category: 'agency_ads',
  },
  {
    skillKey: 'roas-ad-design',
    templateKeys: ['ads_manager'],
    diskAgent: 'ads_manager',
    category: 'agency_ads',
  },
  {
    skillKey: 'roas-webinar-audit',
    templateKeys: ['ads_manager'],
    diskAgent: 'ads_manager',
    category: 'agency_ads',
  },
  {
    skillKey: 'roas-webinar-copy-package',
    templateKeys: ['copywriter'],
    diskAgent: 'copywriter',
    category: 'agency_copy',
  },
  {
    skillKey: 'roas-webinar-emails',
    templateKeys: ['copywriter'],
    diskAgent: 'copywriter',
    category: 'agency_copy',
    existingAgentMarkerSkillKey: 'roas-webinar-copy-package',
  },
  {
    skillKey: 'roas-webinar-topics',
    templateKeys: ['copywriter'],
    diskAgent: 'copywriter',
    category: 'agency_copy',
  },
  {
    skillKey: 'roas-landing-page-copy',
    templateKeys: ['copywriter'],
    diskAgent: 'copywriter',
    category: 'agency_copy',
  },
  {
    skillKey: 'roas-video-ad-scripts',
    templateKeys: ['copywriter'],
    diskAgent: 'copywriter',
    category: 'agency_copy',
  },
  {
    skillKey: 'roas-image-brief',
    templateKeys: ['designer'],
    diskAgent: 'designer',
    category: 'agency_design',
  },
  {
    skillKey: 'roas-funnel-design',
    templateKeys: ['designer'],
    diskAgent: 'designer',
    category: 'agency_design',
  },
  {
    skillKey: 'roas-webinar-deck',
    templateKeys: ['designer'],
    diskAgent: 'designer',
    category: 'agency_design',
  },
  {
    skillKey: 'instagram-carousel-design',
    templateKeys: ['designer'],
    diskAgent: 'designer',
    category: 'agency_design',
  },
]

/** Existing library skill — assign to copywriter so Phase B voice pass resolves. */
const EXTRA_ASSIGNMENTS: Array<{
  templateKey: string
  skillKey: string
  existingAgentMarkerSkillKey?: string
}> = [
  {
    templateKey: 'copywriter',
    skillKey: 'dylans-super-voice',
    existingAgentMarkerSkillKey: 'roas-webinar-copy-package',
  },
]

function parseSkillFrontmatter(markdown: string): {
  name: string
  description: string
  body: string
} {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/)
  if (!match) {
    return { name: 'Untitled', description: '', body: markdown.trim() }
  }
  const yaml = match[1]
  const name = (yaml.match(/^name:\s*(.+)$/m)?.[1] ?? '').trim().replace(/^["']|["']$/g, '')
  const description = (yaml.match(/^description:\s*(.+)$/m)?.[1] ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
  return { name: name || 'Untitled', description, body: markdown.slice(match[0].length).trim() }
}

function sqlQuote(tag: string, content: string): string {
  return `$${tag}$${content}$${tag}$`
}

function displayName(skillKey: string, frontmatterName: string): string {
  const base = frontmatterName || skillKey
  return base
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}

function contentTypeForPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.py') return 'text/x-python'
  if (ext === '.md') return 'text/markdown'
  if (ext === '.json') return 'application/json'
  if (ext === '.ttf') return 'font/ttf'
  if (ext === '.otf') return 'font/otf'
  if (BINARY_EXT.has(ext) && ext.startsWith('.jp')) return 'image/jpeg'
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif') return 'image/gif'
  return 'text/plain'
}

async function walkResources(
  skillDir: string,
): Promise<Array<{ relPath: string; absPath: string }>> {
  const out: Array<{ relPath: string; absPath: string }> = []
  async function walk(dir: string, prefix: string): Promise<void> {
    if (!existsSync(dir)) return
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const absPath = path.join(dir, entry.name)
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) await walk(absPath, relPath)
      else out.push({ relPath, absPath })
    }
  }
  for (const sub of ['references', 'assets'] as const) {
    await walk(path.join(skillDir, sub), sub)
  }
  return out
}

function skillDirFor(diskAgent: string, skillKey: string): string {
  return path.join(REPO_ROOT, 'docker/agents/templates', diskAgent, 'skills', skillKey)
}

function appendExistingAgentBackfill(
  lines: string[],
  skillKey: string,
  markerSkillKey: string,
): void {
  lines.push(`-- Backfill ${skillKey} to already-hired agents carrying ${markerSkillKey}`)
  lines.push(`INSERT INTO public.agent_skills (`)
  lines.push(
    `  user_id, org_id, agent_key, skill_key, name, description, markdown_content, is_enabled, source`,
  )
  lines.push(`)`)
  lines.push(`SELECT`)
  lines.push(
    `  marker.user_id, marker.org_id, marker.agent_key, library.skill_key, library.name, library.description, library.markdown_content, true, 'template'`,
  )
  lines.push(`FROM public.agent_skills marker`)
  lines.push(`CROSS JOIN public.skill_library library`)
  lines.push(`WHERE marker.skill_key = '${markerSkillKey}'`)
  lines.push(`  AND library.skill_key = '${skillKey}'`)
  lines.push(`  AND (marker.user_id IS NOT NULL OR marker.org_id IS NOT NULL)`)
  lines.push(`  AND marker.source IN ('template', 'system', 'default')`)
  lines.push(`  AND NOT EXISTS (`)
  lines.push(`    SELECT 1 FROM public.agent_skills existing`)
  lines.push(`    WHERE existing.agent_key = marker.agent_key`)
  lines.push(`      AND existing.skill_key = library.skill_key`)
  lines.push(`      AND existing.user_id IS NOT DISTINCT FROM marker.user_id`)
  lines.push(`      AND existing.org_id IS NOT DISTINCT FROM marker.org_id`)
  lines.push(`  );`)
  lines.push('')

  lines.push(`INSERT INTO public.agent_skill_resources (`)
  lines.push(
    `  user_id, org_id, agent_key, skill_key, file_path, content, content_type, storage_url`,
  )
  lines.push(`)`)
  lines.push(`SELECT`)
  lines.push(
    `  target.user_id, target.org_id, target.agent_key, resource.skill_key, resource.file_path, resource.content, resource.content_type, NULL`,
  )
  lines.push(`FROM public.agent_skills target`)
  lines.push(`JOIN public.skill_library_resources resource`)
  lines.push(`  ON resource.skill_key = target.skill_key`)
  lines.push(`WHERE target.skill_key = '${skillKey}'`)
  lines.push(`  AND (target.user_id IS NOT NULL OR target.org_id IS NOT NULL)`)
  lines.push(`  AND NOT EXISTS (`)
  lines.push(`    SELECT 1 FROM public.agent_skill_resources existing`)
  lines.push(`    WHERE existing.agent_key = target.agent_key`)
  lines.push(`      AND existing.skill_key = target.skill_key`)
  lines.push(`      AND existing.file_path = resource.file_path`)
  lines.push(`      AND existing.user_id IS NOT DISTINCT FROM target.user_id`)
  lines.push(`      AND existing.org_id IS NOT DISTINCT FROM target.org_id`)
  lines.push(`  );`)
  lines.push('')
}

async function main(): Promise<void> {
  const lines: string[] = [
    '-- Webinar fulfillment Phase B/C skills (skill_library + template assignments).',
    '-- Generated by scripts/generate-webinar-pipeline-skills-migration.ts',
    '-- Binary assets: run scripts/seed-webinar-pipeline-skills.ts after migrate.',
    '-- Includes the complete webinar email + SMS skill and supporting references.',
    'BEGIN;',
    '',
  ]

  for (const skill of SKILLS) {
    const dir = skillDirFor(skill.diskAgent, skill.skillKey)
    const skillPath = path.join(dir, 'SKILL.md')
    if (!existsSync(skillPath)) throw new Error(`Missing ${skillPath}`)

    const markdown = await readFile(skillPath, 'utf-8')
    const { name, description, body } = parseSkillFrontmatter(markdown)
    if (name !== skill.skillKey) {
      console.warn(
        `WARN: frontmatter name "${name}" !== folder/key "${skill.skillKey}" — migration uses folder key`,
      )
    }
    const tag = skill.skillKey.replace(/[^a-z0-9]+/gi, '_')

    lines.push(`-- ${skill.skillKey} (${skill.templateKeys.join(', ')})`)
    lines.push(
      `INSERT INTO public.skill_library (skill_key, name, description, markdown_content, category, updated_at)`,
    )
    lines.push(`VALUES (`)
    lines.push(`  '${skill.skillKey}',`)
    lines.push(`  ${sqlQuote(`${tag}_name`, displayName(skill.skillKey, name))},`)
    lines.push(`  ${sqlQuote(`${tag}_desc`, description)},`)
    lines.push(`  ${sqlQuote(`${tag}_body`, body)},`)
    lines.push(`  '${skill.category}',`)
    lines.push(`  now()`)
    lines.push(`)`)
    lines.push(`ON CONFLICT (skill_key) DO UPDATE SET`)
    lines.push(`  name = EXCLUDED.name,`)
    lines.push(`  description = EXCLUDED.description,`)
    lines.push(`  markdown_content = EXCLUDED.markdown_content,`)
    lines.push(`  category = EXCLUDED.category,`)
    lines.push(`  updated_at = now();`)
    lines.push('')

    for (const { relPath, absPath } of await walkResources(dir)) {
      const ext = path.extname(relPath).toLowerCase()
      const isBinary = BINARY_EXT.has(ext)
      const contentType = contentTypeForPath(relPath)
      const rtag = `${tag}_${relPath.replace(/[^a-z0-9]+/gi, '_')}`

      if (isBinary) {
        // Text-only library table historically; binaries live on agent_skill_resources.
        for (const agentKey of skill.templateKeys) {
          lines.push(
            `INSERT INTO public.agent_skill_resources (user_id, org_id, agent_key, skill_key, file_path, content, content_type, storage_url)`,
          )
          lines.push(
            `SELECT NULL, NULL, '${agentKey}', '${skill.skillKey}', '${relPath}', NULL, '${contentType}', NULL`,
          )
          lines.push(`WHERE NOT EXISTS (`)
          lines.push(`  SELECT 1 FROM public.agent_skill_resources`)
          lines.push(`   WHERE user_id IS NULL AND org_id IS NULL AND agent_key = '${agentKey}'`)
          lines.push(`     AND skill_key = '${skill.skillKey}' AND file_path = '${relPath}'`)
          lines.push(`);`)
          lines.push('')
        }
        continue
      }

      const content = await readFile(absPath, 'utf-8')
      lines.push(
        `INSERT INTO public.skill_library_resources (skill_key, file_path, content, content_type)`,
      )
      lines.push(
        `VALUES ('${skill.skillKey}', '${relPath}', ${sqlQuote(rtag, content)}, '${contentType}')`,
      )
      lines.push(`ON CONFLICT (skill_key, file_path) DO UPDATE SET`)
      lines.push(`  content = EXCLUDED.content,`)
      lines.push(`  content_type = EXCLUDED.content_type;`)
      lines.push('')
    }

    for (const templateKey of skill.templateKeys) {
      lines.push(
        `INSERT INTO public.template_skill_assignments (template_key, skill_key, is_enabled)`,
      )
      lines.push(`VALUES ('${templateKey}', '${skill.skillKey}', true)`)
      lines.push(`ON CONFLICT (template_key, skill_key) DO UPDATE SET is_enabled = true;`)
      lines.push('')

      // Dual-write system agent_skills so existing ads_manager/designer/copywriter
      // runtimes that read agent_skills (not only skill_library) pick up updates.
      lines.push(`INSERT INTO public.agent_skills (`)
      lines.push(
        `  user_id, org_id, agent_key, skill_key, name, description, markdown_content, is_enabled, source`,
      )
      lines.push(`)`)
      lines.push(`SELECT`)
      lines.push(
        `  NULL, NULL, '${templateKey}', skill_key, name, description, markdown_content, true, 'system'`,
      )
      lines.push(`FROM public.skill_library`)
      lines.push(`WHERE skill_key = '${skill.skillKey}'`)
      lines.push(
        `ON CONFLICT (agent_key, skill_key) WHERE user_id IS NULL AND org_id IS NULL DO UPDATE SET`,
      )
      lines.push(`  name = EXCLUDED.name,`)
      lines.push(`  description = EXCLUDED.description,`)
      lines.push(`  markdown_content = EXCLUDED.markdown_content,`)
      lines.push(`  is_enabled = true,`)
      lines.push(`  source = 'system',`)
      lines.push(`  updated_at = now();`)
      lines.push('')

      // Mirror text resources onto system agent_skill_resources for the owner agent.
      lines.push(`INSERT INTO public.agent_skill_resources (`)
      lines.push(
        `  user_id, org_id, agent_key, skill_key, file_path, content, content_type, storage_url`,
      )
      lines.push(`)`)
      lines.push(`SELECT`)
      lines.push(
        `  NULL, NULL, '${templateKey}', r.skill_key, r.file_path, r.content, r.content_type, NULL`,
      )
      lines.push(`FROM public.skill_library_resources r`)
      lines.push(`WHERE r.skill_key = '${skill.skillKey}'`)
      lines.push(
        `ON CONFLICT (agent_key, skill_key, file_path) WHERE user_id IS NULL AND org_id IS NULL DO UPDATE SET`,
      )
      lines.push(`  content = EXCLUDED.content,`)
      lines.push(`  content_type = EXCLUDED.content_type,`)
      lines.push(`  updated_at = now();`)
      lines.push('')
    }

    if (skill.existingAgentMarkerSkillKey) {
      appendExistingAgentBackfill(lines, skill.skillKey, skill.existingAgentMarkerSkillKey)
    }
  }

  for (const extra of EXTRA_ASSIGNMENTS) {
    lines.push(
      `-- Extra assignment: ${extra.skillKey} → ${extra.templateKey} (skill already in library)`,
    )
    lines.push(
      `INSERT INTO public.template_skill_assignments (template_key, skill_key, is_enabled)`,
    )
    lines.push(`VALUES ('${extra.templateKey}', '${extra.skillKey}', true)`)
    lines.push(`ON CONFLICT (template_key, skill_key) DO UPDATE SET is_enabled = true;`)
    lines.push('')
    if (extra.existingAgentMarkerSkillKey) {
      appendExistingAgentBackfill(lines, extra.skillKey, extra.existingAgentMarkerSkillKey)
    }
  }

  // Refresh hired agent copies (template/system/default) so existing workspaces pick up Phase B/C bodies.
  lines.push('-- Backfill hired agent_skills copies from refreshed skill_library')
  lines.push(`UPDATE public.agent_skills AS s`)
  lines.push(`SET`)
  lines.push(`  name = l.name,`)
  lines.push(`  description = l.description,`)
  lines.push(`  markdown_content = l.markdown_content,`)
  lines.push(`  updated_at = now()`)
  lines.push(`FROM public.skill_library AS l`)
  lines.push(`WHERE s.skill_key = l.skill_key`)
  lines.push(`  AND s.source IN ('template', 'system', 'default')`)
  lines.push(`  AND s.skill_key IN (${SKILLS.map((s) => `'${s.skillKey}'`).join(', ')});`)
  lines.push('')

  lines.push('COMMIT;')
  lines.push('')

  writeFileSync(OUT, lines.join('\n'), 'utf-8')
  console.log(`Wrote ${OUT}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
