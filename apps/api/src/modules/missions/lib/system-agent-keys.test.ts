import { describe, expect, it } from 'vitest'
import {
  isHiddenFromUserAgentList,
  isLoopAgentRolloutOrg,
  isSkillWriteLocked,
  isSystemAgentFieldLocked,
  isSystemAgentKey,
  isVisibleInOrgAgentList,
} from './system-agent-keys'

describe('system agent policy helpers', () => {
  it('recognizes platform-managed system agents', () => {
    expect(isSystemAgentKey('vibey')).toBe(true)
    expect(isSystemAgentKey('hr')).toBe(true)
    expect(isSystemAgentKey('atlas')).toBe(true)
    expect(isSystemAgentKey('viktor')).toBe(true)
    expect(isSystemAgentKey('copywriter')).toBe(false)
  })

  it('limits Loop to the Vibey rollout org', () => {
    const vibeyOrgId = '699e3530-881c-4653-b507-4c4b5993538f'
    expect(isLoopAgentRolloutOrg(vibeyOrgId)).toBe(true)
    expect(isLoopAgentRolloutOrg('other-org-id')).toBe(false)
    expect(isLoopAgentRolloutOrg(null)).toBe(false)
    expect(isVisibleInOrgAgentList('loop', vibeyOrgId)).toBe(true)
    expect(isVisibleInOrgAgentList('loop', 'other-org-id')).toBe(false)
  })

  it('hides Viktor from user-facing agent lists', () => {
    expect(isHiddenFromUserAgentList('viktor')).toBe(true)
    expect(isHiddenFromUserAgentList('widget_builder')).toBe(true)
    expect(isHiddenFromUserAgentList('viktor_2')).toBe(true)
    expect(isHiddenFromUserAgentList('widget_builder_3')).toBe(true)
    expect(isHiddenFromUserAgentList('vibey')).toBe(false)
    expect(isHiddenFromUserAgentList('copywriter')).toBe(false)
  })

  it('allows HR and Vibey custom skill writes while keeping other system skills locked', () => {
    expect(isSkillWriteLocked('hr')).toBe(false)
    expect(isSkillWriteLocked('vibey')).toBe(false)
    expect(isSkillWriteLocked('atlas')).toBe(true)
    expect(isSkillWriteLocked('brain_scholar')).toBe(true)
    expect(isSkillWriteLocked('viktor')).toBe(true)
    expect(isSkillWriteLocked('widget_builder')).toBe(true)
  })

  it('locks identity and purpose fields while allowing preferences', () => {
    expect(isSystemAgentFieldLocked('vibey', 'identity')).toBe(true)
    expect(isSystemAgentFieldLocked('vibey', 'brain_grant')).toBe(true)
    expect(isSystemAgentFieldLocked('vibey', 'campaign_grant')).toBe(true)
    expect(isSystemAgentFieldLocked('vibey', 'team_assignment')).toBe(true)
    expect(isSystemAgentFieldLocked('vibey', 'lifecycle')).toBe(true)
    expect(isSystemAgentFieldLocked('vibey', 'portrait')).toBe(false)
    expect(isSystemAgentFieldLocked('vibey', 'custom_skill')).toBe(false)
    expect(isSystemAgentFieldLocked('vibey', 'comms')).toBe(false)
    expect(isSystemAgentFieldLocked('vibey', 'channel_grant')).toBe(false)
    expect(isSystemAgentFieldLocked('copywriter', 'identity')).toBe(false)
  })
})
