import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { GoogleDriveRepository } from '../repositories/google-drive.repository'
import type {
  GoogleDriveDownloadResult,
  GoogleDriveFile,
  GoogleDriveFileList,
  GoogleDriveListFilesOptions,
} from '../types/google-drive.types'
import { GoogleDriveComposioFilesService } from './google-drive-composio-files.service'
import {
  GoogleDriveComposioMultiTabDocsService,
  type GoogleDocTabInput,
} from './google-drive-composio-multi-tab-docs.service'
import { GoogleDriveContentCacheService } from './google-drive-content-cache.service'

type DriveContentKind = 'html' | 'csv' | 'pdf' | 'embed'
type DriveContentResult = {
  kind: DriveContentKind
  mime_type: string
  modified_time: string
  content?: string
  web_view_link?: string
}

@Injectable()
export class GoogleDriveApiService {
  constructor(
    private readonly repo: GoogleDriveRepository,
    private readonly files: GoogleDriveComposioFilesService,
    private readonly multiTabDocs: GoogleDriveComposioMultiTabDocsService,
    private readonly contentCache: GoogleDriveContentCacheService,
  ) {}

  async listFiles(
    supabase: SupabaseClient,
    userId: string,
    opts?: GoogleDriveListFilesOptions,
    orgId?: string | null,
  ): Promise<GoogleDriveFileList> {
    const mode = await this.getConnectionMode(supabase, userId, orgId)
    if (mode.kind === 'composio') {
      return this.files.listFiles(userId, mode.connectedAccountId, opts)
    }
    throw new BadRequestException('Google Drive is not connected')
  }

