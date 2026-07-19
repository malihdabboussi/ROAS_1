import { readFile } from 'node:fs/promises'
import { BadRequestException, Injectable } from '@nestjs/common'
import { ComposioService } from '../../../composio/services/composio.service'
import type {
  GoogleDriveDownloadResult,
  GoogleDriveFile,
  GoogleDriveFileList,
  GoogleDriveListFilesOptions,
} from '../types/google-drive.types'
import { GoogleDriveComposioPayloadService } from './google-drive-composio-payload.service'
import { htmlToGoogleDocsMarkdown } from './html-to-google-docs-markdown'

@Injectable()
export class GoogleDriveComposioFilesService {
  private static readonly WORKSPACE_EXPORT_MAP: Record<string, string> = {
    'application/vnd.google-apps.document': 'application/pdf',
    'application/vnd.google-apps.spreadsheet': 'text/csv',
    'application/vnd.google-apps.presentation': 'application/pdf',
    'application/vnd.google-apps.drawing': 'image/png',
    'application/vnd.google-apps.jam': 'application/pdf',
  }

  constructor(
    private readonly composio: ComposioService,
    private readonly payload: GoogleDriveComposioPayloadService,
  ) {}

  async listFiles(
    userId: string,
    connectedAccountId: string,
    opts?: GoogleDriveListFilesOptions,
  ): Promise<GoogleDriveFileList> {
    const source = opts?.source ?? 'my_drive'
    const args: Record<string, unknown> = {
      pageSize: opts?.pageSize ?? 50,
      pageToken: opts?.pageToken,
      fields:
        'nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,iconLink,thumbnailLink,parents,owners(displayName,emailAddress,photoLink),sharingUser(displayName,emailAddress),starred)',
    }

    const qParts: string[] = ['trashed = false']
    if (source === 'shared_with_me') {
      qParts.push(opts?.folderId ? `'${opts.folderId}' in parents` : 'sharedWithMe = true')
      args.orderBy = 'modifiedTime desc'
      args.supportsAllDrives = true
      args.includeItemsFromAllDrives = true
    } else if (source === 'shared_drives' && opts?.driveId) {
      args.driveId = opts.driveId
      args.corpora = 'drive'
      args.supportsAllDrives = true
      args.includeItemsFromAllDrives = true
      args.orderBy = 'folder,modifiedTime desc'
      qParts.push(opts?.folderId ? `'${opts.folderId}' in parents` : `'${opts.driveId}' in parents`)
    } else {
      args.orderBy = 'folder,modifiedTime desc'
      qParts.push(opts?.folderId ? `'${opts.folderId}' in parents` : "'root' in parents")
    }

    if (opts?.query) qParts.push(`name contains '${opts.query.replace(/'/g, "\\'")}'`)
    args.q = qParts.join(' and ')

    const raw = await this.composio.executeTool(
      'GOOGLEDRIVE_LIST_FILES',
      userId,
      args,
      connectedAccountId,
    )
    const payload = this.payload.unwrap(raw)
    const payloadRecord = this.payload.asRecord(payload)
    const payloadDataRecord = this.payload.asRecord(payloadRecord?.['data'])
    const files =
      this.payload.asArray(payloadRecord?.['files']) ??
      this.payload.asArray(payloadDataRecord?.['files']) ??
      this.payload.asArray(payloadRecord?.['data']) ??
      this.payload.asArray(payload)
    if (!files) throw new BadRequestException('Failed to list Google Drive files')
    const nextPageToken =
      this.payload.asString(payloadRecord?.['nextPageToken']) ??
      this.payload.asString(payloadDataRecord?.['nextPageToken']) ??
      undefined
    return { files: files as GoogleDriveFile[], nextPageToken }
  }

  async listSharedDrives(
    userId: string,
    connectedAccountId: string,
  ): Promise<{ drives: { id: string; name: string }[] }> {
    const raw = await this.composio.executeTool(
      'GOOGLEDRIVE_LIST_SHARED_DRIVES',
      userId,
      {},
      connectedAccountId,
    )
    const payload = this.payload.unwrap(raw)
    const payloadRecord = this.payload.asRecord(payload)
    const payloadDataRecord = this.payload.asRecord(payloadRecord?.['data'])
    const drives =
      this.payload.asArray(payloadRecord?.['drives']) ??
      this.payload.asArray(payloadDataRecord?.['drives']) ??
      this.payload.asArray(payloadRecord?.['data']) ??
      this.payload.asArray(payload)
    return {
      drives: (drives ?? [])
        .map((item) => {
          const row = this.payload.asRecord(item)
          if (!row) return null
          const id = this.payload.asString(row.id)
          const name = this.payload.asString(row.name)
          if (!id || !name) return null
          return { id, name }
        })
        .filter((row): row is { id: string; name: string } => row !== null),
    }
  }

