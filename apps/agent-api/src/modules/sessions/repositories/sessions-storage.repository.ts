import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'

const BUCKET = 'session_transcripts'

@Injectable()
export class SessionsStorageRepository {
  private readonly supabase: SupabaseClient

  constructor(svc: SupabaseServiceClient) {
    this.supabase = svc.client
  }

  async upload(path: string, content: string, contentType: string): Promise<string | null> {
    const { error } = await this.supabase.storage
      .from(BUCKET)
      .upload(path, content, { upsert: true, contentType })
    return error?.message ?? null
  }

  async downloadText(path: string): Promise<{ text: string | null; errorMessage: string | null }> {
    const { data, error } = await this.supabase.storage.from(BUCKET).download(path)
    if (error) {
      return { text: null, errorMessage: error.message ?? '' }
    }
    if (!data) return { text: null, errorMessage: null }
    return { text: await data.text(), errorMessage: null }
  }

  async listStoreFile(parentPrefix: string, fileName: string): Promise<void> {
    await this.supabase.storage.from(BUCKET).list(parentPrefix, {
      search: fileName,
      limit: 20,
    })
  }
}
