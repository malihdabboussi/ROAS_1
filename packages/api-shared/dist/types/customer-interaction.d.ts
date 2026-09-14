export declare const INTERACTION_CHANNELS: readonly ["telegram", "widget", "fathom", "fireflies", "read_ai", "meeting"];
export type InteractionChannel = (typeof INTERACTION_CHANNELS)[number];
export declare const INTERACTION_PARTICIPANT_ROLES: readonly ["customer", "team", "unknown"];
export type InteractionParticipantRole = (typeof INTERACTION_PARTICIPANT_ROLES)[number];
export interface InteractionIdentifier {
    kind: string;
    value: string;
}
export interface InteractionParticipant {
    role: InteractionParticipantRole;
    name: string | null;
    identifiers: InteractionIdentifier[];
}
export interface InteractionEnvelopeV1 {
    v: 1;
    channel: InteractionChannel;
    source_id: string;
    title: string;
    window: {
        from: string;
        to: string;
    };
    participants: InteractionParticipant[];
    content: {
        format: 'transcript';
        text: string;
        message_count: number;
    };
}
export declare const CUSTOMER_INTERACTION_ROUTE_EVENT = "customer_interaction_route";
export declare function buildInteractionDedupeKey(brainId: string, sourceId: string, lastUnitId: string): string;
export declare function parseInteractionEnvelope(value: unknown): InteractionEnvelopeV1 | null;
