import { AlertTriangle, CircleDollarSign, Link2, Route, Sparkles, Zap } from 'lucide-react'
import type { AdminAiUsageReport } from '../types/admin-ai-usage.types'

const integer = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

function SummaryCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string
  value: string
  detail: string
  icon: React.ReactNode
}) {
  return (
    <div className="surface-card rounded-spacing-3 border-border p-spacing-4 border">
      <div className="gap-spacing-2 text-muted-foreground flex items-center">
        {icon}
        <span className="body-4">{label}</span>
      </div>
      <p className="title-h6 text-foreground mt-spacing-2">{value}</p>
      <p className="body-4 text-muted-foreground mt-spacing-1">{detail}</p>
    </div>
  )
}

export function AiUsageSummary({ report }: { report: AdminAiUsageReport }) {
  const correlationPercent = report.coverage.attempts
    ? (report.coverage.correlatedAttempts / report.coverage.attempts) * 100
    : 100
  return (
    <>
      <div className="gap-spacing-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Tokens processed"
          value={compact.format(report.summary.tokens)}
          detail={`${integer.format(report.summary.traces)} traced runs`}
          icon={<Zap className="icon-md" />}
        />
        <SummaryCard
          label="Provider spend"
          value={usd.format(report.summary.providerCostUsd)}
          detail={`${integer.format(report.summary.providerAttempts)} provider calls`}
          icon={<CircleDollarSign className="icon-md" />}
        />
        <SummaryCard
          label="Failed runs"
          value={integer.format(report.summary.failed)}
          detail={`${usd.format(report.opportunities.failedWithCost.costUsd)} spent after failure`}
          icon={<AlertTriangle className="icon-md" />}
        />
        <SummaryCard
          label="Trace correlation"
          value={`${correlationPercent.toFixed(1)}%`}
          detail={`${integer.format(report.coverage.usageLinkedAttempts)} calls linked to usage`}
          icon={<Link2 className="icon-md" />}
        />
      </div>

      <section className="surface-card rounded-spacing-3 border-border p-spacing-4 border">
        <div className="gap-spacing-2 flex items-center">
          <Route className="icon-md text-muted-foreground" />
          <div>
            <h2 className="body-1 text-foreground font-semibold">Processing routes</h2>
            <p className="body-4 text-muted-foreground">
              Verified calls come from the provider ledger. Trace-only cards show model family, not
              direct transport.
            </p>
          </div>
        </div>
        <div className="gap-spacing-3 mt-spacing-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {report.routes.map((route) => (
            <div
              key={route.id}
              className="rounded-spacing-2 border-border bg-secondary p-spacing-3 border"
            >
              <div className="gap-spacing-2 flex items-center justify-between">
                <p className="body-2 text-foreground font-medium">{route.label}</p>
                <span
                  className={
                    route.providerVerified
                      ? 'badge-glass badge-glass-green'
                      : 'badge-glass badge-glass-muted'
                  }
                >
                  {route.providerVerified ? 'Verified provider' : 'Model family only'}
                </span>
              </div>
              <p className="title-h6 text-foreground mt-spacing-3">
                {compact.format(route.tokens)} tokens
              </p>
              <div className="body-4 text-muted-foreground mt-spacing-2 flex justify-between">
                <span>
                  {route.providerVerified
                    ? `${integer.format(route.providerAttempts)} calls · ${usd.format(route.providerCostUsd)}`
                    : `${integer.format(route.traceCount)} traces · route unrecorded`}
                </span>
                <span>{integer.format(route.failed)} failed</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-card rounded-spacing-3 border-border p-spacing-4 border">
        <div className="gap-spacing-2 flex items-center">
          <Sparkles className="icon-md text-muted-foreground" />
          <div>
            <h2 className="body-1 text-foreground font-semibold">Efficiency opportunities</h2>
            <p className="body-4 text-muted-foreground">
              Waste signals that can be reduced without downgrading model quality.
            </p>
          </div>
        </div>
        <div className="gap-spacing-2 mt-spacing-4 grid grid-cols-1 lg:grid-cols-2">
          <Opportunity
            label="Oversized context"
            value={`${integer.format(report.opportunities.oversizedContext.count)} runs`}
            detail={`${compact.format(report.opportunities.oversizedContext.tokens)} tokens · ${usd.format(report.opportunities.oversizedContext.costUsd)}`}
          />
          <Opportunity
            label="Failed after model usage"
            value={`${integer.format(report.opportunities.failedWithCost.count)} runs`}
            detail={`${usd.format(report.opportunities.failedWithCost.costUsd)} spent`}
          />
          <Opportunity
            label="Paid image outputs not validated"
            value={`${integer.format(report.opportunities.paidOutputInvalid.count)} calls`}
            detail={`${usd.format(report.opportunities.paidOutputInvalid.costUsd)} protected from automatic retry`}
          />
          <Opportunity
            label="Paid calls missing usage links"
            value={`${integer.format(report.opportunities.unlinkedPaidAttempts.count)} calls`}
            detail={`${usd.format(report.opportunities.unlinkedPaidAttempts.costUsd)} unlinked`}
          />
          <Opportunity
            label="Provider settlement"
            value={`${integer.format(report.opportunities.unsettledAttempts)} unresolved`}
            detail={
              report.opportunities.reconciliationStale
                ? 'Daily reconciliation is stale'
                : 'Daily reconciliation is current'
            }
          />
        </div>
      </section>
    </>
  )
}

function Opportunity({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-spacing-2 border-border p-spacing-3 flex items-center justify-between border">
      <div>
        <p className="body-2 text-foreground">{label}</p>
        <p className="body-4 text-muted-foreground mt-spacing-1">{detail}</p>
      </div>
      <span className="body-3 text-foreground font-medium">{value}</span>
    </div>
  )
}
