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

type CopiedTemplateTab = {
  title: string
  tabId: string
  parentTabId?: string
  endIndex: number
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

  async copyGoogleDocTemplateWithTabs(
    userId: string,
    connectedAccountId: string,
    templateDocumentId: string,
    title: string,
    tabs: GoogleDocTabInput[],
  ): Promise<GoogleDriveFile> {
    const prepared = this.prepareTabs(tabs)
    const docTitle = title.trim() || 'Webinar Launch Bible'
    const copiedRaw = await this.composio.executeTool(
      'GOOGLEDOCS_COPY_DOCUMENT',
      userId,
      { document_id: templateDocumentId, title: docTitle },
      connectedAccountId,
    )
    const fileId = this.extractDocumentId(copiedRaw)
    if (!fileId) throw new BadRequestException('Failed to copy Webinar Launch Bible template')

    const documentRaw = await this.composio.executeTool(
      'GOOGLEDOCS_GET_DOCUMENT_BY_ID',
      userId,
      { document_id: fileId, include_tabs_content: true },
      connectedAccountId,
    )
    const copiedTabs = this.extractCopiedTemplateTabs(documentRaw)
    const copiedByTitle = new Map(copiedTabs.map((tab) => [normalizeTabTitle(tab.title), tab]))

    for (const tab of prepared) {
      const target = copiedByTitle.get(normalizeTabTitle(tab.title))
      if (!target) {
        throw new BadRequestException(`Webinar Launch Bible template tab not found: ${tab.title}`)
      }
      if (tab.parentTitle) {
        const expectedParent = copiedByTitle.get(normalizeTabTitle(tab.parentTitle))
        if (!expectedParent || target.parentTabId !== expectedParent.tabId) {
          throw new BadRequestException(`Webinar Launch Bible parent tab mismatch: ${tab.title}`)
        }
      }
      const requests = markdownToGoogleDocsTabRequests(
        tab.markdown,
        target.tabId,
        Math.max(1, target.endIndex - 1),
      )
      await this.updateDocumentBatched(userId, connectedAccountId, fileId, requests)
    }

    return {
      id: fileId,
      name: docTitle,
      mimeType: 'application/vnd.google-apps.document',
      webViewLink: `https://docs.google.com/document/d/${fileId}/edit`,
    }
  }

  async createGoogleDocWithTabs(
    userId: string,
    connectedAccountId: string,
    title: string,
    tabs: GoogleDocTabInput[],
  ): Promise<GoogleDriveFile> {
    const prepared = this.prepareTabs(tabs)

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

  private prepareTabs(tabs: GoogleDocTabInput[]) {
    const prepared = tabs
      .map((tab) => ({
        title: truncateTitle(tab.title),
        markdown: htmlToGoogleDocsMarkdown(tab.html),
        parentTitle: tab.parentTitle ? truncateTitle(tab.parentTitle) : undefined,
      }))
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
    return prepared
  }

  private extractCopiedTemplateTabs(raw: unknown): CopiedTemplateTab[] {
    const payload = this.payload.unwrap(raw)
    const record = this.payload.asRecord(payload)
    const data = this.payload.asRecord(record?.['data']) ?? record
    const rows = this.payload.asArray(data?.['tabs']) ?? []
    const flattened: CopiedTemplateTab[] = []

    const visit = (value: unknown, parentTabId?: string) => {
      const tab = this.payload.asRecord(value)
      const properties = this.payload.asRecord(tab?.['tabProperties'])
      const tabId = this.payload.asString(properties?.['tabId'])
      const title = this.payload.asString(properties?.['title'])
      const documentTab = this.payload.asRecord(tab?.['documentTab'])
      const body = this.payload.asRecord(documentTab?.['body'])
      const content = this.payload.asArray(body?.['content']) ?? []
      const endIndex = content.reduce<number>((max, element) => {
        const row = this.payload.asRecord(element)
        const value = typeof row?.['endIndex'] === 'number' ? row['endIndex'] : 1
        return Math.max(max, value)
      }, 1)
      if (tabId && title) flattened.push({ title, tabId, parentTabId, endIndex })
      const children = this.payload.asArray(tab?.['childTabs']) ?? []
      for (const child of children) visit(child, tabId ?? parentTabId)
    }

    for (const row of rows) visit(row)
    if (flattened.length === 0) {
      throw new BadRequestException('Copied Webinar Launch Bible has no readable tabs')
    }
    return flattened
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

function normalizeTabTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\bvideos\b/g, 'video')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
