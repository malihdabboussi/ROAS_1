"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const funnel_tsx_contract_1 = require("./funnel-tsx-contract");
(0, vitest_1.describe)('funnel-tsx-contract', () => {
    (0, vitest_1.it)('decodes html entities in generated_html', () => {
        const normalized = (0, funnel_tsx_contract_1.normalizeFunnelPageSource)({
            generatedHtmlRaw: '<div>Don&#x27;t &amp; won&#39;t</div>',
            generatedCssRaw: '',
        });
        (0, vitest_1.expect)(normalized.generatedHtml).toBe("<div>Don't & won't</div>");
    });
    (0, vitest_1.it)('moves inline style blocks into generated_css', () => {
        const normalized = (0, funnel_tsx_contract_1.normalizeFunnelPageSource)({
            generatedHtmlRaw: '<style>.a{color:red;}</style><div>Hello</div>',
            generatedCssRaw: '',
        });
        (0, vitest_1.expect)(normalized.generatedCss).toContain('.a{color:red;}');
        (0, vitest_1.expect)(normalized.generatedHtml).toBe('<div>Hello</div>');
    });
    (0, vitest_1.it)('wraps bare JSX into a component', () => {
        const prepared = (0, funnel_tsx_contract_1.prepareFunnelPageForWrite)({
            generatedHtmlRaw: '<div>Hero</div><section>Body</section>',
            generatedCssRaw: '',
            pageName: 'OptInPage',
            mode: 'add',
        });
        (0, vitest_1.expect)(prepared.generatedHtml).toContain('const OptInPage = () =>');
        (0, vitest_1.expect)(prepared.generatedHtml).toContain('export default OptInPage');
        (0, vitest_1.expect)(prepared.usedFallback).toBe(false);
    });
    (0, vitest_1.it)('adds default export when missing', () => {
        const prepared = (0, funnel_tsx_contract_1.prepareFunnelPageForWrite)({
            generatedHtmlRaw: 'const FunnelPage = () => <div>Hi</div>',
            generatedCssRaw: '',
            pageName: 'FunnelPage',
            mode: 'add',
        });
        (0, vitest_1.expect)(prepared.generatedHtml).toContain('export default FunnelPage');
        (0, vitest_1.expect)(prepared.usedFallback).toBe(false);
    });
    (0, vitest_1.it)('treats css-only payload as fallback write and preserves css', () => {
        const prepared = (0, funnel_tsx_contract_1.prepareFunnelPageForWrite)({
            generatedHtmlRaw: ':root { --bg: #000; } .hero { color: white; }',
            generatedCssRaw: '',
            pageName: 'LandingPage',
            mode: 'add',
        });
        (0, vitest_1.expect)(prepared.usedFallback).toBe(true);
        (0, vitest_1.expect)(prepared.generatedCss).toContain('--bg');
        (0, vitest_1.expect)((0, funnel_tsx_contract_1.validateFunnelTsxContract)(prepared.generatedHtml).valid).toBe(true);
    });
    (0, vitest_1.it)('preserves previous valid html on unrecoverable update', () => {
        const previousValid = 'const Prev = () => <div>OK</div>\nexport default Prev';
        const prepared = (0, funnel_tsx_contract_1.prepareFunnelPageForWrite)({
            generatedHtmlRaw: '<div>',
            generatedCssRaw: '',
            pageName: 'LandingPage',
            mode: 'update',
            previousValidHtml: previousValid,
        });
        (0, vitest_1.expect)(prepared.usedPreviousValid).toBe(true);
        (0, vitest_1.expect)(prepared.generatedHtml).toBe(previousValid);
        (0, vitest_1.expect)(prepared.usedFallback).toBe(false);
    });
    (0, vitest_1.it)('treats type-only diagnostics as warnings', () => {
        const validation = (0, funnel_tsx_contract_1.validateFunnelTsxContract)([
            'const Landing = () => {',
            '  const [count, setCount] = useState(0)',
            '  return <button onClick={() => setCount("oops")}>{count}</button>',
            '}',
            'export default Landing',
        ].join('\n'));
        (0, vitest_1.expect)(validation.valid).toBe(true);
        (0, vitest_1.expect)((validation.warnings ?? []).length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('programmatic repair adds missing hook imports', () => {
        const source = [
            'const Landing = () => {',
            '  const [n, setN] = useState(0)',
            '  return <div>{n}</div>',
            '}',
            'export default Landing',
        ].join('\n');
        const repaired = (0, funnel_tsx_contract_1.programmaticTsxRepair)({
            generatedHtml: source,
            errors: ["line 2, col 23: Cannot find name 'useState'."],
        });
        (0, vitest_1.expect)(repaired.generatedHtml).toContain("import { useState } from 'react'");
        (0, vitest_1.expect)(repaired.appliedFixes).toContain('add_missing_react_hooks_import');
    });
});
//# sourceMappingURL=funnel-tsx-contract.test.js.map