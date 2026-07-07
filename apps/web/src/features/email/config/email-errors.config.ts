export const EMAIL_ERRORS = {
  ADD_SENDER_IDENTITY_FAILED: {
    userMessage: "Couldn't add this sender email. Please try again.",
  },
  DELETE_SENDER_FAILED: {
    userMessage: "Couldn't delete sender. Try again.",
  },
  SYNC_SENDGRID_FAILED: {
    userMessage: "Couldn't sync from SendGrid. Try again.",
  },
  VERIFY_STATUS_FAILED: {
    userMessage: "Couldn't sync verification status. Try again.",
  },
  ADD_DOMAIN_FAILED: {
    userMessage: "Couldn't add domain. Try again.",
  },
  DELETE_DOMAIN_FAILED: {
    userMessage: "Couldn't delete domain. Try again.",
  },
  DNS_NOT_VERIFIED: {
    userMessage: 'DNS records not yet verified. Check your DNS settings.',
  },
  DNS_SOME_NOT_VERIFIED: {
    userMessage: 'Some DNS records are not yet verified.',
  },
  SET_DEFAULT_DOMAIN_FAILED: {
    userMessage: "Couldn't set default domain. Try again.",
  },
  SET_DEFAULT_SENDER_FAILED: {
    userMessage: "Couldn't set default sender. Try again.",
  },
} as const
