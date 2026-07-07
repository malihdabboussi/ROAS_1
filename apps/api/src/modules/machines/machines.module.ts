import { Module } from '@nestjs/common'
import { InternalMachinesController } from './controllers/internal-machines.controller'
import { MachinesController } from './controllers/machines.controller'
import { MachinePoolRepository } from './repositories/machine-pool.repository'
import { MachineProfileRepository } from './repositories/machine-profile.repository'
import { MachinesRepository } from './repositories/machines.repository'
import { FlyMachineStateService } from './services/fly-machine-state.service'
import { IdleManagerService } from './services/idle-manager.service'
import { MachinePoolService } from './services/machine-pool.service'
import { MachineProvisionAccessService } from './services/machine-provision-access.service'
import { MachineReconciliationService } from './services/machine-reconciliation.service'
import { MachineRuntimeCapabilitiesService } from './services/machine-runtime-capabilities.service'
import { MachineWakeAttemptsService } from './services/machine-wake-attempts.service'
import { MachinesService } from './services/machines.service'

@Module({
  controllers: [MachinesController, InternalMachinesController],
  providers: [
    MachinesService,
    IdleManagerService,
    MachinePoolService,
    MachinePoolRepository,
    MachineProfileRepository,
    MachinesRepository,
    MachineProvisionAccessService,
    FlyMachineStateService,
    MachineReconciliationService,
    MachineRuntimeCapabilitiesService,
    MachineWakeAttemptsService,
  ],
  exports: [
    MachinesService,
    IdleManagerService,
    MachinePoolService,
    MachineProvisionAccessService,
    FlyMachineStateService,
    MachineReconciliationService,
    MachineRuntimeCapabilitiesService,
    MachineWakeAttemptsService,
  ],
})
export class MachinesModule {}
