"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModalApp = getModalApp;
exports.getModalSandboxClient = getModalSandboxClient;
exports.getModalImageBuilder = getModalImageBuilder;
let _client = null;
let _appPromise = null;
function getModalClient() {
    if (!_client) {
        const tokenId = process.env.MODAL_TOKEN_ID;
        const tokenSecret = process.env.MODAL_TOKEN_SECRET;
        if (!tokenId || !tokenSecret) {
            throw new Error('MODAL_TOKEN_ID and MODAL_TOKEN_SECRET must be set');
        }
        const { ModalClient: MC } = require('modal');
        _client = new MC({ tokenId, tokenSecret });
    }
    return _client;
}
function getModalApp() {
    if (_appPromise === null) {
        const appName = process.env.MODAL_APP_NAME || 'vibey-spaces-staging';
        const client = getModalClient();
        _appPromise = client.apps.fromName(appName, { createIfMissing: true });
    }
    return _appPromise;
}
function getModalSandboxClient() {
    return getModalClient();
}
function getModalImageBuilder() {
    return getModalClient().images;
}
//# sourceMappingURL=modal-sandbox-client.js.map