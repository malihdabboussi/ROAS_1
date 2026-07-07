import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseProjectLinksRepository } from '../repositories/supabase-project-links.repository'

@Injectable()
export class SupabaseProjectLinksService {
  constructor(private readonly repository: SupabaseProjectLinksRepository) {}

  async assertProjectOwnership(supabase: SupabaseClient, projectRef: string): Promise<void> {
    await this.repository.assertProjectOwnership(supabase, projectRef)
  }

  async injectSupabaseEnvVars(
    supabase: SupabaseClient,
    _userId: string,
    vibeyProjectId: string,
    apiUrl: string,
    anonKey: string | null,
  ): Promise<void> {
    try {
      const projectStoragePath = await this.repository.getProjectStoragePath(
        supabase,
        vibeyProjectId,
      )
      if (!projectStoragePath || !anonKey) return

      const envContent = [
        `NEXT_PUBLIC_SUPABASE_URL=${apiUrl}`,
        `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`,
        '',
      ].join('\n')

      await this.repository.uploadProjectEnvFile(
        supabase,
        `${projectStoragePath}/.env.local`,
        envContent,
      )
    } catch {
      // non-critical -- user can still copy values manually
    }
  }

  async linkSupabaseToVibeyProject(
    supabase: SupabaseClient,
    vibeyProjectId: string,
    data: {
      supabase_project_ref: string
      supabase_project_name: string
      supabase_region: string
      supabase_api_url: string
      supabase_anon_key: string | null
    },
  ): Promise<void> {
    await this.repository.linkSupabaseToVibeyProject(supabase, vibeyProjectId, data)
  }
}
