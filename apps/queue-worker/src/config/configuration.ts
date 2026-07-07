export default () => ({
  port: parseInt(process.env.PORT || '3004', 10),

  redis: {
    url: process.env.REDIS_URL_EMAIL || process.env.REDIS_URL || '',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    queuePrefix: process.env.REDIS_QUEUE_PREFIX || 'bull',
  },

  vault: {
    encryptionKey: process.env.VAULT_ENCRYPTION_KEY || '',
  },

  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    directDbUrl:
      process.env.SUPABASE_DIRECT_DB_URL ||
      process.env.SUPABASE_DB_URL ||
      process.env.DATABASE_URL ||
      '',
  },

  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || '',
  },

  highlevel: {
    clientId: process.env.GHL_OAUTH_CLIENT_ID || '',
    clientSecret: process.env.GHL_OAUTH_CLIENT_SECRET || '',
  },

  composio: {
    apiKey: process.env.COMPOSIO_API_KEY || '',
    baseUrl: process.env.COMPOSIO_BASE_URL || '',
  },

  app: {
    url: process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '',
  },

  unsubscribe: {
    tokenSecret:
      process.env.UNSUBSCRIBE_TOKEN_SECRET || process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY || '',
  },
})
