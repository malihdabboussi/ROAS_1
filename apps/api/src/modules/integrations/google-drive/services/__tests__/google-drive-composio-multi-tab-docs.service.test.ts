import { describe, expect, it, vi } from 'vitest'
import { GoogleDriveComposioMultiTabDocsService } from '../google-drive-composio-multi-tab-docs.service'
import { GoogleDriveComposioPayloadService } from '../google-drive-composio-payload.service'

describe('GoogleDriveComposioMultiTabDocsService', () => {
  it('copies a native template and appends campaign content to matching copied tabs', async () => {
    const executeTool = vi
      .fn()
      .mockResolvedValueOnce({ successful: true, data: { document_id: 'copy-1' } })
      .mockResolvedValueOnce({
        successful: true,
        data: {
          tabs: [
            {
              tabProperties: { tabId: 't.overview', title: '0 - OVERVIEW' },
              documentTab: { body: { content: [{ endIndex: 50 }] } },
            },
            {
              tabProperties: { tabId: 't.funnels', title: '3 - FUNNEL PAGES' },
              documentTab: { body: { content: [{ endIndex: 80 }] } },
              childTabs: [
                {
                  tabProperties: { tabId: 't.optin', title: 'P1 - OPT IN PAGE' },
                  documentTab: { body: { content: [{ endIndex: 100 }] } },
                },
              ],
            },
          ],
        },
      })
      .mockResolvedValue({ successful: true, data: {} })
    const service = new GoogleDriveComposioMultiTabDocsService(
      { executeTool } as never,
      new GoogleDriveComposioPayloadService(),
    )

    const file = await service.copyGoogleDocTemplateWithTabs(
      'user-1',
      'account-1',
      'template-1',
      'Impact Launch Bible',
      [
        { title: '0 - Overview', html: '<h1>Campaign overview</h1>' },
        {
          title: 'P1 - Opt-in Page',
          parentTitle: '3 - Funnel Pages',
          html: '<h1>Opt-in copy</h1>',
        },
      ],
    )

    expect(file.id).toBe('copy-1')
    expect(executeTool).toHaveBeenNthCalledWith(
      1,
      'GOOGLEDOCS_COPY_DOCUMENT',
      'user-1',
      { document_id: 'template-1', title: 'Impact Launch Bible' },
      'account-1',
    )
    expect(executeTool).toHaveBeenCalledWith(
      'GOOGLEDOCS_UPDATE_EXISTING_DOCUMENT',
      'user-1',
      expect.objectContaining({
        document_id: 'copy-1',
        editDocs: expect.arrayContaining([
          expect.objectContaining({
            insertText: expect.objectContaining({
              location: { index: 49, tabId: 't.overview' },
            }),
          }),
        ]),
      }),
      'account-1',
    )
    expect(executeTool).toHaveBeenCalledWith(
      'GOOGLEDOCS_UPDATE_EXISTING_DOCUMENT',
      'user-1',
      expect.objectContaining({
        editDocs: expect.arrayContaining([
          expect.objectContaining({
            insertText: expect.objectContaining({
              location: { index: 99, tabId: 't.optin' },
            }),
          }),
        ]),
      }),
      'account-1',
    )
  })

  it('creates a multi-tab Google Doc via markdown create + addDocumentTab', async () => {
    const executeTool = vi
      .fn()
      .mockResolvedValueOnce({
        successful: true,
        data: { document_id: 'doc-1' },
      })
      .mockResolvedValueOnce({ successful: true, data: {} })
      .mockResolvedValueOnce({
        successful: true,
        data: {
          data: {
            replies: [
              {
                addDocumentTab: {
                  tabProperties: { tabId: 't.second', title: 'Email 2' },
                },
              },
            ],
          },
        },
      })
      .mockResolvedValue({ successful: true, data: {} })

    const service = new GoogleDriveComposioMultiTabDocsService(
      { executeTool } as never,
      new GoogleDriveComposioPayloadService(),
    )

    const file = await service.createGoogleDocWithTabs(
      'user-1',
      'account-1',
      'Mission Deliverables',
      [
        { title: 'Email 1', html: '<h1>Email 1</h1><p>Hello</p>' },
        {
          title: 'Email 2',
          html: '<h1>Email 2</h1><p>Reminder</p><table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>',
        },
      ],
    )

    expect(file).toMatchObject({
      id: 'doc-1',
      webViewLink: 'https://docs.google.com/document/d/doc-1/edit',
    })
    expect(executeTool).toHaveBeenCalledWith(
      'GOOGLEDOCS_CREATE_DOCUMENT_MARKDOWN',
      'user-1',
      expect.objectContaining({ title: 'Mission Deliverables' }),
      'account-1',
    )
    expect(executeTool).toHaveBeenCalledWith(
      'GOOGLEDOCS_UPDATE_EXISTING_DOCUMENT',
      'user-1',
      expect.objectContaining({
        document_id: 'doc-1',
        editDocs: [
          expect.objectContaining({
            updateDocumentTabProperties: expect.objectContaining({
              tabProperties: expect.objectContaining({ tabId: 't.0', title: 'Email 1' }),
            }),
          }),
        ],
      }),
      'account-1',
    )
    expect(executeTool).toHaveBeenCalledWith(
      'GOOGLEDOCS_UPDATE_EXISTING_DOCUMENT',
      'user-1',
      expect.objectContaining({
        editDocs: [
          expect.objectContaining({
            addDocumentTab: expect.objectContaining({
              tabProperties: { title: 'Email 2' },
            }),
          }),
        ],
      }),
      'account-1',
    )
    expect(executeTool).toHaveBeenCalledWith(
      'GOOGLEDOCS_UPDATE_EXISTING_DOCUMENT',
      'user-1',
      expect.objectContaining({
        editDocs: expect.arrayContaining([
          expect.objectContaining({
            insertText: expect.objectContaining({
              location: expect.objectContaining({ tabId: 't.second' }),
            }),
          }),
        ]),
      }),
      'account-1',
    )
    expect(executeTool).toHaveBeenCalledWith(
      'GOOGLEDOCS_UPDATE_EXISTING_DOCUMENT',
      'user-1',
      expect.objectContaining({
        editDocs: expect.arrayContaining([
          expect.objectContaining({
            insertTable: expect.objectContaining({
              location: expect.objectContaining({ tabId: 't.second' }),
            }),
          }),
        ]),
      }),
      'account-1',
    )
  })

  it('creates child tabs beneath an earlier parent tab', async () => {
    const executeTool = vi
      .fn()
      .mockResolvedValueOnce({ successful: true, data: { document_id: 'doc-1' } })
      .mockResolvedValueOnce({ successful: true, data: {} })
      .mockResolvedValueOnce({
        successful: true,
        data: {
          replies: [
            {
              addDocumentTab: { tabProperties: { tabId: 't.funnels', title: '3 - Funnel Pages' } },
            },
          ],
        },
      })
      .mockResolvedValueOnce({ successful: true, data: {} })
      .mockResolvedValueOnce({
        successful: true,
        data: {
          replies: [
            { addDocumentTab: { tabProperties: { tabId: 't.optin', title: 'P1 - Opt-in Page' } } },
          ],
        },
      })
      .mockResolvedValue({ successful: true, data: {} })
    const service = new GoogleDriveComposioMultiTabDocsService(
      { executeTool } as never,
      new GoogleDriveComposioPayloadService(),
    )

    await service.createGoogleDocWithTabs('user-1', 'account-1', 'Launch Bible', [
      { title: '0 - Overview', html: '<h1>Overview</h1>' },
      { title: '3 - Funnel Pages', html: '<h1>Funnel Pages</h1>' },
      {
        title: 'P1 - Opt-in Page',
        parentTitle: '3 - Funnel Pages',
        html: '<h1>Opt-in</h1>',
      },
    ])

    expect(executeTool).toHaveBeenCalledWith(
      'GOOGLEDOCS_UPDATE_EXISTING_DOCUMENT',
      'user-1',
      expect.objectContaining({
        editDocs: [
          expect.objectContaining({
            addDocumentTab: {
              tabProperties: {
                title: 'P1 - Opt-in Page',
                parentTabId: 't.funnels',
              },
            },
          }),
        ],
      }),
      'account-1',
    )
  })
})
