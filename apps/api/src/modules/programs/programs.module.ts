import { Module } from '@nestjs/common'
import { ProgramSharingController } from './controllers/program-sharing.controller'
import { ProgramsController } from './controllers/programs.controller'
import { TaskRollupController } from './controllers/task-rollup.controller'
import { ProgramPermissionsRepository } from './repositories/program-permissions.repository'
import { ProgramsRepository } from './repositories/programs.repository'
import { TaskRollupRepository } from './repositories/task-rollup.repository'
import { ProgramPermissionsService } from './services/program-permissions.service'
import { ProgramsService } from './services/programs.service'
import { TaskRollupService } from './services/task-rollup.service'

@Module({
  controllers: [ProgramsController, ProgramSharingController, TaskRollupController],
  providers: [
    ProgramsService,
    ProgramsRepository,
    ProgramPermissionsService,
    ProgramPermissionsRepository,
    TaskRollupService,
    TaskRollupRepository,
  ],
  exports: [
    ProgramsService,
    ProgramsRepository,
    ProgramPermissionsService,
    ProgramPermissionsRepository,
    TaskRollupService,
  ],
})
export class ProgramsModule {}
