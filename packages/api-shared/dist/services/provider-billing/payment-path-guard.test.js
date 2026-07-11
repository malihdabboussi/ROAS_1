"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const vitest_1 = require("vitest");
const PAID_PROVIDER_PATTERNS = [
    /openrouter\.ai\/api\/v1\/chat\/completions/,
    /OPENROUTER_BASE_URL\}\/chat\/completions/,
    /openRouterBaseUrl\}\/chat\/completions/,
    /generativelanguage\.googleapis\.com/,
    /api\.deepgram\.com/,
    /api\.dataforseo\.com/,
    /api\.scrapecreators\.com/,
];
const PAID_PROVIDER_ALLOWLIST = {
    'apps/api/src/modules/provider-billing/services/openrouter-billing-client.service.ts': [
        { file: 'apps/api/src/modules/provider-billing/services/openrouter-billing-client.service.ts', includes: ['recordAttempt', 'settleByIdOrGeneration'] },
    ],
    'apps/web/src/app/api/tsx-repair/route.ts': [
        { file: 'apps/web/src/app/api/tsx-repair/route.ts', includes: ['recordProviderAttempt', 'settleProviderAttempt'] },
    ],
    'apps/api/src/modules/media/integrations/gemini-image.integration.ts': [
        { file: 'apps/api/src/modules/media/integrations/gemini-image.integration.ts', includes: ['OpenRouterBillingClientService', 'fixed_price_customer_billing'] },
        { file: 'apps/api/src/modules/media/controllers/media-image-generation.controller.ts', includes: ['processImageUsage'] },
        { file: 'apps/api/src/modules/media/controllers/media-image-stream.controller.ts', includes: ['processImageUsage'] },
    ],
    'apps/api/src/modules/media/services/media-indexer.service.ts': [
        { file: 'apps/api/src/modules/media/services/media-indexer.service.ts', includes: ['processDirectTextUsage', 'document_index_embedding'] },
    ],
    'apps/api/src/modules/brain/services/embedding.service.ts': [
        { file: 'apps/api/src/modules/brain/services/embedding.service.ts', includes: ['processDirectTextUsage', 'char_estimate'] },
    ],
    'apps/api/src/modules/brain/services/gemini-ocr.service.ts': [
        { file: 'apps/api/src/modules/brain/services/gemini-ocr.service.ts', includes: ['processDirectTextUsage', 'document_ocr'] },
    ],
    'apps/api/src/modules/conversations/services/conversation-title-suggestion.service.ts': [
        { file: 'apps/api/src/modules/conversations/services/conversation-title-suggestion.service.ts', includes: ['processDirectTextUsage', 'suggest_title'] },
    ],
    'apps/api/src/modules/composio/services/composio.service.ts': [
        { file: 'apps/api/src/modules/composio/services/composio.service.ts', includes: ['processDirectTextUsage', 'composio_toolkit_search_embedding'] },
    ],
    'apps/api/src/modules/campaigns/services/ad-variation-generator.service.ts': [
        { file: 'apps/api/src/modules/campaigns/controllers/ad-copy-generation-artifacts.controller.ts', includes: ['processDirectTextUsage'] },
        { file: 'apps/api/src/modules/campaigns/controllers/ad-generation-artifacts.controller.ts', includes: ['processImageUsage'] },
    ],
    'apps/api/src/modules/transcribe/integrations/deepgram.integration.ts': [
        { file: 'apps/api/src/modules/transcribe/controllers/transcribe.controller.ts', includes: ['processDirectTextUsage', 'deepgram_estimate'] },
    ],
    'apps/api/src/modules/integrations/dataforseo/services/dataforseo-api.service.ts': [
        { file: 'apps/api/src/modules/integrations/dataforseo/services/dataforseo-usage.service.ts', includes: ['processDirectTextUsage', 'dataforseo_response_cost'] },
    ],
    'apps/api/src/modules/integrations/scrapecreators/services/scrapecreators-api.service.ts': [
        { file: 'apps/api/src/modules/integrations/scrapecreators/services/scrapecreators-action.service.ts', includes: ['processDirectTextUsage', 'scrapecreators_flat'] },
    ],
    'apps/agent-api/src/modules/brain/gateways/brain-live.gateway.ts': [
        { file: 'apps/agent-api/src/modules/brain/gateways/brain-live.gateway.ts', includes: ['startUsageBillingTimer', 'trackSessionUsage'] },
    ],
    'apps/agent-api/src/modules/brain/services/embedding.service.ts': [
        { file: 'apps/agent-api/src/modules/brain/services/embedding.service.ts', includes: ['processDirectTextUsage', 'char_estimate'] },
    ],
    'apps/agent-api/src/modules/brain/services/gemini-ocr.service.ts': [
        { file: 'apps/agent-api/src/modules/brain/services/gemini-ocr.service.ts', includes: ['processDirectTextUsage', 'document_ocr'] },
    ],
    'apps/agent-api/src/modules/brain/services/voice-assignment.service.ts': [
        { file: 'apps/agent-api/src/modules/brain/services/voice-assignment.service.ts', includes: ['processDirectTextUsage', 'voice_avatar_gender_detection'] },
    ],
    'apps/agent-api/src/modules/brain/services/brain-reranker.service.ts': [
        { file: 'apps/agent-api/src/modules/brain/services/brain-reranker.service.ts', includes: ['Provider billing attempts service is required for Brain LLM reranker', 'callGemini(prompt, undefined, billing)'] },
    ],
    'apps/agent-api/src/modules/artifacts/integrations/artifact-missions-media-gemini.client.ts': [
        { file: 'apps/agent-api/src/modules/artifacts/services/artifact-missions-media-image.service.ts', includes: ['processDirectTextUsage'] },
        { file: 'apps/agent-api/src/modules/artifacts/services/artifact-missions-media-document.service.ts', includes: ['processDirectTextUsage'] },
    ],
    'apps/agent-api/src/modules/artifacts/integrations/artifact-missions-media-deepgram.client.ts': [
        { file: 'apps/agent-api/src/modules/artifacts/services/artifact-missions-media-transcript.service.ts', includes: ['chargeDeepgramUsage'] },
        { file: 'apps/agent-api/src/modules/artifacts/services/artifact-missions-media-video.service.ts', includes: ['chargeDeepgramUsage'] },
    ],
    'apps/agent-api/src/modules/artifacts/integrations/artifact-missions-media-scrape-creators.client.ts': [
        { file: 'apps/agent-api/src/modules/artifacts/services/artifact-missions-media-transcript.service.ts', includes: ['chargeScrapeCreatorsUsage'] },
    ],
    'apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-provider.service.ts': [
        { file: 'apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-provider.service.ts', includes: ['Provider billing attempts service is required', 'fixed_price_customer_billing'] },
        { file: 'apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-generate.service.ts', includes: ['processFixedCostUsage'] },
    ],
    'apps/agent-api/src/modules/artifacts/services/artifact-visual-doc.service.ts': [
        { file: 'apps/agent-api/src/modules/artifacts/services/artifact-visual-doc.service.ts', includes: ['Provider billing attempts service is required', 'recordAttempt'] },
    ],
    'apps/mission-worker/src/modules/brain-ops/customer-interaction-extraction.service.ts': [
        { file: 'apps/mission-worker/src/modules/brain-ops/customer-interaction-extraction.service.ts', includes: ['chargeDirectTextUsage', 'customer_interaction_extraction'] },
    ],
    'apps/mission-worker/src/modules/brain-ops/company-cortex-formation.service.ts': [
        { file: 'apps/mission-worker/src/modules/brain-ops/company-cortex-formation.service.ts', includes: ['chargeDirectTextUsage', 'company_cortex_object_embedding'] },
    ],
    'apps/mission-worker/src/modules/missions/services/context/mission-context.service.ts': [
        { file: 'apps/mission-worker/src/modules/missions/services/context/mission-context.service.ts', includes: ['chargeDirectTextUsage', 'context_embedding'] },
    ],
};
const ZERO_CREDIT_ALLOWLIST = new Set([
    'apps/api/src/modules/provider-billing/services/provider-billing-settlement.service.ts',
    'apps/agent-api/src/modules/billing/services/credits-usage-processing.service.ts',
]);
const SCAN_ROOTS = [
    'apps/api/src',
    'apps/agent-api/src',
    'apps/mission-worker/src',
    'apps/web/src/app/api',
    'packages/api-shared/src',
];
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);
(0, vitest_1.describe)('provider billing payment path guard', () => {
    (0, vitest_1.it)('keeps paid provider calls behind reviewed billing paths', () => {
        const root = findRepoRoot();
        const offenders = [];
        for (const file of listSourceFiles(root)) {
            const rel = (0, node_path_1.relative)(root, file);
            if (isIgnoredSource(rel))
                continue;
            const text = (0, node_fs_1.readFileSync)(file, 'utf8');
            const hasPaidProviderCall = PAID_PROVIDER_PATTERNS.some((pattern) => pattern.test(text));
            if (hasPaidProviderCall && !PAID_PROVIDER_ALLOWLIST[rel])
                offenders.push(rel);
        }
        (0, vitest_1.expect)(offenders).toEqual([]);
        for (const [providerFile, evidenceList] of Object.entries(PAID_PROVIDER_ALLOWLIST)) {
            const providerText = (0, node_fs_1.readFileSync)((0, node_path_1.resolve)(root, providerFile), 'utf8');
            (0, vitest_1.expect)(PAID_PROVIDER_PATTERNS.some((pattern) => pattern.test(providerText)), `${providerFile} no longer contains a paid provider endpoint; remove it from PAID_PROVIDER_ALLOWLIST`).toBe(true);
            for (const evidence of evidenceList) {
                const evidenceText = (0, node_fs_1.readFileSync)((0, node_path_1.resolve)(root, evidence.file), 'utf8');
                for (const snippet of evidence.includes) {
                    (0, vitest_1.expect)(evidenceText, `${providerFile} missing billing evidence "${snippet}" in ${evidence.file}`).toContain(snippet);
                }
            }
        }
    });
    (0, vitest_1.it)('does not detach customer credit processing after provider work succeeds', () => {
        const root = findRepoRoot();
        const offenders = [];
        const detachedBillingCall = /\.(processImageUsage|processFixedCostUsage|processDirectTextUsage|processTranscribeUsage)\([\s\S]{0,3000}?\.catch\(/;
        for (const file of listSourceFiles(root)) {
            const rel = (0, node_path_1.relative)(root, file);
            if (isIgnoredSource(rel))
                continue;
            const text = (0, node_fs_1.readFileSync)(file, 'utf8');
            if (detachedBillingCall.test(text))
                offenders.push(rel);
        }
        (0, vitest_1.expect)(offenders).toEqual([]);
    });
    (0, vitest_1.it)('does not call Brain Gemini LLM helpers without a billing owner', () => {
        const root = findRepoRoot();
        const offenders = [];
        const unownedGeminiCall = /\.callGemini\([\s\S]{0,500}?undefined\s*\)/;
        for (const file of listSourceFiles(root)) {
            const rel = (0, node_path_1.relative)(root, file);
            if (isIgnoredSource(rel))
                continue;
            const text = (0, node_fs_1.readFileSync)(file, 'utf8');
            if (unownedGeminiCall.test(text))
                offenders.push(rel);
        }
        (0, vitest_1.expect)(offenders).toEqual([]);
    });
    (0, vitest_1.it)('does not cap incurred provider debits to current balance', () => {
        const root = findRepoRoot();
        const offenders = [];
        const cappedIncurredDebit = /(?:this|host)\.getChargeableCredits\(/;
        for (const file of listSourceFiles(root)) {
            const rel = (0, node_path_1.relative)(root, file);
            if (isIgnoredSource(rel))
                continue;
            const text = (0, node_fs_1.readFileSync)(file, 'utf8');
            if (cappedIncurredDebit.test(text))
                offenders.push(rel);
        }
        (0, vitest_1.expect)(offenders).toEqual([]);
    });
    (0, vitest_1.it)('does not insert zero-credit paid usage rows outside reviewed no-charge paths', () => {
        const root = findRepoRoot();
        const offenders = [];
        for (const file of listSourceFiles(root)) {
            const rel = (0, node_path_1.relative)(root, file);
            if (isIgnoredSource(rel) || ZERO_CREDIT_ALLOWLIST.has(rel))
                continue;
            const text = (0, node_fs_1.readFileSync)(file, 'utf8');
            if (text.includes('credits_charged: 0'))
                offenders.push(rel);
        }
        (0, vitest_1.expect)(offenders).toEqual([]);
    });
    (0, vitest_1.it)('does not mark customer-triggered provider attempts as platform-owned', () => {
        const root = findRepoRoot();
        const offenders = [];
        const platformOwner = /billingOwnerType:\s*['"]platform['"]/;
        for (const file of listSourceFiles(root)) {
            const rel = (0, node_path_1.relative)(root, file);
            if (isIgnoredSource(rel))
                continue;
            const text = (0, node_fs_1.readFileSync)(file, 'utf8');
            if (!platformOwner.test(text))
                continue;
            if (text.includes('fixed_price_customer_billing'))
                continue;
            offenders.push(rel);
        }
        (0, vitest_1.expect)(offenders).toEqual([]);
    });
});
function findRepoRoot() {
    let current = __dirname;
    while (current !== (0, node_path_1.dirname)(current)) {
        if ((0, node_fs_1.existsSync)((0, node_path_1.join)(current, 'pnpm-workspace.yaml')))
            return current;
        current = (0, node_path_1.dirname)(current);
    }
    throw new Error('Could not locate repo root');
}
function listSourceFiles(root) {
    const out = [];
    for (const scanRoot of SCAN_ROOTS) {
        walk((0, node_path_1.resolve)(root, scanRoot), out);
    }
    return out;
}
function walk(dir, out) {
    if (!(0, node_fs_1.existsSync)(dir))
        return;
    for (const entry of (0, node_fs_1.readdirSync)(dir, { withFileTypes: true })) {
        const path = (0, node_path_1.join)(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === 'dist')
                continue;
            walk(path, out);
            continue;
        }
        const ext = entry.name.slice(entry.name.lastIndexOf('.'));
        if (SOURCE_EXTENSIONS.has(ext))
            out.push(path);
    }
}
function isIgnoredSource(rel) {
    return (rel.includes('/__tests__/') ||
        rel.endsWith('.test.ts') ||
        rel.endsWith('.spec.ts') ||
        rel.includes('/evals/') ||
        rel.includes('/logs/'));
}
//# sourceMappingURL=payment-path-guard.test.js.map