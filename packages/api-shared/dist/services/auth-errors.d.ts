export type AuthErrorCode = 'missing_authorization_header' | 'invalid_authorization_header' | 'token_invalid' | 'token_expired' | 'claims_invalid' | 'auth_provider_unavailable';
export declare abstract class AuthError extends Error {
    readonly code: AuthErrorCode;
    constructor(code: AuthErrorCode, message: string);
}
export declare class AuthInputError extends AuthError {
    constructor(code: Extract<AuthErrorCode, 'missing_authorization_header' | 'invalid_authorization_header'>);
}
export declare class InvalidTokenError extends AuthError {
    constructor(code: Extract<AuthErrorCode, 'token_invalid' | 'token_expired' | 'claims_invalid'>);
}
export declare class AuthUpstreamUnavailableError extends AuthError {
    constructor();
}
