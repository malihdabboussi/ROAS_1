"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSafeFallbackFunnelTsx = buildSafeFallbackFunnelTsx;
exports.normalizeFunnelPageSource = normalizeFunnelPageSource;
exports.validateFunnelTsxContract = validateFunnelTsxContract;
exports.programmaticTsxRepair = programmaticTsxRepair;
exports.recoverFunnelTsx = recoverFunnelTsx;
exports.prepareFunnelPageForWrite = prepareFunnelPageForWrite;
let _esbuild;
function getEsbuild() {
    if (!_esbuild)
        _esbuild = require('esbuild');
    return _esbuild;
}
let _ts;
function getTs() {
    if (!_ts)
        _ts = require('typescript');
    return _ts;
}
function buildSafeFallbackFunnelTsx(pageName) {
    const safeName = toSafeComponentName(pageName);
    return [
        `const ${safeName} = () => {`,
        '  return (',
        "    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px', fontFamily: 'Inter, system-ui, sans-serif', background: '#0f1116', color: '#e5e7eb' }}>",
        "      <section style={{ maxWidth: '720px', width: '100%', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '20px', background: 'rgba(255,255,255,0.04)' }}>",
        "        <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 700 }}>Page was auto-recovered</h1>",
        '        <p style={{ margin: 0, opacity: 0.86 }}>Generated source was invalid, so a safe fallback was saved.</p>',
        '      </section>',
        '    </main>',
        '  )',
        '}',
        '',
        `export default ${safeName}`,
    ].join('\n');
}
function decodeHtmlEntities(text) {
    return text
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, ' ');
}
function decodeUnicodeEscapes(text) {
    return text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
}
function normalizeFunnelPageSource(input) {
    const normalizationApplied = [];
    let html = String(input.generatedHtmlRaw ?? '');
    let css = String(input.generatedCssRaw ?? '').trim();
    if (/^\uFEFF/.test(html)) {
        html = html.replace(/^\uFEFF/, '');
        normalizationApplied.push('strip_bom');
    }
    if (/&#x27;|&#39;|&apos;|&#\d+;|&#x[0-9a-fA-F]+;|&amp;|&lt;|&gt;|&quot;|&nbsp;/.test(html)) {
        html = decodeHtmlEntities(html);
        normalizationApplied.push('decode_html_entities');
    }
    if (/\\u[0-9a-fA-F]{4}/.test(html)) {
        html = decodeUnicodeEscapes(html);
        normalizationApplied.push('decode_unicode_escapes');
    }
    if (/<!--[\s\S]*?-->/.test(html)) {
        html = html.replace(/<!--[\s\S]*?-->/g, '');
        normalizationApplied.push('strip_html_comments');
    }
    if (/^\s*```(?:tsx|ts|jsx|js)?\s*\n?/i.test(html)) {
        html = html.replace(/^\s*```(?:tsx|ts|jsx|js)?\s*\n?/i, '');
        normalizationApplied.push('strip_code_fence_start');
    }
    if (/\n?\s*```\s*$/i.test(html)) {
        html = html.replace(/\n?\s*```\s*$/i, '');
        normalizationApplied.push('strip_code_fence_end');
    }
    const extracted = extractInlineStyleBlocks(html);
    if (extracted.css) {
        css = [css, extracted.css].filter(Boolean).join('\n\n');
        normalizationApplied.push('extract_inline_style_blocks');
    }
    html = extracted.html;
    const normalizedAttrs = html.replace(/\bclass=/g, 'className=').replace(/\bfor=/g, 'htmlFor=');
    if (normalizedAttrs !== html) {
        html = normalizedAttrs;
        normalizationApplied.push('normalize_jsx_attrs');
    }
    html = html.trim();
    return { generatedHtml: html, generatedCss: css, normalizationApplied };
}
function validateFunnelTsxContract(raw) {
    if (!raw.trim())
        return { valid: false, code: 'EMPTY', message: 'generated_html cannot be empty' };
    if (/<!--|-->/.test(raw)) {
        return {
            valid: false,
            code: 'HTML_COMMENTS',
            message: 'generated_html cannot contain HTML comments (`<!-- -->`)',
        };
    }
    if (/^\s*```/.test(raw) || /```\s*$/.test(raw)) {
        return {
            valid: false,
            code: 'MARKDOWN_FENCE',
            message: 'generated_html cannot contain markdown code fences',
        };
    }
    if (isLikelyStylesheetContent(raw)) {
        return {
            valid: false,
            code: 'STYLESHEET_CONTENT',
            message: 'generated_html looks like CSS/stylesheet content, not TSX',
        };
    }
    if (!isComponentShapedTsx(raw)) {
        return {
            valid: false,
            code: 'NOT_COMPONENT',
            message: 'generated_html must contain a self-contained React component with default export',
        };
    }
    const diagnostics = getTsxSemanticDiagnostics(raw);
    if (diagnostics.fatalErrors.length > 0) {
        return {
            valid: false,
            code: 'TSX_PARSE_ERROR',
            message: diagnostics.fatalErrors[0],
            errors: diagnostics.fatalErrors,
            warnings: diagnostics.nonFatalErrors,
        };
    }
    const esbuildErrors = validateWithEsbuildTransform(raw);
    if (esbuildErrors.length > 0) {
        return {
            valid: false,
            code: 'TSX_PARSE_ERROR',
            message: esbuildErrors[0],
            errors: esbuildErrors,
            warnings: diagnostics.nonFatalErrors,
        };
    }
    return {
        valid: true,
        warnings: diagnostics.nonFatalErrors,
    };
}
function validateWithEsbuildTransform(raw) {
    try {
        getEsbuild().transformSync(raw, {
            loader: 'tsx',
            jsx: 'transform',
            jsxFactory: 'React.createElement',
            jsxFragment: 'React.Fragment',
            target: 'es2020',
        });
        return [];
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const lines = msg.split('\n').filter((l) => l.trim().length > 0);
        return lines.length > 0 ? lines : ['esbuild transform failed'];
    }
}
const RUNTIME_SCOPE_GLOBALS = new Set([
    'useState',
    'useEffect',
    'useRef',
    'useCallback',
    'useMemo',
    'useReducer',
    'useContext',
    'useLayoutEffect',
    'useId',
    'motion',
    'AnimatePresence',
    'useAnimation',
    'useInView',
    'useScroll',
    'useTransform',
    'useSpring',
]);
function programmaticTsxRepair(input) {
    let html = String(input.generatedHtml ?? '');
    const appliedFixes = [];
    const errors = input.errors ?? [];
    const missingNames = extractMissingNames(errors);
    for (const name of RUNTIME_SCOPE_GLOBALS)
        missingNames.delete(name);
    const reactHooks = ['useState', 'useEffect', 'useRef', 'useCallback', 'useMemo'];
    const missingReactHooks = reactHooks.filter((hook) => missingNames.has(hook));
    if (missingReactHooks.length > 0) {
        const next = upsertNamedImport(html, 'react', missingReactHooks);
        if (next !== html) {
            html = next;
            appliedFixes.push('add_missing_react_hooks_import');
        }
    }
    const motionNames = ['motion', 'AnimatePresence', 'useAnimation', 'useInView'];
    const missingMotion = motionNames.filter((name) => missingNames.has(name));
    if (missingMotion.length > 0) {
        const next = upsertNamedImport(html, 'framer-motion', missingMotion);
        if (next !== html) {
            html = next;
            appliedFixes.push('add_missing_framer_motion_import');
        }
    }
    const missingIcons = [...missingNames].filter(isLikelyLucideIconName);
    if (missingIcons.length > 0) {
        const next = upsertNamedImport(html, 'lucide-react', missingIcons);
        if (next !== html) {
            html = next;
            appliedFixes.push('add_missing_lucide_import');
        }
    }
    const strippedTypeArtifacts = stripTypeArtifacts(html);
    if (strippedTypeArtifacts !== html) {
        html = strippedTypeArtifacts;
        appliedFixes.push('strip_typescript_annotations');
    }
    const dedupedImports = dedupeNamedImports(html);
    if (dedupedImports !== html) {
        html = dedupedImports;
        appliedFixes.push('dedupe_imports');
    }
    const mergedMultiLineImports = mergeMultiLineNamedImports(html);
    if (mergedMultiLineImports !== html) {
        html = mergedMultiLineImports;
        appliedFixes.push('merge_duplicate_import_lines');
    }
    return { generatedHtml: html, appliedFixes };
}
function recoverFunnelTsx(input) {
    let html = input.generatedHtml.trim();
    let css = input.generatedCss.trim();
    const recoveryApplied = [];
    if (isLikelyStylesheetContent(html)) {
        css = [css, html].filter(Boolean).join('\n\n');
        html = buildSafeFallbackFunnelTsx(input.pageName);
        recoveryApplied.push('move_stylesheet_content_to_css');
        recoveryApplied.push('inject_safe_fallback');
        return {
            generatedHtml: html,
            generatedCss: css,
            recoveryApplied,
            validation: validateFunnelTsxContract(html),
        };
    }
    const wrapped = wrapBareJsxAsComponent(html, input.pageName);
    if (wrapped) {
        html = wrapped;
        recoveryApplied.push('wrap_bare_jsx_component');
    }
    const withDefaultExport = ensureDefaultExport(html);
    if (withDefaultExport !== html) {
        html = withDefaultExport;
        recoveryApplied.push('ensure_default_export');
    }
    const validation = validateFunnelTsxContract(html);
    return { generatedHtml: html, generatedCss: css, recoveryApplied, validation };
}
function prepareFunnelPageForWrite(input) {
    const normalized = normalizeFunnelPageSource({
        generatedHtmlRaw: input.generatedHtmlRaw,
        generatedCssRaw: input.generatedCssRaw ?? '',
    });
    const initialValidation = validateFunnelTsxContract(normalized.generatedHtml);
    if (initialValidation.valid) {
        return {
            generatedHtml: normalized.generatedHtml,
            generatedCss: normalized.generatedCss,
            normalizationApplied: normalized.normalizationApplied,
            recoveryApplied: [],
            usedFallback: false,
            usedPreviousValid: false,
            initialValidation,
            finalValidation: initialValidation,
        };
    }
    const recovered = recoverFunnelTsx({
        generatedHtml: normalized.generatedHtml,
        generatedCss: normalized.generatedCss,
        pageName: input.pageName,
    });
    if (recovered.validation.valid) {
        const usedFallback = recovered.recoveryApplied.includes('inject_safe_fallback');
        return {
            generatedHtml: recovered.generatedHtml,
            generatedCss: recovered.generatedCss,
            normalizationApplied: normalized.normalizationApplied,
            recoveryApplied: recovered.recoveryApplied,
            usedFallback,
            usedPreviousValid: false,
            initialValidation,
            finalValidation: recovered.validation,
        };
    }
    const previousValidation = input.previousValidHtml
        ? validateFunnelTsxContract(input.previousValidHtml)
        : { valid: false };
    if (input.mode === 'update' && previousValidation.valid) {
        return {
            generatedHtml: input.previousValidHtml,
            generatedCss: recovered.generatedCss,
            normalizationApplied: normalized.normalizationApplied,
            recoveryApplied: [...recovered.recoveryApplied, 'preserve_previous_valid_html'],
            usedFallback: false,
            usedPreviousValid: true,
            initialValidation,
            finalValidation: previousValidation,
        };
    }
    const fallback = buildSafeFallbackFunnelTsx(input.pageName);
    return {
        generatedHtml: fallback,
        generatedCss: recovered.generatedCss,
        normalizationApplied: normalized.normalizationApplied,
        recoveryApplied: [...recovered.recoveryApplied, 'inject_safe_fallback'],
        usedFallback: true,
        usedPreviousValid: false,
        initialValidation,
        finalValidation: validateFunnelTsxContract(fallback),
    };
}
function extractInlineStyleBlocks(raw) {
    let css = '';
    const html = raw.replace(/<style[\s>][\s\S]*?<\/style\s*>/gi, (block) => {
        const match = block.match(/<style[\s>]*>([\s\S]*?)<\/style\s*>/i);
        const styleBody = String(match?.[1] ?? '').trim();
        if (styleBody)
            css = css ? `${css}\n\n${styleBody}` : styleBody;
        return '';
    });
    return { html: html.trim(), css };
}
function toSafeComponentName(pageName) {
    const safeName = pageName.replace(/[^A-Za-z0-9_]/g, '');
    if (!safeName)
        return 'FunnelPage';
    if (/^[A-Z]/.test(safeName))
        return safeName;
    return `${safeName.slice(0, 1).toUpperCase()}${safeName.slice(1)}`;
}
function isLikelyStylesheetContent(raw) {
    const source = raw.trim();
    if (!source)
        return false;
    if (/^@import\s+url\(/i.test(source))
        return true;
    if (/^(?::root|html|body|\.[\w-]+|#[\w-]+)\s*\{/.test(source))
        return true;
    if (/<style[\s>]/i.test(source))
        return true;
    if (/--[\w-]+\s*:\s*[^;]+;/.test(source) &&
        !/(?:export\s+default|function\s+[A-Z]|const\s+[A-Z][\w]*\s*=)/.test(source)) {
        return true;
    }
    return false;
}
function isComponentShapedTsx(raw) {
    if (!/\bexport\s+default\b/.test(raw))
        return false;
    return true;
}
function wrapBareJsxAsComponent(raw, pageName) {
    const source = raw.trim();
    if (!source || !source.startsWith('<'))
        return null;
    if (/\bexport\s+default\b|\bfunction\s+[A-Za-z_]\w*|\bconst\s+[A-Za-z_]\w*\s*=/.test(source)) {
        return null;
    }
    const safeName = toSafeComponentName(pageName);
    return [
        `const ${safeName} = () => {`,
        '  return (',
        '    <>',
        source,
        '    </>',
        '  )',
        '}',
        '',
        `export default ${safeName}`,
    ].join('\n');
}
function ensureDefaultExport(raw) {
    if (/\bexport\s+default\b/.test(raw))
        return raw;
    const constMatch = raw.match(/\bconst\s+([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (constMatch?.[1])
        return `${raw}\n\nexport default ${constMatch[1]}`;
    const fnMatch = raw.match(/\bfunction\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
    if (fnMatch?.[1])
        return `${raw}\n\nexport default ${fnMatch[1]}`;
    return raw;
}
const AMBIENT_REACT_TYPES = `
declare namespace React {
  type ReactNode = any;
  type ReactElement = any;
  type CSSProperties = Record<string, any>;
  type FC<P = {}> = (props: P) => ReactElement | null;
  type PropsWithChildren<P = {}> = P & { children?: ReactNode };
  type MouseEvent<T = Element> = any;
  type ChangeEvent<T = Element> = any;
  type FormEvent<T = Element> = any;
  type KeyboardEvent<T = Element> = any;
  type Ref<T> = any;
  type RefObject<T> = { current: T | null };
  type MutableRefObject<T> = { current: T };
  type Dispatch<A> = (value: A) => void;
  type SetStateAction<S> = S | ((prevState: S) => S);
  function useState<S>(initial: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  function useState<S = undefined>(): [S | undefined, Dispatch<SetStateAction<S | undefined>>];
  function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
  function useMemo<T>(factory: () => T, deps: any[]): T;
  function useRef<T>(initial: T): MutableRefObject<T>;
  function useRef<T>(initial: T | null): RefObject<T>;
  function useRef<T = undefined>(): MutableRefObject<T | undefined>;
  function createElement(type: any, props?: any, ...children: any[]): ReactElement;
  function forwardRef<T, P = {}>(render: (props: P, ref: Ref<T>) => ReactElement | null): FC<P & { ref?: Ref<T> }>;
  function memo<P = {}>(component: FC<P>): FC<P>;
  function Fragment(props: { children?: ReactNode }): ReactElement;
}
declare namespace JSX {
  interface IntrinsicElements { [elemName: string]: any; }
  type Element = React.ReactElement;
}
declare module 'react' { export = React; }
declare module 'lucide-react' { const x: any; export = x; }
declare module 'framer-motion' {
  export const motion: any;
  export const AnimatePresence: any;
  export function useAnimation(): any;
  export function useInView(ref: any, opts?: any): boolean;
  const x: any; export default x;
}
declare module 'animejs' { const x: any; export = x; }
`;
function getTsxSemanticDiagnostics(raw) {
    const ts = getTs();
    const fileName = '/Generated.tsx';
    const ambientName = '/ambient.d.ts';
    const files = {
        [fileName]: raw,
        [ambientName]: AMBIENT_REACT_TYPES,
    };
    const compilerOptions = {
        jsx: ts.JsxEmit.ReactJSX,
        jsxImportSource: 'react',
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2020,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        strict: false,
        noEmit: true,
        skipLibCheck: true,
        allowJs: true,
        esModuleInterop: true,
        isolatedModules: true,
    };
    const host = {
        getSourceFile: (name, languageVersion) => {
            const content = files[name];
            if (content !== undefined)
                return ts.createSourceFile(name, content, languageVersion, true);
            return undefined;
        },
        writeFile: () => { },
        getDefaultLibFileName: () => '/lib.d.ts',
        useCaseSensitiveFileNames: () => true,
        getCanonicalFileName: (f) => f,
        getCurrentDirectory: () => '/',
        getNewLine: () => '\n',
        fileExists: (name) => name in files || name === '/lib.d.ts',
        readFile: (name) => files[name] ?? '',
        getDirectories: () => [],
        resolveModuleNameLiterals: (moduleLiterals, containingFile) => {
            return moduleLiterals.map((literal) => {
                const name = literal.text;
                if (name === 'react' ||
                    name === 'lucide-react' ||
                    name === 'framer-motion' ||
                    name === 'animejs') {
                    return {
                        resolvedModule: {
                            resolvedFileName: ambientName,
                            isExternalLibraryImport: true,
                            extension: ts.Extension.Dts,
                        },
                    };
                }
                return { resolvedModule: undefined };
            });
        },
    };
    const program = ts.createProgram([fileName, ambientName], compilerOptions, host);
    const diagnostics = ts.getPreEmitDiagnostics(program);
    const fatalErrors = [];
    const nonFatalErrors = [];
    for (const diag of diagnostics) {
        if (diag.category !== ts.DiagnosticCategory.Error)
            continue;
        if (diag.file?.fileName === ambientName)
            continue;
        const message = ts.flattenDiagnosticMessageText(diag.messageText, ' ').trim();
        const formatted = diag.file && diag.start !== undefined
            ? (() => {
                const pos = diag.file.getLineAndCharacterOfPosition(diag.start);
                return `line ${pos.line + 1}, col ${pos.character + 1}: ${message}`;
            })()
            : message;
        if (isFatalTsxDiagnostic(diag))
            fatalErrors.push(formatted);
        else
            nonFatalErrors.push(formatted);
    }
    return { fatalErrors, nonFatalErrors };
}
function isFatalTsxDiagnostic(diag) {
    const code = diag.code;
    if (code === 1003 ||
        code === 1005 ||
        code === 1009 ||
        code === 1010 ||
        code === 1011 ||
        code === 1109 ||
        code === 1128 ||
        code === 1136 ||
        code === 1160 ||
        code === 1161 ||
        code === 1381 ||
        code === 1382 ||
        code === 17004) {
        return true;
    }
    const message = getTs().flattenDiagnosticMessageText(diag.messageText, ' ');
    if (/Cannot find name 'exports'/.test(message))
        return false;
    return /Expression expected|Declaration or statement expected|'}' expected/.test(message);
}
function extractMissingNames(errors) {
    const names = new Set();
    for (const error of errors) {
        const match = error.match(/Cannot find name '([A-Za-z0-9_]+)'/);
        if (match?.[1])
            names.add(match[1]);
    }
    return names;
}
function upsertNamedImport(source, moduleName, names) {
    const uniqueNames = [...new Set(names)].sort();
    if (uniqueNames.length === 0)
        return source;
    const escapedModule = moduleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const namedImportRe = new RegExp(`^\\s*import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${escapedModule}['"];?\\s*$`, 'm');
    const defaultPlusNamedImportRe = new RegExp(`^\\s*import\\s+([A-Za-z_$][\\w$]*)\\s*,\\s*\\{([^}]*)\\}\\s*from\\s*['"]${escapedModule}['"];?\\s*$`, 'm');
    const defaultImportRe = new RegExp(`^\\s*import\\s+([A-Za-z_$][\\w$]*)\\s*from\\s*['"]${escapedModule}['"];?\\s*$`, 'm');
    const defaultPlusNamedMatch = source.match(defaultPlusNamedImportRe);
    if (defaultPlusNamedMatch) {
        const defaultImport = defaultPlusNamedMatch[1].trim();
        const existingNamed = defaultPlusNamedMatch[2]
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean)
            .map((part) => part.split(/\s+as\s+/i)[0].trim());
        const merged = [...new Set([...existingNamed, ...uniqueNames])].sort();
        const replacement = `import ${defaultImport}, { ${merged.join(', ')} } from '${moduleName}'`;
        return source.replace(defaultPlusNamedImportRe, replacement);
    }
    const namedMatch = source.match(namedImportRe);
    if (namedMatch) {
        const existingNamed = namedMatch[1]
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean)
            .map((part) => part.split(/\s+as\s+/i)[0].trim());
        const merged = [...new Set([...existingNamed, ...uniqueNames])].sort();
        const replacement = `import { ${merged.join(', ')} } from '${moduleName}'`;
        return source.replace(namedImportRe, replacement);
    }
    const defaultMatch = source.match(defaultImportRe);
    if (defaultMatch) {
        const defaultImport = defaultMatch[1].trim();
        const replacement = `import ${defaultImport}, { ${uniqueNames.join(', ')} } from '${moduleName}'`;
        return source.replace(defaultImportRe, replacement);
    }
    const importStatement = `import { ${uniqueNames.join(', ')} } from '${moduleName}'\n`;
    const lastImportMatch = [...source.matchAll(/^\s*import[^\n]*\n?/gm)].pop();
    if (lastImportMatch?.index !== undefined) {
        const insertAt = lastImportMatch.index + lastImportMatch[0].length;
        return `${source.slice(0, insertAt)}${importStatement}${source.slice(insertAt)}`;
    }
    return `${importStatement}${source}`;
}
function isLikelyLucideIconName(name) {
    if (!/^[A-Z][A-Za-z0-9]*$/.test(name))
        return false;
    if (name.length < 3)
        return false;
    if (name.endsWith('Page') || name.endsWith('Props'))
        return false;
    return true;
}
function stripTypeArtifacts(source) {
    let next = source;
    next = next.replace(/^type\s+[A-Za-z_][A-Za-z0-9_<>,\s=|&?:[\]{}()'"-]*\n/gm, '');
    next = next.replace(/^interface\s+[A-Za-z_][A-Za-z0-9_<>,\s]*\{[\s\S]*?\}\n?/gm, '');
    next = next.replace(/(const\s+[A-Z][A-Za-z0-9_]*)(\s*:\s*(?:React\.)?(?:FC|FunctionComponent)(?:<[^>]*>)?\s*=)/g, '$1 =');
    return next;
}
function mergeMultiLineNamedImports(source) {
    const lines = source.split('\n');
    const lineRe = /^(\s*)import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/;
    const moduleMap = new Map();
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(lineRe);
        if (!m)
            continue;
        const mod = m[3];
        let entry = moduleMap.get(mod);
        if (!entry) {
            entry = { indices: [], names: new Set() };
            moduleMap.set(mod, entry);
        }
        entry.indices.push(i);
        for (const part of m[2].split(',')) {
            const token = part
                .trim()
                .split(/\s+as\s+/)[0]
                ?.trim();
            if (token)
                entry.names.add(token);
        }
    }
    let changed = false;
    for (const [mod, entry] of moduleMap) {
        if (entry.indices.length <= 1)
            continue;
        changed = true;
        const merged = [...entry.names].sort();
        const indent = lines[entry.indices[0]].match(/^(\s*)/)?.[1] ?? '';
        lines[entry.indices[0]] = `${indent}import { ${merged.join(', ')} } from '${mod}'`;
        for (let k = 1; k < entry.indices.length; k++)
            lines[entry.indices[k]] = '';
    }
    if (!changed)
        return source;
    return lines
        .filter((l, i) => {
        for (const entry of moduleMap.values()) {
            if (entry.indices.length > 1 && entry.indices.slice(1).includes(i) && l === '')
                return false;
        }
        return true;
    })
        .join('\n');
}
function dedupeNamedImports(source) {
    return source.replace(/^(\s*import\s*\{)([^}]*)(\}\s*from\s*['"][^'"]+['"];?\s*)$/gm, (_whole, open, body, close) => {
        const merged = [
            ...new Set(body
                .split(',')
                .map((x) => x.trim())
                .filter(Boolean)),
        ].sort();
        return `${open} ${merged.join(', ')} ${close}`;
    });
}
//# sourceMappingURL=funnel-tsx-contract.js.map