export const CHANNEL_CHAT_ERRORS = {
  missingRequiredFields: 'Missing user_id, conversation_id, or content',
  missingAccessToken: 'Missing access_token',
  slackAccessDenied: 'Slack access denied',
  providerBusy:
    "Pixel is temporarily busy. I retried your message, but I still couldn't get a response. Please try again in a moment.",
  processingFailed: "I couldn't process this message. Try again.",
} as const
