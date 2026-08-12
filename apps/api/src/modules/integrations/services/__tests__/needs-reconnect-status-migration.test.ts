import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = resolve(
  process.cwd(),
  '../../supabase/migrations/20260812180000_allow_integration_needs_reconnect_status.sql',
)

const migrationOrderPath = resolve(process.cwd(), '../../scripts/roas/migration-order.txt')

function migrationSql(): string {
  return readFileSync(migrationPath, 'utf8')
}

describe('allow integration needs_reconnect status migration', () => {
  it('drops the existing status check idempotently before re-adding it', () => {
    const sql = migrationSql()

    expect(sql).toMatch(/DROP CONSTRAINT IF EXISTS user_integrations_status_check/i)
    expect(sql).toMatch(/ADD CONSTRAINT user_integrations_status_check/i)
  })

  it('allows every status the API writes, including needs_reconnect', () => {
    const sql = migrationSql()

    for (const status of ['pending', 'connected', 'needs_reconnect', 'error', 'disconnected']) {
      expect(sql).toContain(`'${status}'`)
    }
  })

  it('is registered in the migration apply order', () => {
    const order = readFileSync(migrationOrderPath, 'utf8')

    expect(order).toContain('20260812180000_allow_integration_needs_reconnect_status.sql')
  })
})
