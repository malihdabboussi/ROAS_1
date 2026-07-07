import { describe, expect, it } from 'vitest'
import type { FlowAutomationSummary } from '../../types/flow-automation.types'
import type { FlowBuildSessionLink } from '../../types/flow-build-session-link.types'
import { groupManageFlows, usesSeparateDraftsSection } from '../flows-grouping'

const draftInAlpha: FlowAutomationSummary = {
  id: 'draft-1',
  name: 'Draft alpha',
  enabled: false,
  is_draft: true,
  trigger: { type: 'task_created' },
  actions: [],
  space_id: 'space-a',
  space_title: 'Alpha space',
  campaign_id: 'campaign-a',
  campaign_name: 'Alpha campaign',
}

const publishedInBeta: FlowAutomationSummary = {
  id: 'flow-1',
  name: 'Published beta',
  enabled: true,
  is_draft: false,
  trigger: { type: 'task_created' },
  actions: [],
  space_id: 'space-b',
  space_title: 'Beta space',
  campaign_id: 'campaign-b',
  campaign_name: 'Beta campaign',
}

const reusableAcrossSpaces: FlowAutomationSummary = {
  id: 'flow-definition-card',
  flow_definition_id: 'definition-1',
  name: 'Reusable flow',
  enabled: true,
  is_draft: false,
  trigger: { type: 'task_created' },
  actions: [],
  space_id: undefined,
  space_title: undefined,
  campaign_id: undefined,
  campaign_name: undefined,
  installation_count: 2,
}

const orphanSession: FlowBuildSessionLink = {
  id: 'session-1',
  space_id: 'space-a',
  conversation_id: 'conv-1',
  automation_id: null,
  target_automation_id: null,
  status: 'planned',
  plan_name: 'Loop build',
  updated_at: null,
}

describe('usesSeparateDraftsSection', () => {
  it('keeps the dedicated drafts section for none and status grouping', () => {
    expect(usesSeparateDraftsSection('none')).toBe(true)
    expect(usesSeparateDraftsSection('status')).toBe(true)
  })

  it('merges drafts into groups for campaign and space grouping', () => {
    expect(usesSeparateDraftsSection('campaign')).toBe(false)
    expect(usesSeparateDraftsSection('space')).toBe(false)
  })
})

describe('groupManageFlows', () => {
  it('groups drafts by campaign alongside published flows', () => {
    const groups = groupManageFlows(
      [draftInAlpha, publishedInBeta],
      [],
      'campaign',
      'asc',
      new Map([['space-a', 'Alpha space']]),
    )

    expect(groups).toHaveLength(2)
    expect(groups?.find((group) => group.key === 'campaign-a')?.items).toEqual([draftInAlpha])
    expect(groups?.find((group) => group.key === 'campaign-b')?.items).toEqual([publishedInBeta])
  })

  it('groups drafts and orphan build sessions by space', () => {
    const groups = groupManageFlows(
      [draftInAlpha, publishedInBeta],
      [orphanSession],
      'space',
      'asc',
      new Map([
        ['space-a', 'Alpha space'],
        ['space-b', 'Beta space'],
      ]),
    )

    const alphaGroup = groups?.find((group) => group.key === 'space-a')
    expect(alphaGroup?.items).toEqual([draftInAlpha])
    expect(alphaGroup?.orphanSessions).toEqual([orphanSession])
    expect(alphaGroup?.itemCount).toBe(2)
    expect(groups?.find((group) => group.key === 'space-b')?.items).toEqual([publishedInBeta])
  })

  it('keeps published-only groups when grouping by status', () => {
    const groups = groupManageFlows(
      [draftInAlpha, publishedInBeta],
      [orphanSession],
      'status',
      'asc',
      new Map(),
    )

    expect(groups?.flatMap((group) => group.items)).toEqual([publishedInBeta])
  })

  it('groups reusable Flow definitions without one Space under multiple spaces', () => {
    const groups = groupManageFlows([reusableAcrossSpaces], [], 'space', 'asc', new Map())

    expect(groups).toHaveLength(1)
    expect(groups?.[0]?.key).toBe('multiple-spaces')
    expect(groups?.[0]?.label).toBe('Multiple spaces')
    expect(groups?.[0]?.items).toEqual([reusableAcrossSpaces])
  })

  it('groups reusable Flow definitions without one campaign under multiple campaigns', () => {
    const groups = groupManageFlows([reusableAcrossSpaces], [], 'campaign', 'asc', new Map())

    expect(groups).toHaveLength(1)
    expect(groups?.[0]?.key).toBe('multiple-campaigns')
    expect(groups?.[0]?.label).toBe('Multiple campaigns')
    expect(groups?.[0]?.items).toEqual([reusableAcrossSpaces])
  })
})
