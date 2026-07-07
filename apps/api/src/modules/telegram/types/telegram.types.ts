export interface TelegramBotInfo {
  id: number
  is_bot: boolean
  first_name: string
  username?: string
  can_join_groups?: boolean
  can_read_all_group_messages?: boolean
  supports_inline_queries?: boolean
}

export interface TelegramApiResponse<T> {
  ok: boolean
  result?: T
  description?: string
  error_code?: number
}

export interface TelegramCallbackQuery {
  id: string
  from: TelegramUser
  message?: TelegramMessage
  data?: string
}

export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  callback_query?: TelegramCallbackQuery
}

export interface TelegramPhotoSize {
  file_id: string
  file_unique_id: string
  width: number
  height: number
  file_size?: number
}

export interface TelegramVideo {
  file_id: string
  file_unique_id: string
  width: number
  height: number
  duration: number
  mime_type?: string
  file_size?: number
}

export interface TelegramDocument {
  file_id: string
  file_unique_id: string
  file_name?: string
  mime_type?: string
  file_size?: number
}

export interface TelegramAudio {
  file_id: string
  file_unique_id: string
  duration: number
  mime_type?: string
  file_size?: number
  file_name?: string
}

export interface TelegramVoice {
  file_id: string
  file_unique_id: string
  duration: number
  mime_type?: string
  file_size?: number
}

export interface TelegramVideoNote {
  file_id: string
  file_unique_id: string
  length: number
  duration: number
  file_size?: number
}

export interface TelegramSticker {
  file_id: string
  file_unique_id: string
  is_animated: boolean
  is_video: boolean
}

export interface TelegramFile {
  file_id: string
  file_unique_id: string
  file_size?: number
  file_path?: string
}

export interface TelegramMessage {
  message_id: number
  from?: TelegramUser
  chat: TelegramChat
  date: number
  text?: string
  caption?: string
  photo?: TelegramPhotoSize[]
  video?: TelegramVideo
  document?: TelegramDocument
  audio?: TelegramAudio
  voice?: TelegramVoice
  video_note?: TelegramVideoNote
  sticker?: TelegramSticker
}

export interface TelegramUser {
  id: number
  is_bot: boolean
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
}

export interface TelegramChat {
  id: number
  type: 'private' | 'group' | 'supergroup' | 'channel'
  title?: string
  username?: string
  first_name?: string
  last_name?: string
}

export interface AgentChannel {
  id: string
  user_id: string
  agent_key: string
  channel_type: string
  provider_config: Record<string, unknown>
  webhook_secret: string | null
  is_active: boolean
  is_public: boolean
  org_id: string | null
  last_message_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}
