import { describe, expect, it } from 'vitest'
import { breadcrumbFromPath } from './shell-breadcrumb'

describe('breadcrumbFromPath', () => {
  it('names agency Clients and Client Campaigns from the route', () => {
    expect(breadcrumbFromPath('/clients', null).label).toBe('Clients')
    expect(breadcrumbFromPath('/clients/client-1', null).label).toBe('Clients')
    expect(breadcrumbFromPath('/client-campaigns', null).label).toBe('Client Campaigns')
  })

  it('names Programs from the route instead of falling back to Inbox', () => {
    expect(breadcrumbFromPath('/programs', null).label).toBe('Programs')
    expect(breadcrumbFromPath('/programs/prog-clients', null).label).toBe('Programs')
  })

  it('names All Tasks from the route', () => {
    expect(breadcrumbFromPath('/all-tasks', null).label).toBe('All Tasks')
    expect(breadcrumbFromPath('/home/my-tasks', null).label).toBe('All Tasks')
  })

  it('does not label unknown routes as Inbox', () => {
    expect(breadcrumbFromPath('/settings', null).label).toBe('')
  })

  it('keeps space titles under Campaigns until a page breadcrumb supplies client context', () => {
    expect(breadcrumbFromPath('/spaces', 'Evergreen leads').label).toBe(
      'Campaigns / Evergreen leads',
    )
  })
})
