import { Module } from '@nestjs/common'
import { ProgramsController } from './controllers/programs.controller'
import { TaskRollupController } from './controllers/task-rollup.controller'
import { ProgramsRepository } from './repositories/programs.repository'
import { TaskRollupRepository } from './repositories/task-rollup.repository'
import { ProgramsService } from './services/programs.service'
import { TaskRollupService } from './services/task-rollup.service'

@Module({
  controllers: [ProgramsController, TaskRollupController],
  providers: [ProgramsService, ProgramsRepository, TaskRollupService, TaskRollupRepository],
  exports: [ProgramsService, ProgramsRepository, TaskRollupService],
})
export class ProgramsModule {}
