import { describe, expect, it } from 'vitest'
import { buildStaticAdChatRoutingInstruction } from './static-ad-chat-routing'

describe('buildStaticAdChatRoutingInstruction', () => {
  it.each([
    'I want some ads',
    'Can you make static ads for this?',
    'can you make some static ads for this / sttic ad production',
  ])('requires the visual production-type gate for an ambiguous Studio request: %s', (request) => {
    const instruction = buildStaticAdChatRoutingInstruction(request, 'studio')

    expect(instruction).toContain('selection_required')
    expect(instruction).toContain('"action":"ask_clarification"')
    expect(instruction).toContain('"id":"validate_messaging"')
    expect(instruction).toContain('"id":"image_brief"')
    expect(instruction).toContain('"id":"static_ad_book"')
    expect(instruction).toContain('Do not silently default to Myth vs. System')
  })

  it('locks an explicit Validate Messaging request to that lane', () => {
    const instruction = buildStaticAdChatRoutingInstruction(
      'Use Validate Messaging Angles to make three static ads',
      'studio',
    )

    expect(instruction).toContain('validate_messaging')
    expect(instruction).toContain('Do not substitute Static Ad Book')
    expect(instruction).not.toContain('"action":"ask_clarification"')
  })

  it('locks a clarification-card answer to Validate Messaging without requiring another creation verb', () => {
    const instruction = buildStaticAdChatRoutingInstruction(
      'Which kind of static ad should I create?: Validate messaging angles',
      'studio',
    )

    expect(instruction).toContain('CURRENT TURN STATIC AD ROUTE: validate_messaging')
    expect(instruction).not.toContain('"action":"ask_clarification"')
  })

  it('treats the Static Ad Book skill name as an explicit route without choosing a format', () => {
    const instruction = buildStaticAdChatRoutingInstruction(
      '/static-ad-book make ads for this campaign',
      'studio',
    )

    expect(instruction).toContain('CURRENT TURN STATIC AD ROUTE: static_ad_book')
    expect(instruction).toContain('family and format clarification cards')
    expect(instruction).not.toContain('"action":"ask_clarification"')
  })

  it('keeps an explicit Static Ad Book format instead of defaulting', () => {
    const instruction = buildStaticAdChatRoutingInstruction(
      'Make two chat receipt ads',
      'studio',
    )

    expect(instruction).toContain('static_ad_book')
    expect(instruction).toContain('explicitly named')
    expect(instruction).not.toContain('"action":"ask_clarification"')
  })

  it.each([
    'Audit our Meta ads',
    'Launch the approved ads',
    'Make three video ads',
    'How are our ads performing?',
  ])('does not intercept a different ad workflow: %s', (request) => {
    expect(buildStaticAdChatRoutingInstruction(request, 'studio')).toBe('')
  })

  it('uses numbered text choices outside Studio', () => {
    const instruction = buildStaticAdChatRoutingInstruction('I want some ads', 'slack')

    expect(instruction).toContain('plain text')
    expect(instruction).not.toContain('"action":"ask_clarification"')
  })
})
