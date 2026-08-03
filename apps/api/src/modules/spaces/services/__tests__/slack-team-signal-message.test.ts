import { describe, expect, it } from 'vitest'
import {
  composeDigestMessage,
  composeGreeting,
  composeInternalEscalation,
  composeNarrativeItem,
  composeThreadFollowUp,
  extractSignalFinding,
  firstNameFromDisplay,
  signalMessageItemFromAction,
  suggestedActionFor,
} from '../slack-team-signal-message'

describe('slack-team-signal-message', () => {
  it('strips the legacy disclaimer and raised-header when extracting a finding', () => {
    const content = [
      'Georgette raised a workflow discovery in #video-editing:',
      'We can automate distribution.',
      'Review the source and coordinate the response internally. Pixel will not message the external person.',
    ].join('\n\n')
    expect(extractSignalFinding(content)).toBe('We can automate distribution.')
  })

  it('writes a personalized narrative escalation without the disclaimer', () => {
    const message = composeInternalEscalation(
      {
        subjectName: 'Georgette',
        channelName: 'video-editing',
        kind: 'workflow_discovery',
        finding:
          'We can automate the distribution and tracking of the new Claude workflow tutorial.',
      },
      { recipientName: 'Dylan Vanas', now: new Date('2026-07-31T19:00:00.000Z') },
    )
    expect(message).toMatch(/^Hey Dylan/)
    expect(message).toContain('There was something Georgette flagged in #video-editing')
    expect(message).toContain('They mentioned')
    expect(message).toContain('might need your feedback')
    expect(message).toContain(suggestedActionFor('workflow_discovery'))
    expect(message).not.toContain('Pixel will not message the external person')
    expect(message).not.toContain('1. Georgette — workflow discovery')
  })

  it('compiles multiple signals into narrative paragraphs with a greeting', () => {
    const message = composeDigestMessage(
      [
        {
          subjectName: 'Georgette',
          channelName: 'video-editing',
          kind: 'workflow_discovery',
          finding: 'Automate the Claude tutorial distribution.',
        },
        {
          subjectName: 'Yasir Khan',
          channelName: 'roas-yasir-khan-coaching-ltd-955',
          kind: 'unanswered_question',
          finding: 'the next session assets before Friday',
        },
        {
          subjectName: 'Peter Samios',
          channelName: 'roas-above-it-432',
          kind: 'unanswered_question',
          finding: 'the deck',
        },
      ],
      { recipientName: 'Dylan Vanas', now: new Date('2026-07-31T19:00:00.000Z') },
    )
    expect(message).toMatch(/^Hey Dylan/)
    expect(message).toContain('1. There was something Georgette flagged')
    expect(message).toContain('2. Yasir Khan had a question')
    expect(message).toContain('posted asking specifically about')
    expect(message).toContain("Didn't see a response yet")
    expect(message).toContain('3. Peter Samios had a question')
    expect(message).not.toContain('Yasir Khan — unanswered question in #')
    expect(message).toContain('Say the word on any of these')
  })

  it('formats thread follow-ups as narrative, not label lists', () => {
    const message = composeThreadFollowUp(
      [
        {
          subjectName: 'Georgette',
          channelName: 'video-editing',
          kind: 'workflow_discovery',
          finding: 'Automate the Claude tutorial distribution.',
        },
      ],
      { recipientName: 'Dylan Vanas' },
    )
    expect(message).toContain('One more for you, Dylan')
    expect(message).toContain(composeNarrativeItem({
      subjectName: 'Georgette',
      channelName: 'video-editing',
      kind: 'workflow_discovery',
      finding: 'Automate the Claude tutorial distribution.',
    }))
  })

  it('varies greeting cadence and uses first name', () => {
    expect(firstNameFromDisplay('Dylan Vanas')).toBe('Dylan')
    expect(composeGreeting('Dylan Vanas', new Date('2026-07-31T16:00:00.000Z'))).toMatch(
      /Hey Dylan|Morning Dylan/,
    )
  })

  it('builds message items from shadow-action metadata', () => {
    expect(
      signalMessageItemFromAction({
        proposedContent: 'Need confirmation on launch date.',
        metadata: {
          subject_display_name: 'Casey Client',
          source_channel_name: 'client-alpha',
          signal_kind: 'unanswered_question',
        },
      }),
    ).toEqual({
      subjectName: 'Casey Client',
      channelName: 'client-alpha',
      kind: 'unanswered_question',
      finding: 'Need confirmation on launch date.',
    })
  })
})
