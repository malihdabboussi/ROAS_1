import { Injectable } from '@nestjs/common'
import type { RequestScope } from '@vibey/api-shared'
import { MediaRepository } from './media.repository'

@Injectable()
export class MediaCanvaRepository {
  constructor(private readonly mediaRepository: MediaRepository) {}

  async listConnections(userId: string, scope: RequestScope): Promise<Record<string, unknown>[]> {
    let query = this.mediaRepository.client
      .from('user_integrations')
      .select('id, user_id, status, metadata, scope_mode, is_default, updated_at')
      .eq('integration_id', 'canva')

    if (scope.orgId) {
      query = query.eq('org_id', scope.orgId)
    } else {
      query = query.eq('user_id', userId).is('org_id', null)
    }

    const { data, error } = await query.order('updated_at', { ascending: false })
    if (error || !data) return []
    return data as Record<string, unknown>[]
  }
}