  async listSharedDrives(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<{ drives: { id: string; name: string }[] }> {
    const mode = await this.getConnectionMode(supabase, userId, orgId)
    if (mode.kind === 'composio') {
      return this.files.listSharedDrives(userId, mode.connectedAccountId)
    }
    throw new BadRequestException('Google Drive is not connected')
  }

  async getFile(
    supabase: SupabaseClient,
    userId: string,
    fileId: string,
    orgId?: string | null,
  ): Promise<GoogleDriveFile> {
    const mode = await this.getConnectionMode(supabase, userId, orgId)
    if (mode.kind === 'composio') {
      return this.files.getFile(userId, mode.connectedAccountId, fileId)
    }
    throw new BadRequestException('Google Drive is not connected')
  }

  async getFileContent(
    supabase: SupabaseClient,
    userId: string,
    fileId: string,
    orgId?: string | null,
  ): Promise<DriveContentResult> {
    const file = await this.getFile(supabase, userId, fileId, orgId)
    const mimeType = file.mimeType || 'application/octet-stream'
    const modifiedTime = file.modifiedTime || new Date().toISOString()
    const cacheKey = `${file.id}:${modifiedTime}`
    const cached = this.contentCache.get<DriveContentResult>(cacheKey)
    if (cached) return cached

    const kind = this.resolveDriveContentKind(mimeType)
    let result: DriveContentResult

    if (kind === 'embed') {
      result = {
        kind,
        mime_type: mimeType,
        modified_time: modifiedTime,
        web_view_link: file.webViewLink,
      }
      this.contentCache.set(cacheKey, result)
      return result
    }

    const exportMimeType =
      kind === 'html' ? 'text/html' : kind === 'csv' ? 'text/csv' : 'application/pdf'
    const { buffer } = await this.downloadFile(
      supabase,
      userId,
      fileId,
      mimeType,
      orgId,
      exportMimeType,
    )

    if (kind === 'pdf') {
      result = {
        kind,
        mime_type: 'application/pdf',
        modified_time: modifiedTime,
        web_view_link: file.webViewLink,
      }
      this.contentCache.set(cacheKey, result)
      return result
    }

    result = {
      kind,
      mime_type: exportMimeType,
      modified_time: modifiedTime,
      content: buffer.toString('utf8'),
      web_view_link: file.webViewLink,
    }
    this.contentCache.set(cacheKey, result)
    return result
  }

  async downloadFile(
    supabase: SupabaseClient,
    userId: string,
    fileId: string,
    mimeType?: string,
    orgId?: string | null,
    preferredExportMimeType?: string,
  ): Promise<GoogleDriveDownloadResult> {
    const mode = await this.getConnectionMode(supabase, userId, orgId)
    if (mode.kind === 'composio') {
      return this.files.downloadFile(
        userId,
        mode.connectedAccountId,
        fileId,
        mimeType,
        preferredExportMimeType,
      )
    }
    throw new BadRequestException('Google Drive is not connected')
  }

  async uploadFile(
    supabase: SupabaseClient,
    userId: string,
    name: string,
    mimeType: string,
    body: Buffer,
    folderId?: string,
    orgId?: string | null,
  ): Promise<GoogleDriveFile> {
    const mode = await this.getConnectionMode(supabase, userId, orgId)
    if (mode.kind === 'composio') {
      return this.files.uploadFile(userId, mode.connectedAccountId, name, mimeType, body, folderId)
    }
    throw new BadRequestException('Google Drive is not connected')
  }

  async createGoogleDoc(
    supabase: SupabaseClient,
    userId: string,
    title: string,
    html: string,
    orgId?: string | null,
  ): Promise<GoogleDriveFile> {
    const mode = await this.getConnectionMode(supabase, userId, orgId)
    if (mode.kind === 'composio') {
      return this.files.createGoogleDoc(userId, mode.connectedAccountId, title, html)
    }
    throw new BadRequestException('Google Drive is not connected')
  }

  async createGoogleDocWithTabs(
    supabase: SupabaseClient,
    userId: string,
    title: string,
    tabs: GoogleDocTabInput[],
    orgId?: string | null,
  ): Promise<GoogleDriveFile> {
    const mode = await this.getConnectionMode(supabase, userId, orgId)
    if (mode.kind === 'composio') {
      return this.multiTabDocs.createGoogleDocWithTabs(userId, mode.connectedAccountId, title, tabs)
    }
    throw new BadRequestException('Google Drive is not connected')
  }

  async renameFile(
    supabase: SupabaseClient,
    userId: string,
    fileId: string,
    newName: string,
    orgId?: string | null,
  ) {
    const mode = await this.getConnectionMode(supabase, userId, orgId)
    if (mode.kind === 'composio') {
      return this.files.renameFile(userId, mode.connectedAccountId, fileId, newName)
    }
    throw new BadRequestException('Google Drive is not connected')
  }

  async shareFile(
    supabase: SupabaseClient,
    userId: string,
    fileId: string,
    email: string,
    role: 'reader' | 'writer' | 'commenter' = 'reader',
    orgId?: string | null,
  ) {
    const mode = await this.getConnectionMode(supabase, userId, orgId)
    if (mode.kind === 'composio') {
      return this.files.shareFile(userId, mode.connectedAccountId, fileId, email, role)
    }
    throw new BadRequestException('Google Drive is not connected')
  }

  async deleteFile(
    supabase: SupabaseClient,
    userId: string,
    fileId: string,
    orgId?: string | null,
  ): Promise<void> {
    const mode = await this.getConnectionMode(supabase, userId, orgId)
    if (mode.kind === 'composio') {
      return this.files.deleteFile(userId, mode.connectedAccountId, fileId)
    }
    throw new BadRequestException('Google Drive is not connected')
  }

  private async getConnectionMode(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<{ kind: 'composio'; connectedAccountId: string } | { kind: 'none' }> {
    const row = await this.repo.findConnectionMode(supabase, userId, orgId)
    if (!row) return { kind: 'none' }

    const metadata =
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : null
    const connectedAccountId =
      metadata && typeof metadata.composio_connected_account_id === 'string'
        ? metadata.composio_connected_account_id
        : ''
    if (connectedAccountId.length > 0) {
      return { kind: 'composio', connectedAccountId }
    }

    return { kind: 'none' }
  }

  private resolveDriveContentKind(mimeType: string): DriveContentKind {
    if (mimeType === 'application/vnd.google-apps.document') return 'html'
    if (mimeType === 'application/vnd.google-apps.spreadsheet') return 'csv'
    if (mimeType === 'application/vnd.google-apps.presentation') return 'pdf'
    return 'embed'
  }
}
