import { describe, expect, it, vi } from 'vitest'
import { MissionDeliverablesRepository } from '../persistence/mission-deliverables.repository'

function createService() {
  return new MissionDeliverablesRepository() as any
}

describe('Mission deliverable repository', () => {
  it('does not expose a fallback insert method', () => {
    const service = createService()
    expect(typeof service.createOrUpdateDeliverable).toBe('undefined')
  })

  it('detects tool-authored deliverables by metadata source', async () => {
    const service = createService()
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            contains: vi.fn(() => ({
              limit: vi.fn(async () => ({
                data: [{ id: 'deliverable-1' }],
                error: null,
              })),
            })),
          })),
        })),
      })),
    } as any

    const result = await service.hasToolAuthoredDeliverables(supabase, 'mission-1')
    expect(result).toBe(true)
  })

  it('returns latest tool-authored deliverable id', async () => {
    const service = createService()
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            contains: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => ({
                    data: { id: 'deliverable-latest' },
                    error: null,
                  })),
                })),
              })),
            })),
          })),
        })),
      })),
    } as any

    const result = await service.getLatestToolAuthoredDeliverableId(supabase, 'mission-1')
    expect(result).toBe('deliverable-latest')
  })

  it('verifies document output contracts against tool-authored mission deliverables', async () => {
    const service = createService()
    const supabase = {
      from: vi.fn((table: string) => {
        if (table !== 'mission_deliverables') throw new Error(`Unexpected table ${table}`)
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              contains: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn(async () => ({
                      data: { id: 'deliverable-doc', type: 'doc', title: 'Final Markdown' },
                      error: null,
                    })),
                  })),
                })),
              })),
            })),
          })),
        }
      }),
    } as any

    const result = await service.verifyOutputContract(supabase, 'mission-1', {
      artifact_kind: 'document_artifact',
      required_action: 'save_document',
      required_artifact_type: 'doc',
    })

    expect(result).toEqual({
      ok: true,
      expected_action: 'save_document',
      expected_artifact_type: 'doc',
      found_artifact_id: 'deliverable-doc',
      recovery: 'corrective_run',
    })
  })

  it('verifies preferred artifact-manifest deliverable ids before mission-wide latest fallback', async () => {
    const service = createService()
    const query: any = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      contains: vi.fn(() => query),
      in: vi.fn(() => query),
      order: vi.fn(async () => ({
        data: [
          {
            id: 'deliverable-current',
            type: 'doc',
            title: 'Current subtask doc',
            source_action: 'save_document',
            metadata: { source: 'agent_tool', source_action: 'save_document' },
          },
        ],
        error: null,
      })),
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table !== 'mission_deliverables') throw new Error(`Unexpected table ${table}`)
        return query
      }),
    } as any

    const result = await service.verifyOutputContract(
      supabase,
      'mission-1',
      {
        artifact_kind: 'document_artifact',
        required_action: 'save_document',
        required_artifact_type: 'doc',
      },
      ['deliverable-current'],
    )

    expect(query.in).toHaveBeenCalledWith('id', ['deliverable-current'])
    expect(result).toMatchObject({
      ok: true,
      found_artifact_id: 'deliverable-current',
    })
  })

  it('rejects preferred deliverables created by the wrong action', async () => {
    const service = createService()
    const query: any = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      contains: vi.fn(() => query),
      in: vi.fn(() => query),
      order: vi.fn(async () => ({
        data: [
          {
            id: 'deliverable-brief',
            type: 'doc',
            title: 'Image fallback brief',
            source_action: 'save_document',
            metadata: { source: 'agent_tool', source_action: 'save_document' },
          },
        ],
        error: null,
      })),
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table !== 'mission_deliverables') throw new Error(`Unexpected table ${table}`)
        return query
      }),
    } as any

    const result = await service.verifyOutputContract(
      supabase,
      'mission-1',
      {
        artifact_kind: 'document_artifact',
        required_action: 'generate_image',
        required_artifact_type: 'doc',
      },
      ['deliverable-brief'],
    )

    expect(result).toMatchObject({
      ok: false,
      reason: expect.stringContaining('expected generate_image'),
      expected_action: 'generate_image',
    })
  })

  it('rejects missing document output contracts with corrective-run recovery', async () => {
    const service = createService()
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            contains: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => ({ data: null, error: null })),
                })),
              })),
            })),
          })),
        })),
      })),
    } as any

    const result = await service.verifyOutputContract(supabase, 'mission-1', {
      artifact_kind: 'document_artifact',
      required_action: 'save_document',
      required_artifact_type: 'doc',
    })

    expect(result).toMatchObject({
      ok: false,
      reason: expect.stringContaining('Missing required doc deliverable'),
      expected_action: 'save_document',
      expected_artifact_type: 'doc',
      recovery: 'corrective_run',
    })
  })

  it('verifies docx output contracts by file mime type', async () => {
    const service = createService()
    const supabase = {
      from: vi.fn((table: string) => {
        if (table !== 'mission_deliverables') throw new Error(`Unexpected table ${table}`)
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              contains: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn(async () => ({
                      data: {
                        id: 'deliverable-docx',
                        type: 'file',
                        title: 'Final Word Doc',
                        mime_type:
                          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        source_action: 'create_docx',
                        metadata: { source_action: 'create_docx' },
                      },
                      error: null,
                    })),
                  })),
                })),
              })),
            })),
          })),
        }
      }),
    } as any

    const result = await service.verifyOutputContract(supabase, 'mission-1', {
      artifact_kind: 'document_artifact',
      required_action: 'create_docx',
      required_artifact_type: 'file',
      expected: {
        mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        source_action: 'create_docx',
      },
    })

    expect(result).toEqual({
      ok: true,
      expected_action: 'create_docx',
      expected_artifact_type: 'file',
      found_artifact_id: 'deliverable-docx',
      recovery: 'corrective_run',
    })
  })

  it('verifies agent skill contracts against agent_skills rows', async () => {
    const service = createService()
    const skillQuery = {
      select: vi.fn(() => skillQuery),
      eq: vi.fn(() => skillQuery),
      is: vi.fn(() => skillQuery),
      maybeSingle: vi.fn(async () => ({
        data: { id: 'skill-1', skill_key: 'transcript-processor' },
        error: null,
      })),
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table !== 'agent_skills') throw new Error(`Unexpected table ${table}`)
        return skillQuery
      }),
    } as any

    const result = await service.verifyOutputContract(supabase, 'mission-1', {
      artifact_kind: 'agent_skill',
      required_action: 'create_agent_skill',
      required_artifact_type: 'agent_skill',
      expected: {
        agent_key: 'zane',
        skill_key: 'transcript-processor',
        org_id: 'org-1',
      },
    })

    expect(result).toEqual({
      ok: true,
      expected_action: 'create_agent_skill',
      expected_artifact_type: 'agent_skill',
      found_artifact_id: 'skill-1',
      recovery: 'vibey_replan',
    })
  })

  it('formats non-text deliverable from content_json', async () => {
    const service = createService()
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: {
                    title: 'Structured output',
                    type: 'doc',
                    content: null,
                    content_json: { sections: [{ title: 'A' }] },
                    file_url: null,
                  },
                  error: null,
                })),
              })),
            })),
          })),
        })),
      })),
    } as any

    const result = await service.getExistingDeliverable(supabase, 'mission-1')
    expect(result).toContain('"sections"')
  })
})