  async getFile(
    userId: string,
    connectedAccountId: string,
    fileId: string,
  ): Promise<GoogleDriveFile> {
    const raw = await this.composio.executeTool(
      'GOOGLEDRIVE_GET_FILE_METADATA',
      userId,
      {
        fileId,
        fields:
          'id,name,mimeType,size,createdTime,modifiedTime,webViewLink,iconLink,thumbnailLink,parents,owners(displayName,emailAddress,photoLink),sharingUser(displayName,emailAddress),starred',
        supportsAllDrives: true,
      },
      connectedAccountId,
    )
    const payload = this.payload.unwrap(raw)
    const payloadRecord = this.payload.asRecord(payload)
    const file = this.payload.asRecord(payloadRecord?.['data']) ?? payloadRecord
    if (!file) throw new BadRequestException('Failed to get Google Drive file')
    return file as unknown as GoogleDriveFile
  }

  async downloadFile(
    userId: string,
    connectedAccountId: string,
    fileId: string,
    mimeType?: string,
    preferredExportMimeType?: string,
  ): Promise<GoogleDriveDownloadResult> {
    const exportMime =
      preferredExportMimeType ||
      (mimeType ? GoogleDriveComposioFilesService.WORKSPACE_EXPORT_MAP[mimeType] : undefined)
    const args = { file_id: fileId, ...(exportMime ? { mime_type: exportMime } : {}) }
    const raw = await this.composio.executeTool(
      'GOOGLEDRIVE_DOWNLOAD_FILE',
      userId,
      args,
      connectedAccountId,
    )
    const payload = this.payload.unwrap(raw)
    const payloadRecord = this.payload.asRecord(payload)
    const payloadDataRecord = this.payload.asRecord(payloadRecord?.['data'])
    const filePath =
      this.payload.asString(payloadRecord?.['file_path']) ??
      this.payload.asString(payloadDataRecord?.['file_path']) ??
      this.payload.asString(payloadRecord?.['path']) ??
      this.payload.asString(payloadDataRecord?.['path'])
    const rawDownloaded =
      payloadRecord?.['downloaded_file_content'] ?? payloadDataRecord?.['downloaded_file_content']
    let downloadedContent = this.payload.asString(rawDownloaded)
    let downloadUrl: string | null = null
    let objMime: string | null = null
    if (
      !downloadedContent &&
      rawDownloaded &&
      typeof rawDownloaded === 'object' &&
      !Array.isArray(rawDownloaded)
    ) {
      const obj = rawDownloaded as Record<string, unknown>
      downloadedContent =
        this.payload.asString(obj.content) ??
        this.payload.asString(obj.data) ??
        this.payload.asString(obj.base64)
      downloadUrl = this.payload.asString(obj.s3url) ?? this.payload.asString(obj.uri)
      objMime = this.payload.asString(obj.mimeType)
    }
    const payloadMime =
      this.payload.asString(payloadRecord?.['mimeType']) ??
      this.payload.asString(payloadDataRecord?.['mimeType'])

    if (filePath) {
      const buffer = await readFile(filePath)
      const finalMime = exportMime ?? mimeType ?? 'application/octet-stream'
      return {
        buffer,
        exportMimeType: finalMime,
        exportExt: this.resolveExportExt(finalMime),
      }
    }

    if (downloadedContent) {
      const buffer = Buffer.from(downloadedContent, 'base64')
      const finalMime =
        exportMime ?? objMime ?? payloadMime ?? mimeType ?? 'application/octet-stream'
      return {
        buffer,
        exportMimeType: finalMime,
        exportExt: this.resolveExportExt(finalMime),
      }
    }

    if (downloadUrl) {
      const res = await fetch(downloadUrl)
      if (!res.ok) throw new BadRequestException('Failed to fetch file from Composio download URL')
      const arrayBuffer = await res.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const finalMime =
        exportMime ?? objMime ?? payloadMime ?? mimeType ?? 'application/octet-stream'
      return {
        buffer,
        exportMimeType: finalMime,
        exportExt: this.resolveExportExt(finalMime),
      }
    }

    throw new BadRequestException('Failed to download Google Drive file via Composio')
  }

