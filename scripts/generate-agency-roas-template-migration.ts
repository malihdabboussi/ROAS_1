#!/usr/bin/env tsx
/**
 * Generates supabase/migrations/*_agency_roas_ad_kit_template.sql from the TS catalog.
 */
import { writeFileSync } from 'node:fs'
import * as path from 'node:path'
import { AGENCY_AUTOMATION_TEMPLATES } from '../apps/api/src/modules/spaces/data/space-automation-template-catalog-agency'

const REPO_ROOT = path.resolve(__dirname, '..')
const template = AGENCY_AUTOMATION_TEMPLATES.find((row) => row.template_key === 'agency-roas-ad-kit-slack')
if (!template) throw new Error('agency-roas-ad-kit-slack not found in catalog')

const OUT = path.join(REPO_ROOT, 'supabase/migrations/20260630201000_agency_roas_ad_kit_template.sql')
const bodyJson = JSON.stringify(template.body)

const sql = `-- Agency ROAS Ad Kit (Slack) preset — concepts → copy → human gate → design.
BEGIN;

INSERT INTO public.space_automation_templates (
  template_key,
  title,
  description,
  badge,
  featured,
  is_new,
  workflows,
  integration,
  trigger_group,
  body,
  sort_order
)
VALUES (
  '${template.template_key}',
  '${template.title.replace(/'/g, "''")}',
  '${template.description.replace(/'/g, "''")}',
  '${template.badge?.replace(/'/g, "''") ?? ''}',
  ${template.featured ?? false},
  ${template.is_new ?? false},
  ARRAY['agency_ops']::text[],
  'slack',
  'slack',
  '${bodyJson.replace(/'/g, "''")}'::jsonb,
  ${template.sort_order ?? 420}
)
ON CONFLICT (template_key) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  badge = EXCLUDED.badge,
  featured = EXCLUDED.featured,
  is_new = EXCLUDED.is_new,
  workflows = EXCLUDED.workflows,
  integration = EXCLUDED.integration,
  trigger_group = EXCLUDED.trigger_group,
  body = EXCLUDED.body,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

COMMIT;
`

writeFileSync(OUT, sql)
console.log(`Wrote ${OUT}`)
