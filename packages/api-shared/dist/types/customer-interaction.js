"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CUSTOMER_INTERACTION_ROUTE_EVENT = exports.INTERACTION_PARTICIPANT_ROLES = exports.INTERACTION_CHANNELS = void 0;
exports.buildInteractionDedupeKey = buildInteractionDedupeKey;
exports.parseInteractionEnvelope = parseInteractionEnvelope;
exports.INTERACTION_CHANNELS = [
    'telegram',
    'widget',
    'fathom',
    'fireflies',
    'read_ai',
    'meeting',
];
exports.INTERACTION_PARTICIPANT_ROLES = ['customer', 'team', 'unknown'];
exports.CUSTOMER_INTERACTION_ROUTE_EVENT = 'customer_interaction_route';
function buildInteractionDedupeKey(brainId, sourceId, lastUnitId) {
    return `interaction-${brainId}-${sourceId}-${lastUnitId}`;
}
function isNonEmptyString(value) {
    return typeof value === 'string' && value.length > 0;
}
function parseIdentifier(value) {
    if (!value || typeof value !== 'object')
        return null;
    const candidate = value;
    if (!isNonEmptyString(candidate.kind) || !isNonEmptyString(candidate.value))
        return null;
    return { kind: candidate.kind, value: candidate.value };
}
function parseParticipant(value) {
    if (!value || typeof value !== 'object')
        return null;
    const candidate = value;
    if (!exports.INTERACTION_PARTICIPANT_ROLES.includes(candidate.role) ||
        !Array.isArray(candidate.identifiers)) {
        return null;
    }
    const identifiers = candidate.identifiers.map(parseIdentifier);
    if (identifiers.some((identifier) => identifier === null))
        return null;
    return {
        role: candidate.role,
        name: typeof candidate.name === 'string' && candidate.name ? candidate.name : null,
        identifiers: identifiers,
    };
}
function parseInteractionEnvelope(value) {
    if (!value || typeof value !== 'object')
        return null;
    const candidate = value;
    if (candidate.v !== 1)
        return null;
    if (!exports.INTERACTION_CHANNELS.includes(candidate.channel))
        return null;
    if (!isNonEmptyString(candidate.source_id) || !isNonEmptyString(candidate.title))
        return null;
    const window = candidate.window;
    if (!window || !isNonEmptyString(window.from) || !isNonEmptyString(window.to))
        return null;
    if (!Array.isArray(candidate.participants))
        return null;
    const participants = candidate.participants.map(parseParticipant);
    if (participants.some((participant) => participant === null))
        return null;
    const content = candidate.content;
    if (!content ||
        content.format !== 'transcript' ||
        typeof content.text !== 'string' ||
        typeof content.message_count !== 'number') {
        return null;
    }
    return {
        v: 1,
        channel: candidate.channel,
        source_id: candidate.source_id,
        title: candidate.title,
        window: { from: window.from, to: window.to },
        participants: participants,
        content: {
            format: 'transcript',
            text: content.text,
            message_count: content.message_count,
        },
    };
}
//# sourceMappingURL=customer-interaction.js.map