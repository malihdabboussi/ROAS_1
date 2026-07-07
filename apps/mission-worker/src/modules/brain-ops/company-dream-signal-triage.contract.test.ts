import { describe, expect, it, vi } from 'vitest'

type DreamGroup = {
  id: string
  source: 'conversation' | 'channel_thread' | 'space_activity' | 'deliverable'
  turns: Array<{ role: 'user' | 'assistant' | 'agent' | 'system' | 'tool'; text: string }>
  metadata?: Record<string, unknown>
}

type TriageResult = {
  included: Array<{ id: string; reason: string; labels?: string[] }>
  skipped: Array<{ id: string; reason: string }>
}

async function loadTriageService() {
  const modulePath = './company-dream-signal-triage.service'
  const mod = await import(modulePath)
  expect(mod.CompanyDreamSignalTriageService).toBeTypeOf('function')
  return mod.CompanyDreamSignalTriageService as new (deps: {
    semanticClassifier: {
      classifyGroups(groups: DreamGroup[]): Promise<Array<{ id: string; labels: string[] }>>
    }
  }) => {
    triageGroups(groups: DreamGroup[], options: { maxGroups: number }): Promise<TriageResult>
  }
}

describe('CompanyDreamSignalTriageService contract', () => {
  it('includes indirect taste praise even when phrase rules would miss it', async () => {
    const CompanyDreamSignalTriageService = await loadTriageService()
    const classifyGroups = vi
      .fn()
      .mockResolvedValue([{ id: 'short-taste', labels: ['taste_positive'] }])
    const service = new CompanyDreamSignalTriageService({
      semanticClassifier: { classifyGroups },
    })

    const result = await service.triageGroups(
      [
        {
          id: 'short-taste',
          source: 'conversation',
          turns: [
            { role: 'user', text: "I love how it's not in your face." },
            { role: 'assistant', text: 'Got it.' },
          ],
        },
      ],
      { maxGroups: 10 },
    )

    expect(result.included.map((group) => group.id)).toContain('short-taste')
    expect(result.included[0]?.labels).toContain('taste_positive')
    expect(classifyGroups).toHaveBeenCalled()
  })

  it('includes short explicit agent-behavior corrections regardless of length', async () => {
    const CompanyDreamSignalTriageService = await loadTriageService()
    const classifyGroups = vi.fn().mockResolvedValue([])
    const service = new CompanyDreamSignalTriageService({
      semanticClassifier: { classifyGroups },
    })

    const result = await service.triageGroups(
      [
        {
          id: 'autonomy-correction',
          source: 'conversation',
          turns: [
            { role: 'user', text: 'Never create tasks automatically. Ask me first.' },
            { role: 'assistant', text: 'Understood.' },
          ],
        },
      ],
      { maxGroups: 10 },
    )

    expect(result.included.map((group) => group.id)).toContain('autonomy-correction')
  })

  it('excludes low-context acknowledgements', async () => {
    const CompanyDreamSignalTriageService = await loadTriageService()
    const service = new CompanyDreamSignalTriageService({
      semanticClassifier: { classifyGroups: vi.fn().mockResolvedValue([]) },
    })

    const result = await service.triageGroups(
      [
        {
          id: 'thanks-only',
          source: 'conversation',
          turns: [
            { role: 'user', text: 'thanks' },
            { role: 'assistant', text: 'Anytime.' },
          ],
        },
      ],
      { maxGroups: 10 },
    )

    expect(result.included.map((group) => group.id)).not.toContain('thanks-only')
    expect(result.skipped.map((group) => group.id)).toContain('thanks-only')
  })

  it('hard-excludes long assistant output with no human follow-up', async () => {
    const CompanyDreamSignalTriageService = await loadTriageService()
    const classifyGroups = vi.fn().mockResolvedValue([{ id: 'agent-monologue', labels: [] }])
    const service = new CompanyDreamSignalTriageService({
      semanticClassifier: { classifyGroups },
    })

    const result = await service.triageGroups(
      [
        {
          id: 'agent-monologue',
          source: 'conversation',
          turns: [
            { role: 'user', text: 'Write the plan.' },
            { role: 'assistant', text: 'Here is the plan.\n'.repeat(500) },
          ],
        },
      ],
      { maxGroups: 10 },
    )

    expect(result.included.map((group) => group.id)).not.toContain('agent-monologue')
    expect(classifyGroups).not.toHaveBeenCalled()
  })
})
