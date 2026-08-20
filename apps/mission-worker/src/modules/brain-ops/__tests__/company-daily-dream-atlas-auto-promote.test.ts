import { describe, expect, it, vi } from 'vitest'
import {
  COMPANY_CORTEX_AUTO_PROMOTE_CONFIDENCE,
  shouldAutoPromoteCompanyCortexSignal,
} from '../company-cortex-signal.repository'
import { CompanyDailyDreamAtlasService } from '../company-daily-dream-atlas.service'

describe('Company Cortex auto-promote threshold', () => {
  it('promotes at the 0.8 boundary and leaves lower confidence for human review', () => {
    expect(COMPANY_CORTEX_AUTO_PROMOTE_CONFIDENCE).toBe(0.8)
    expect(shouldAutoPromoteCompanyCortexSignal(0.8)).toBe(true)
    expect(shouldAutoPromoteCompanyCortexSignal(0.99)).toBe(true)
    expect(shouldAutoPromoteCompanyCortexSignal(0.799)).toBe(false)
    expect(shouldAutoPromoteCompanyCortexSignal(0.5)).toBe(false)
    expect(shouldAutoPromoteCompanyCortexSignal(Number.NaN)).toBe(false)
  })

  it('auto-promotes inserted high-confidence signals and enqueues formation outbox', async () => {
    const promoteHighConfidenceSignals = vi.fn().mockResolvedValue(['sig-hi'])
    const insertFormationOutbox = vi.fn().mockResolvedValue(undefined)
    const service = new CompanyDailyDreamAtlasService(
      {} as never,
      {
        promoteHighConfidenceSignals,
        insertFormationOutbox,
      } as never,
      {} as never,
    )

    const result = await service.autoPromoteHighConfidenceSignals({
      orgId: 'org-1',
      brainId: 'brain-1',
      userId: 'user-1',
      inserted: [
        { id: 'sig-hi', confidence: 0.91 },
        { id: 'sig-lo', confidence: 0.4 },
      ],
    })

    expect(promoteHighConfidenceSignals).toHaveBeenCalledWith({
      brainId: 'brain-1',
      orgId: 'org-1',
      signalIds: ['sig-hi'],
      reviewedBy: 'user-1',
    })
    expect(insertFormationOutbox).toHaveBeenCalledOnce()
    expect(insertFormationOutbox).toHaveBeenCalledWith({
      brainId: 'brain-1',
      orgId: 'org-1',
      userId: 'user-1',
      signalId: 'sig-hi',
      source: 'auto_high_confidence',
    })
    expect(result.promotedSignalIds).toEqual(['sig-hi'])
  })

  it('does not enqueue formation when no inserted signal meets the threshold', async () => {
    const promoteHighConfidenceSignals = vi.fn()
    const insertFormationOutbox = vi.fn()
    const service = new CompanyDailyDreamAtlasService(
      {} as never,
      {
        promoteHighConfidenceSignals,
        insertFormationOutbox,
      } as never,
      {} as never,
    )

    const result = await service.autoPromoteHighConfidenceSignals({
      orgId: 'org-1',
      brainId: 'brain-1',
      userId: 'user-1',
      inserted: [{ id: 'sig-lo', confidence: 0.79 }],
    })

    expect(promoteHighConfidenceSignals).not.toHaveBeenCalled()
    expect(insertFormationOutbox).not.toHaveBeenCalled()
    expect(result.promotedSignalIds).toEqual([])
  })
})
