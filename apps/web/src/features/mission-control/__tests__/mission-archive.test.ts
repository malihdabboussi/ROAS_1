import { describe, it } from 'vitest'

describe('Mission Archive Migration', () => {
  it.todo('uses backendPatch(/api/missions/:id/status) instead of direct supabase update')
  it.todo('keeps archiving loading state until request finishes')
  it.todo('shows error toast when backendPatch throws')
  it.todo('does not send unsupported fields to status DTO')
})
