import type { BrainTemporalMetadata, BrainTemporalPayload } from './brain-temporal';
export type BrainTimelineType = 'identity' | 'belief_evolution' | 'perspective_evolution' | 'customer_journey' | 'objection_journey' | 'avatar_evolution' | 'company_decision_history' | 'company_object_history' | 'agent_knowledge_growth' | 'source_history' | 'topic_history' | 'custom';
export type BrainTimelineTargetType = 'brain' | 'user' | 'contact' | 'account' | 'agent' | 'company_object' | 'belief_pattern' | 'perspective' | 'narrative_page' | 'customer_avatar' | 'topic' | 'source' | 'custom';
export type BrainTimelineStatus = 'active' | 'archived';
export type BrainTimelineItemType = 'event' | 'decision' | 'shift' | 'milestone' | 'contradiction' | 'formation' | 'resolution';
export interface BrainTimelineTarget {
    target_type: BrainTimelineTargetType | string;
    target_id?: string | null;
}
export interface BrainTimeline extends BrainTemporalPayload {
    id: string;
    brain_id: string;
    timeline_type: BrainTimelineType | string;
    target_type: BrainTimelineTargetType | string;
    target_id: string | null;
    title: string;
    summary: string | null;
    status: BrainTimelineStatus | string;
    evidence_started_at: string | null;
    evidence_ended_at: string | null;
    metadata: Record<string, unknown>;
    created_by_agent_key: string | null;
    created_at: string;
    updated_at: string;
    temporal?: BrainTemporalMetadata;
    items?: BrainTimelineItem[];
}
export interface BrainTimelineItem extends BrainTemporalPayload {
    id: string;
    timeline_id: string;
    brain_id: string;
    episode_id: string | null;
    item_type: BrainTimelineItemType | string;
    title: string;
    description: string | null;
    importance: number;
    confidence: number;
    source_type: string | null;
    source_id: string | null;
    source_title: string | null;
    related_node_type: string | null;
    related_node_id: string | null;
    evidence_refs: Array<Record<string, unknown>>;
    dedupe_key: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
    temporal?: BrainTemporalMetadata;
}
export interface CreateBrainTimelineInput extends BrainTemporalPayload {
    brain_type: string;
    brain_id?: string;
    timeline_type: BrainTimelineType | string;
    target_type: BrainTimelineTargetType | string;
    target_id?: string | null;
    title: string;
    summary?: string | null;
    status?: BrainTimelineStatus | string;
    metadata?: Record<string, unknown>;
}
export interface UpsertBrainTimelineItemInput extends BrainTemporalPayload {
    item_type: BrainTimelineItemType | string;
    title: string;
    description?: string | null;
    importance?: number;
    confidence?: number;
    source_type?: string | null;
    source_id?: string | null;
    source_title?: string | null;
    related_node_type?: string | null;
    related_node_id?: string | null;
    evidence_refs?: Array<Record<string, unknown>>;
    dedupe_key?: string | null;
    metadata?: Record<string, unknown>;
}
