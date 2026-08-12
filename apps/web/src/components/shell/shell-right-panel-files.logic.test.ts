import { describe, expect, it } from 'vitest'
import {
  fileRowDayLabel,
  fileRowMeta,
  fileRowSubtitle,
  groupFileRowsByDay,
} from './shell-right-panel-files.logic'

const NOW = new Date('2026-08-11T18:00:00Z')

describe('fileRowMeta', () => {
  it('maps known artifact types to labels and tints', () => {
    expect(fileRowMeta('file', 'presentation')).toEqual({
      label: 'Presentation',
      glassClass: 'badge-glass-orange',
    })
    expect(fileRowMeta('file', 'funnel').glassClass).toBe('badge-glass-purple')
    expect(fileRowMeta('file', 'image_upload').label).toBe('Image')
  })

  it('humanizes unknown artifact types instead of leaking slugs', () => {
    expect(fileRowMeta('artifact', 'case_study')).toEqual({
      label: 'Case Study',
      glassClass: 'badge-glass-purple',
    })
  })

  it('falls back to attachment kind when no artifact type is present', () => {
    expect(fileRowMeta('image').label).toBe('Image')
    expect(fileRowMeta('video').label).toBe('Video')
    expect(fileRowMeta('unknown-kind').label).toBe('Artifact')
  })
})

describe('fileRowDayLabel', () => {
  it('labels today and yesterday', () => {
    expect(fileRowDayLabel('2026-08-11T09:00:00Z', NOW)).toBe('Today')
    expect(fileRowDayLabel('2026-08-10T23:00:00Z', NOW)).toBe('Yesterday')
  })

  it('labels older same-year dates without the year', () => {
    expect(fileRowDayLabel('2026-08-01T09:00:00Z', NOW)).toBe('Aug 1')
  })

  it('keeps the year for prior years and survives bad input', () => {
    expect(fileRowDayLabel('2025-12-30T09:00:00Z', NOW)).toBe('Dec 30, 2025')
    expect(fileRowDayLabel('not-a-date', NOW)).toBe('Earlier')
  })
})

describe('fileRowSubtitle', () => {
  it('appends a relative time for recent rows', () => {
    expect(fileRowSubtitle('Funnel', '2026-08-11T15:00:00Z', NOW)).toBe('Funnel · 3h ago')
  })

  it('drops the time part for old rows and bad dates', () => {
    expect(fileRowSubtitle('Funnel', '2026-07-01T15:00:00Z', NOW)).toBe('Funnel')
    expect(fileRowSubtitle('Funnel', 'not-a-date', NOW)).toBe('Funnel')
  })
})

describe('groupFileRowsByDay', () => {
  it('sorts newest-first and buckets by day', () => {
    const groups = groupFileRowsByDay(
      [
        { id: 'old', createdAt: '2026-08-01T09:00:00Z' },
        { id: 'today-late', createdAt: '2026-08-11T16:00:00Z' },
        { id: 'yesterday', createdAt: '2026-08-10T12:00:00Z' },
        { id: 'today-early', createdAt: '2026-08-11T08:00:00Z' },
      ],
      NOW,
    )
    expect(groups.map((group) => group.label)).toEqual(['Today', 'Yesterday', 'Aug 1'])
    expect(groups[0]?.rows.map((row) => row.id)).toEqual(['today-late', 'today-early'])
  })

  it('returns no groups for no rows', () => {
    expect(groupFileRowsByDay([], NOW)).toEqual([])
  })
})
