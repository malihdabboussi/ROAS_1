import { describe, expect, it } from 'vitest'
import { buildSpendChartData } from './ai-usage-chart-data'

describe('buildSpendChartData', () => {
  it('keeps the top five models, groups the rest, and fills missing dates', () => {
    const entries = [
      ['model/slash', 6],
      ['model spaces', 5],
      ['model:three', 4],
      ['model.four', 3],
      ['model-five', 2],
      ['model-six', 1],
      ['model-seven', 0.5],
    ] as const
    const result = buildSpendChartData(
      {
        startDate: '2026-07-10',
        endDate: '2026-07-12',
        previousStartDate: '2026-07-07',
        previousEndDate: '2026-07-09',
      },
      entries.map(([model, costUsd]) => ({ date: '2026-07-10', model, costUsd })),
    )

    expect(result.series).toEqual([
      { key: 'model_1', model: 'model/slash', total: 6 },
      { key: 'model_2', model: 'model spaces', total: 5 },
      { key: 'model_3', model: 'model:three', total: 4 },
      { key: 'model_4', model: 'model.four', total: 3 },
      { key: 'model_5', model: 'model-five', total: 2 },
      { key: 'model_other', model: 'Other', total: 1.5 },
    ])
    expect(result.rows).toHaveLength(3)
    expect(result.rows[0]).toEqual({
      date: '2026-07-10',
      model_1: 6,
      model_2: 5,
      model_3: 4,
      model_4: 3,
      model_5: 2,
      model_other: 1.5,
    })
    expect(result.rows[1]).toEqual({
      date: '2026-07-11',
      model_1: 0,
      model_2: 0,
      model_3: 0,
      model_4: 0,
      model_5: 0,
      model_other: 0,
    })
    expect(result.series.reduce((sum, item) => sum + item.total, 0)).toBe(21.5)
    expect(result.series.every((item) => /^model_(?:[1-5]|other)$/.test(item.key))).toBe(true)
  })
})
