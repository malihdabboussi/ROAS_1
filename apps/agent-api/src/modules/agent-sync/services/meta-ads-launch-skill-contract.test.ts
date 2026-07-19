import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('roas-meta-ads-launch skill migration', () => {
  const migration = fs.readFileSync(
    path.resolve(
      process.cwd(),
      '../../supabase/migrations/20260719143000_meta_ads_launch_skill.sql',
    ),
    'utf8',
  )

  it('keeps PageGrader read-only and Meta publishing inside Vibey', () => {
    expect(migration).toMatch(/PageGrader supplies read-only/i)
    expect(migration).toMatch(/Never publish through PageGrader/i)
    expect(migration).toMatch(/PAUSED state/i)
  })

  it('keeps creative ownership out of Blaze and uses native Docs', () => {
    expect(migration).toMatch(/Ivy owns missing or revised copy/i)
    expect(migration).toMatch(/Lux owns missing or revised visual creative/i)
    expect(migration).toMatch(/native editable Doc/i)
    expect(migration).toMatch(/Never create a PDF/i)
  })

  it('requires Dylan Super Voice for all written updates', () => {
    expect(migration).toMatch(/dylans-super-voice/i)
    expect(migration).toMatch(/exclusive authority/i)
    expect(migration).toMatch(/no-em-dash/i)
  })
})
