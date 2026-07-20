import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { GoogleDriveApiService } from '../../integrations/google-drive/services/google-drive-api.service'
import type { GoogleDriveFile } from '../../integrations/google-drive/types/google-drive.types'
import { MissionsRepository } from '../repositories/missions.repository'
import { MissionLifecycleService } from './mission-lifecycle.service'

type MissionDeliverableRow = {
  id: string
  title?: string | null
  type?: string | null
  entity_table?: string | null
  entity_id?: string | null
  created_at?: string | null
}

type GoogleExportTab = {
  title: string
  html: string
  parentTitle?: string
}

type MissionGoogleExportOptions = {
  title?: string
  deliverableTitle?: string
  source?: 'mission_deliverables' | 'webinar_launch_bible'
  tabs?: GoogleExportTab[]
}

type SpaceItemDocRow = {
  id: string
  title?: string | null
  doc_body?: string | null
}

@Injectable()
export class MissionDeliverablesGoogleExportService {
  constructor(
    private readonly missionLifecycleService: MissionLifecycleService,
    private readonly missionsRepository: MissionsRepository,
    private readonly googleDriveApi: GoogleDriveApiService,
  ) {}

  async exportSpaceDocsToGoogleDoc(
    supabase: SupabaseClient,
    userId: string,
    missionId: string,
    orgId?: string | null,
    options: MissionGoogleExportOptions = {},
  ): Promise<{ file: GoogleDriveFile; tabCount: number; deliverableId: string }> {
    const mission = (await this.missionLifecycleService.getById(
      supabase,
      userId,
      missionId,
      orgId,
      null,
      'edit',
    )) as { title?: string | null }

    const deliverables = options.tabs
      ? []
      : ((await this.missionsRepository.listDeliverables(
          supabase,
          missionId,
        )) as MissionDeliverableRow[])

    const spaceDocs = deliverables
      .filter(
        (row) =>
          row.type === 'doc' &&
          row.entity_table === 'space_items' &&
          typeof row.entity_id === 'string' &&
          row.entity_id.trim().length > 0,
      )
      .slice()
      .sort((a, b) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')))

    if (!options.tabs && spaceDocs.length === 0) {
      throw new BadRequestException('No space documents found to export')
    }

    const tabs = options.tabs ?? (await this.buildSpaceDocTabs(supabase, spaceDocs))

    if (tabs.length === 0) {
      throw new BadRequestException('No exportable document content found')
    }

    const missionTitle = String(mission?.title ?? '').trim() || 'Mission deliverables'
    const documentTitle = options.title?.trim() || `${missionTitle} — Deliverables`
    const file = await this.googleDriveApi.createGoogleDocWithTabs(
      supabase,
      userId,
      documentTitle,
      tabs,
      orgId,
    )
    const fileUrl = file.webViewLink || `https://docs.google.com/document/d/${file.id}/edit`
    const created = await this.missionsRepository.createDeliverable(supabase, {
      mission_id: missionId,
      user_id: userId,
      org_id: orgId ?? null,
      agent_key: 'atlas',
      type: 'file',
      title: options.deliverableTitle?.trim() || documentTitle,
      file_url: fileUrl,
      file_name: file.name || documentTitle,
      mime_type: file.mimeType || 'application/vnd.google-apps.document',
      metadata: {
        source_action:
          options.source === 'webinar_launch_bible'
            ? 'compile_webinar_launch_bible'
            : 'export_mission_deliverables_google_doc',
        export_source: options.source || 'mission_deliverables',
        google_file_id: file.id,
        tab_count: tabs.length,
      },
    })

    return { file, tabCount: tabs.length, deliverableId: String(created.id) }
  }

  private async buildSpaceDocTabs(
    supabase: SupabaseClient,
    spaceDocs: MissionDeliverableRow[],
  ): Promise<GoogleExportTab[]> {
    const itemIds = [...new Set(spaceDocs.map((row) => row.entity_id!).filter(Boolean))]
    const { data, error } = await supabase
      .from('space_items')
      .select('id, title, doc_body')
      .in('id', itemIds)
    if (error) throw new BadRequestException(error.message)

    const itemsById = new Map(
      ((data ?? []) as SpaceItemDocRow[]).map((item) => [item.id, item] as const),
    )
    return spaceDocs
      .map((deliverable) => {
        const item = itemsById.get(deliverable.entity_id!)
        const docBody = String(item?.doc_body ?? '').trim()
        if (!docBody) return null
        const title =
          String(deliverable.title ?? '').trim() || String(item?.title ?? '').trim() || 'Untitled'
        return { title, html: buildExportHtml(title, docBody) }
      })
      .filter((tab): tab is GoogleExportTab => tab !== null)
  }
}

function buildExportHtml(title: string, docBody: string): string {
  const escapedTitle = title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  return `<h1>${escapedTitle}</h1>${docBody}`
}
