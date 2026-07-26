import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('static-ad-book skill migration', () => {
  const migration = fs.readFileSync(
    path.resolve(
      process.cwd(),
      '../../supabase/migrations/20260724143000_static_ad_book_skill.sql',
    ),
    'utf8',
  )
  const serverRendererMigration = fs.readFileSync(
    path.resolve(
      process.cwd(),
      '../../supabase/migrations/20260726215000_static_ad_server_renderer.sql',
    ),
    'utf8',
  )

  it('seeds the complete ten-format book and deterministic renderer', () => {
    for (const format of [
      'hero_framing',
      'identity_callout',
      'case_study',
      'workshop_event',
      'tweet_receipt',
      'chat_receipt',
      'press_authority',
      'fake_news',
      'myth_vs_system',
      'offer_stack',
    ]) {
      expect(migration).toContain(format)
    }
    expect(migration).toMatch(/assets\/engine\/render_ad\.py/)
    expect(migration).toMatch(/Playwright/)
    expect(migration).toMatch(/verbatim/)
  })

  it('supports mission quantities, references, copy modes, and both chat and designer agents', () => {
    expect(migration).toMatch(/playbook_kickoff/)
    expect(migration).toMatch(/exactly `quantity`/)
    expect(migration).toMatch(/reference_assets/)
    expect(migration).toMatch(/write_for_me/)
    expect(migration).toMatch(/use_my_copy/)
    expect(migration).toMatch(/VALUES \('designer'\), \('vibey'\)/)
  })

  it('requires explicit person sourcing, substantiated proof, visual QA, and Media registration', () => {
    expect(migration).toMatch(/real photo.*generative person/is)
    expect(migration).toMatch(/Never invent a testimonial/i)
    expect(migration).toMatch(/Verify visually/i)
    expect(migration).toMatch(/Register every final PNG in campaign Space Media/i)
  })

  it('routes final typography through the deterministic server renderer', () => {
    expect(serverRendererMigration).toMatch(/operation: render_static_ad/i)
    expect(serverRendererMigration).toMatch(/only returned PNGs/i)
    expect(serverRendererMigration).toMatch(/never call `generate_image` for a final/i)
    expect(serverRendererMigration).toMatch(/UPDATE public\.agent_skills/i)
  })
})
