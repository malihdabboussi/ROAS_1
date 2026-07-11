"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthUpstreamUnavailableError = exports.InvalidTokenError = exports.AuthInputError = exports.AuthError = void 0;
class AuthError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.AuthError = AuthError;
class AuthInputError extends AuthError {
    constructor(code) {
        super(code, 'Missing or invalid Authorization header');
    }
}
exports.AuthInputError = AuthInputError;
class InvalidTokenError extends AuthError {
    constructor(code) {
        const message = code === 'token_expired' ? 'Token expired' : 'Invalid token';
        super(code, message);
    }
}
exports.InvalidTokenError = InvalidTokenError;
class AuthUpstreamUnavailableError extends AuthError {
    constructor() {
        super('auth_provider_unavailable', 'Authentication temporarily unavailable');
    }
}
exports.AuthUpstreamUnavailableError = AuthUpstreamUnavailableError;
//# sourceMappingURL=auth-errors.js.map