export interface DropboxOAuthTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
  uid: string
  account_id: string
}

export interface DropboxFile {
  id: string
  name: string
  path_lower: string
  path_display: string
  '.tag': 'file' | 'folder' | 'deleted'
  size?: number
  is_downloadable?: boolean
  client_modified?: string
  server_modified?: string
  rev?: string
  content_hash?: string
  sharing_info?: {
    read_only: boolean
    shared_folder_id?: string
  }
}

export interface DropboxFileList {
  entries: DropboxFile[]
  cursor: string
  has_more: boolean
}

export interface DropboxUserIntegration {
  id: string
  user_id: string
  integration_id: string
  provider: string
  status: string
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  metadata: {
    email?: string
    display_name?: string
    account_id?: string
  } | null
}
