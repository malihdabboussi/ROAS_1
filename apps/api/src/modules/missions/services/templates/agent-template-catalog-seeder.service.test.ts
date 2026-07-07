import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { MissionsRepository } from '../../repositories/missions.repository'
import { AgentTemplateCatalogSeederService } from './agent-template-catalog-seeder.service'

function createSeededCatalogSupabase() {
  const employeeQuery = {
    select: vi.fn(() => employeeQuery),
    eq: vi.fn().mockResolvedValue({ data: [], error: null }),
  }
  const assignmentsQuery = {
    select: vi.fn().mockResolvedValue({ count: 1, error: null }),
  }
  const supabase = {
    from: vi.fn((table: string) => {
      if (table === 'agent_employee_templates') return employeeQuery
      if (table === 'template_skill_assignments') return assignmentsQuery
      throw new Error(`Unexpected table ${table}`)
    }),
  }

  return {
    supabase: supabase as unknown as SupabaseClient,
    from: supabase.from,
    employeeQuery,
    assignmentsQuery,
  }
}

describe('AgentTemplateCatalogSeederService', () => {
  it('marks the catalog seeded when template skill assignments already exist', async () => {
    const { supabase, from, employeeQuery, assignmentsQuery } = createSeededCatalogSupabase()
    const service = new AgentTemplateCatalogSeederService(new MissionsRepository())

    await service.ensureSeeded(supabase)
    await service.ensureSeeded(supabase)

    expect(from).toHaveBeenCalledTimes(2)
    expect(employeeQuery.select).toHaveBeenCalledWith('template_key')
    expect(employeeQuery.eq).toHaveBeenCalledWith('is_enabled', true)
    expect(assignmentsQuery.select).toHaveBeenCalledWith('*', { count: 'exact', head: true })
  })
})
