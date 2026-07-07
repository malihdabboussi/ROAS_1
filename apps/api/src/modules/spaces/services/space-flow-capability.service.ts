import { Injectable } from '@nestjs/common'
import {
  getFlowCapability,
  searchFlowCapabilities,
  type FlowCapabilityKind,
} from '@vibey/api-shared'

@Injectable()
export class SpaceFlowCapabilityService {
  search(input: {
    query?: string | null
    kind?: FlowCapabilityKind | null
    category?: string | null
    limit?: number | null
    cursor?: string | null
  }) {
    return searchFlowCapabilities(input)
  }

  get(capabilityId: string) {
    return getFlowCapability(capabilityId)
  }
}
