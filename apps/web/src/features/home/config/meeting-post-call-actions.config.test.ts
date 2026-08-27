import { describe, expect, it } from 'vitest'
import {
  googleAgendaPrompt,
  MEETING_FOLLOW_UP_REVIEW_PROMPT,
  MEETING_POST_CALL_ACTIONS,
  startAgendaPrompt,
} from './meeting-post-call-actions.config'

describe('startAgendaPrompt', () => {
  it('points the agent at update_document when an agenda Space Doc exists', () => {
    const prompt = startAgendaPrompt('agenda-doc-1')
    expect(prompt).toContain('update_document')
    expect(prompt).toContain('agenda-doc-1')
    expect(prompt).toContain('Do not only return a draft fence')
    expect(prompt).not.toContain('```draft Agenda```')
  })

  it('asks Pixel to pull open actions, launches, and client reports onto the agenda page', () => {
    const prompt = startAgendaPrompt('agenda-doc-1')
    expect(prompt).toContain('put it on the agenda page')
    expect(prompt).toContain('Open action items')
    expect(prompt).toContain('Launches')
    expect(prompt).toContain('Client reports')
    expect(prompt).toContain('Do not invent launches, reports, or numbers')
  })

  it('falls back to a draft fence when no agenda doc is linked', () => {
    expect(startAgendaPrompt(null)).toContain('```draft Agenda```')
  })
})

describe('googleAgendaPrompt', () => {
  it('asks for the Page Grader Google Doc instead of the Space Doc', () => {
    const prompt = googleAgendaPrompt()
    expect(prompt).toContain('Page Grader Google Doc')
    expect(prompt).toContain('🏆 ACTIONS')
    expect(prompt).toContain('Keep the Space Doc agenda untouched')
  })
})

describe('MEETING_POST_CALL_ACTIONS', () => {
  it('runs the same guided post-call flow used by Pixel review links', () => {
    const action = MEETING_POST_CALL_ACTIONS.find((row) => row.id === 'run-post-call-flow')
    expect(action?.label).toBe('Run post-call flow')
    expect(action?.prompt).toBe(MEETING_FOLLOW_UP_REVIEW_PROMPT)
  })

  it('delegates remaining IN PROGRESS and TO-DO work through one Portal confirm link', () => {
    const delegate = MEETING_POST_CALL_ACTIONS.find((action) => action.id === 'delegate-remaining')
    expect(delegate?.label).toBe('Delegate remaining work')
    expect(delegate?.prompt).toContain('page_grader_create_delegation_preview')
    expect(delegate?.prompt).toContain('confirm_url')
    expect(delegate?.prompt).toContain('Skip anything marked ✅ DONE')
    expect(delegate?.prompt).toContain('Do not loop page_grader_create_fulfillment_request')
  })
})

describe('MEETING_FOLLOW_UP_REVIEW_PROMPT', () => {
  it('starts after inline context confirmation and uses the existing delegation preview', () => {
    expect(MEETING_FOLLOW_UP_REVIEW_PROMPT).toContain('already-confirmed meeting context')
    expect(MEETING_FOLLOW_UP_REVIEW_PROMPT).not.toContain('Stage 1')
    expect(MEETING_FOLLOW_UP_REVIEW_PROMPT).toContain('call list_mcp_servers')
    expect(MEETING_FOLLOW_UP_REVIEW_PROMPT).toContain('call use_mcp_tool once')
    expect(MEETING_FOLLOW_UP_REVIEW_PROMPT).toContain(
      'tool_name page_grader_create_delegation_preview',
    )
    expect(MEETING_FOLLOW_UP_REVIEW_PROMPT).toContain('Do not use create_task')
    expect(MEETING_FOLLOW_UP_REVIEW_PROMPT).toContain('meeting Space scope does not block')
    expect(MEETING_FOLLOW_UP_REVIEW_PROMPT).toContain('```draft Follow-up message```')
    expect(MEETING_FOLLOW_UP_REVIEW_PROMPT).toContain('Do not send it')
  })
})
