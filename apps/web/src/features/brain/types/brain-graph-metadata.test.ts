import { describe, expect, it } from 'vitest'
import {
  CAMPAIGN_DOMAIN_LABELS,
  ENTRY_TYPE_LABELS,
  isCompanyCognitionObjectType,
  knowledgeSourceTypeColor,
  knowledgeSourceTypeLabel,
  MEMORY_TYPE_LABELS,
} from './index'

describe('brain graph metadata exports', () => {
  it('keeps known and fallback knowledge source labels/colors stable', () => {
    expect(knowledgeSourceTypeColor('space_doc')).toBe('--brain-document-rgb')
    expect(knowledgeSourceTypeLabel('space_doc')).toBe('Document')
    expect(knowledgeSourceTypeColor('unknown_source')).toBe('--brain-conn-related-to-rgb')
    expect(knowledgeSourceTypeLabel('unknown_source')).toBe('Unknown Source')
  })

  it('keeps cognition type guards and public label maps stable', () => {
    expect(isCompanyCognitionObjectType('belief')).toBe(true)
    expect(isCompanyCognitionObjectType('standard')).toBe(false)
    expect(isCompanyCognitionObjectType(null)).toBe(false)
    expect(MEMORY_TYPE_LABELS.fact).toBe('Fact')
    expect(ENTRY_TYPE_LABELS.case_study).toBe('Case Study')
    expect(CAMPAIGN_DOMAIN_LABELS.marketing).toBe('Marketing')
  })
})
