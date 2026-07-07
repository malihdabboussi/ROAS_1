#!/usr/bin/env tsx
/**
 * Upserts agency flow templates into space_automation_templates.
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm tsx scripts/seed-agency-automation-templates.ts
 */
import { createClient } from '@supabase/supabase-js'
import { AGENCY_AUTOMATION_TEMPLATES } from '../apps/api/src/modules/spaces/data/space-automation-template-catalog-agency'

function getEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

async function main(): Promise<void> {
  const supabase = createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  })

  for (const row of AGENCY_AUTOMATION_TEMPLATES) {
    const payload = {
      template_key: row.template_key,
      title: row.title,
      description: row.description,
      badge: row.badge ?? '',
      featured: row.featured ?? false,
      is_new: row.is_new ?? false,
      workflows: row.workflows,
      integration: row.integration ?? null,
      trigger_group: row.trigger_group ?? null,
      body: row.body,
      sort_order: row.sort_order ?? 400,
      is_active: true,
      updated_at: new Date().toISOString(),
    }

    const { data: existing } = await supabase
      .from('space_automation_templates')
      .select('id')
      .eq('template_key', row.template_key)
      .maybeSingle()

    if (existing?.id) {
      const { error } = await supabase
        .from('space_automation_templates')
        .update(payload)
        .eq('id', existing.id)
      if (error) throw new Error(`update ${row.template_key}: ${error.message}`)
    } else {
      const { error } = await supabase.from('space_automation_templates').insert(payload)
      if (error) throw new Error(`insert ${row.template_key}: ${error.message}`)
    }
    console.log(`  ${row.template_key}`)
  }
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
