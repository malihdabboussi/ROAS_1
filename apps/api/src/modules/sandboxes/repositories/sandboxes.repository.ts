import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'

export type SandboxProjectBinding = {
  modal_sandbox_id?: string | null
  modal_tunnel_url?: string | null
  modal_snapshot_id?: string | null
  modal_snapshot_created_at?: string | null
}

export type SandboxHydrationProject = {
  storage_path?: string | null
  manifest?: { files?: string[] } | null
}

export type SandboxTheme = {
  colors?: Record<string, string> | null
  font_heading?: string | null
  font_body?: string | null
  design_settings?: unknown
}

@Injectable()
export class SandboxesRepository {
  constructor(private readonly svc: SupabaseServiceClient) {}

  getServiceClient(): SupabaseClient {
    return this.svc.client
  }

  async findProjectBinding(
    supabase: SupabaseClient,
    projectId: string,
  ): Promise<SandboxProjectBinding | null> {
    const { data } = await supabase
      .from('project_repos')
      .select('modal_sandbox_id, modal_tunnel_url, modal_snapshot_id, modal_snapshot_created_at')
      .eq('id', projectId)
      .single()
    return (data ?? null) as SandboxProjectBinding | null
  }

  async clearSandboxBinding(supabase: SupabaseClient, projectId: string): Promise<void> {
    await supabase
      .from('project_repos')
      .update({ modal_sandbox_id: null, modal_tunnel_url: null })
      .eq('id', projectId)
  }

  async discardSandboxBinding(supabase: SupabaseClient, projectId: string): Promise<void> {
    await supabase
      .from('project_repos')
      .update({
        modal_sandbox_id: null,
        modal_tunnel_url: null,
        modal_snapshot_id: null,
        modal_snapshot_created_at: null,
      })
      .eq('id', projectId)
  }

  async updateSandboxTunnel(
    supabase: SupabaseClient,
    projectId: string,
    sandboxId: string,
    tunnelUrl: string,
  ): Promise<void> {
    await supabase
      .from('project_repos')
      .update({ modal_sandbox_id: sandboxId, modal_tunnel_url: tunnelUrl })
      .eq('id', projectId)
  }

  async markSandboxRunning(
    supabase: SupabaseClient,
    projectId: string,
    sandboxId: string,
    tunnelUrl: string,
  ): Promise<void> {
    await supabase
      .from('project_repos')
      .update({
        modal_sandbox_id: sandboxId,
        modal_tunnel_url: tunnelUrl,
        deploy_status: 'running',
        last_deployed_at: new Date().toISOString(),
      })
      .eq('id', projectId)
  }

  async findComponentKitFiles(): Promise<Array<{ file_path: string; content: string }>> {
    const { data, error } = await this.svc.client
      .from('agent_skill_resources')
      .select('file_path, content')
      .is('user_id', null)
      .eq('agent_key', 'viktor')
      .eq('skill_key', 'spaces-component-kit')
    if (error) throw error
    if (!data?.length) throw new Error('no rows')
    return data.filter(
      (row): row is { file_path: string; content: string } => typeof row.content === 'string',
    )
  }

  async findProjectThemeId(supabase: SupabaseClient, projectId: string): Promise<string | null> {
    const { data } = await supabase
      .from('project_repos')
      .select('theme_id')
      .eq('id', projectId)
      .single()
    return (data?.theme_id as string | null | undefined) ?? null
  }

  async findBrandingTheme(themeId: string): Promise<SandboxTheme | null> {
    const { data } = await this.svc.client
      .from('branding_themes')
      .select('colors, font_heading, font_body, design_settings')
      .eq('id', themeId)
      .single()
    return (data ?? null) as SandboxTheme | null
  }

  async findHydrationProject(
    supabase: SupabaseClient,
    projectId: string,
  ): Promise<SandboxHydrationProject | null> {
    const { data } = await supabase
      .from('project_repos')
      .select('storage_path, manifest')
      .eq('id', projectId)
      .single()
    return (data ?? null) as SandboxHydrationProject | null
  }

  async downloadProjectFile(objectPath: string): Promise<any> {
    return this.svc.client.storage.from('projects').download(objectPath)
  }

  async findProjectSandboxId(supabase: SupabaseClient, projectId: string): Promise<string | null> {
    const { data } = await supabase
      .from('project_repos')
      .select('modal_sandbox_id')
      .eq('id', projectId)
      .single()
    return (data?.modal_sandbox_id as string | null | undefined) ?? null
  }

  async updateProjectSnapshot(
    supabase: SupabaseClient,
    projectId: string,
    snapshotId: string,
  ): Promise<void> {
    await supabase
      .from('project_repos')
      .update({
        modal_snapshot_id: snapshotId,
        modal_snapshot_created_at: new Date().toISOString(),
      })
      .eq('id', projectId)
  }

  async markSandboxStopped(supabase: SupabaseClient, projectId: string): Promise<void> {
    await supabase
      .from('project_repos')
      .update({
        modal_sandbox_id: null,
        modal_tunnel_url: null,
        deploy_status: 'stopped',
      })
      .eq('id', projectId)
  }

  async listIdleProjects(cutoff: string): Promise<Array<{ id: string; modal_sandbox_id: string }>> {
    const { data } = await this.svc.client
      .from('project_repos')
      .select('id, modal_sandbox_id')
      .not('modal_sandbox_id', 'is', null)
      .lt('last_deployed_at', cutoff)
    return (data ?? []) as Array<{ id: string; modal_sandbox_id: string }>
  }
}
