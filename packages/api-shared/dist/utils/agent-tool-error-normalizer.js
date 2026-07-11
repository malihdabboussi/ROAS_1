"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeAgentToolFailureFields = normalizeAgentToolFailureFields;
const MAX_FIELD_LENGTH = 240;
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function truncateText(value) {
    const normalized = value.replace(/\s+/g, ' ').trim();
    return normalized.length > MAX_FIELD_LENGTH
        ? `${normalized.slice(0, MAX_FIELD_LENGTH - 1)}…`
        : normalized;
}
function readString(record, key) {
    const value = record[key];
    return typeof value === 'string' && value.trim().length > 0 ? truncateText(value) : undefined;
}
function readRetryPolicy(value) {
    if (typeof value === 'string' && value.trim().length > 0)
        return truncateText(value);
    if (!isRecord(value))
        return undefined;
    return readString(value, 'mode') ?? readString(value, 'reason');
}
function readObservability(value) {
    if (!isRecord(value))
        return undefined;
    const fingerprint = readString(value, 'fingerprint');
    const reportLevel = readString(value, 'report_level');
    if (!fingerprint && !reportLevel)
        return undefined;
    return {
        ...(fingerprint ? { fingerprint } : {}),
        ...(reportLevel ? { report_level: reportLevel } : {}),
    };
}
function extractJsonTextEnvelope(value) {
    if (!isRecord(value) || !Array.isArray(value.content))
        return null;
    for (const entry of value.content) {
        if (!isRecord(entry) || entry.type !== 'text' || typeof entry.text !== 'string')
            continue;
        try {
            const parsed = JSON.parse(entry.text);
            if (isRecord(parsed))
                return parsed;
        }
        catch {
            continue;
        }
    }
    return null;
}
function candidateRecords(value) {
    if (!isRecord(value))
        return [];
    const records = [value];
    if (isRecord(value.details))
        records.unshift(value.details);
    if (isRecord(value.result))
        records.push(value.result);
    if (isRecord(value.data))
        records.push(value.data);
    const envelope = extractJsonTextEnvelope(value);
    if (envelope) {
        records.unshift(envelope);
        if (isRecord(envelope.details))
            records.unshift(envelope.details);
    }
    return records;
}
function looksLikeToolError(record) {
    return (typeof record.error_code === 'string' ||
        typeof record.error_class === 'string' ||
        typeof record.effect_state === 'string' ||
        typeof record.retry_policy === 'string' ||
        isRecord(record.retry_policy) ||
        typeof record.workflow_class === 'string' ||
        isRecord(record.observability));
}
function normalizeAgentToolFailureFields(value) {
    const fields = {};
    for (const record of candidateRecords(value)) {
        if (!looksLikeToolError(record))
            continue;
        fields.error_code ??= readString(record, 'error_code');
        fields.error_class ??= readString(record, 'error_class');
        fields.workflow_class ??= readString(record, 'workflow_class');
        fields.effect_state ??= readString(record, 'effect_state');
        fields.retry_policy ??= readRetryPolicy(record.retry_policy);
        fields.observability ??= readObservability(record.observability);
        fields.reliability ??= readString(record, 'reliability');
        const userExplanation = isRecord(record.user_explanation) ? record.user_explanation : null;
        fields.user_explanation ??=
            (userExplanation ? readString(userExplanation, 'sentence') : undefined) ??
                readString(record, 'user_explanation');
        fields.message ??= readString(record, 'message');
        fields.error ??= readString(record, 'error');
    }
    return fields;
}
//# sourceMappingURL=agent-tool-error-normalizer.js.map