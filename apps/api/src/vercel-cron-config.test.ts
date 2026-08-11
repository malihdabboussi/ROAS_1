import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

type CronEntry = { path: string; schedule: string }

describe('Vercel cron isolation', () => {
  it('keeps the automation scanner out of five-minute maintenance slots', () => {
    const config = JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8')) as {
      crons: CronEntry[]
    }
    const scheduler = config.crons.find(
      (entry) => entry.path === '/api/internal/space-automations/dispatch-due',
    )

    expect(scheduler?.schedule).toBe(
      '1-4,6-9,11-14,16-19,21-24,26-29,31-34,36-39,41-44,46-49,51-54,56-59 * * * *',
    )
  })
})
