import { Injectable } from '@nestjs/common'
import {
  clearAdminSkillBuilderContext,
  getAdminSkillBuilderContext,
  setAdminSkillBuilderContext,
  type AdminSkillBuilderRuntimeContext,
} from '../admin-skill-builder-context.store'

export type { AdminSkillBuilderRuntimeContext }

@Injectable()
export class AdminSkillBuilderContextService {
  set(sessionId: string, ctx: AdminSkillBuilderRuntimeContext): void {
    setAdminSkillBuilderContext(sessionId, ctx)
  }

  get(sessionId: string | null | undefined): AdminSkillBuilderRuntimeContext | null {
    return getAdminSkillBuilderContext(sessionId)
  }

  clear(sessionId: string): void {
    clearAdminSkillBuilderContext(sessionId)
  }
}
