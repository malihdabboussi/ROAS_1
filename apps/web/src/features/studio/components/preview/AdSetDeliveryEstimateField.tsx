export type AdSetDeliveryEstimate = {
  estimate_mau_lower_bound: number
  estimate_mau_upper_bound: number
  estimate_dau: number
  daily_outcomes_curve: Array<{ spend: number; reach: number; actions: number }>
}

interface AdSetDeliveryEstimateFieldProps {
  deliveryEstimate: AdSetDeliveryEstimate | null
  estimateLoading: boolean
  estimateError: string | null
  onFetchEstimate: () => void
  formatNumber: (value: number) => string
}

function formatCurrency(cents: number): string {
  const dollars = cents / 100
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return `$${dollars.toFixed(0)}`
}

export function AdSetDeliveryEstimateField({
  deliveryEstimate,
  estimateLoading,
  estimateError,
  onFetchEstimate,
  formatNumber,
}: AdSetDeliveryEstimateFieldProps) {
  return (
    <div className="space-y-5">
      {estimateLoading && !deliveryEstimate && (
        <p className="typo-caption text-muted-foreground">Loading predictions...</p>
      )}
      {estimateError && (
        <div
          className={`body-3 rounded-lg px-3 py-2 font-medium ${
            estimateError === 'Not Connected'
              ? 'badge-glass badge-glass-red'
              : 'text-destructive'
          }`}
        >
          {estimateError}
        </div>
      )}
      {deliveryEstimate && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onFetchEstimate}
              disabled={estimateLoading}
              className="bg-secondary text-foreground hover:bg-secondary/80 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60"
            >
              {estimateLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-secondary rounded-lg p-3">
              <p className="typo-caption text-muted-foreground">Estimated Reach</p>
              <p className="body-2 text-foreground font-semibold">
                {formatNumber(deliveryEstimate.estimate_mau_lower_bound)} -{' '}
                {formatNumber(deliveryEstimate.estimate_mau_upper_bound)}
              </p>
            </div>
            <div className="bg-secondary rounded-lg p-3">
              <p className="typo-caption text-muted-foreground">Daily Active</p>
              <p className="body-2 text-foreground font-semibold">
                {formatNumber(deliveryEstimate.estimate_dau)}
              </p>
            </div>
          </div>
          {deliveryEstimate.daily_outcomes_curve.length > 0 && (
            <div className="bg-secondary rounded-lg p-3">
              <p className="typo-caption text-muted-foreground mb-2">
                Estimated Daily Results
              </p>
              <div className="grid grid-cols-3 gap-2">
                {deliveryEstimate.daily_outcomes_curve.slice(0, 3).map((point, i) => (
                  <div key={i} className="text-center">
                    <p className="typo-caption text-muted-foreground">
                      {formatCurrency(point.spend)}/day
                    </p>
                    <p className="body-3 text-foreground font-medium">
                      {formatNumber(point.reach)} reach
                    </p>
                    {point.actions > 0 && (
                      <p className="typo-caption text-primary">
                        {formatNumber(point.actions)} actions
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {!deliveryEstimate && !estimateLoading && !estimateError && (
        <button
          type="button"
          onClick={onFetchEstimate}
          className="bg-secondary text-foreground hover:bg-secondary/80 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
        >
          Load Predictions
        </button>
      )}
    </div>
  )
}
