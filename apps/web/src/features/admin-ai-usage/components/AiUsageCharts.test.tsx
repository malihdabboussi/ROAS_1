import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AiUsageCharts } from './AiUsageCharts'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => <div />,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => <div />,
  CartesianGrid: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
}))

const report = {
  range: {
    startDate: '2026-07-10',
    endDate: '2026-07-11',
    previousStartDate: '2026-07-08',
    previousEndDate: '2026-07-09',
  },
  comparison: {
    providerCostUsd: { current: 2, previous: 1, changePercent: 100 },
    providerAttempts: { current: 2, previous: 0, changePercent: null },
    tokens: { current: 200, previous: 100, changePercent: 100 },
    failureRate: { current: 10, previous: 20, changePercent: -50 },
  },
  daily: [
    { date: '2026-07-10', providerCostUsd: 2, providerAttempts: 2, tokens: 200, failed: 1 },
    { date: '2026-07-11', providerCostUsd: 0, providerAttempts: 0, tokens: 0, failed: 0 },
  ],
  dailyModelSpend: [{ date: '2026-07-10', model: 'resolved-model', costUsd: 2 }],
}

describe('AiUsageCharts', () => {
  afterEach(cleanup)

  it('renders metric labels, neutral comparison wording, and model totals', () => {
    render(<AiUsageCharts report={report as never} />)

    expect(screen.getByText('Provider spend')).toBeInTheDocument()
    expect(screen.getByText('Provider requests')).toBeInTheDocument()
    expect(screen.getByText('Tokens processed')).toBeInTheDocument()
    expect(screen.getByText('Failure rate')).toBeInTheDocument()
    expect(screen.getByText('No prior activity')).toBeInTheDocument()
    expect(screen.getByText('Spend by model')).toBeInTheDocument()
    expect(screen.getByText('resolved-model')).toBeInTheDocument()
  })

  it('renders the verified-spend empty state', () => {
    render(<AiUsageCharts report={{ ...report, dailyModelSpend: [] } as never} />)
    expect(
      screen.getByText('No verified provider spend occurred in this range.'),
    ).toBeInTheDocument()
  })
})
