import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('artifact renderer runtime packaging', () => {
  const dockerfile = fs.readFileSync(path.resolve(process.cwd(), '../../docker/Dockerfile'), 'utf8')

  it('packages the IG Story renderer at the configured stable runtime path', () => {
    expect(dockerfile).toMatch(
      /COPY --chown=node:node apps\/agent-api\/src\/modules\/artifacts\/scripts\/render_ig_story\.py \/app\/agent-api\/renderers\/render_ig_story\.py/,
    )
    expect(dockerfile).toMatch(
      /ENV IG_STORY_RENDER_SCRIPT_PATH=\/app\/agent-api\/renderers\/render_ig_story\.py/,
    )
    expect(dockerfile).toMatch(/RUN test -r "\$\{IG_STORY_RENDER_SCRIPT_PATH\}"/)
  })
})