  async uploadFile(
    userId: string,
    connectedAccountId: string,
    name: string,
    mimeType: string,
    body: Buffer,
    folderId?: string,
  ): Promise<GoogleDriveFile> {
    if (
      !mimeType.startsWith('text/') &&
      mimeType !== 'application/json' &&
      mimeType !== 'text/csv'
    ) {
      throw new BadRequestException(
        'Composio Google Drive upload currently supports text-based files only in this flow.',
      )
    }
    const text = body.toString('utf8')
    const raw = await this.composio.executeTool(
      'GOOGLEDRIVE_CREATE_FILE_FROM_TEXT',
      userId,
      {
        file_name: name,
        text_content: text,
        mime_type: mimeType || 'text/plain',
        ...(folderId ? { parent_id: folderId } : {}),
      },
      connectedAccountId,
    )
    const payload = this.payload.unwrap(raw)
    const payloadRecord = this.payload.asRecord(payload)
    const created = this.payload.asRecord(payloadRecord?.['data']) ?? payloadRecord
    if (!created)
      throw new BadRequestException('Failed to upload file to Google Drive via Composio')
    return created as unknown as GoogleDriveFile
  }

  async createGoogleDoc(
    userId: string,
    connectedAccountId: string,
    title: string,
    html: string,
  ): Promise<GoogleDriveFile> {
    if (Buffer.byteLength(html, 'utf8') > 4_500_000) {
      throw new BadRequestException('Document is too large for Google Docs export')
    }
    // Composio redacts OAuth tokens, so raw Drive HTML upload is unavailable.
    // CREATE_FILE_FROM_TEXT pastes HTML as plain text. Markdown create yields a
    // properly formatted Google Doc (headings/tables/lists) via the Docs toolkit
    // using the same Drive-connected account (drive scope covers Docs writes).
    const markdown = htmlToGoogleDocsMarkdown(html)
    if (!markdown.trim()) {
      throw new BadRequestException('Document has no exportable content')
    }
    const raw = await this.composio.executeTool(
      'GOOGLEDOCS_CREATE_DOCUMENT_MARKDOWN',
      userId,
      {
        title: title.trim() || 'Untitled',
        markdown_text: markdown,
      },
      connectedAccountId,
    )
    const payload = this.payload.unwrap(raw)
    const payloadRecord = this.payload.asRecord(payload)
    const created = this.payload.asRecord(payloadRecord?.['data']) ?? payloadRecord
    const fileId =
      this.payload.asString(created?.document_id) ??
      this.payload.asString(created?.id) ??
      this.payload.asString(created?.documentId)
    if (!created || !fileId) {
      throw new BadRequestException('Failed to create Google Doc')
    }
    const file = created as unknown as GoogleDriveFile
    return {
      ...file,
      id: fileId,
      name: title.trim() || file.name || 'Untitled',
      mimeType: file.mimeType || 'application/vnd.google-apps.document',
      webViewLink: file.webViewLink || `https://docs.google.com/document/d/${fileId}/edit`,
    }
  }

  async renameFile(
    userId: string,
    connectedAccountId: string,
    fileId: string,
    newName: string,
  ): Promise<GoogleDriveFile> {
    const raw = await this.composio.executeTool(
      'GOOGLEDRIVE_UPDATE_FILE_METADATA_PATCH',
      userId,
      { fileId, title: newName, supportsAllDrives: true },
      connectedAccountId,
    )
    const payload = this.payload.unwrap(raw)
    const payloadRecord = this.payload.asRecord(payload)
    const updated = this.payload.asRecord(payloadRecord?.['data']) ?? payloadRecord
    if (!updated) throw new BadRequestException('Failed to rename Google Drive file via Composio')
    return updated as unknown as GoogleDriveFile
  }

  async shareFile(
    userId: string,
    connectedAccountId: string,
    fileId: string,
    email: string,
    role: 'reader' | 'writer' | 'commenter',
  ): Promise<void> {
    await this.composio.executeTool(
      'GOOGLEDRIVE_CREATE_PERMISSION',
      userId,
      {
        file_id: fileId,
        type: 'user',
        email_address: email,
        role,
        supports_all_drives: true,
        send_notification_email: true,
      },
      connectedAccountId,
    )
  }

  async deleteFile(userId: string, connectedAccountId: string, fileId: string): Promise<void> {
    await this.composio.executeTool(
      'GOOGLEDRIVE_DELETE_FILE',
      userId,
      { fileId, supportsAllDrives: true },
      connectedAccountId,
    )
  }

  private resolveExportExt(mimeType: string): string {
    if (mimeType === 'application/pdf') return '.pdf'
    if (mimeType === 'text/csv') return '.csv'
    if (mimeType === 'image/png') return '.png'
    return ''
  }
}
