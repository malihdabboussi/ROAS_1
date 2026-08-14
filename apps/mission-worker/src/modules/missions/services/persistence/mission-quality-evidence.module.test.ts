import 'reflect-metadata'
import { describe, expect, it } from 'vitest'
import { BrainOpsModule } from '../../../brain-ops/brain-ops.module'
import { DreamOpsModule } from '../../../dream-ops/dream-ops.module'
import { MissionQualityEvidenceRepository } from './mission-quality-evidence.repository'

function providersFor(moduleType: object): unknown[] {
  return Reflect.getMetadata('providers', moduleType) || []
}

describe('Mission quality evidence provider wiring', () => {
  it.each([
    ['BrainOpsModule', BrainOpsModule],
    ['DreamOpsModule', DreamOpsModule],
  ])('%s can construct MissionOpenclawGateway', (_name, moduleType) => {
    expect(providersFor(moduleType)).toContain(MissionQualityEvidenceRepository)
  })
})
