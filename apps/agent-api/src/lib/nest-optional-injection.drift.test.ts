import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'
import { describe, expect, it } from 'vitest'

/**
 * `@Optional() dep: Service | undefined` compiles to `Object` in
 * `design:paramtypes` (TypeScript serialises explicit unions as Object), so
 * Nest cannot resolve the provider and injects `undefined` without any error.
 * `ChatPrewarmContextService` lost its AgentPolicyService this way, which
 * denied every chat turn's personal Brain lane. Declare optional injected
 * dependencies as `dep?: Service`, or name the token with `@Inject(Service)`.
 */
const SRC_ROOT = join(__dirname, '..')
const UNION_OPTIONAL_INJECTION =
  /@Optional\(\)(?![^\n]*@Inject\()[^\n,]*:\s*[A-Za-z][A-Za-z0-9]*\s*\|\s*(?:undefined|null)\b/

function listSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (entry !== 'node_modules' && entry !== 'dist') listSourceFiles(full, out)
    } else if (full.endsWith('.ts') && !full.endsWith('.test.ts') && !full.endsWith('.d.ts')) {
      out.push(full)
    }
  }
  return out
}

describe('Nest optional injection declarations', () => {
  it('never combines @Optional() with an explicit `| undefined` or `| null` union type', () => {
    const offenders = listSourceFiles(SRC_ROOT)
      .filter((file) => UNION_OPTIONAL_INJECTION.test(readFileSync(file, 'utf8')))
      .map((file) => relative(SRC_ROOT, file))
    expect(offenders).toEqual([])
  })
})
