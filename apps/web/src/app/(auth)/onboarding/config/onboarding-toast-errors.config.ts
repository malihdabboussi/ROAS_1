/** User-facing toast messages for onboarding errors */
export const ONBOARDING_TOAST_ERRORS = {
  PROVISION_FAILED: { userMessage: "Couldn't start your workspace. Try again." },
  ANIMATION_SEEN_FAILED: { userMessage: "Couldn't save progress. Try again." },
  PROFILE_SAVE_FAILED: { userMessage: "Couldn't save your onboarding answers. Try again." },
  PORTRAIT_GENERATION_FAILED: { userMessage: "Couldn't generate portrait. Try again." },
} as const
