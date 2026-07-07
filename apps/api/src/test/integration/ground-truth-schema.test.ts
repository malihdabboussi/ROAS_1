import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

const REQUIRED_WITH_ORG = [
  'campaigns',
  'missions',
  'agents_registry',
  'conversations',
  'media_assets',
  'avatars',
  'blog_posts',
  'domains',
  'funnels',
  'leads',
  'offers',
  'presentations',
  'project_repos',
  'segments',
  'sequences',
  'social_posts',
  'user_notifications',
  'agent_awareness_points',
  'contact_custom_field_definitions',
]

const REQUIRED_WITHOUT_ORG = [
  'email_settings',
  'sequence_emails',
  'funnel_pages',
  'ads',
  'messages',
  'conversation_documents',
  'profiles',
  'user_profiles',
  'user_subscriptions',
]

function hasRealDbEnv() {
  return (
    !!process.env.GROUND_TRUTH_DB_URL &&
    !!process.env.GROUND_TRUTH_DB_SERVICE_ROLE_KEY &&
    process.env.GROUND_TRUTH_DB_URL !== 'https://test.supabase.co'
  )
}

describe('Ground Truth Schema Validation', () => {
  it('requires explicit real DB env to run', () => {
    expect(typeof hasRealDbEnv()).toBe('boolean')
  })

  it.skipIf(!hasRealDbEnv())(
    'validates org_id schema and RLS flags against live database',
    async () => {
      const client = createClient(
        process.env.GROUND_TRUTH_DB_URL!,
        process.env.GROUND_TRUTH_DB_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      )

      const sql = `
      WITH cols AS (
        SELECT table_name, BOOL_OR(column_name = 'org_id') AS has_org_id
        FROM information_schema.columns
        WHERE table_schema = 'public'
        GROUP BY table_name
      ),
      rls AS (
        SELECT tablename AS table_name, rowsecurity
        FROM pg_tables
        WHERE schemaname = 'public'
      )
      SELECT c.table_name, c.has_org_id, COALESCE(r.rowsecurity, false) AS rowsecurity
      FROM cols c
      LEFT JOIN rls r ON r.table_name = c.table_name
      WHERE c.table_name = ANY($1::text[])
      ORDER BY c.table_name;
    `

      const allTables = [...REQUIRED_WITH_ORG, ...REQUIRED_WITHOUT_ORG]
      const { data, error } = await client.rpc('exec_sql_json', {
        query: sql,
        params: JSON.stringify([allTables]),
      } as never)

      if (error) throw error
      expect(Array.isArray(data)).toBe(true)

      const rows = (data ?? []) as Array<{
        table_name: string
        has_org_id: boolean
        rowsecurity: boolean
      }>
      const map = new Map(rows.map((r) => [r.table_name, r]))

      for (const table of REQUIRED_WITH_ORG) {
        const row = map.get(table)
        expect(row, `${table} missing from schema snapshot`).toBeTruthy()
        expect(row?.has_org_id, `${table} must have org_id`).toBe(true)
        expect(row?.rowsecurity, `${table} must have rowsecurity enabled`).toBe(true)
      }

      for (const table of REQUIRED_WITHOUT_ORG) {
        const row = map.get(table)
        expect(row, `${table} missing from schema snapshot`).toBeTruthy()
        expect(row?.has_org_id, `${table} must not have org_id`).toBe(false)
        expect(row?.rowsecurity, `${table} must have rowsecurity enabled`).toBe(true)
      }
    },
  )
})
