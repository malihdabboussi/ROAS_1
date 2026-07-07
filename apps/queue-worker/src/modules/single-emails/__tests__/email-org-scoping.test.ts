import { describe, it } from 'vitest'

describe('Queue Worker Single Email Org Scoping', () => {
  it.todo('uses orgId from job payload when selecting email_settings')
  it.todo('falls back to personal email settings when orgId is absent')
  it.todo('never reads another org settings row for same user')
})
