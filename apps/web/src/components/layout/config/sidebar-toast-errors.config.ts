/** User-facing toast messages for sidebar/campaign operations */
export const SIDEBAR_TOAST_ERRORS = {
  LOAD_CAMPAIGNS_FAILED: { userMessage: "Couldn't load campaigns. Try again." },
  PIN_CAMPAIGN_FAILED: { userMessage: "Couldn't pin campaign. Try again." },
  DELETE_CAMPAIGN_FAILED: { userMessage: "Couldn't delete campaign. Try again." },
  SAVE_CAMPAIGN_FAILED: { userMessage: "Couldn't save campaign. Try again." },
  DEFAULT_ACCOUNT_SAVE_FAILED: { userMessage: "Couldn't save the default account. Try again." },
} as const
