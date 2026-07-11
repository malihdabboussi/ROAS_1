"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveProjectSessionKey = deriveProjectSessionKey;
exports.verifyProjectSessionKey = verifyProjectSessionKey;
const node_crypto_1 = require("node:crypto");
const PROJECT_SESSION_KEY_PREFIX = 'vps_';
function deriveProjectSessionKey(projectId, rootSecret) {
    const normalizedProjectId = projectId.trim();
    const secret = rootSecret?.trim() ?? '';
    if (!normalizedProjectId || !secret)
        return '';
    const digest = (0, node_crypto_1.createHmac)('sha256', secret).update(normalizedProjectId).digest('base64url');
    return `${PROJECT_SESSION_KEY_PREFIX}${digest}`;
}
function verifyProjectSessionKey(projectId, sessionKey, rootSecret) {
    const expected = deriveProjectSessionKey(projectId, rootSecret);
    const candidate = sessionKey?.trim() ?? '';
    if (!expected || !candidate)
        return false;
    const expectedBuffer = Buffer.from(expected);
    const candidateBuffer = Buffer.from(candidate);
    return (expectedBuffer.length === candidateBuffer.length &&
        (0, node_crypto_1.timingSafeEqual)(expectedBuffer, candidateBuffer));
}
//# sourceMappingURL=project-session-key.js.map