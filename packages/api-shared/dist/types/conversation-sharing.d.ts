import { z } from 'zod';
export declare const ConversationShareLevelSchema: z.ZodEnum<["view", "edit", "admin"]>;
export type ConversationShareLevel = z.infer<typeof ConversationShareLevelSchema>;
export declare const ConversationShareEntityTypeSchema: z.ZodEnum<["user", "org"]>;
export type ConversationShareEntityType = z.infer<typeof ConversationShareEntityTypeSchema>;
export declare const ConversationShareIdParamSchema: z.ZodObject<{
    shareId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    shareId: string;
}, {
    shareId: string;
}>;
export type ConversationShareIdParam = z.infer<typeof ConversationShareIdParamSchema>;
export declare const ConversationIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export type ConversationIdParam = z.infer<typeof ConversationIdParamSchema>;
export declare const UpsertConversationShareSchema: z.ZodObject<{
    entity_type: z.ZodEnum<["user", "org"]>;
    entity_id: z.ZodString;
    level: z.ZodEnum<["view", "edit", "admin"]>;
}, "strip", z.ZodTypeAny, {
    entity_type: "user" | "org";
    entity_id: string;
    level: "admin" | "edit" | "view";
}, {
    entity_type: "user" | "org";
    entity_id: string;
    level: "admin" | "edit" | "view";
}>;
export type UpsertConversationShareDto = z.infer<typeof UpsertConversationShareSchema>;
export interface ConversationShareRecord {
    id: string;
    conversation_id: string;
    org_id: string | null;
    entity_type: ConversationShareEntityType;
    entity_id: string;
    level: ConversationShareLevel;
    created_by: string;
    created_at: string;
}
