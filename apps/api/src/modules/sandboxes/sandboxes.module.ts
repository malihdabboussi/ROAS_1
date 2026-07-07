import { Module } from '@nestjs/common'
import { SandboxesController } from './controllers/sandboxes.controller'
import { SandboxesRepository } from './repositories/sandboxes.repository'
import { SandboxIdleManagerService } from './services/sandbox-idle-manager.service'
import { SandboxProjectFilesService } from './services/sandbox-project-files.service'
import { SandboxService } from './services/sandbox.service'

@Module({
  controllers: [SandboxesController],
  providers: [
    SandboxesRepository,
    SandboxProjectFilesService,
    SandboxService,
    SandboxIdleManagerService,
  ],
  exports: [SandboxService, SandboxIdleManagerService],
})
export class SandboxesModule {}
