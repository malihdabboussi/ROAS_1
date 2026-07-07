#!/usr/bin/env tsx
/**
 * Generates supabase/migrations/*_roas_ad_skills.sql from docker skill files.
 * Text resources are inlined; PNG rows are inserted with NULL storage_url
 * (run scripts/seed-roas-ad-skills.ts to upload binaries).
 */
import { existsSync, writeFileSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import * as path from 'node:path'

const REPO_ROOT = path.resolve(__dirname, '..')
const SKILLS_DIR = path.join(REPO_ROOT, 'docker/agents/templates/ads_manager/skills')
const AGENT_KEY = 'ads_manager'
const SKILL_KEYS = [
  'human-written-copy',
  'roas-ad-concepts',
  'roas-ad-copy',
  'roas-ad-kit',
  'roas-ad-design',
] as const
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif'])
const OUT = path.join(REPO_ROOT, 'supabase/migrations/20260630200000_roas_ad_skills.sql')

function parseSkillFrontmatter(markdown: string): { name: string; description: string } {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return { name: 'Untitled', description: '' }
  const yaml = match[1]
  const name = (yaml.match(/^name:\s*(.+)$/m)?.[1] ?? '').trim().replace(/^["']|["']$/g, '')
  const description = (yaml.match(/^description:\s*(.+)$/m)?.[1] ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
  return { name: name || 'Untitled', description }
}

function sqlQuote(tag: string, content: string): string {
  return `$${tag}$${content}$${tag}$`
}

async function walkDir(dir: string, prefix: string): Promise<Array<{ relPath: string; absPath: string }>> {
  if (!existsSync(dir)) return []
  const entries = await readdir(dir, { withFileTypes: true })
  const out: Array<{ relPath: string; absPath: string }> = []
  for (const entry of entries) {
    const absPath = path.join(dir, entry.name)
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      out.push(...(await walkDir(absPath, relPath)))
    } else {
      out.push({ relPath, absPath })
    }
  }
  return out
}

async function main(): Promise<void> {
  const lines: string[] = [
    '-- ROAS ad skills for ads_manager (Blaze). Binary assets: run scripts/seed-roas-ad-skills.ts after migrate.',
    'BEGIN;',
    '',
  ]

  for (const skillKey of SKILL_KEYS) {
    const skillDir = path.join(SKILLS_DIR, skillKey)
    const markdown = await readFile(path.join(skillDir, 'SKILL.md'), 'utf-8')
    const { name, description } = parseSkillFrontmatter(markdown)
    const tag = `skill_${skillKey.replace(/-/g, '_')}`

    lines.push(`-- ${skillKey}`)
    lines.push(`INSERT INTO public.agent_skills (`)
    lines.push(`  user_id, org_id, agent_key, skill_key, name, description, markdown_content, is_enabled, source`)
    lines.push(`)`)
    lines.push(`SELECT NULL, NULL, '${AGENT_KEY}', '${skillKey}',`)
    lines.push(`  ${sqlQuote(`${tag}_name`, name)},`)
    lines.push(`  ${sqlQuote(`${tag}_desc`, description)},`)
    lines.push(`  ${sqlQuote(`${tag}_body`, markdown)},`)
    lines.push(`  true, 'system'`)
    lines.push(`WHERE NOT EXISTS (`)
    lines.push(`  SELECT 1 FROM public.agent_skills`)
    lines.push(`   WHERE user_id IS NULL AND org_id IS NULL`)
    lines.push(`     AND agent_key = '${AGENT_KEY}' AND skill_key = '${skillKey}'`)
    lines.push(`);`)
    lines.push('')

    for (const sub of ['references', 'assets'] as const) {
      const files = await walkDir(path.join(skillDir, sub), sub)
      for (const { relPath, absPath } of files) {
        const ext = path.extname(relPath).toLowerCase()
        const isImage = IMAGE_EXT.has(ext)
        const contentType =
          ext === '.py' ? 'text/x-python' : ext === '.md' ? 'text/markdown' : isImage ? 'image/png' : 'text/plain'

        if (isImage) {
          lines.push(
            `INSERT INTO public.agent_skill_resources (user_id, org_id, agent_key, skill_key, file_path, content, content_type, storage_url)`,
          )
          lines.push(
            `SELECT NULL, NULL, '${AGENT_KEY}', '${skillKey}', '${relPath}', NULL, '${contentType}', NULL`,
          )
          lines.push(`WHERE NOT EXISTS (`)
          lines.push(`  SELECT 1 FROM public.agent_skill_resources`)
          lines.push(`   WHERE user_id IS NULL AND org_id IS NULL`)
          lines.push(`     AND agent_key = '${AGENT_KEY}' AND skill_key = '${skillKey}' AND file_path = '${relPath}'`)
          lines.push(`);`)
        } else {
          const content = await readFile(absPath, 'utf-8')
          const rtag = `res_${skillKey.replace(/-/g, '_')}_${relPath.replace(/[^a-z0-9]/gi, '_')}`
          lines.push(
            `INSERT INTO public.agent_skill_resources (user_id, org_id, agent_key, skill_key, file_path, content, content_type)`,
          )
          lines.push(
            `SELECT NULL, NULL, '${AGENT_KEY}', '${skillKey}', '${relPath}', ${sqlQuote(rtag, content)}, '${contentType}'`,
          )
          lines.push(`WHERE NOT EXISTS (`)
          lines.push(`  SELECT 1 FROM public.agent_skill_resources`)
          lines.push(`   WHERE user_id IS NULL AND org_id IS NULL`)
          lines.push(`     AND agent_key = '${AGENT_KEY}' AND skill_key = '${skillKey}' AND file_path = '${relPath}'`)
          lines.push(`);`)
        }
      }
    }
    lines.push('')
  }

  lines.push(`UPDATE public.agents_registry`)
  lines.push(`   SET skills = (`)
  lines.push(`     SELECT COALESCE(jsonb_agg(DISTINCT to_jsonb(elem)), '[]'::jsonb)`)
  lines.push(`       FROM (`)
  lines.push(`         SELECT jsonb_array_elements_text(COALESCE(skills, '[]'::jsonb)) AS elem`)
  for (const skillKey of SKILL_KEYS) {
    lines.push(`         UNION ALL SELECT '${skillKey}'`)
  }
  lines.push(`       ) s`)
  lines.push(`   ),`)
  lines.push(`   updated_at = now()`)
  lines.push(` WHERE user_id IS NULL AND org_id IS NULL AND agent_key = '${AGENT_KEY}';`)
  lines.push('')
  lines.push('COMMIT;')

  writeFileSync(OUT, lines.join('\n') + '\n')
  console.log(`Wrote ${OUT} (${lines.length} lines)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
