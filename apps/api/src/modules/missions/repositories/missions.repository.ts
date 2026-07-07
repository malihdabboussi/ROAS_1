import { Injectable } from '@nestjs/common'
import { MissionsRepositoryWorkflowsBase } from './missions-repository-workflows.base'

@Injectable()
export class MissionsRepository extends MissionsRepositoryWorkflowsBase {}
