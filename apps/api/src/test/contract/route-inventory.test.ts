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
    { path: '.well-known/oauth-authorization-server', method: RequestMethod.GET },
    { path: '.well-known/openid-configuration', method: RequestMethod.GET },
  ],
}

describe('API route inventory contract', () => {
  it('matches the committed method + path inventory', async () => {
    expect(collectSourceRouteInventory(SRC_DIR, GLOBAL_PREFIX_OPTIONS)).toMatchSnapshot()
  })
})
