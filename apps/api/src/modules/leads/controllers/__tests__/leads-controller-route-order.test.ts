import { describe, expect, it } from 'vitest'
import { LeadsModule } from '../../leads.module'
import { LeadContactTimelineController } from '../lead-contact-timeline.controller'
import { LeadContactsController } from '../lead-contacts.controller'
import { LeadsController } from '../leads.controller'

function methodIndex(controller: Function, methodName: string): number {
  return Object.getOwnPropertyNames(controller.prototype).indexOf(methodName)
}

describe('LeadsController route order', () => {
  it('keeps static contact collection routes before contact-id routes', () => {
    const controllers = Reflect.getMetadata('controllers', LeadsModule) as Function[]
    expect(methodIndex(LeadContactsController, 'getContactBasics')).toBeGreaterThan(-1)
    expect(methodIndex(LeadContactTimelineController, 'getContactActivity')).toBeGreaterThan(-1)
    expect(methodIndex(LeadsController, 'list')).toBeGreaterThan(-1)
    expect(methodIndex(LeadContactsController, 'getContactBasics')).toBeLessThan(
      methodIndex(LeadContactsController, 'getContact'),
    )
    expect(controllers.indexOf(LeadContactsController)).toBeLessThan(
      controllers.indexOf(LeadContactTimelineController),
    )
    expect(controllers.indexOf(LeadContactsController)).toBeLessThan(
      controllers.indexOf(LeadsController),
    )
  })
})
