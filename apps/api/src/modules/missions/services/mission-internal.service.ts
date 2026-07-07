import { Injectable } from '@nestjs/common'
import { PostgresDirectService } from '@vibey/api-shared'
import { MissionInternalRepository } from '../repositories/mission-internal.repository'
import { MissionServiceRoleClientRepository } from '../repositories/mission-service-role-client.repository'
import { MissionsRepository } from '../repositories/missions.repository'
import { MissionLifecycleService } from './mission-lifecycle.service'
import { MissionOutboxService } from './mission-outbox.service'
import { MissionInternalAwarenessBase } from './mission-internal-awareness.base'

@Injectable()
export class MissionInternalService extends MissionInternalAwarenessBase {
  constructor(
    missionsRepository: MissionsRepository,
    postgresDirect: PostgresDirectService,
    missionOutboxService: MissionOutboxService,
    missionLifecycleService: MissionLifecycleService,
    missionInternalRepository: MissionInternalRepository,
    serviceRoleClientRepository: MissionServiceRoleClientRepository,
  ) {
    super(
      missionsRepository,
      postgresDirect,
      missionOutboxService,
      missionLifecycleService,
      missionInternalRepository,
      serviceRoleClientRepository,
    )
  }
}
