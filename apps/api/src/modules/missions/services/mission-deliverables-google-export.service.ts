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
  ): Promise<{ file: GoogleDriveFile; tabCount: number }> {
    const mission = (await this.missionLifecycleService.getById(
      supabase,
      userId,
      missionId,
      orgId,
      null,
      'edit',
    )) as { title?: string | null }

    const deliverables = (await this.missionsRepository.listDeliverables(
      supabase,
      missionId,
    )) as MissionDeliverableRow[]

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

    if (spaceDocs.length === 0) {
      throw new BadRequestException('No space documents found to export')
    }

    const itemIds = [...new Set(spaceDocs.map((row) => row.entity_id!).filter(Boolean))]
    const { data, error } = await supabase
      .from('space_items')
      .select('id, title, doc_body')
      .in('id', itemIds)
    if (error) throw new BadRequestException(error.message)

    const itemsById = new Map(
      ((data ?? []) as SpaceItemDocRow[]).map((item) => [item.id, item] as const),
    )

    const tabs = spaceDocs
      .map((deliverable) => {
        const item = itemsById.get(deliverable.entity_id!)
        const docBody = String(item?.doc_body ?? '').trim()
        if (!docBody) return null
        const title =
          String(deliverable.title ?? '').trim() || String(item?.title ?? '').trim() || 'Untitled'
        return {
          title,
          html: buildExportHtml(title, docBody),
        }
      })
      .filter((tab): tab is { title: string; html: string } => tab !== null)

    if (tabs.length === 0) {
      throw new BadRequestException('No exportable document content found')
    }

    const missionTitle = String(mission?.title ?? '').trim() || 'Mission deliverables'
    const file = await this.googleDriveApi.createGoogleDocWithTabs(
      supabase,
      userId,
      `${missionTitle} — Deliverables`,
      tabs,
      orgId,
    )

    return { file, tabCount: tabs.length }
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
