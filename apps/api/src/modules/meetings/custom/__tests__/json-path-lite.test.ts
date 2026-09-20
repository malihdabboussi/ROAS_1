import { describe, expect, it } from 'vitest'
import { isFieldPath, readList, readText, readValue } from '../json-path-lite'

const doc = {
  meeting: { id: 42, title: '  Kickoff  ', owner: { email: 'Host@Example.com' } },
  transcript: {
    speaker_blocks: [
      { speaker: { name: 'A' }, words: 'hello' },
      { speaker: { name: 'B' }, words: '' },
      { speaker: { name: 'C' }, words: 'bye' },
    ],
  },
  attendees: ['x@example.com', 'y@example.com'],
  chapters: [{ items: [{ text: 'one' }, { text: 'two' }] }, { items: [{ text: 'three' }] }],
}

describe('json-path-lite', () => {
  it('validates the dot-and-brackets syntax', () => {
    expect(isFieldPath('meeting.title')).toBe(true)
    expect(isFieldPath('transcript.speaker_blocks[].words')).toBe(true)
    expect(isFieldPath('a[]')).toBe(true)
    expect(isFieldPath('a[0].b')).toBe(false)
    expect(isFieldPath('a..b')).toBe(false)
    expect(isFieldPath('')).toBe(false)
    expect(isFieldPath(42)).toBe(false)
  })

  it('reads nested scalars and objects', () => {
    expect(readValue(doc, 'meeting.id')).toBe(42)
    expect(readValue(doc, 'meeting.owner')).toEqual({ email: 'Host@Example.com' })
    expect(readValue(doc, 'meeting.missing.deeper')).toBeUndefined()
    expect(readValue(doc, 'attendees.0')).toBeUndefined()
  })

  it('reads the first element when a path crosses an array', () => {
    expect(readValue(doc, 'transcript.speaker_blocks[].words')).toBe('hello')
    expect(readValue(doc, 'attendees[]')).toBe('x@example.com')
  })

  it('expands every [] segment for lists, including nested ones', () => {
    expect(readList(doc, 'transcript.speaker_blocks[].words')).toEqual(['hello', '', 'bye'])
    expect(readList(doc, 'attendees[]')).toEqual(['x@example.com', 'y@example.com'])
    expect(readList(doc, 'chapters[].items[].text')).toEqual(['one', 'two', 'three'])
    expect(readList(doc, 'nope[]')).toEqual([])
    expect(readList(doc, 'meeting[]')).toEqual([])
  })

  it('readText trims strings, stringifies finite numbers, and ignores the rest', () => {
    expect(readText(doc, 'meeting.title')).toBe('Kickoff')
    expect(readText(doc, 'meeting.id')).toBe('42')
    expect(readText(doc, 'meeting.owner')).toBeNull()
    expect(readText(doc, undefined)).toBeNull()
    expect(readText({ n: Number.NaN }, 'n')).toBeNull()
  })
})
