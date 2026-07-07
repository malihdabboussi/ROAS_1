import { describe, expect, it } from 'vitest'
import { answerAsTaskTitle, resolveFormTaskTitle } from '../form-task-title'

describe('resolveFormTaskTitle', () => {
  const questions = [
    { id: 'q_contact', type: 'contact', label: 'Contact' },
    { id: 'q_notes', type: 'long_text', label: 'Notes' },
  ]

  it('uses contact name in automatic mode', () => {
    expect(
      resolveFormTaskTitle({
        formName: 'Lead form',
        questions,
        answers: {
          q_contact: { first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com' },
        },
      }),
    ).toBe('Ada Lovelace')
  })

  it('uses contact email when name is missing in automatic mode', () => {
    expect(
      resolveFormTaskTitle({
        formName: 'Lead form',
        questions,
        answers: {
          q_contact: { email: 'ada@example.com' },
        },
      }),
    ).toBe('ada@example.com')
  })

  it('falls back to form submitted message when contact has no name or email', () => {
    expect(
      resolveFormTaskTitle({
        formName: 'Lead form',
        questions,
        answers: {
          q_contact: { phone: '555-0100' },
        },
      }),
    ).toBe('New form "Lead form" is Submitted')
  })

  it('uses a specific contact subfield when task_title_question_id includes subfield source', () => {
    expect(
      resolveFormTaskTitle({
        formName: 'Lead form',
        questions,
        answers: {
          q_contact: { first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com' },
        },
        taskTitleQuestionId: 'q_contact::email',
      }),
    ).toBe('ada@example.com')
  })

  it('uses the selected question when task_title_question_id is set', () => {
    expect(
      resolveFormTaskTitle({
        formName: 'Lead form',
        questions,
        answers: {
          q_contact: { first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com' },
          q_notes: 'Needs onboarding help',
        },
        taskTitleQuestionId: 'q_notes',
      }),
    ).toBe('Needs onboarding help')
  })
})

describe('answerAsTaskTitle', () => {
  it('prefers full name over email for contact answers', () => {
    expect(
      answerAsTaskTitle(
        { name: 'Grace Hopper', email: 'grace@example.com' },
        { id: 'q1', type: 'contact' },
      ),
    ).toBe('Grace Hopper')
  })
})
