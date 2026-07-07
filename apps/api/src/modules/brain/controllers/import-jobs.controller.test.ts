import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { BrainImportJobRequestsService } from '../services/brain-import-job-requests.service'
import { ImportJobStatusController } from './import-job-status.controller'
import { ImportJobsController } from './import-jobs.controller'

const user = { id: 'user-1' }
const scope = { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' as const }
const supabase = { from: vi.fn() }

function createController() {
  const importJobs = {
    enqueueDocumentRemember: vi.fn().mockResolvedValue({ jobId: 'job-1', status: 'queued' }),
    enqueueFathomMeetingImport: vi.fn().mockResolvedValue({ jobId: 'job-2', status: 'queued' }),
    enqueueCampaignFileImport: vi.fn().mockResolvedValue({ jobId: 'job-3', status: 'queued' }),
    enqueueSkIngest: vi.fn().mockResolvedValue({ jobId: 'job-4', status: 'queued' }),
  }
  const jobStatus = {
    listActiveJobs: vi.fn().mockResolvedValue([{ id: 'job-5' }]),
    cancelJob: vi.fn().mockResolvedValue(true),
  }
  const brainPermissions = {
    assertCanTrainBrain: vi.fn().mockResolvedValue('train'),
  }

  const requests = new BrainImportJobRequestsService(importJobs as never, brainPermissions as never)
  return {
    controller: new ImportJobsController(requests),
    statusController: new ImportJobStatusController(jobStatus as never),
    importJobs,
    jobStatus,
    brainPermissions,
  }
}

describe('ImportJobsController', () => {
  it('trims document content and applies document defaults before enqueueing', async () => {
    const { controller, importJobs } = createController()

    await expect(
      controller.enqueueRememberDocument(
        user,
        {
          content: '  useful notes  ',
          sourceTitle: 'Notes',
        },
        scope,
      ),
    ).resolves.toEqual({ success: true, jobId: 'job-1', status: 'queued' })

    expect(importJobs.enqueueDocumentRemember).toHaveBeenCalledWith(
      'user-1',
      {
        content: 'useful notes',
        sourceType: 'document',
        sourceId: null,
        sourceTitle: 'Notes',
        mediaType: 'text',
        mediaUrl: null,
        mediaMimeType: null,
        mediaBase64: null,
        mediaCaption: null,
        assetId: null,
        assetRef: null,
      },
      'org-1',
    )
  })

  it('preserves uploaded asset refs in document import jobs', async () => {
    const { controller, importJobs } = createController()
    const assetRef = {
      kind: 'vibey_asset',
      asset_id: 'asset-1',
      bucket_name: 'media',
      file_path: 'user-1/documents/notes.pdf',
      url: 'https://cdn.example/notes.pdf',
      mime_type: 'application/pdf',
      asset_type: 'document',
      name: 'notes.pdf',
      original_filename: 'notes.pdf',
      file_size: 99,
      campaign_id: null,
      space_id: null,
      org_id: 'org-1',
      source: 'upload',
      source_surface: 'brain',
    } as const

    await expect(
      controller.enqueueRememberDocument(
        user,
        {
          content: 'notes',
          mediaUrl: 'https://cdn.example/notes.pdf',
          assetId: 'asset-1',
          assetRef,
        } as never,
        scope,
      ),
    ).resolves.toEqual({ success: true, jobId: 'job-1', status: 'queued' })

    expect(importJobs.enqueueDocumentRemember).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        mediaUrl: 'https://cdn.example/notes.pdf',
        assetId: 'asset-1',
        assetRef,
      }),
      'org-1',
    )
  })

  it('rejects invalid document source types before enqueueing', async () => {
    const { controller, importJobs } = createController()

    await expect(
      controller.enqueueRememberDocument(
        user,
        { content: 'body', sourceType: 'invalid' as never },
        scope,
      ),
    ).rejects.toBeInstanceOf(BadRequestException)

    expect(importJobs.enqueueDocumentRemember).not.toHaveBeenCalled()
  })

  it('checks brain train permissions before enqueueing a scoped meeting import', async () => {
    const { controller, importJobs, brainPermissions } = createController()
    const meeting = { id: 'meeting-1', title: 'Call' }

    await expect(
      controller.enqueueFathomMeeting(
        user,
        { meeting, brainId: ' brain-1 ', targetBrain: ' agent ' },
        scope,
        supabase as never,
      ),
    ).resolves.toEqual({ success: true, jobId: 'job-2', status: 'queued' })

    expect(brainPermissions.assertCanTrainBrain).toHaveBeenCalledWith(
      supabase,
      'user-1',
      scope,
      'brain-1',
    )
    expect(importJobs.enqueueFathomMeetingImport).toHaveBeenCalledWith(
      'user-1',
      meeting,
      'org-1',
      'brain-1',
      'agent',
    )
  })

  it('trims campaign file inputs and validates source type', async () => {
    const { controller, importJobs } = createController()

    await expect(
      controller.enqueueCampaignFile(
        user,
        {
          campaignId: ' campaign-1 ',
          title: ' Plan ',
          content: ' Strategy ',
          sourceType: 'drive',
          domain: 'strategy',
        },
        scope,
      ),
    ).resolves.toEqual({ success: true, jobId: 'job-3', status: 'queued' })

    expect(importJobs.enqueueCampaignFileImport).toHaveBeenCalledWith(
      'user-1',
      {
        campaignId: 'campaign-1',
        title: 'Plan',
        content: 'Strategy',
        sourceType: 'drive',
        domain: 'strategy',
        mediaType: 'text',
        mediaUrl: null,
        mediaMimeType: null,
        mediaBase64: null,
        mediaCaption: null,
        assetId: null,
        assetRef: null,
      },
      'org-1',
    )
  })

  it('checks train permission and trims SK ingest fields', async () => {
    const { controller, importJobs, brainPermissions } = createController()

    await expect(
      controller.enqueueSkIngest(
        user,
        {
          brainId: ' brain-1 ',
          text: ' Knowledge ',
          sourceType: ' note ',
          title: ' Title ',
        },
        scope,
        supabase as never,
      ),
    ).resolves.toEqual({ success: true, jobId: 'job-4', status: 'queued' })

    expect(brainPermissions.assertCanTrainBrain).toHaveBeenCalledWith(
      supabase,
      'user-1',
      scope,
      'brain-1',
    )
    expect(importJobs.enqueueSkIngest).toHaveBeenCalledWith(
      'user-1',
      {
        brainId: 'brain-1',
        text: 'Knowledge',
        sourceType: 'note',
        title: 'Title',
        domain: undefined,
        mediaType: 'text',
        mediaUrl: null,
        mediaMimeType: null,
        mediaBase64: null,
        mediaCaption: null,
        assetId: null,
        assetRef: null,
      },
      'org-1',
    )
  })

  it('maps active job query scope from brain and campaign filters', async () => {
    const { statusController, jobStatus } = createController()

    await expect(statusController.listActiveJobs(user, scope, ' brain-1 ')).resolves.toEqual({
      success: true,
      jobs: [{ id: 'job-5' }],
    })

    expect(jobStatus.listActiveJobs).toHaveBeenCalledWith('user-1', {
      brainId: 'brain-1',
    })
  })

  it('rejects cancel requests when the job cannot be cancelled', async () => {
    const { statusController, jobStatus } = createController()
    jobStatus.cancelJob.mockResolvedValue(false)

    await expect(statusController.cancelJob(user, 'job-1', scope)).rejects.toBeInstanceOf(
      BadRequestException,
    )
  })
})
