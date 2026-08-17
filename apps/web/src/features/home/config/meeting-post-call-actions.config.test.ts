import { describe, expect, it } from 'vitest'
import { googleAgendaPrompt, startAgendaPrompt } from './meeting-post-call-actions.config'

describe('startAgendaPrompt', () => {
  it('points the agent at update_document when an agenda Space Doc exists', () => {
    const prompt = startAgendaPrompt('agenda-doc-1')
    expect(prompt).toContain('update_document')
    expect(prompt).toContain('agenda-doc-1')
    expect(prompt).toContain('Do not only return a draft fence')
    expect(prompt).not.toContain('```draft Agenda```')
  })

  it('falls back to a draft fence when no agenda doc is linked', () => {
    expect(startAgendaPrompt(null)).toContain('```draft Agenda```')
  })
})

describe('googleAgendaPrompt', () => {
  it('asks for the Page Grader Google Doc instead of the Space Doc', () => {
    const prompt = googleAgendaPrompt()
    expect(prompt).toContain('Page Grader Google Doc')
    expect(prompt).toContain('Keep the Space Doc agenda untouched')
  })
})
