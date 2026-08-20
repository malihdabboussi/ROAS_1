import { describe, expect, it, vi } from 'vitest'
import { CompanyCortexFormationService } from '../company-cortex-formation.service'

describe('CompanyCortexFormationService', () => {
  const service = new CompanyCortexFormationService(
    {} as never,
    {} as never,
    {
      tryParseJsonStrict: (content: string) => JSON.parse(content) as Record<string, unknown>,
    } as never,
  )

  it('parseOperations extracts relations and drops invalid title refs on resolve', () => {
    const content = JSON.stringify({
      operations: [
        {
          object_type: 'belief',
          title: 'Alpha',
          truth: 'Alpha truth',
          source_signal_ids: ['sig-1'],
          evidence_refs: [{ type: 'company_signal', id: 'sig-1' }],
          retrieval_rule: { trigger: 'alpha question', context_form: 'Use Alpha truth.' },
        },
        {
          object_type: 'tension',
          title: 'Beta',
          truth: 'Beta truth',
          source_signal_ids: ['sig-2'],
          evidence_refs: [{ type: 'company_signal', id: 'sig-2' }],
          retrieval_rule: { trigger: 'beta question', context_form: 'Use Beta truth.' },
        },
      ],
      relations: [
        { from_title: 'Beta', to_title: 'Alpha', type: 'contains', confidence: 0.9 },
        { from_title: 'Beta', to_title: 'Missing', type: 'supports', confidence: 0.5 },
        { from_title: 'Beta', to_title: 'Alpha', type: 'contains', confidence: 0.8 },
      ],
    })

    const { relations } = service.parseOperations(content, {
      orgId: 'org-1',
      brainId: 'brain-1',
      activeSignalIds: new Set(['sig-1', 'sig-2']),
    })
    const titleToId = new Map([
      ['alpha', 'id-alpha'],
      ['beta', 'id-beta'],
    ])
    const edges = service.resolveRelations(relations, titleToId, {
      orgId: 'org-1',
      brainId: 'brain-1',
    })

    expect(edges).toHaveLength(1)
    expect(edges[0]).toMatchObject({
      source_object_id: 'id-beta',
      target_object_id: 'id-alpha',
      relation_type: 'contains',
      confidence: 0.9,
    })
  })

  it('drops formation operations without reviewed lineage, evidence, or retrieval rules', () => {
    const content = JSON.stringify({
      operations: [
        {
          object_type: 'belief',
          title: 'No evidence',
          truth: 'Missing evidence refs.',
          source_signal_ids: ['sig-1'],
          retrieval_rule: { trigger: 'question', context_form: 'Answer.' },
        },
        {
          object_type: 'belief',
          title: 'Unreviewed',
          truth: 'References a signal outside the reviewed set.',
          source_signal_ids: ['sig-2'],
          evidence_refs: [{ type: 'company_signal', id: 'sig-2' }],
          retrieval_rule: { trigger: 'question', context_form: 'Answer.' },
        },
        {
          object_type: 'belief',
          title: 'Complete',
          truth: 'Complete reviewed formation.',
          source_signal_ids: ['sig-1'],
          evidence_refs: [{ type: 'company_signal', id: 'sig-1' }],
          retrieval_rule: { trigger: 'question', context_form: 'Answer.' },
        },
      ],
    })

    const { objects, signalIds } = service.parseOperations(content, {
      orgId: 'org-1',
      brainId: 'brain-1',
      activeSignalIds: new Set(['sig-1']),
    })

    expect(objects).toHaveLength(1)
    expect(objects[0]).toMatchObject({ title: 'Complete', source_signal_ids: ['sig-1'] })
    expect(signalIds).toEqual(['sig-1'])
  })

  it('retries once when Atlas formation JSON is invalid, then returns parseable content', async () => {
    const callOpenClawRaw = vi
      .fn()
      .mockResolvedValueOnce({ content: 'not-json' })
      .mockResolvedValueOnce({ content: '{"operations":[],"relations":[]}' })
    const retryService = new CompanyCortexFormationService(
      { callOpenClawRaw } as never,
      {} as never,
      {
        tryParseJsonStrict: (content: string) => {
          try {
            return JSON.parse(content) as Record<string, unknown>
          } catch {
            return null
          }
        },
      } as never,
    )

    const content = await (retryService as any).callAtlasWithJsonRetry(
      { id: 'outbox-1' },
      'original prompt',
      'company_cortex_formation',
    )

    expect(content).toBe('{"operations":[],"relations":[]}')
    expect(callOpenClawRaw).toHaveBeenCalledTimes(2)
    expect(callOpenClawRaw.mock.calls[1]?.[3]).toContain(
      'Your previous response could not be parsed as JSON.',
    )
  })

  it('warns and returns zeros when no active signals are eligible for formation', async () => {
    const listFormationSignals = vi.fn().mockResolvedValue([])
    const warn = vi.fn()
    const service = new CompanyCortexFormationService(
      {} as never,
      { listFormationSignals } as never,
      {} as never,
    )
    ;(service as { logger: { warn: typeof warn } }).logger = { warn } as never

    const result = await service.runFormation({
      outboxId: 'outbox-empty',
      userId: 'user-1',
      orgId: 'org-1',
      brainId: 'brain-1',
      payload: { signal_ids: ['missing'] },
    })

    expect(result).toEqual({ objectsCreated: 0, edgesCreated: 0, signalsMerged: 0 })
    expect(listFormationSignals).toHaveBeenCalledWith({
      brainId: 'brain-1',
      limit: 50,
      signalIds: ['missing'],
    })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('zero active signals eligible'))
  })
})
