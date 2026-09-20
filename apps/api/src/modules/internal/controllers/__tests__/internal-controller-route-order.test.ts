import { describe, expect, it } from 'vitest'
import { InternalModule } from '../../internal.module'
import { InternalBrainImportJobsController } from '../internal-brain-import-jobs.controller'
import { InternalMeetingImportJobsController } from '../internal-meeting-import-jobs.controller'

function methodIndex(controller: Function, methodName: string): number {
  return Object.getOwnPropertyNames(controller.prototype).indexOf(methodName)
}

describe('InternalController route order', () => {
  it('keeps static brain import job routes before job-id routes', () => {
    const controllers = Reflect.getMetadata('controllers', InternalModule) as Function[]
    expect(
      methodIndex(InternalMeetingImportJobsController, 'enqueueMeetingImport'),
    ).toBeGreaterThan(-1)
    expect(
      methodIndex(InternalBrainImportJobsController, 'enqueueDueBrainImportJobs'),
    ).toBeGreaterThan(-1)
    expect(methodIndex(InternalBrainImportJobsController, 'processBrainImportJob')).toBeGreaterThan(
      -1,
    )
    expect(methodIndex(InternalBrainImportJobsController, 'claimBrainImportJob')).toBeGreaterThan(
      -1,
    )
    expect(controllers.indexOf(InternalMeetingImportJobsController)).toBeLessThan(
      controllers.indexOf(InternalBrainImportJobsController),
    )
    expect(
      methodIndex(InternalBrainImportJobsController, 'enqueueDueBrainImportJobs'),
    ).toBeLessThan(methodIndex(InternalBrainImportJobsController, 'claimBrainImportJob'))
  })
})
