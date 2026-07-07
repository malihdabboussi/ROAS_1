import { describe, expect, it } from 'vitest'
import {
  normalizeFunnelPageSource,
  prepareFunnelPageForWrite,
  programmaticTsxRepair,
  validateFunnelTsxContract,
} from './funnel-tsx-contract'

describe('funnel-tsx-contract', () => {
  it('decodes html entities in generated_html', () => {
    const normalized = normalizeFunnelPageSource({
      generatedHtmlRaw: '<div>Don&#x27;t &amp; won&#39;t</div>',
      generatedCssRaw: '',
    })
    expect(normalized.generatedHtml).toBe("<div>Don't & won't</div>")
  })

  it('moves inline style blocks into generated_css', () => {
    const normalized = normalizeFunnelPageSource({
      generatedHtmlRaw: '<style>.a{color:red;}</style><div>Hello</div>',
      generatedCssRaw: '',
    })
    expect(normalized.generatedCss).toContain('.a{color:red;}')
    expect(normalized.generatedHtml).toBe('<div>Hello</div>')
  })

  it('wraps bare JSX into a component', () => {
    const prepared = prepareFunnelPageForWrite({
      generatedHtmlRaw: '<div>Hero</div><section>Body</section>',
      generatedCssRaw: '',
      pageName: 'OptInPage',
      mode: 'add',
    })
    expect(prepared.generatedHtml).toContain('const OptInPage = () =>')
    expect(prepared.generatedHtml).toContain('export default OptInPage')
    expect(prepared.usedFallback).toBe(false)
  })

  it('adds default export when missing', () => {
    const prepared = prepareFunnelPageForWrite({
      generatedHtmlRaw: 'const FunnelPage = () => <div>Hi</div>',
      generatedCssRaw: '',
      pageName: 'FunnelPage',
      mode: 'add',
    })
    expect(prepared.generatedHtml).toContain('export default FunnelPage')
    expect(prepared.usedFallback).toBe(false)
  })

  it('treats css-only payload as fallback write and preserves css', () => {
    const prepared = prepareFunnelPageForWrite({
      generatedHtmlRaw: ':root { --bg: #000; } .hero { color: white; }',
      generatedCssRaw: '',
      pageName: 'LandingPage',
      mode: 'add',
    })
    expect(prepared.usedFallback).toBe(true)
    expect(prepared.generatedCss).toContain('--bg')
    expect(validateFunnelTsxContract(prepared.generatedHtml).valid).toBe(true)
  })

  it('preserves previous valid html on unrecoverable update', () => {
    const previousValid = 'const Prev = () => <div>OK</div>\nexport default Prev'
    const prepared = prepareFunnelPageForWrite({
      generatedHtmlRaw: '<div>',
      generatedCssRaw: '',
      pageName: 'LandingPage',
      mode: 'update',
      previousValidHtml: previousValid,
    })
    expect(prepared.usedPreviousValid).toBe(true)
    expect(prepared.generatedHtml).toBe(previousValid)
    expect(prepared.usedFallback).toBe(false)
  })

  it('treats type-only diagnostics as warnings', () => {
    const validation = validateFunnelTsxContract(
      [
        'const Landing = () => {',
        '  const [count, setCount] = useState(0)',
        '  return <button onClick={() => setCount("oops")}>{count}</button>',
        '}',
        'export default Landing',
      ].join('\n'),
    )
    expect(validation.valid).toBe(true)
    expect((validation.warnings ?? []).length).toBeGreaterThan(0)
  })

  it('programmatic repair adds missing hook imports', () => {
    const source = [
      'const Landing = () => {',
      '  const [n, setN] = useState(0)',
      '  return <div>{n}</div>',
      '}',
      'export default Landing',
    ].join('\n')
    const repaired = programmaticTsxRepair({
      generatedHtml: source,
      errors: ["line 2, col 23: Cannot find name 'useState'."],
    })
    expect(repaired.generatedHtml).toContain("import { useState } from 'react'")
    expect(repaired.appliedFixes).toContain('add_missing_react_hooks_import')
  })
})
