import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { DropboxIntegration } from '../integrations/dropbox.integration'
import type { DropboxFile, DropboxFileList } from '../types/dropbox.types'
import { DropboxOAuthService } from './dropbox-oauth.service'

@Injectable()
export class DropboxApiService {
  constructor(
    private readonly dropbox: DropboxIntegration,
    private readonly oauth: DropboxOAuthService,
  ) {}

  async listFiles(
    supabase: SupabaseClient,
    userId: string,
    opts?: { path?: string; cursor?: string; limit?: number },
  ): Promise<DropboxFileList> {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.dropbox.listFiles(token, opts)
  }

  async searchFiles(
    supabase: SupabaseClient,
    userId: string,
    query: string,
    opts?: { path?: string },
  ): Promise<{ matches: DropboxFile[] }> {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.dropbox.searchFiles(token, query, opts)
  }

  async getFileMetadata(
    supabase: SupabaseClient,
    userId: string,
    path: string,
  ): Promise<DropboxFile> {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.dropbox.getFileMetadata(token, path)
  }

  async downloadFile(supabase: SupabaseClient, userId: string, path: string): Promise<Buffer> {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.dropbox.downloadFile(token, path)
  }

  async uploadFile(
    supabase: SupabaseClient,
    userId: string,
    path: string,
    body: Buffer,
    mode: 'add' | 'overwrite' = 'add',
  ): Promise<DropboxFile> {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.dropbox.uploadFile(token, path, body, mode)
  }

  async deleteFile(supabase: SupabaseClient, userId: string, path: string): Promise<void> {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.dropbox.deleteFile(token, path)
  }

  async createSharedLink(
    supabase: SupabaseClient,
    userId: string,
    path: string,
  ): Promise<{ url: string }> {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.dropbox.createSharedLink(token, path)
  }

  async moveFile(
    supabase: SupabaseClient,
    userId: string,
    fromPath: string,
    toPath: string,
  ): Promise<DropboxFile> {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.dropbox.moveFile(token, fromPath, toPath)
  }
}
