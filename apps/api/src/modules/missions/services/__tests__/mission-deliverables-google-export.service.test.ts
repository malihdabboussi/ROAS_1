import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { MissionDeliverablesGoogleExportService } from '../mission-deliverables-google-export.service'

describe('MissionDeliverablesGoogleExportService', () => {
  it('exports space-doc deliverables as Google Doc tabs', async () => {
    const lifecycle = {
      getById: vi.fn().mockResolvedValue({ title: 'Webinar Fulfillment' }),
    }
    const repo = {
      listDeliverables: vi.fn().mockResolvedValue([
        {
          id: 'd1',
          title: 'Email 1',
          type: 'doc',
          entity_table: 'space_items',
          entity_id: 'item-1',
          created_at: '2026-07-01T10:00:00.000Z',
        },
        {
          id: 'd2',
          title: 'Offer',
          type: 'offer',
          entity_table: null,
          entity_id: null,
          created_at: '2026-07-01T11:00:00.000Z',
        },
        {
          id: 'd3',
          title: 'Email 2',
          type: 'doc',
          entity_table: 'space_items',
          entity_id: 'item-2',
          created_at: '2026-07-01T12:00:00.000Z',
        },
      ]),
      createDeliverable: vi.fn().mockResolvedValue({ id: 'deliverable-google-1' }),
    }
    const googleDrive = {
      createGoogleDocWithTabs: vi.fn().mockResolvedValue({
        id: 'doc-1',
        webViewLink: 'https://docs.google.com/document/d/doc-1/edit',
      }),
    }
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [
              { id: 'item-1', title: 'Email 1', doc_body: '<p>Hello</p>' },
              { id: 'item-2', title: 'Email 2', doc_body: '<p>Reminder</p>' },
            ],
            error: null,
          }),
        }),
      }),
    }

    const service = new MissionDeliverablesGoogleExportService(
      lifecycle as never,
      repo as never,
      googleDrive as never,
    )

    await expect(
      service.exportSpaceDocsToGoogleDoc(supabase as never, 'user-1', 'mission-1', 'org-1'),
    ).resolves.toEqual({
      file: {
        id: 'doc-1',
        webViewLink: 'https://docs.google.com/document/d/doc-1/edit',
      },
      tabCount: 2,
      deliverableId: 'deliverable-google-1',
    })

    expect(googleDrive.createGoogleDocWithTabs).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'Webinar Fulfillment — Deliverables',
      [
        { title: 'Email 1', html: '<h1>Email 1</h1><p>Hello</p>' },
        { title: 'Email 2', html: '<h1>Email 2</h1><p>Reminder</p>' },
      ],
      'org-1',
    )
    expect(repo.createDeliverable).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        mission_id: 'mission-1',
        agent_key: 'atlas',
        type: 'file',
        title: 'Webinar Fulfillment — Deliverables',
        file_url: 'https://docs.google.com/document/d/doc-1/edit',
        mime_type: 'application/vnd.google-apps.document',
      }),
    )
  })

  it('copies the native Launch Bible template before adding campaign content', async () => {
    const lifecycle = {
      getById: vi.fn().mockResolvedValue({ title: 'Impact Webinar Fulfillment' }),
    }
    const repo = {
      listDeliverables: vi.fn().mockResolvedValue([]),
      createDeliverable: vi.fn().mockResolvedValue({ id: 'launch-bible-1' }),
    }
    const googleDrive = {
      createGoogleDocFromTemplate: vi.fn().mockResolvedValue({
        id: 'google-doc-1',
        name: 'Impact Webinar Launch Bible',
        mimeType: 'application/vnd.google-apps.document',
        webViewLink: 'https://docs.google.com/document/d/google-doc-1/edit',
      }),
    }
    const service = new MissionDeliverablesGoogleExportService(
      lifecycle as never,
      repo as never,
      googleDrive as never,
    )
    const tabs = [
      { title: '0 - Overview', html: '<h1>Overview</h1><p>Funnel: https://example.com</p>' },
      { title: '1 - ICP Sheet', html: '<h1>ICP</h1><p>Mortgage lenders</p>' },
      { title: '7 - SMS & Emails', html: '<h1>Follow-up</h1><p>Email 1</p>' },
    ]

    await expect(
      service.exportSpaceDocsToGoogleDoc({} as never, 'user-1', 'mission-1', 'org-1', {
        title: 'Impact Webinar Launch Bible',
        tabs,
        deliverableTitle: 'Task 16 — Webinar Launch Bible',
        source: 'webinar_launch_bible',
      }),
    ).resolves.toEqual({
      file: expect.objectContaining({ id: 'google-doc-1' }),
      tabCount: 3,
      deliverableId: 'launch-bible-1',
    })

    expect(googleDrive.createGoogleDocFromTemplate).toHaveBeenCalledWith(
      {},
      'user-1',
      expect.objectContaining({
        title: 'Impact Webinar Launch Bible',
        tabs,
      }),
      'org-1',
    )
    expect(repo.createDeliverable).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        title: 'Task 16 — Webinar Launch Bible',
        metadata: expect.objectContaining({
          source_action: 'compile_webinar_launch_bible',
          export_source: 'webinar_launch_bible',
          google_file_id: 'google-doc-1',
          template_document_id: expect.any(String),
          template_preserved: true,
          tab_count: 3,
        }),
      }),
    )
  })

  it('rejects when there are no space documents', async () => {
    const service = new MissionDeliverablesGoogleExportService(
      { getById: vi.fn().mockResolvedValue({ title: 'Empty' }) } as never,
      { listDeliverables: vi.fn().mockResolvedValue([]) } as never,
      { createGoogleDocWithTabs: vi.fn() } as never,
    )

    await expect(
      service.exportSpaceDocsToGoogleDoc({} as never, 'user-1', 'mission-1', null),
    ).rejects.toBeInstanceOf(BadRequestException)
  })
})
