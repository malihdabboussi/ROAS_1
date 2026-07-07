import { BadRequestException, Injectable } from '@nestjs/common'
import type { FirefliesTranscript, FirefliesUser } from '../types/fireflies.types'

const API_URL = 'https://api.fireflies.ai/graphql'

@Injectable()
export class FirefliesIntegration {
  private async query<T>(
    apiKey: string,
    gql: string,
    variables?: Record<string, unknown>,
  ): Promise<T> {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ query: gql, variables }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new BadRequestException(`Fireflies API error: ${text}`)
    }

    const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> }
    if (json.errors?.length) {
      throw new BadRequestException(`Fireflies GraphQL error: ${json.errors[0].message}`)
    }
    return json.data as T
  }

  async getUser(apiKey: string): Promise<FirefliesUser> {
    const data = await this.query<{ user: FirefliesUser }>(
      apiKey,
      `{ user { user_id email name num_transcripts recent_meeting minutes_consumed is_admin integrations } }`,
    )
    return data.user
  }

  async listTranscripts(
    apiKey: string,
    opts?: { limit?: number; skip?: number; title?: string },
  ): Promise<FirefliesTranscript[]> {
    const data = await this.query<{ transcripts: FirefliesTranscript[] }>(
      apiKey,
      `query Transcripts($limit: Int, $skip: Int, $title: String) {
        transcripts(limit: $limit, skip: $skip, title: $title) {
          id title date duration transcript_url audio_url video_url
          host_email organizer_email participants
          speakers { id name }
          summary { keywords action_items overview short_summary meeting_type topics_discussed }
          meeting_attendees { displayName email name }
        }
      }`,
      {
        limit: opts?.limit ?? 20,
        skip: opts?.skip ?? 0,
        title: opts?.title,
      },
    )
    return data.transcripts ?? []
  }

  async getTranscript(apiKey: string, transcriptId: string): Promise<FirefliesTranscript> {
    const data = await this.query<{ transcript: FirefliesTranscript }>(
      apiKey,
      `query Transcript($id: String!) {
        transcript(id: $id) {
          id title date duration transcript_url audio_url video_url
          host_email organizer_email participants
          speakers { id name }
          sentences { index speaker_name speaker_id text raw_text start_time end_time }
          summary { keywords action_items outline shorthand_bullet overview bullet_gist gist short_summary short_overview meeting_type topics_discussed }
          meeting_attendees { displayName email name }
        }
      }`,
      { id: transcriptId },
    )
    return data.transcript
  }
}
