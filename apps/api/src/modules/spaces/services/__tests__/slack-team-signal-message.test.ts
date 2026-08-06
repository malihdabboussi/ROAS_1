import { describe, expect, it } from 'vitest'
import {
  addressFindingToRecipient,
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
  it('rewrites the recipient to second person in findings', () => {
    expect(
      addressFindingToRecipient(
        "Dylan stepped in to clarify Dylan's plan with Bryce.",
        'Dylan Vanas',
      ),
    ).toBe('you stepped in to clarify your plan with Bryce.')

    const message = composeDigestMessage(
      [
        {
          subjectName: 'Bryce - Unit Bravo',
          channelName: 'roas-pascalzone',
          kind: 'client_risk',
          finding:
            'Spencer paused campaigns. Dylan stepped in to clarify the $1,497 maintenance plan.',
        },
      ],
      { recipientName: 'Dylan Vanas', now: new Date('2026-08-05T19:30:00.000-07:00') },
    )
    expect(message).toMatch(/you stepped in to clarify the \$1,497 maintenance plan/i)
    expect(message).not.toContain('Dylan stepped in')
  })

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
    expect(message).toContain('*Georgette in #video-editing*')
    expect(message).toContain('Flagged: we can automate')
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
    expect(message).toContain('1. *Georgette in #video-editing*')
    expect(message).toContain('2. *Yasir Khan in #roas-yasir-khan-coaching-ltd-955*')
    expect(message).toContain('Asked: the next session assets before Friday.')
    expect(message).toContain('3. *Peter Samios in #roas-above-it-432*')
    expect(message).not.toContain('Yasir Khan — unanswered question in #')
    expect(message).toContain('Want me to take the first pass on any of these?')
    expect(message).not.toContain('—')
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
    expect(message).toContain(
      composeNarrativeItem({
        subjectName: 'Georgette',
        channelName: 'video-editing',
        kind: 'workflow_discovery',
        finding: 'Automate the Claude tutorial distribution.',
      }),
    )
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

  it('uses source evidence instead of recursively composed legacy copy', () => {
    const legacy =
      'Drew Penizotto had a question in #roas-pascalzone. They posted asking specifically about Drew Penizotto asked: "Are you guys sending notifications for the people who showed up and didnt show up last week?". Didn\'t see a response yet — want a reply drafted for you?'
    const item = signalMessageItemFromAction({
      proposedContent: legacy,
      metadata: {
        subject_display_name: 'Drew Penizotto',
        source_channel_name: 'roas-pascalzone',
        source_message_text:
          'Are you guys sending notifications for the people who showed up and didnt show up last week?',
        signal_kind: 'unanswered_question',
      },
    })
    const message = composeDigestMessage([item], {
      recipientName: 'Dylan Vanas',
      now: new Date('2026-08-04T17:35:00.000-07:00'),
    })

    expect(message).toContain('*Drew Penizotto in #roas-pascalzone*')
    expect(message).toContain(
      'Asked: are you guys sending notifications for the people who showed up and didnt show up last week.',
    )
    expect(message.match(/Drew Penizotto/g)).toHaveLength(1)
    expect(message.match(/want a reply drafted for you\?/gi)).toHaveLength(1)
    expect(message).not.toContain('—')
  })

  it('prefers the normalized finding stored on new actions', () => {
    expect(
      signalMessageItemFromAction({
        proposedContent: 'legacy wrapper',
        metadata: {
          signal_kind: 'workflow_discovery',
          signal_finding: 'Automate the weekly reporting handoff.',
          source_message_text: 'A longer raw Slack message.',
        },
      }).finding,
    ).toBe('Automate the weekly reporting handoff.')
  })

  it('presents wins as briefing context instead of unanswered-message alerts', () => {
    const message = composeDigestMessage(
      [
        {
          subjectName: 'Shawn',
          channelName: 'content-creator-university',
          kind: 'team_win',
          finding: 'The webinar crossed $150K and set a new client milestone.',
        },
      ],
      { recipientName: 'Dylan', now: new Date('2026-08-04T17:35:00.000-07:00') },
    )

    expect(message).toContain('Win 🎉')
    expect(message).toContain('crossed $150K')
    expect(message).not.toContain('still need eyes')
    expect(message).not.toContain('reply drafted')
  })
})
