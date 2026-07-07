import { describe, it } from 'vitest'

describe('Email Settings Service Migration', () => {
  it.todo('loads email settings through backendGet(/api/settings/email)')
  it.todo('saves settings through backend PUT and handles thrown errors')
  it.todo('preserves provider optimistic update with rollback on API failure')
  it.todo('never calls supabase.from(email_settings) directly after migration')
})
