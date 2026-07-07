export interface FirefliesSpeaker {
  id: string
  name: string
}

export interface FirefliesSentenceAiFilter {
  task: boolean
  pricing: boolean
  metric: boolean
  question: boolean
  date_and_time: boolean
  text_cleanup: string
  sentiment: string
}

export interface FirefliesSentence {
  index: number
  speaker_name: string
  speaker_id: string
  text: string
  raw_text: string
  start_time: number
  end_time: number
  ai_filters?: FirefliesSentenceAiFilter
}

export interface FirefliesSummary {
  keywords?: string[]
  action_items?: string[]
  outline?: string[]
  shorthand_bullet?: string[]
  overview?: string
  bullet_gist?: string[]
  gist?: string
  short_summary?: string
  short_overview?: string
  meeting_type?: string
  topics_discussed?: string[]
}

export interface FirefliesTranscript {
  id: string
  title: string
  date: number
  duration: number
  transcript_url?: string
  audio_url?: string
  video_url?: string
  host_email?: string
  organizer_email?: string
  participants?: string[]
  speakers?: FirefliesSpeaker[]
  sentences?: FirefliesSentence[]
  summary?: FirefliesSummary
  meeting_attendees?: Array<{
    displayName?: string
    email?: string
    name?: string
  }>
}

export interface FirefliesUser {
  user_id: string
  email: string
  name: string
  num_transcripts: number
  recent_meeting: string
  minutes_consumed: number
  is_admin: boolean
  integrations: string[]
}
