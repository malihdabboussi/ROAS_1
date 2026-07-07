import { Injectable } from '@nestjs/common'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { OrgScopeService, type RequestScope } from '@vibey/api-shared'

export type ProjectRepoRow = {
  id: string
  user_id: string
  conversation_id: string | null
  name: string
  description: string | null
  storage_path: string
  entry_point: string
  dependencies: Record<string, string>
  manifest: Record<string, unknown>
  source: 'github' | 'agent' | 'upload'
  source_meta: Record<string, unknown>
  status: 'building' | 'ready' | 'error'
  created_at: string
  updated_at: string
}

type ProjectPublishConfigRow = {
  vercel_project_id?: string | null
  domain_id?: string | null
  supabase_api_url?: string | null
  supabase_anon_key?: string | null
}

type ProjectSourceManifestRow = {
  storage_path?: string | null
  manifest?: Record<string, unknown> | null
}

@Injectable()
export class ProjectsRepository {
  constructor(private readonly orgScope: OrgScopeService) {}

  async listProjects(supabase: SupabaseClient, scope: RequestScope): Promise<ProjectRepoRow[]> {
    let query = supabase.from('project_repos').select('*')
    query = this.orgScope.applyScope(query, scope)
    const { data, error } = await query.order('updated_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []) as ProjectRepoRow[]
  }

  async insertProjectRepo(
    supabase: SupabaseClient,
    row: Record<string, unknown>,
  ): Promise<ProjectRepoRow> {
    const { data, error } = await supabase.from('project_repos').insert(row).select('*').single()
    if (error) throw new Error(error.message)
    return data as ProjectRepoRow
  }

  async updateProjectRepo(
    supabase: SupabaseClient,
    userId: string,
    projectId: string,
    patch: Record<string, unknown>,
  ): Promise<ProjectRepoRow> {
    const { data, error } = await supabase
      .from('project_repos')
      .update(patch)
      .eq('id', projectId)
      .eq('user_id', userId)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return data as ProjectRepoRow
  }

  async updateProjectRepoById(
    supabase: SupabaseClient,
    projectId: string,
    patch: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await supabase.from('project_repos').update(patch).eq('id', projectId)
    if (error) throw new Error(error.message)
  }

  async deleteProjectRepo(
    supabase: SupabaseClient,
    userId: string,
    projectId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('project_repos')
      .delete()
      .eq('id', projectId)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
  }

  async getProjectOwned(
    supabase: SupabaseClient,
    userId: string,
    projectId: string,
    orgId?: string | null,
  ): Promise<ProjectRepoRow> {
    let query = supabase.from('project_repos').select('*').eq('id', projectId).eq('user_id', userId)
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { data, error } = await query.single()
    if (error || !data) throw new Error(error?.message ?? 'project_not_found')
    return data as ProjectRepoRow
  }

  async updateProjectManifest(
    supabase: SupabaseClient,
    userId: string,
    projectId: string,
    manifest: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await supabase
      .from('project_repos')
      .update({ manifest, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
  }

  async uploadProjectStorageObject(
    supabase: SupabaseClient,
    storagePath: string,
    content: string,
    contentType: string,
  ): Promise<void> {
    const { error } = await supabase.storage.from('projects').upload(storagePath, content, {
      upsert: true,
      contentType,
    })
    if (error) throw new Error(error.message)
  }

  async removeProjectStorageObjects(
    supabase: SupabaseClient,
    storagePaths: string[],
  ): Promise<void> {
    if (storagePaths.length === 0) return
    const { error } = await supabase.storage.from('projects').remove(storagePaths)
    if (error) throw new Error(error.message)
  }

  async downloadProjectStorageText(
    supabase: SupabaseClient,
    storagePath: string,
  ): Promise<string> {
    const { data, error } = await supabase.storage.from('projects').download(storagePath)
    if (error || !data) throw new Error(error?.message ?? 'file_not_found')
    return data.text()
  }

  async downloadProjectStorageBuffer(
    supabase: SupabaseClient,
    storagePath: string,
    relativePath: string,
  ): Promise<Buffer> {
    const { data: blob, error } = await supabase.storage.from('projects').download(storagePath)
    if (error || !blob) {
      throw new Error(
        `Missing file in Storage: ${relativePath} (${error?.message ?? 'download failed'})`,
      )
    }
    return Buffer.from(await blob.arrayBuffer())
  }

  async getProjectSourceManifest(
    supabase: SupabaseClient,
    userId: string,
    projectId: string,
  ): Promise<ProjectSourceManifestRow> {
    const { data, error } = await supabase
      .from('project_repos')
      .select('storage_path, manifest')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single()
    if (error || !data?.storage_path) {
      throw new Error(error?.message ?? 'project_not_found')
    }
    return data as ProjectSourceManifestRow
  }

  async getProjectPublishConfig(
    supabase: SupabaseClient,
    projectId: string,
  ): Promise<ProjectPublishConfigRow | null> {
    const { data } = await supabase
      .from('project_repos')
      .select('vercel_project_id, domain_id, supabase_api_url, supabase_anon_key')
      .eq('id', projectId)
      .single()
    return (data ?? null) as ProjectPublishConfigRow | null
  }

  async findProjectId(supabase: SupabaseClient, projectId: string): Promise<string | null> {
    const { data } = await supabase.from('project_repos').select('id').eq('id', projectId).single()
    return (data?.id as string | undefined) ?? null
  }

  touchLastDeployedAt(supabase: SupabaseClient, projectId: string): void {
    void supabase
      .from('project_repos')
      .update({ last_deployed_at: new Date().toISOString() })
      .eq('id', projectId)
      .then(
        () => {},
        () => {},
      )
  }

  async getDomainName(supabase: SupabaseClient, domainId: string): Promise<string | null> {
    const { data } = await supabase
      .from('domains')
      .select('domain_name')
      .eq('id', domainId)
      .single()
    return (data?.domain_name as string | undefined) ?? null
  }

  async slugExists(slug: string): Promise<boolean> {
    const serviceClient = this.createServiceClient()
    const { data } = await serviceClient
      .from('project_repos')
      .select('id')
      .eq('slug', slug)
      .limit(1)
      .maybeSingle()
    return !!data
  }

  createServiceClientFromEnv(): SupabaseClient | null {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) {
      return null
    }

    return createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  }

  private createServiceClient(): SupabaseClient {
    return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  }
}
