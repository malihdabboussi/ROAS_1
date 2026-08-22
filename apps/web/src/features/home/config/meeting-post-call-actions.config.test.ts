import { describe, expect, it } from 'vitest'
import {
  googleAgendaPrompt,
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
  it('writes recaps as a DONE / IN PROGRESS / TO-DO hit list', () => {
    const recap = MEETING_POST_CALL_ACTIONS.find((action) => action.id === 'recap-message')
    expect(recap?.prompt).toContain('(IN PROGRESS)')
    expect(recap?.prompt).toContain('(TO-DO)')
    expect(recap?.prompt).toContain('✅ (DONE)')
    expect(recap?.prompt).not.toContain("WHAT'S HAPPENING BEFORE")
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
