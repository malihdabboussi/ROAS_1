"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHAT_SCOPE_KINDS = void 0;
exports.normalizeChatScopeKind = normalizeChatScopeKind;
exports.normalizeScopeId = normalizeScopeId;
exports.createChatScope = createChatScope;
exports.scopesEqual = scopesEqual;
exports.describeScope = describeScope;
exports.CHAT_SCOPE_KINDS = [
    'personal',
    'campaign',
    'shared_space',
    'channel',
    'mission',
    'unknown',
];
function normalizeChatScopeKind(value) {
    return exports.CHAT_SCOPE_KINDS.includes(value) ? value : 'unknown';
}
function normalizeScopeId(value) {
    if (typeof value !== 'string')
        return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}
function createChatScope(input) {
    return {
        space_id: normalizeScopeId(input.space_id),
        campaign_id: normalizeScopeId(input.campaign_id),
        scope_kind: normalizeChatScopeKind(input.scope_kind),
        org_id: normalizeScopeId(input.org_id),
    };
}
function scopesEqual(a, b) {
    if (!a || !b)
        return false;
    return a.space_id === b.space_id && a.campaign_id === b.campaign_id && a.org_id === b.org_id;
}
function describeScope(scope) {
    const label = scope.scope_kind === 'personal'
        ? 'personal space'
        : scope.scope_kind === 'campaign'
            ? 'campaign space'
            : scope.scope_kind === 'shared_space'
                ? 'shared space'
                : scope.scope_kind;
    return `${label} (space_id=${scope.space_id ?? 'none'}, campaign_id=${scope.campaign_id ?? 'none'})`;
}
//# sourceMappingURL=chat-scope.js.map