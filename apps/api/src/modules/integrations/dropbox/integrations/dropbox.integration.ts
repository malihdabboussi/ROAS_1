import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type {
  DropboxFile,
  DropboxFileList,
  DropboxOAuthTokenResponse,
} from '../types/dropbox.types'

@Injectable()
export class DropboxIntegration {
  private readonly appKey: string
  private readonly appSecret: string
  private readonly redirectUri: string

  private readonly AUTH_BASE = 'https://www.dropbox.com/oauth2/authorize'
  private readonly TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token'
  private readonly API_BASE = 'https://api.dropboxapi.com/2'
  private readonly CONTENT_BASE = 'https://content.dropboxapi.com/2'

  constructor(private readonly config: ConfigService) {
    this.appKey = this.config.get<string>('DROPBOX_APP_KEY') || ''
    this.appSecret = this.config.get<string>('DROPBOX_APP_SECRET') || ''
    this.redirectUri = this.config.get<string>('DROPBOX_REDIRECT_URI') || ''
  }

  isConfigured(): boolean {
    return !!(this.appKey && this.appSecret && this.redirectUri)
  }

  buildAuthorizationUrl(state: string): string {
    if (!this.isConfigured()) {
      throw new BadRequestException('Missing Dropbox OAuth configuration')
    }
    const params = new URLSearchParams({
      client_id: this.appKey,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      token_access_type: 'offline',
      state,
    })
    return `${this.AUTH_BASE}?${params.toString()}`
  }

  async exchangeCodeForTokens(code: string): Promise<DropboxOAuthTokenResponse> {
    const res = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.appKey,
        client_secret: this.appSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new BadRequestException(`Dropbox token exchange failed: ${text}`)
    }
    return res.json() as Promise<DropboxOAuthTokenResponse>
  }

  async refreshAccessToken(refreshToken: string): Promise<DropboxOAuthTokenResponse> {
    const res = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.appKey,
        client_secret: this.appSecret,
        grant_type: 'refresh_token',
      }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new BadRequestException(`Dropbox token refresh failed: ${text}`)
    }
    return res.json() as Promise<DropboxOAuthTokenResponse>
  }

  async getUserInfo(
    accessToken: string,
  ): Promise<{ email: string; name: string; accountId: string }> {
    const res = await fetch(`${this.API_BASE}/users/get_current_account`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: 'null',
    })
    if (!res.ok) throw new BadRequestException('Failed to get Dropbox user info')
    const data = (await res.json()) as {
      email: string
      name: { display_name: string }
      account_id: string
    }
    return { email: data.email, name: data.name.display_name, accountId: data.account_id }
  }

  async listFiles(
    accessToken: string,
    opts?: { path?: string; cursor?: string; limit?: number },
  ): Promise<DropboxFileList> {
    if (opts?.cursor) {
      const res = await fetch(`${this.API_BASE}/files/list_folder/continue`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ cursor: opts.cursor }),
      })
      if (!res.ok) throw new BadRequestException('Failed to continue listing Dropbox files')
      return res.json() as Promise<DropboxFileList>
    }

    const res = await fetch(`${this.API_BASE}/files/list_folder`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: opts?.path || '',
        recursive: false,
        include_mounted_folders: true,
        include_non_downloadable_files: true,
        limit: opts?.limit ?? 50,
      }),
    })
    if (!res.ok) {
      const errText = await res.text()
      throw new BadRequestException(`Failed to list Dropbox files: ${errText}`)
    }
    return res.json() as Promise<DropboxFileList>
  }

  async searchFiles(
    accessToken: string,
    query: string,
    opts?: { path?: string },
  ): Promise<{ matches: DropboxFile[] }> {
    const body: Record<string, unknown> = { query, options: { max_results: 50 } }
    if (opts?.path) body.options = { ...(body.options as object), path: opts.path }

    const res = await fetch(`${this.API_BASE}/files/search_v2`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new BadRequestException('Failed to search Dropbox files')
    const data = (await res.json()) as { matches: { metadata: { metadata: DropboxFile } }[] }
    return { matches: data.matches.map((m) => m.metadata.metadata) }
  }

  async getFileMetadata(accessToken: string, path: string): Promise<DropboxFile> {
    const res = await fetch(`${this.API_BASE}/files/get_metadata`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, include_media_info: true }),
    })
    if (!res.ok) throw new BadRequestException('Failed to get Dropbox file metadata')
    return res.json() as Promise<DropboxFile>
  }

  async downloadFile(accessToken: string, path: string): Promise<Buffer> {
    const res = await fetch(`${this.CONTENT_BASE}/files/download`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({ path }),
      },
    })
    if (!res.ok) throw new BadRequestException('Failed to download Dropbox file')
    const arrayBuffer = await res.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  async uploadFile(
    accessToken: string,
    path: string,
    body: Buffer,
    mode: 'add' | 'overwrite' = 'add',
  ): Promise<DropboxFile> {
    const res = await fetch(`${this.CONTENT_BASE}/files/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({ path, mode, autorename: true, mute: false }),
      },
      body: new Uint8Array(body),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new BadRequestException(`Failed to upload to Dropbox: ${text}`)
    }
    return res.json() as Promise<DropboxFile>
  }

  async deleteFile(accessToken: string, path: string): Promise<void> {
    const res = await fetch(`${this.API_BASE}/files/delete_v2`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    })
    if (!res.ok) throw new BadRequestException('Failed to delete Dropbox file')
  }

  async createSharedLink(accessToken: string, path: string): Promise<{ url: string }> {
    const res = await fetch(`${this.API_BASE}/sharing/create_shared_link_with_settings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path,
        settings: { requested_visibility: 'public', audience: 'public' },
      }),
    })
    if (!res.ok) {
      const data = (await res.json()) as {
        error?: { shared_link_already_exists?: { metadata?: { url: string } } }
      }
      if (data.error?.shared_link_already_exists?.metadata?.url) {
        return { url: data.error.shared_link_already_exists.metadata.url }
      }
      throw new BadRequestException('Failed to create Dropbox shared link')
    }
    const data = (await res.json()) as { url: string }
    return { url: data.url }
  }

  async moveFile(accessToken: string, fromPath: string, toPath: string): Promise<DropboxFile> {
    const res = await fetch(`${this.API_BASE}/files/move_v2`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from_path: fromPath, to_path: toPath, autorename: true }),
    })
    if (!res.ok) throw new BadRequestException('Failed to move Dropbox file')
    const data = (await res.json()) as { metadata: DropboxFile }
    return data.metadata
  }
}
