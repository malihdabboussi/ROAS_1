import { describe, expect, it } from 'vitest'
import { SlackOpenDmDtoSchema } from './slack.dto'

describe('SlackOpenDmDtoSchema', () => {
  it('accepts one to eight unique recipients for a multi-person DM', () => {
    expect(
      SlackOpenDmDtoSchema.parse({
        slack_user_ids: ['U-DYLAN', 'U-BETTY'],
      }),
    ).toEqual({
      slack_user_ids: ['U-DYLAN', 'U-BETTY'],
    })
  })

  it('rejects ambiguous, duplicate, and oversized recipient inputs', () => {
    expect(
      SlackOpenDmDtoSchema.safeParse({
        slack_user_id: 'U-DYLAN',
        slack_user_ids: ['U-BETTY'],
      }).success,
    ).toBe(false)
    expect(
      SlackOpenDmDtoSchema.safeParse({
        slack_user_ids: ['U-BETTY', 'U-BETTY'],
      }).success,
    ).toBe(false)
    expect(
      SlackOpenDmDtoSchema.safeParse({
        slack_user_ids: Array.from({ length: 9 }, (_, index) => `U-${index}`),
      }).success,
    ).toBe(false)
  })
})
