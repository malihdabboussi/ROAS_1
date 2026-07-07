import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { RequestMethod } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import { collectSourceRouteInventory } from '../../../../../scripts/arch/route-inventory.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC_DIR = resolve(__dirname, '../..')

const GLOBAL_PREFIX_OPTIONS = {
  globalPrefix: 'api',
  exclude: [
    { path: '', method: RequestMethod.POST },
    { path: '', method: RequestMethod.HEAD },
    { path: '.well-known/oauth-protected-resource', method: RequestMethod.GET },
    { path: '.well-known/oauth-protected-resource/api/mcp', method: RequestMethod.GET },
    { path: '.well-known/oauth-protected-resource/api/vibey-mcp', method: RequestMethod.GET },
  ],
}

describe('Agent API route inventory contract', () => {
  it('matches the committed method + path inventory', async () => {
    expect(collectSourceRouteInventory(SRC_DIR, GLOBAL_PREFIX_OPTIONS)).toMatchSnapshot()
  })
})
