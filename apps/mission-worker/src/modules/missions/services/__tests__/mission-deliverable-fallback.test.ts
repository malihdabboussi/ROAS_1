import { describe, expect, it, vi } from 'vitest'
import { evaluateDeliverableContractRow } from '../persistence/mission-deliverable-contract-evaluator'
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

  it('rejects a document with the wrong contracted title', async () => {
    const result = evaluateDeliverableContractRow(
      {
        id: 'deliverable-audit',
        type: 'doc',
        title: 'ADS-A#1 - Live Meta Account Audit',
        metadata: { source_action: 'save_document' },
      },
      {
        artifact_kind: 'document_artifact',
        required_action: 'save_document',
        required_artifact_type: 'doc',
        expected: { title: 'ADS-A#2 - Optimization Recommendations' },
      },
    )

    expect(result).toMatchObject({
      ok: false,
      reason: expect.stringContaining('expected title ADS-A#2 - Optimization Recommendations'),
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

    expect(result).toMatchObject({
      ok: true,
      found_artifact_id: 'deliverable-current',
    })
  })

  it('maps a Space document manifest id to its mission deliverable wrapper', async () => {
    const service = createService()
    const query: any = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      contains: vi.fn(() => query),
      order: vi.fn(async () => ({
        data: [
          {
            id: 'mission-deliverable-1',
            entity_id: 'space-doc-1',
            entity_table: 'space_items',
            type: 'doc',
            title: 'ADS-A#2 - Optimization Recommendations',
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
        expected: { title: 'ADS-A#2 - Optimization Recommendations' },
      },
      ['space-doc-1'],
    )

    expect(result).toMatchObject({
      ok: true,
      found_artifact_id: 'mission-deliverable-1',
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

  it('rejects an incomplete preferred media batch when the contract requires several images', async () => {
    const service = createService()
    const query: any = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      contains: vi.fn(() => query),
      in: vi.fn(() => query),
      order: vi.fn(async () => ({
        data: [
          {
            id: 'image-1',
            type: 'image',
            source_action: 'process_media',
            metadata: { source: 'agent_tool', source_action: 'process_media' },
          },
          {
            id: 'image-2',
            type: 'image',
            source_action: 'process_media',
            metadata: { source: 'agent_tool', source_action: 'process_media' },
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
        artifact_kind: 'media_artifact',
        required_action: 'process_media',
        required_artifact_type: 'image',
        expected: { minimum_count: 3 },
      },
      ['image-1', 'image-2'],
    )

    expect(result).toMatchObject({
      ok: false,
      reason: 'Found 2 matching image deliverables, expected at least 3',
      recovery: 'corrective_run',
    })
  })

  it('selects the latest matching contract type when concurrent subtasks publish artifacts', async () => {
    const service = createService()
    const preferredQuery: any = {
      select: vi.fn(() => preferredQuery),
      eq: vi.fn(() => preferredQuery),
      contains: vi.fn(() => preferredQuery),
      in: vi.fn(() => preferredQuery),
      order: vi.fn(async () => ({ data: [], error: null })),
    }
    const latestQuery: any = {
      select: vi.fn(() => latestQuery),
      eq: vi.fn(() => latestQuery),
      contains: vi.fn(() => latestQuery),
      order: vi.fn(() => latestQuery),
      limit: vi.fn(() => latestQuery),
      maybeSingle: vi.fn(async () => ({
        data: {
          id: 'deliverable-deck',
          type: 'presentation',
          source_action: 'create_presentation',
          metadata: { source: 'agent_tool', entity_id: 'presentation-entity' },
        },
        error: null,
      })),
    }
    const matchingQuery: any = {
      select: vi.fn(() => matchingQuery),
      eq: vi.fn(() => matchingQuery),
      contains: vi.fn(() => matchingQuery),
      order: vi.fn(() => matchingQuery),
      limit: vi.fn(async () => ({
        data: [
          {
            id: 'deliverable-funnel',
            type: 'funnel',
            source_action: 'create_funnel',
            metadata: {
              source: 'agent_tool',
              entity_id: 'funnel-entity',
              source_action: 'create_funnel',
            },
          },
        ],
        error: null,
      })),
    }
    let queryCount = 0
    const supabase = {
      from: vi.fn((table: string) => {
        if (table !== 'mission_deliverables') throw new Error(`Unexpected table ${table}`)
        queryCount += 1
        if (queryCount === 1) return preferredQuery
        if (queryCount === 2) return latestQuery
        return matchingQuery
      }),
    } as any

    const result = await service.verifyOutputContract(
      supabase,
      'mission-1',
      {
        artifact_kind: 'funnel_artifact',
        required_action: 'create_funnel',
        required_artifact_type: 'funnel',
      },
      ['funnel-entity'],
    )

    expect(matchingQuery.eq).toHaveBeenCalledWith('type', 'funnel')
    expect(result).toMatchObject({
      ok: true,
      found_artifact_id: 'deliverable-funnel',
    })
  })

  it('rejects a funnel contract when no campaign media is attached', async () => {
    const service = createService()
    const deliverable = {
      id: 'deliverable-funnel',
      type: 'funnel',
      source_action: 'create_funnel',
      metadata: {
        source: 'agent_tool',
        entity_id: 'funnel-entity',
        source_action: 'create_funnel',
      },
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'mission_deliverables') {
          const query: any = {
            select: vi.fn(() => query),
            eq: vi.fn(() => query),
            contains: vi.fn(() => query),
            in: vi.fn(() => query),
            order: vi.fn(async () => ({ data: [deliverable], error: null })),
          }
          return query
        }
        if (table === 'funnel_assets') {
          const query: any = {
            select: vi.fn(() => query),
            eq: vi.fn(() => query),
            limit: vi.fn(async () => ({ data: [], error: null })),
          }
          return query
        }
        throw new Error(`Unexpected table ${table}`)
      }),
    } as any

    const result = await service.verifyOutputContract(
      supabase,
      'mission-1',
      {
        artifact_kind: 'funnel_artifact',
        required_action: 'create_funnel',
        required_artifact_type: 'funnel',
        expected: { require_attached_assets: true },
      },
      ['deliverable-funnel'],
    )

    expect(result).toMatchObject({ ok: false, recovery: 'corrective_run' })
    expect(result.reason).toMatch(/no attached media assets/i)
  })

  it('rejects funnel HTML that still contains visual asset placeholders', async () => {
    const service = createService()
    const deliverable = {
      id: 'deliverable-funnel',
      type: 'funnel',
      source_action: 'create_funnel',
      metadata: {
        source: 'agent_tool',
        entity_id: 'funnel-entity',
        source_action: 'create_funnel',
      },
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'mission_deliverables') {
          const query: any = {
            select: vi.fn(() => query),
            eq: vi.fn(() => query),
            contains: vi.fn(() => query),
            in: vi.fn(() => query),
            order: vi.fn(async () => ({ data: [deliverable], error: null })),
          }
          return query
        }
        if (table === 'funnel_files') {
          const query: any = {
            select: vi.fn(() => query),
            eq: vi.fn(async () => ({
              data: [{ path: 'index.html', content: '[Gavin headshot — confirm from Drive]' }],
              error: null,
            })),
          }
          return query
        }
        throw new Error(`Unexpected table ${table}`)
      }),
    } as any

    const result = await service.verifyOutputContract(
      supabase,
      'mission-1',
      {
        artifact_kind: 'funnel_artifact',
        required_action: 'create_funnel',
        required_artifact_type: 'funnel',
        expected: { forbid_asset_placeholders: true },
      },
      ['deliverable-funnel'],
    )

    expect(result.reason).toMatch(/visual asset placeholder/i)
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
