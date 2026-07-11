"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpsertConversationShareSchema = exports.ConversationIdParamSchema = exports.ConversationShareIdParamSchema = exports.ConversationShareEntityTypeSchema = exports.ConversationShareLevelSchema = void 0;
const zod_1 = require("zod");
exports.ConversationShareLevelSchema = zod_1.z.enum(['view', 'edit', 'admin']);
exports.ConversationShareEntityTypeSchema = zod_1.z.enum(['user', 'org']);
exports.ConversationShareIdParamSchema = zod_1.z.object({ shareId: zod_1.z.string().uuid() });
exports.ConversationIdParamSchema = zod_1.z.object({ id: zod_1.z.string().uuid() });
exports.UpsertConversationShareSchema = zod_1.z.object({
    entity_type: exports.ConversationShareEntityTypeSchema,
    entity_id: zod_1.z.string().uuid(),
    level: exports.ConversationShareLevelSchema,
});
//# sourceMappingURL=conversation-sharing.js.map