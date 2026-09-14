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
export declare const ConversationConnectionEntityTypeSchema: z.ZodEnum<["campaign", "space"]>;
export type ConversationConnectionEntityType = z.infer<typeof ConversationConnectionEntityTypeSchema>;
export declare const AddConversationConnectionSchema: z.ZodObject<{
    entity_type: z.ZodEnum<["campaign", "space"]>;
    entity_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    entity_type: "campaign" | "space";
    entity_id: string;
}, {
    entity_type: "campaign" | "space";
    entity_id: string;
}>;
export type AddConversationConnectionDto = z.infer<typeof AddConversationConnectionSchema>;
export declare const ConversationConnectionParamSchema: z.ZodObject<{
    id: z.ZodString;
    entityType: z.ZodEnum<["campaign", "space"]>;
    entityId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    entityType: "campaign" | "space";
    entityId: string;
}, {
    id: string;
    entityType: "campaign" | "space";
    entityId: string;
}>;
export type ConversationConnectionParam = z.infer<typeof ConversationConnectionParamSchema>;
export declare const UpsertConversationShareSchema: z.ZodObject<{
    entity_type: z.ZodEnum<["user", "org"]>;
    entity_id: z.ZodString;
    level: z.ZodEnum<["view", "edit", "admin"]>;
    notify: z.ZodOptional<z.ZodBoolean>;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    entity_type: "user" | "org";
    entity_id: string;
    level: "view" | "edit" | "admin";
    notify?: boolean | undefined;
    note?: string | undefined;
}, {
    entity_type: "user" | "org";
    entity_id: string;
    level: "view" | "edit" | "admin";
    notify?: boolean | undefined;
    note?: string | undefined;
}>;
export type UpsertConversationShareDto = z.infer<typeof UpsertConversationShareSchema>;
export declare const PassOffConversationShareSchema: z.ZodObject<{
    user_id: z.ZodString;
    level: z.ZodDefault<z.ZodEnum<["view", "edit", "admin"]>>;
    note: z.ZodOptional<z.ZodString>;
    notify: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    level: "view" | "edit" | "admin";
    notify: boolean;
    user_id: string;
    note?: string | undefined;
}, {
    user_id: string;
    level?: "view" | "edit" | "admin" | undefined;
    notify?: boolean | undefined;
    note?: string | undefined;
}>;
export type PassOffConversationShareDto = z.infer<typeof PassOffConversationShareSchema>;
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
