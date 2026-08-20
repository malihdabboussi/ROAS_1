import { describe, expect, it } from 'vitest'
import {
  bindWorkRequestAssignee,
  pageGraderSendAssignee,
  resolveWorkRequestAssigneeIdentity,
  stampWorkRequestAssignee,
} from './work-request-assignee'

const portal = [
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Rafay',
    email: 'rafay@roas.co',
    source: 'portal' as const,
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    name: 'Sam Editor',
    email: 'sam@roas.co',
    source: 'portal' as const,
  },
]

describe('work-request-assignee', () => {
  it('binds a Portal roster row by id and keeps email for ClickUp', () => {
    const identity = bindWorkRequestAssignee(
      {
        assignee_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        assignee_name: 'Rafay',
      },
      portal,
    )
    expect(identity).toMatchObject({
      name: 'Rafay',
      email: 'rafay@roas.co',
      pageGraderUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      source: 'portal',
    })
    expect(pageGraderSendAssignee(identity)).toEqual({
      page_grader_user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      email: 'rafay@roas.co',
      name: 'Rafay',
    })
  })

  it('maps a typed email to the Portal user instead of storing Slack-looking free text', () => {
    const identity = bindWorkRequestAssignee(
      { assignee_name: 'rafay@roas.co', assignee_email: 'rafay@roas.co' },
      portal,
    )
    expect(identity.pageGraderUserId).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    expect(identity.name).toBe('Rafay')
    expect(identity.email).toBe('rafay@roas.co')
  })

  it('rehydrates an old name-only draft against the current Portal roster', () => {
    const identity = resolveWorkRequestAssigneeIdentity({}, 'rafay@roas.co', portal)
    expect(identity.pageGraderUserId).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    expect(pageGraderSendAssignee(identity)?.email).toBe('rafay@roas.co')
  })

  it('does not bind Harry M. to a Harry/Haroon slash alias', () => {
    const roster = [
      ...portal,
      {
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        name: 'Harry/Haroon',
        email: 'haroon@roas.co',
        source: 'portal' as const,
      },
    ]
    const identity = bindWorkRequestAssignee({ assignee_name: 'Harry M.' }, roster)
    expect(identity).toMatchObject({
      name: 'Harry M.',
      pageGraderUserId: null,
      source: 'free_text',
    })
  })

  it('binds a unique first name onto a slash-alias roster row', () => {
    const roster = [
      ...portal,
      {
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        name: 'Harry/Haroon',
        email: 'haroon@roas.co',
        source: 'portal' as const,
      },
    ]
    const identity = bindWorkRequestAssignee({ assignee_name: 'Haroon' }, roster)
    expect(identity.pageGraderUserId).toBe('cccccccc-cccc-4ccc-8ccc-cccccccccccc')
    expect(identity.name).toBe('Harry/Haroon')
  })

  it('stamps routing so finalize can send Portal id even after reload', () => {
    const identity = bindWorkRequestAssignee(
      { assignee_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
      portal,
    )
    expect(stampWorkRequestAssignee({ work_scope: 'general' }, identity).assignee).toMatchObject({
      name: 'Sam Editor',
      email: 'sam@roas.co',
      page_grader_user_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      source: 'portal',
    })
  })
})
