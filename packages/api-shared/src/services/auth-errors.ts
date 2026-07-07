export type AuthErrorCode =
  | 'missing_authorization_header'
  | 'invalid_authorization_header'
  | 'token_invalid'
  | 'token_expired'
  | 'claims_invalid'
  | 'auth_provider_unavailable'

export abstract class AuthError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    message: string,
  ) {
    super(message)
  }
}

export class AuthInputError extends AuthError {
  constructor(
    code: Extract<AuthErrorCode, 'missing_authorization_header' | 'invalid_authorization_header'>,
  ) {
    super(code, 'Missing or invalid Authorization header')
  }
}

export class InvalidTokenError extends AuthError {
  constructor(code: Extract<AuthErrorCode, 'token_invalid' | 'token_expired' | 'claims_invalid'>) {
    const message = code === 'token_expired' ? 'Token expired' : 'Invalid token'
    super(code, message)
  }
}

export class AuthUpstreamUnavailableError extends AuthError {
  constructor() {
    super('auth_provider_unavailable', 'Authentication temporarily unavailable')
  }
}
