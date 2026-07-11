export declare const CHAT_SCOPE_KINDS: readonly ["personal", "campaign", "shared_space", "channel", "mission", "unknown"];
export type ChatScopeKind = (typeof CHAT_SCOPE_KINDS)[number];
export interface ChatScope {
    space_id: string | null;
    campaign_id: string | null;
    scope_kind: ChatScopeKind;
    org_id: string | null;
}
export declare function normalizeChatScopeKind(value: unknown): ChatScopeKind;
export declare function normalizeScopeId(value: unknown): string | null;
export declare function createChatScope(input: {
    space_id?: unknown;
    campaign_id?: unknown;
    scope_kind?: unknown;
    org_id?: unknown;
}): ChatScope;
export declare function scopesEqual(a: ChatScope | null | undefined, b: ChatScope | null | undefined): boolean;
export declare function describeScope(scope: ChatScope): string;
