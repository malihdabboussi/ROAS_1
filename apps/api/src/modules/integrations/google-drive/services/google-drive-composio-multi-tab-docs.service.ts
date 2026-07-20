import { BadRequestException, Injectable } from '@nestjs/common'
import { ComposioService } from '../../../composio/services/composio.service'
import type { GoogleDriveFile } from '../types/google-drive.types'
import { GoogleDriveComposioPayloadService } from './google-drive-composio-payload.service'
import { htmlToGoogleDocsMarkdown } from './html-to-google-docs-markdown'
import { markdownToGoogleDocsTabRequests } from './markdown-to-google-docs-tab-requests'

export type GoogleDocTabInput = {
  title: string
  html: string
  parentTitle?: string
}

const FIRST_TAB_ID = 't.0'
const MAX_TAB_TITLE = 100
const MAX_EDIT_BATCH = 40

@Injectable()
export class GoogleDriveComposioMultiTabDocsService {
  constructor(
    private readonly composio: ComposioService,
    private readonly payload: GoogleDriveComposioPayloadService,
  ) {}

  async createGoogleDocWithTabs(
    userId: string,
    connectedAccountId: string,
    title: string,
    tabs: GoogleDocTabInput[],
  ): Promise<GoogleDriveFile> {
    const prepared = tabs
      .map((tab) => {
        const tabTitle = truncateTitle(tab.title)
        const markdown = htmlToGoogleDocsMarkdown(tab.html)
        return {
          title: tabTitle,
          markdown,
          parentTitle: tab.parentTitle ? truncateTitle(tab.parentTitle) : undefined,
        }
      })
      .filter((tab) => tab.markdown.trim().length > 0)

    if (prepared.length === 0) {
      throw new BadRequestException('No exportable document content found')
    }

    const totalBytes = prepared.reduce(
      (sum, tab) => sum + Buffer.byteLength(tab.markdown, 'utf8'),
      0,
    )
    if (totalBytes > 4_500_000) {
      throw new BadRequestException('Documents are too large for Google Docs export')
    }

    const docTitle = title.trim() || 'Untitled'
    const createdRaw = await this.composio.executeTool(
      'GOOGLEDOCS_CREATE_DOCUMENT_MARKDOWN',
      userId,
      {
        title: docTitle,
        markdown_text: prepared[0]!.markdown,
      },
      connectedAccountId,
    )
    const fileId = this.extractDocumentId(createdRaw)
    if (!fileId) throw new BadRequestException('Failed to create Google Doc')

    await this.updateDocument(userId, connectedAccountId, fileId, [
      {
        updateDocumentTabProperties: {
          tabProperties: { tabId: FIRST_TAB_ID, title: prepared[0]!.title },
          fields: 'title',
        },
      },
    ])
    const tabIdsByTitle = new Map<string, string>([[prepared[0]!.title, FIRST_TAB_ID]])

    for (const tab of prepared.slice(1)) {
      const parentTabId = tab.parentTitle ? tabIdsByTitle.get(tab.parentTitle) : undefined
      if (tab.parentTitle && !parentTabId) {
        throw new BadRequestException(`Google Doc parent tab not found: ${tab.parentTitle}`)
      }
      const addRaw = await this.updateDocument(userId, connectedAccountId, fileId, [
        {
          addDocumentTab: {
            tabProperties: {
              title: tab.title,
              ...(parentTabId ? { parentTabId } : {}),
            },
          },
        },
      ])
      const tabId = this.extractAddedTabId(addRaw)
      if (!tabId) {
        throw new BadRequestException('Failed to create a Google Doc tab')
      }
      tabIdsByTitle.set(tab.title, tabId)
      const requests = markdownToGoogleDocsTabRequests(tab.markdown, tabId)
      await this.updateDocumentBatched(userId, connectedAccountId, fileId, requests)
    }

    return {
      id: fileId,
      name: docTitle,
      mimeType: 'application/vnd.google-apps.document',
      webViewLink: `https://docs.google.com/document/d/${fileId}/edit`,
    }
  }

  private async updateDocumentBatched(
    userId: string,
    connectedAccountId: string,
    documentId: string,
    requests: Record<string, unknown>[],
  ): Promise<void> {
    if (requests.length === 0) return
    for (let i = 0; i < requests.length; i += MAX_EDIT_BATCH) {
      await this.updateDocument(
        userId,
        connectedAccountId,
        documentId,
        requests.slice(i, i + MAX_EDIT_BATCH),
      )
    }
  }

  private async updateDocument(
    userId: string,
    connectedAccountId: string,
    documentId: string,
    editDocs: Record<string, unknown>[],
  ): Promise<unknown> {
    const raw = await this.composio.executeTool(
      'GOOGLEDOCS_UPDATE_EXISTING_DOCUMENT',
      userId,
      { document_id: documentId, editDocs },
      connectedAccountId,
    )
    this.payload.unwrap(raw)
    return raw
  }

  private extractDocumentId(raw: unknown): string | null {
    const payload = this.payload.unwrap(raw)
    const record = this.payload.asRecord(payload)
    const nested = this.payload.asRecord(record?.['data'])
    return (
      this.payload.asString(record?.document_id) ??
      this.payload.asString(record?.documentId) ??
      this.payload.asString(record?.id) ??
      this.payload.asString(nested?.document_id) ??
      this.payload.asString(nested?.documentId) ??
      this.payload.asString(nested?.id)
    )
  }

  private extractAddedTabId(raw: unknown): string | null {
    const payload = this.payload.unwrap(raw)
    const record = this.payload.asRecord(payload)
    const data = this.payload.asRecord(record?.['data']) ?? record
    const replies = this.payload.asArray(data?.['replies']) ?? []
    for (const reply of replies) {
      const row = this.payload.asRecord(reply)
      const add = this.payload.asRecord(row?.['addDocumentTab'])
      const props = this.payload.asRecord(add?.['tabProperties'])
      const tabId = this.payload.asString(props?.['tabId'])
      if (tabId) return tabId
    }
    return null
  }
}

function truncateTitle(value: string): string {
  const title = value.trim() || 'Untitled'
  if (title.length <= MAX_TAB_TITLE) return title
  return `${title.slice(0, MAX_TAB_TITLE - 1).trimEnd()}…`
}
