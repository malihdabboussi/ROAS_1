"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const project_session_key_1 = require("./project-session-key");
(0, vitest_1.describe)('project session keys', () => {
    (0, vitest_1.it)('derives different runtime keys for different projects from the same root secret', () => {
        const projectOneKey = (0, project_session_key_1.deriveProjectSessionKey)('project-1', 'root-secret');
        const projectTwoKey = (0, project_session_key_1.deriveProjectSessionKey)('project-2', 'root-secret');
        (0, vitest_1.expect)(projectOneKey).toMatch(/^vps_/);
        (0, vitest_1.expect)(projectTwoKey).toMatch(/^vps_/);
        (0, vitest_1.expect)(projectOneKey).not.toBe(projectTwoKey);
        (0, vitest_1.expect)(projectOneKey).not.toBe('root-secret');
    });
    (0, vitest_1.it)('only verifies the key for the project it was derived for', () => {
        const projectOneKey = (0, project_session_key_1.deriveProjectSessionKey)('project-1', 'root-secret');
        (0, vitest_1.expect)((0, project_session_key_1.verifyProjectSessionKey)('project-1', projectOneKey, 'root-secret')).toBe(true);
        (0, vitest_1.expect)((0, project_session_key_1.verifyProjectSessionKey)('project-2', projectOneKey, 'root-secret')).toBe(false);
        (0, vitest_1.expect)((0, project_session_key_1.verifyProjectSessionKey)('project-1', 'root-secret', 'root-secret')).toBe(false);
    });
    (0, vitest_1.it)('rejects missing inputs instead of producing a reusable global key', () => {
        (0, vitest_1.expect)((0, project_session_key_1.deriveProjectSessionKey)('', 'root-secret')).toBe('');
        (0, vitest_1.expect)((0, project_session_key_1.deriveProjectSessionKey)('project-1', '')).toBe('');
        (0, vitest_1.expect)((0, project_session_key_1.verifyProjectSessionKey)('project-1', undefined, 'root-secret')).toBe(false);
    });
});
//# sourceMappingURL=project-session-key.test.js.map