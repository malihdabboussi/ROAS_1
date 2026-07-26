import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('ig-organic-video-ad skill migration', () => {
  const migration = [
    '../../supabase/migrations/20260723204214_ig_organic_video_ad_skill.sql',
    '../../supabase/migrations/20260725153000_ig_organic_video_preapproved_copy.sql',
    '../../supabase/migrations/20260726122500_ig_organic_video_renderer_path.sql',
    '../../supabase/migrations/20260726124500_ig_organic_video_server_renderer.sql',
  ]
    .map((filePath) => fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf8'))
    .join('\n')

  it('uses the direct Higgsfield MCP and reuses stock footage by default', () => {
    expect(migration).toMatch(/direct Higgsfield MCP/i)
    expect(migration).toMatch(/https:\/\/mcp\.higgsfield\.ai/i)
    expect(migration).toMatch(/Do not route Higgsfield through Composio/i)
    expect(migration).toMatch(/reuse_when_available/i)
  })

  it('keeps copy approval separate from rendering', () => {
    expect(migration).toMatch(/Copy is a separate approval stage/i)
    expect(migration).toMatch(/Stop for approval before generating footage or rendering/i)
    expect(migration).toMatch(/copy_approved/i)
    expect(migration).toMatch(/proceed directly to Stage 2/i)
    expect(migration).toMatch(/write_for_me.*cannot bypass copy approval/is)
    expect(migration).toMatch(/Never ask an image or video model to render copy/i)
  })

  it('locks rendering to Pillow and the approved emoji set', () => {
    expect(migration).toMatch(/render_ig_story\.py/i)
    expect(migration).toMatch(/skills\/ig-organic-video-ad\/assets\/render_ig_story\.py/)
    expect(migration).toMatch(/Do not look for it under the mission working directory/i)
    expect(migration).toMatch(/operation.*render_ig_story/is)
    expect(migration).toMatch(/Do not use shell execution/i)
    expect(migration).toMatch(/Pillow/i)
    expect(migration).toMatch(/👇.*⏰.*✅.*🚨.*🙌/s)
    expect(migration).toMatch(/embedded color/i)
  })
})
