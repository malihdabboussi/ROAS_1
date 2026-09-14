"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PassOffConversationShareSchema = exports.UpsertConversationShareSchema = exports.ConversationConnectionParamSchema = exports.AddConversationConnectionSchema = exports.ConversationConnectionEntityTypeSchema = exports.ConversationIdParamSchema = exports.ConversationShareIdParamSchema = exports.ConversationShareEntityTypeSchema = exports.ConversationShareLevelSchema = void 0;
const zod_1 = require("zod");
exports.ConversationShareLevelSchema = zod_1.z.enum(['view', 'edit', 'admin']);
exports.ConversationShareEntityTypeSchema = zod_1.z.enum(['user', 'org']);
exports.ConversationShareIdParamSchema = zod_1.z.object({ shareId: zod_1.z.string().uuid() });
exports.ConversationIdParamSchema = zod_1.z.object({ id: zod_1.z.string().uuid() });
exports.ConversationConnectionEntityTypeSchema = zod_1.z.enum(['campaign', 'space']);
exports.AddConversationConnectionSchema = zod_1.z.object({
    entity_type: exports.ConversationConnectionEntityTypeSchema,
    entity_id: zod_1.z.string().uuid(),
});
exports.ConversationConnectionParamSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    entityType: exports.ConversationConnectionEntityTypeSchema,
    entityId: zod_1.z.string().uuid(),
});
exports.UpsertConversationShareSchema = zod_1.z.object({
    entity_type: exports.ConversationShareEntityTypeSchema,
    entity_id: zod_1.z.string().uuid(),
    level: exports.ConversationShareLevelSchema,
    notify: zod_1.z.boolean().optional(),
    note: zod_1.z.string().max(500).optional(),
});
exports.PassOffConversationShareSchema = zod_1.z.object({
    user_id: zod_1.z.string().uuid(),
    level: exports.ConversationShareLevelSchema.default('edit'),
    note: zod_1.z.string().max(500).optional(),
    notify: zod_1.z.boolean().default(true),
});
//# sourceMappingURL=conversation-sharing.js.map