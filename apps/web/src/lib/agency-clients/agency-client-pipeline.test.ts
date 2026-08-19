import { describe, expect, it } from 'vitest'
import {
  comparePipelineStages,
  formatPipelineStageLabel,
  groupClientsByPipeline,
  isDefaultHiddenClient,
  isDefaultHiddenPipelineStage,
  resolvePipelineSlug,
  visiblePipelineClients,
} from './agency-client-pipeline'

describe('agency client pipeline', () => {
  it('resolves Portal dropdown labels and slugs onto the canonical order', () => {
    expect(resolvePipelineSlug('NEW CLIENT INTAKE')).toBe('new_client_intake')
    expect(resolvePipelineSlug('active_happy')).toBe('active_happy')
    expect(resolvePipelineSlug('ACTIVE/HAPPY')).toBe('active_happy')
    expect(resolvePipelineSlug('active')).toBe('active_happy')
    expect(resolvePipelineSlug('CHURNED/INACTIVE')).toBe('churned_inactive')
    expect(resolvePipelineSlug('DONE WITH YOU / CONSULTING')).toBe('done_with_you_consulting')
  })

  it('hides inactive, blocked, and churned by default', () => {
    expect(isDefaultHiddenPipelineStage('INACTIVE')).toBe(true)
    expect(isDefaultHiddenPipelineStage('blocked')).toBe(true)
    expect(isDefaultHiddenPipelineStage('churned_inactive')).toBe(true)
    expect(isDefaultHiddenPipelineStage('paused')).toBe(false)
    expect(isDefaultHiddenPipelineStage('DONE WITH YOU / CONSULTING')).toBe(false)
    expect(
      isDefaultHiddenClient({
        status: 'active',
        config: { external_sources: { page_grader: { pipeline_stage: 'blocked' } } },
      }),
    ).toBe(true)
  })

  it('orders stages in the Portal pipeline sequence', () => {
    const labels = [
      'CHURNED/INACTIVE',
      'NEW CLIENT INTAKE',
      'ACTIVE/HAPPY',
      'PRE-LAUNCH',
      'Mystery',
    ]
    expect([...labels].sort(comparePipelineStages)).toEqual([
      'NEW CLIENT INTAKE',
      'PRE-LAUNCH',
      'ACTIVE/HAPPY',
      'CHURNED/INACTIVE',
      'Mystery',
    ])
  })

  it('hides default-hidden clients unless searching, showing hidden, or pinned', () => {
    const clients = [
      { id: 'a', name: 'Active Co', pipeline_stage: 'active_happy' },
      { id: 'b', name: 'Churned Co', pipeline_stage: 'churned_inactive' },
      { id: 'c', name: 'Blocked Co', status: 'blocked' },
    ]
    expect(visiblePipelineClients(clients).map((row) => row.id)).toEqual(['a'])
    expect(visiblePipelineClients(clients, { includeHidden: true }).map((row) => row.id)).toEqual([
      'a',
      'c',
      'b',
    ])
    expect(visiblePipelineClients(clients, { query: 'churned' }).map((row) => row.id)).toEqual([
      'b',
    ])
    expect(
      visiblePipelineClients(clients, { alwaysIncludeIds: ['c'] }).map((row) => row.id),
    ).toEqual(['a', 'c'])
  })

  it('groups by canonical pipeline labels in Portal order', () => {
    const groups = groupClientsByPipeline([
      { id: '2', name: 'Happy', pipeline_stage: 'active' },
      { id: '1', name: 'Intake', pipeline_stage: 'new_client_intake' },
    ])
    expect(groups.map(([label, rows]) => [label, rows.map((row) => row.id)])).toEqual([
      ['New Client Intake', ['1']],
      ['Active/Happy', ['2']],
    ])
    expect(formatPipelineStageLabel('active_happy')).toBe('Active/Happy')
  })
})
