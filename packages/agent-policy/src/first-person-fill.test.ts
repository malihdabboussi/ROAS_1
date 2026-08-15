import { describe, expect, it } from 'vitest'
import {
  FIRST_PERSON_FILL_USER_BRAIN_QUERY,
  isFirstPersonFillRequest,
  resolveUserBrainSearchQuery,
} from './first-person-fill.js'

describe('first-person fill query rewrite', () => {
  it('detects fill-this-out, guest prep, and write-as-me requests', () => {
    expect(
      isFirstPersonFillRequest("Hey, here's a link. I need some help on this, filling this out"),
    ).toBe(true)
    expect(isFirstPersonFillRequest('Can you fill this out for the podcast?')).toBe(true)
    expect(isFirstPersonFillRequest('Help me with this guest prep form')).toBe(true)
    expect(isFirstPersonFillRequest('Write this as me')).toBe(true)
    expect(isFirstPersonFillRequest('Draft my bio for the speaker form')).toBe(true)
    expect(isFirstPersonFillRequest('check Dylan (me) user brain')).toBe(true)
    expect(isFirstPersonFillRequest('pull this from my brain')).toBe(true)
  })

  it('does not rewrite ordinary work queries', () => {
    expect(isFirstPersonFillRequest('Fill the ad set budget to $500')).toBe(false)
    expect(isFirstPersonFillRequest('What is the retainer cap?')).toBe(false)
    expect(resolveUserBrainSearchQuery('retainer cap')).toBe('retainer cap')
  })

  it('replaces first-person fill queries with identity retrieval', () => {
    expect(
      resolveUserBrainSearchQuery(
        'I need some help on this, filling this out https://docs.google.com/forms/d/abc',
      ),
    ).toBe(FIRST_PERSON_FILL_USER_BRAIN_QUERY)
  })
})
