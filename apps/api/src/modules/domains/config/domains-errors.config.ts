/**
 * Domains Error Configuration
 * Ported from legacy: apps/app-backend/src/modules/domains/config/domains-errors.config.ts
 */

export interface DomainsErrorConfig {
  code: string
  userMessage: string
  logMessage: string
  severity: 'info' | 'warn' | 'error' | 'critical'
  retryable: boolean
  httpStatus: number
}

export const DOMAINS_ERRORS: Record<string, DomainsErrorConfig> = {
  // Database
  DB_QUERY_FAILED: {
    code: 'DB_QUERY_FAILED',
    userMessage: "Couldn't load that. Try again?",
    logMessage: 'Database query failed during domains operation',
    severity: 'error',
    retryable: true,
    httpStatus: 500,
  },
  DB_INSERT_FAILED: {
    code: 'DB_INSERT_FAILED',
    userMessage: "Couldn't save that. Try again?",
    logMessage: 'Database insert operation failed',
    severity: 'error',
    retryable: true,
    httpStatus: 500,
  },
  DB_UPDATE_FAILED: {
    code: 'DB_UPDATE_FAILED',
    userMessage: "Couldn't update that. Try again?",
    logMessage: 'Database update operation failed',
    severity: 'error',
    retryable: true,
    httpStatus: 500,
  },
  DB_DELETE_FAILED: {
    code: 'DB_DELETE_FAILED',
    userMessage: "Couldn't delete that. Try again?",
    logMessage: 'Database delete operation failed',
    severity: 'error',
    retryable: true,
    httpStatus: 500,
  },

  // Domain operations
  LOAD_DOMAINS_FAILED: {
    code: 'LOAD_DOMAINS_FAILED',
    userMessage: "Couldn't load domains. Try again?",
    logMessage: 'Failed to fetch user domains',
    severity: 'error',
    retryable: true,
    httpStatus: 500,
  },
  ADD_DOMAIN_FAILED: {
    code: 'ADD_DOMAIN_FAILED',
    userMessage: "Couldn't add domain. Try again?",
    logMessage: 'Failed to add domain',
    severity: 'error',
    retryable: true,
    httpStatus: 500,
  },
  DOMAIN_ALREADY_EXISTS: {
    code: 'DOMAIN_ALREADY_EXISTS',
    userMessage: 'You already have this domain... refresh to see it.',
    logMessage: 'Attempted to add duplicate domain',
    severity: 'info',
    retryable: false,
    httpStatus: 409,
  },
  DOMAIN_CHECK_FAILED: {
    code: 'DOMAIN_CHECK_FAILED',
    userMessage: "Couldn't check if domain exists. Try again?",
    logMessage: 'Failed to check domain availability',
    severity: 'error',
    retryable: true,
    httpStatus: 500,
  },
  DOMAIN_NOT_FOUND: {
    code: 'DOMAIN_NOT_FOUND',
    userMessage: "Can't find that domain... refresh and try again?",
    logMessage: 'Domain not found in database',
    severity: 'warn',
    retryable: false,
    httpStatus: 404,
  },
  SUBDOMAIN_ALREADY_EXISTS: {
    code: 'SUBDOMAIN_ALREADY_EXISTS',
    userMessage: 'You already have a generated subdomain for this environment',
    logMessage: 'User already has generated subdomain',
    severity: 'info',
    retryable: false,
    httpStatus: 400,
  },

  // Verification
  VERIFY_FAILED: {
    code: 'VERIFY_FAILED',
    userMessage: "Couldn't verify that. Try again?",
    logMessage: 'Domain verification failed',
    severity: 'error',
    retryable: true,
    httpStatus: 500,
  },
  UPDATE_STATUS_FAILED: {
    code: 'UPDATE_STATUS_FAILED',
    userMessage: "Couldn't update status. Try again?",
    logMessage: 'Failed to update domain verification status',
    severity: 'error',
    retryable: true,
    httpStatus: 500,
  },

  // Connection
  CONNECT_DOMAIN_FAILED: {
    code: 'CONNECT_DOMAIN_FAILED',
    userMessage: "Couldn't connect domain. Try again?",
    logMessage: 'Failed to connect domain to funnel',
    severity: 'error',
    retryable: true,
    httpStatus: 500,
  },
  FUNNEL_NOT_FOUND: {
    code: 'FUNNEL_NOT_FOUND',
    userMessage: "Can't find that funnel... refresh and try again?",
    logMessage: 'Funnel not found in database',
    severity: 'warn',
    retryable: false,
    httpStatus: 404,
  },
  GENERATED_DOMAIN_NOT_FOUND: {
    code: 'GENERATED_DOMAIN_NOT_FOUND',
    userMessage: "Can't find your generated subdomain... publish a funnel first, then try again.",
    logMessage: 'Generated subdomain not found for user',
    severity: 'warn',
    retryable: false,
    httpStatus: 404,
  },
  LEAD_MAGNET_NOT_FOUND: {
    code: 'LEAD_MAGNET_NOT_FOUND',
    userMessage: "Can't find that lead magnet... refresh and try again?",
    logMessage: 'Lead magnet not found in database',
    severity: 'warn',
    retryable: false,
    httpStatus: 404,
  },
  PROJECT_NOT_FOUND: {
    code: 'PROJECT_NOT_FOUND',
    userMessage: "Can't find that project... refresh and try again?",
    logMessage: 'Project not found in database',
    severity: 'warn',
    retryable: false,
    httpStatus: 404,
  },
  LANDING_PAGE_NOT_FOUND: {
    code: 'LANDING_PAGE_NOT_FOUND',
    userMessage: "Can't find that landing page... refresh and try again?",
    logMessage: 'Landing page not found in database',
    severity: 'warn',
    retryable: false,
    httpStatus: 404,
  },
  DOMAIN_STILL_CONNECTED: {
    code: 'DOMAIN_STILL_CONNECTED',
    userMessage: 'Disconnect the domain from its funnel before deleting',
    logMessage: 'Attempted to delete domain still connected to funnel',
    severity: 'warn',
    retryable: false,
    httpStatus: 400,
  },
  GENERATED_DOMAIN_PROTECTED: {
    code: 'GENERATED_DOMAIN_PROTECTED',
    userMessage: 'Base generated domain cannot be deleted',
    logMessage: 'Attempted to delete generated base domain',
    severity: 'warn',
    retryable: false,
    httpStatus: 400,
  },

  // External APIs
  VERCEL_API_ERROR: {
    code: 'VERCEL_API_ERROR',
    userMessage: 'Domain provider hiccup. Give it a sec, then try again.',
    logMessage: 'Vercel API call failed or returned error',
    severity: 'error',
    retryable: true,
    httpStatus: 503,
  },

  // Generic
  UNKNOWN_ERROR: {
    code: 'UNKNOWN_ERROR',
    userMessage: 'Something unexpected happened. Try again?',
    logMessage: 'Unhandled error in domains feature',
    severity: 'critical',
    retryable: true,
    httpStatus: 500,
  },
} as const

export type DomainsErrorCode = keyof typeof DOMAINS_ERRORS
