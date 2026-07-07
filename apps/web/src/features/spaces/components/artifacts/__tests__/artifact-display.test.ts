import { describe, expect, it, vi } from 'vitest'
import {
  artifactMatchesSearch,
  formatArtifactDate,
  formatRelativeArtifactDate,
  groupArtifactRows,
  sortArtifactRows,
  type ArtifactListRow,
} from '../artifact-display'

const rows: ArtifactListRow[] = [
  {
    id: '1',
    title: 'Launch Funnel',
    subtitle: 'opt-in',
    created_at: '2026-04-01T10:00:00.000Z',
    updated_at: '2026-04-02T10:00:00.000Z',
    groupValues: { status: 'draft', platform: 'instagram' },
    sortValues: { created_at: '2026-04-01T10:00:00.000Z', name: 'Launch Funnel' },
    raw: {},
  },
  {
    id: '2',
    title: 'Authority Offer',
    subtitle: 'complete',
    created_at: '2026-04-03T10:00:00.000Z',
    updated_at: '2026-04-04T10:00:00.000Z',
    groupValues: { status: 'published', platform: 'linkedin' },
    sortValues: { created_at: '2026-04-03T10:00:00.000Z', name: 'Authority Offer' },
    raw: {},
  },
]

describe('artifact display helpers', () => {
  it('matches search across title, subtitle, and group values', () => {
    expect(artifactMatchesSearch(rows[0]!, 'launch')).toBe(true)
    expect(artifactMatchesSearch(rows[1]!, 'linkedin')).toBe(true)
    expect(artifactMatchesSearch(rows[0]!, 'missing')).toBe(false)
  })

  it('sorts rows by configured field and direction', () => {
    expect(
      sortArtifactRows(rows, { sort_by: 'created_at', sort_dir: 'desc' }).map((row) => row.id),
    ).toEqual(['2', '1'])
    expect(
      sortArtifactRows(rows, { sort_by: 'name', sort_dir: 'asc' }).map((row) => row.id),
    ).toEqual(['2', '1'])
  })

  it('groups rows by group values', () => {
    const groups = groupArtifactRows(rows, 'status')
    expect(groups?.map((group) => group.label)).toEqual(['draft', 'published'])
    expect(groups?.[0]?.rows).toHaveLength(1)
  })

  it('formats artifact dates and relative labels', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-25T12:00:00.000Z'))

    try {
      expect(formatArtifactDate('2026-06-20T12:00:00.000Z')).toBe('Jun 20, 2026')
      expect(formatArtifactDate(null)).toBe('')
      expect(formatArtifactDate('not-a-date')).toBe('')

      expect(formatRelativeArtifactDate('2026-06-25T11:30:00.000Z')).toBe('just now')
      expect(formatRelativeArtifactDate('2026-06-25T08:00:00.000Z')).toBe('4h ago')
      expect(formatRelativeArtifactDate('2026-06-23T12:00:00.000Z')).toBe('2d ago')
      expect(formatRelativeArtifactDate('2026-06-01T12:00:00.000Z')).toBe('Jun 1, 2026')
      expect(formatRelativeArtifactDate('not-a-date')).toBe('')
    } finally {
      vi.useRealTimers()
    }
  })
})
