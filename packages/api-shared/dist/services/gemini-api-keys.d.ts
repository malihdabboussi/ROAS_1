export type GeminiEnvReader = (key: string) => string | undefined;
export declare const GEMINI_API_KEY_FALLBACK_ENV_KEYS: readonly ["GEMINI_API_KEY_FALLBACK", "GEMINI_API_KEY_FALLBACK_2"];
export declare function resolveGeminiApiKeys(read: GeminiEnvReader): string[];
export declare function shouldTryNextGeminiApiKey(status: number): boolean;
