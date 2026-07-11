"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BRAIN_RETRIEVAL_TIME_MODES = exports.BRAIN_TEMPORAL_STATUSES = void 0;
exports.normalizeIsoDate = normalizeIsoDate;
exports.normalizeTemporalPayload = normalizeTemporalPayload;
exports.temporalInsertFields = temporalInsertFields;
exports.temporalCandidateMetadata = temporalCandidateMetadata;
exports.temporalLabel = temporalLabel;
exports.BRAIN_TEMPORAL_STATUSES = [
    'current',
    'historical',
    'superseded',
    'contradicted',
    'expired',
];
exports.BRAIN_RETRIEVAL_TIME_MODES = [
    'default',
    'as_of',
    'timeline',
    'evolution',
];
const TEMPORAL_INPUT_ALIASES = {
    episode_id: ['episode_id', 'episodeId'],
    occurred_at: ['occurred_at', 'occurredAt', 'source_occurred_at', 'sourceOccurredAt'],
    occurred_until: [
        'occurred_until',
        'occurredUntil',
        'source_occurred_until',
        'sourceOccurredUntil',
    ],
    asserted_at: ['asserted_at', 'assertedAt'],
    valid_from: ['valid_from', 'validFrom'],
    valid_until: ['valid_until', 'validUntil'],
    temporal_status: ['temporal_status', 'temporalStatus'],
    temporal_confidence: ['temporal_confidence', 'temporalConfidence'],
    temporal_source: ['temporal_source', 'temporalSource'],
    effective_from: ['effective_from', 'effectiveFrom'],
    effective_until: ['effective_until', 'effectiveUntil'],
    evidence_started_at: ['evidence_started_at', 'evidenceStartedAt'],
    evidence_ended_at: ['evidence_ended_at', 'evidenceEndedAt'],
};
function normalizeIsoDate(value) {
    if (value instanceof Date) {
        const time = value.getTime();
        return Number.isFinite(time) ? value.toISOString() : null;
    }
    if (typeof value !== 'string' && typeof value !== 'number')
        return null;
    const raw = String(value).trim();
    if (!raw)
        return null;
    const time = Date.parse(raw);
    if (!Number.isFinite(time))
        return null;
    return new Date(time).toISOString();
}
function normalizeTemporalPayload(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input))
        return {};
    const record = input;
    const result = {};
    for (const key of ['episode_id', 'temporal_status', 'temporal_source']) {
        const raw = firstDefined(record, TEMPORAL_INPUT_ALIASES[key]);
        if (raw === undefined || raw === null)
            continue;
        const value = String(raw).trim();
        if (value)
            result[key] = value;
    }
    for (const key of [
        'occurred_at',
        'occurred_until',
        'asserted_at',
        'valid_from',
        'valid_until',
        'effective_from',
        'effective_until',
        'evidence_started_at',
        'evidence_ended_at',
    ]) {
        const value = normalizeIsoDate(firstDefined(record, TEMPORAL_INPUT_ALIASES[key]));
        if (value)
            result[key] = value;
    }
    const confidence = Number(firstDefined(record, TEMPORAL_INPUT_ALIASES.temporal_confidence));
    if (Number.isFinite(confidence)) {
        result.temporal_confidence = Math.max(0, Math.min(1, confidence));
    }
    if (!result.temporal_status && (result.valid_until || result.occurred_until)) {
        result.temporal_status = 'historical';
    }
    return result;
}
function temporalInsertFields(input) {
    const temporal = normalizeTemporalPayload(input);
    const fields = {};
    for (const [key, value] of Object.entries(temporal)) {
        if (value !== undefined)
            fields[key] = value;
    }
    return fields;
}
function temporalCandidateMetadata(row) {
    const occurredAt = normalizeIsoDate(row.occurred_at ?? row.evidence_started_at);
    const occurredUntil = normalizeIsoDate(row.occurred_until ?? row.evidence_ended_at);
    const validFrom = normalizeIsoDate(row.valid_from ?? row.effective_from);
    const validUntil = normalizeIsoDate(row.valid_until ?? row.effective_until);
    const temporalStatus = typeof row.temporal_status === 'string' && row.temporal_status.trim()
        ? row.temporal_status.trim()
        : null;
    return {
        episode_id: typeof row.episode_id === 'string' ? row.episode_id : null,
        occurred_at: occurredAt,
        occurred_until: occurredUntil,
        asserted_at: normalizeIsoDate(row.asserted_at),
        valid_from: validFrom,
        valid_until: validUntil,
        temporal_status: temporalStatus,
        temporal_confidence: typeof row.temporal_confidence === 'number' ? row.temporal_confidence : null,
        temporal_source: typeof row.temporal_source === 'string' && row.temporal_source.trim()
            ? row.temporal_source.trim()
            : null,
        temporal_label: temporalLabel({
            occurred_at: occurredAt,
            occurred_until: occurredUntil,
            valid_from: validFrom,
            valid_until: validUntil,
            temporal_status: temporalStatus,
        }),
    };
}
function temporalLabel(input) {
    const occurredAt = normalizeIsoDate(input.occurred_at);
    const occurredUntil = normalizeIsoDate(input.occurred_until);
    const validFrom = normalizeIsoDate(input.valid_from ?? input.effective_from);
    const validUntil = normalizeIsoDate(input.valid_until ?? input.effective_until);
    if (occurredAt && occurredUntil && occurredAt !== occurredUntil) {
        return `Happened ${formatDateLabel(occurredAt)}-${formatDateLabel(occurredUntil)}`;
    }
    if (occurredAt)
        return `Happened ${formatDateLabel(occurredAt)}`;
    if (validFrom || validUntil) {
        return `Valid ${validFrom ? formatDateLabel(validFrom) : 'unknown'}-${validUntil ? formatDateLabel(validUntil) : 'open'}`;
    }
    return input.temporal_status ? String(input.temporal_status) : 'Time unknown';
}
function formatDateLabel(value) {
    return value.slice(0, 10);
}
function firstDefined(record, keys) {
    for (const key of keys) {
        if (record[key] !== undefined)
            return record[key];
    }
    return undefined;
}
//# sourceMappingURL=brain-temporal.js.map