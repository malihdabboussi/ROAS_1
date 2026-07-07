/** User-facing toast messages for custom domains errors */
export const DOMAINS_TOAST_ERRORS = {
  ADD_DOMAIN_FAILED: {
    userMessage: "Couldn't add domain. Try again.",
  },
  DELETE_DOMAIN_FAILED: {
    userMessage: "Couldn't delete domain. Try again.",
  },
  LOAD_DNS_FAILED: {
    userMessage: "Couldn't load DNS records. Try again.",
  },
  VERIFICATION_FAILED: {
    userMessage: 'Verification failed. Try again.',
  },
  DNS_NOT_VERIFIED: {
    userMessage: 'DNS not verified yet. Check your DNS settings and try again.',
  },
  COPY_FAILED: {
    userMessage: "Couldn't copy. Try again.",
  },
} as const

/** User-facing toast messages for domains success */
export const DOMAINS_TOAST_SUCCESS = {
  DOMAIN_ADDED: {
    userMessage: 'Domain added. Configure DNS to verify.',
  },
  DOMAIN_REMOVED: {
    userMessage: 'Domain removed.',
  },
  DOMAIN_VERIFIED: {
    userMessage: 'Domain verified successfully!',
  },
  COPIED: {
    userMessage: 'Copied to clipboard.',
  },
} as const
