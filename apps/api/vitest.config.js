"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const unplugin_swc_1 = __importDefault(require("unplugin-swc"));
const config_1 = require("vitest/config");
exports.default = (0, config_1.defineConfig)({
    test: {
        root: path_1.default.resolve(__dirname),
        include: ['src/**/*.test.ts'],
        environment: 'node',
        setupFiles: ['src/test/setup.ts'],
        globals: true,
    },
    plugins: [
        unplugin_swc_1.default.vite({
            module: { type: 'es6' },
        }),
    ],
    resolve: {
        alias: {
            '@': path_1.default.resolve(__dirname, 'src'),
            '@vibey/api-shared': path_1.default.resolve(__dirname, '../../packages/api-shared/src/index.ts'),
            '@vibey/agent-policy': path_1.default.resolve(__dirname, '../../packages/agent-policy/src'),
        },
    },
});
//# sourceMappingURL=vitest.config.js.map