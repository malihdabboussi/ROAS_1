import { describe, expect, it } from 'vitest'

type Call = {
  table: string
  action: string
  filters?: Array<{ column: string; value: unknown }>
}

function makeClient(calls: Call[]) {
  const makeChain = (table: string) => {
    const filters: Array<{ column: string; value: unknown }> = []
    const chain: Record<string, unknown> = {
      select() {
        return chain
      },
      eq(column: string, value: unknown) {
        filters.push({ column, value })
        return chain
      },
      in(column: string, value: unknown) {
        filters.push({ column, value })
        return chain
      },
      order() {
        return chain
      },
      limit() {
        return chain
      },
      async maybeSingle() {
        calls.push({ table, action: 'maybeSingle', filters: [...filters] })
        return { data: { id: 'company-brain-1', org_id: 'org-1', scope: 'company' }, error: null }
      },
      then(resolve: (value: { data: unknown[]; error: null }) => unknown) {
        calls.push({ table, action: 'then', filters: [...filters] })
        return Promise.resolve({
          data: [
            {
              id: 'standard-1',
              object_type: 'standard',
              title: 'Subtle positioning',
              truth: 'The company prefers subtle customer-facing copy.',
              status: 'active',
              confidence: 0.9,
              retrieval_rule: {
                trigger: 'sales follow-up, outbound email, customer-facing copy',
                context_form: 'Keep customer-facing copy subtle and non-pushy.',
              },
            },
            {
              id: 'protocol-1',
              object_type: 'protocol',
              title: 'Approval before mutation',
              truth: 'Agents ask before creating workspace tasks.',
              status: 'active',
              confidence: 0.85,
              retrieval_rule: {
                trigger: 'task creation, workspace mutation, automation',
                context_form: 'Ask before creating or changing workspace objects.',
              },
            },
            {
              id: 'irrelevant-1',
              object_type: 'decision',
              title: 'Hiring cadence',
              truth: 'The company hires slowly.',
              status: 'active',
              confidence: 0.8,
              retrieval_rule: { trigger: 'hiring' },
            },
          ],
          error: null,
        }).then(resolve)
      },
    }
    return chain
  }
  return { from: (table: string) => makeChain(table) }
}

async function loadCompiler() {
  const mod = await import('./company-context-compiler.service')
  expect(mod.CompanyContextCompilerService).toBeTypeOf('function')
  return mod.CompanyContextCompilerService as new (svc: { client: unknown }) => {
    buildCompanyContext(input: {
      orgId: string | null
      userId: string
      query?: string
      agentKey?: string
      taskType?: string
    }): Promise<string>
  }
}

describe('CompanyContextCompilerService', () => {
  it('selects task-relevant company objects and omits irrelevant company memory', async () => {
    const calls: Call[] = []
    const Compiler = await loadCompiler()
    const compiler = new Compiler({ client: makeClient(calls) })

    const context = await compiler.buildCompanyContext({
      orgId: 'org-1',
      userId: 'user-1',
      agentKey: 'ivy',
      taskType: 'sales_follow_up',
      query: 'Write a customer-facing sales follow-up email.',
    })

    expect(context).toContain('COMPANY OPERATING CONTEXT')
    expect(context).toContain('Keep customer-facing copy subtle and non-pushy.')
    expect(context).not.toContain('The company hires slowly.')
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'ns_brains',
          action: 'maybeSingle',
          filters: expect.arrayContaining([{ column: 'scope', value: 'company' }]),
        }),
        expect.objectContaining({
          table: 'company_cortex_objects',
          action: 'then',
          filters: expect.arrayContaining([
            { column: 'brain_id', value: 'company-brain-1' },
            { column: 'status', value: 'active' },
          ]),
        }),
      ]),
    )
  })

  it('returns empty context outside org scope', async () => {
    const Compiler = await loadCompiler()
    const compiler = new Compiler({ client: makeClient([]) })

    await expect(
      compiler.buildCompanyContext({ orgId: null, userId: 'user-1', query: 'Anything' }),
    ).resolves.toBe('')
  })
})
