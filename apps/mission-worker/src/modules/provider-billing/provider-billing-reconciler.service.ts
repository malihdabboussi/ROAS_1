import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class ProviderBillingReconcilerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProviderBillingReconcilerService.name)
  private timer?: ReturnType<typeof setInterval>
  private running = false

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    if (!this.config.get<boolean>('providerBilling.reconcilerEnabled')) return
    const intervalMs = Math.max(10_000, this.config.get<number>('providerBilling.reconcileMs') ?? 60_000)
    this.timer = setInterval(() => {
      void this.reconcile()
    }, intervalMs)
    void this.reconcile()
    this.logger.log(`Provider billing reconciler enabled intervalMs=${intervalMs}`)
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
  }

  private async reconcile(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      const baseUrl = this.config.get<string>('missionApi.mainApiUrl') || ''
      const token = this.config.get<string>('missionApi.internalToken') || ''
      if (!baseUrl || !token) {
        this.logger.warn('Provider billing reconciler skipped: main API URL or token missing')
        return
      }
      const limit = this.config.get<number>('providerBilling.reconcileLimit') ?? 25
      const response = await fetch(
        `${baseUrl.replace(/\/$/, '')}/api/internal/provider-billing/reconcile`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            limit,
            workerId: `mission-worker-${process.pid}`,
          }),
        },
      )
      if (!response.ok) {
        this.logger.warn(`Provider billing reconcile failed status=${response.status}`)
        return
      }
      const result = (await response.json()) as Record<string, unknown>
      this.logger.log(`Provider billing reconcile ${JSON.stringify(result)}`)
    } catch (error) {
      this.logger.warn(
        `Provider billing reconcile error: ${error instanceof Error ? error.message : String(error)}`,
      )
    } finally {
      this.running = false
    }
  }
}
