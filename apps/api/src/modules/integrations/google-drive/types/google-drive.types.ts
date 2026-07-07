export interface GoogleDriveOAuthTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
}

export interface GoogleDriveFileOwner {
  displayName?: string
  emailAddress?: string
  photoLink?: string
}

export interface GoogleDriveFile {
  id: string
  name: string
  mimeType: string
  size?: string
  createdTime?: string
  modifiedTime?: string
  webViewLink?: string
  iconLink?: string
  thumbnailLink?: string
  parents?: string[]
  owners?: GoogleDriveFileOwner[]
  sharingUser?: GoogleDriveFileOwner
  starred?: boolean
}

export interface GoogleDriveFileList {
  files: GoogleDriveFile[]
  nextPageToken?: string
}

export type GoogleDriveSource = 'my_drive' | 'shared_with_me' | 'shared_drives'

export type GoogleDriveListFilesOptions = {
  folderId?: string
  pageToken?: string
  pageSize?: number
  query?: string
  source?: GoogleDriveSource
  driveId?: string
}

export type GoogleDriveDownloadResult = {
  buffer: Buffer
  exportMimeType: string
  exportExt: string
}

export interface GoogleDriveUserIntegration {
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
  } | null
}
