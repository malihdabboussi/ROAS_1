import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class SupabaseProjectLinksRepository {
  async assertProjectOwnership(client: SupabaseClient, projectRef: string): Promise<void> {
    const { data, error } = await client
      .from('project_repos')
      .select('id')
      .eq('supabase_project_ref', projectRef)
      .limit(1)
      .single()

    if (error || !data) {
      throw new BadRequestException('Supabase project not linked to any of your projects')
    }
  }

  async getProjectStoragePath(
    client: SupabaseClient,
    vibeyProjectId: string,
  ): Promise<string | null> {
    const { data } = await client
      .from('project_repos')
      .select('storage_path')
      .eq('id', vibeyProjectId)
      .single()

    return (data?.storage_path as string | null | undefined) ?? null
  }

  async uploadProjectEnvFile(
    client: SupabaseClient,
    storagePath: string,
    envContent: string,
  ): Promise<void> {
    await client.storage.from('projects').upload(storagePath, envContent, {
      upsert: true,
      contentType: 'text/plain',
    })
  }

  async linkSupabaseToVibeyProject(
    client: SupabaseClient,
    vibeyProjectId: string,
    data: {
      supabase_project_ref: string
      supabase_project_name: string
      supabase_region: string
      supabase_api_url: string
      supabase_anon_key: string | null
    },
  ): Promise<void> {
    const { error } = await client
      .from('project_repos')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vibeyProjectId)

    if (error) {
      throw new Error(`Failed to link Supabase project: ${error.message}`)
    }
  }
}
