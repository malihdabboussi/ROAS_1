export type FunnelTsxValidationCode = 'EMPTY' | 'HTML_COMMENTS' | 'MARKDOWN_FENCE' | 'STYLESHEET_CONTENT' | 'NOT_COMPONENT' | 'TSX_PARSE_ERROR';
export interface FunnelTsxValidationResult {
    valid: boolean;
    code?: FunnelTsxValidationCode;
    message?: string;
    errors?: string[];
    warnings?: string[];
}
export interface NormalizeFunnelPageSourceInput {
    generatedHtmlRaw: string;
    generatedCssRaw?: string;
}
export interface NormalizeFunnelPageSourceResult {
    generatedHtml: string;
    generatedCss: string;
    normalizationApplied: string[];
}
export interface RecoverFunnelTsxInput {
    generatedHtml: string;
    generatedCss: string;
    pageName: string;
}
export interface RecoverFunnelTsxResult {
    generatedHtml: string;
    generatedCss: string;
    recoveryApplied: string[];
    validation: FunnelTsxValidationResult;
}
export interface FunnelWriteContractInput {
    generatedHtmlRaw: string;
    generatedCssRaw?: string;
    pageName: string;
    mode: 'add' | 'update';
    previousValidHtml?: string;
}
export interface FunnelWriteContractResult {
    generatedHtml: string;
    generatedCss: string;
    normalizationApplied: string[];
    recoveryApplied: string[];
    usedFallback: boolean;
    usedPreviousValid: boolean;
    initialValidation: FunnelTsxValidationResult;
    finalValidation: FunnelTsxValidationResult;
}
export interface ProgrammaticTsxRepairInput {
    generatedHtml: string;
    errors?: string[];
}
export interface ProgrammaticTsxRepairResult {
    generatedHtml: string;
    appliedFixes: string[];
}
export declare function buildSafeFallbackFunnelTsx(pageName: string): string;
export declare function normalizeFunnelPageSource(input: NormalizeFunnelPageSourceInput): NormalizeFunnelPageSourceResult;
export declare function validateFunnelTsxContract(raw: string): FunnelTsxValidationResult;
export declare function programmaticTsxRepair(input: ProgrammaticTsxRepairInput): ProgrammaticTsxRepairResult;
export declare function recoverFunnelTsx(input: RecoverFunnelTsxInput): RecoverFunnelTsxResult;
export declare function prepareFunnelPageForWrite(input: FunnelWriteContractInput): FunnelWriteContractResult;
