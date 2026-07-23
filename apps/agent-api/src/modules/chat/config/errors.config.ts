export const CHANNEL_CHAT_ERRORS = {
  missingRequiredFields: 'Missing user_id, conversation_id, or content',
  missingAccessToken: 'Missing access_token',
  slackAccessDenied: 'Slack access denied',
  processingFailed: "I couldn't process this message. Try again.",
} as const
