"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORG_ROLE_RESOURCE_BASELINE = exports.RESOURCE_SHARE_LEVEL_WEIGHT = exports.ResourceShareLevelSchema = void 0;
exports.maxResourceShareLevel = maxResourceShareLevel;
exports.meetsResourceShareLevel = meetsResourceShareLevel;
exports.baselineFromOrgRole = baselineFromOrgRole;
const zod_1 = require("zod");
exports.ResourceShareLevelSchema = zod_1.z.enum(['admin', 'edit', 'view']);
exports.RESOURCE_SHARE_LEVEL_WEIGHT = {
    admin: 3,
    edit: 2,
    view: 1,
};
exports.ORG_ROLE_RESOURCE_BASELINE = {
    owner: 'admin',
    admin: 'admin',
    creator: 'edit',
    editor: 'edit',
    viewer: 'view',
};
function maxResourceShareLevel(levels) {
    const cleaned = levels.filter((level) => Boolean(level));
    if (cleaned.length === 0)
        return null;
    return cleaned.sort((a, b) => exports.RESOURCE_SHARE_LEVEL_WEIGHT[b] - exports.RESOURCE_SHARE_LEVEL_WEIGHT[a])[0];
}
function meetsResourceShareLevel(actual, required) {
    if (!actual)
        return false;
    return exports.RESOURCE_SHARE_LEVEL_WEIGHT[actual] >= exports.RESOURCE_SHARE_LEVEL_WEIGHT[required];
}
function baselineFromOrgRole(orgRole) {
    if (!orgRole)
        return null;
    return exports.ORG_ROLE_RESOURCE_BASELINE[orgRole];
}
//# sourceMappingURL=resource-share-level.js.map