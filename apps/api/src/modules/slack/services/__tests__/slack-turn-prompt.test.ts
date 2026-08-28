import { describe, expect, it } from 'vitest'
import {
  buildInboundSlackTurnPrompt,
  buildSlackMentionClientLookupText,
} from '../slack-turn-prompt'

const yasirStamp = {
  channelId: 'C0B5MKP7Y30',
  channelName: 'roas-yasir-khan-coaching-ltd-955',
  pageGraderClientId: 'b17dcee8-yasir',
  pageGraderClientName: 'Yasir Khan Coaching LTD',
  roasCampaignId: null,
  roasCampaignName: null,
}

const base = {
  currentStamp: null,
  forwardedContext: '',
  threadContext: '',
  threadParentIsPixel: false,
  isDirectMessage: true,
  hasDocuments: false,
}

describe('buildInboundSlackTurnPrompt — N0 stamp leads the prompt', () => {
  it('R04 general in a DM: [Ask kind] first, no client identity, forbids list_clients', () => {
    const p = buildInboundSlackTurnPrompt({ ...base, text: "What's on my task list today?" })
    expect(p.fullMessage.startsWith('[Ask kind]\nKind: general')).toBe(true)
    expect(p.fullMessage).toContain('Do not call list_clients')
    expect(p.fullMessage).not.toContain('[Slack channel identity]')
    expect(p.clientSource).toBe('none')
    expect(p.clientId).toBeNull()
  })

  it('R04 general inside a client channel: identity is softened, not the work to do', () => {
    const p = buildInboundSlackTurnPrompt({
      ...base,
      text: "What's on my task list today?",
      currentStamp: yasirStamp,
      isDirectMessage: false,
    })
    expect(p.askKind.kind).toBe('general')
    expect(p.fullMessage).toContain('[Slack channel identity]')
    expect(p.fullMessage).toContain("the current ask is about the operator's own world")
    expect(p.fullMessage).not.toContain('Use this client for Service Requests')
    // Telemetry still records where the turn happened.
    expect(p.clientSource).toBe('stamp')
  })

  it('R38 client ask in a stamped channel: identity block says use this client, source=stamp', () => {
    const p = buildInboundSlackTurnPrompt({
      ...base,
      text: 'How are Meta ads performing last 7 days?',
      currentStamp: yasirStamp,
      isDirectMessage: false,
    })
    expect(p.askKind.kind).toBe('client')
    expect(p.fullMessage).toContain('Use this client for Service Requests')
    expect(p.fullMessage).toContain('Do not search User Brain first')
    expect(p.clientSource).toBe('stamp')
    expect(p.clientId).toBe('b17dcee8-yasir')
  })

  it('R31 quoted 1DS thread in a group DM: kind=client from the quote, source=quote', () => {
    const forwardedContext = [
      '[Forwarded Slack message]',
      'From: Caleb',
      'Channel: #roas-1ds-collective-llc-939',
      'Message: I have a 9x16 and 16x9',
      '[Slack channel identity]',
      'Channel: #roas-1ds-collective-llc-939 (C1DS)',
      'Resolved ROAS Portal client: 1DS Collective LLC (id=ca82655a)',
    ].join('\n')
    const p = buildInboundSlackTurnPrompt({
      ...base,
      text: 'need this edited VSL style asap',
      forwardedContext,
    })
    expect(p.askKind.kind).toBe('client')
    expect(p.askKind.signals).toContain('quoted client channel')
    expect(p.clientSource).toBe('quote')
    expect(p.fullMessage.indexOf('[Ask kind]')).toBeLessThan(
      p.fullMessage.indexOf('[Forwarded Slack message]'),
    )
  })

  it('R55 "approve" on a Pixel thread: continuation, thread context wraps the current message', () => {
    const p = buildInboundSlackTurnPrompt({
      ...base,
      text: 'approve',
      threadContext: 'Pixel: Your Service Request draft is waiting for review.',
      threadParentIsPixel: true,
    })
    expect(p.askKind.kind).toBe('continuation')
    expect(p.fullMessage.startsWith('[Slack thread context]')).toBe(true)
    expect(p.fullMessage).toContain('[Current message]\n[Ask kind]\nKind: continuation')
  })

  it('unmapped channel with a client-shaped name: hint source, still asks Pixel to resolve via list_clients', () => {
    const p = buildInboundSlackTurnPrompt({
      ...base,
      text: 'redesign speaklikeaceo.com into the post-webinar page',
      currentStamp: { ...yasirStamp, pageGraderClientId: null, pageGraderClientName: null },
      isDirectMessage: false,
    })
    expect(p.clientSource).toBe('hint')
    expect(p.fullMessage).toContain(
      'Resolve the Portal client with list_clients using "yasir khan coaching"',
    )
  })

  it('file-only turn still gets a kind and the file marker', () => {
    const p = buildInboundSlackTurnPrompt({ ...base, text: '', hasDocuments: true })
    expect(p.fullMessage).toContain('[Ask kind]')
    expect(p.fullMessage).toContain('[User sent a file]')
  })

  it('client ask in a DM: [Client context] follows [Ask kind], source=named', () => {
    const p = buildInboundSlackTurnPrompt({
      ...base,
      text: "What was stats for Yasir's last webinar on Aug 6?",
      clientContextBlock:
        '[Client context]\nClient: Yasir Khan Coaching LTD (portal id=b17dcee8)\nSlack channels: #roas-yasir-khan-coaching-ltd-955 (C0B5MKP7Y30)',
      namedClientId: 'b17dcee8',
    })
    expect(p.askKind.kind).toBe('client')
    expect(p.clientSource).toBe('named')
    expect(p.clientId).toBe('b17dcee8')
    expect(p.fullMessage.indexOf('[Ask kind]')).toBeLessThan(
      p.fullMessage.indexOf('[Client context]'),
    )
    expect(p.fullMessage.indexOf('[Client context]')).toBeLessThan(
      p.fullMessage.indexOf("What was stats for Yasir's last webinar on Aug 6?"),
    )
  })

  it('general ask does not inject the client bundle even when one was resolved', () => {
    const p = buildInboundSlackTurnPrompt({
      ...base,
      text: "What's on my task list today?",
      currentStamp: yasirStamp,
      isDirectMessage: false,
      clientContextBlock: '[Client context]\nClient: Yasir Khan Coaching LTD',
      namedClientId: 'b17dcee8-yasir',
    })
    expect(p.askKind.kind).toBe('general')
    expect(p.fullMessage).not.toContain('[Client context]')
    expect(p.clientSource).toBe('stamp')
  })
})

describe('buildSlackMentionClientLookupText', () => {
  it('keeps the surrounding thread available when the @Pixel mention is only a pronoun', () => {
    const lookupText = buildSlackMentionClientLookupText(
      '- do you have it',
      'Dylan: We went deep on the onboarding call for Claude Club.',
    )

    expect(lookupText).toContain('- do you have it')
    expect(lookupText).toContain('onboarding call for Claude Club')
  })
})
