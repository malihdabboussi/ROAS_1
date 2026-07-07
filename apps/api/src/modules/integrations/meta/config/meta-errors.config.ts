/**
 * Meta API error messages - no hardcoded strings in integration code.
 */

export const META_ERRORS = {
  // OAuth / config
  MISSING_OAUTH_CONFIG: 'Missing Meta OAuth configuration',
  MISSING_APP_SECRET: 'Missing META_APP_SECRET configuration',

  // parseMetaErrorMessage - Meta API code mappings
  BUDGET_TYPE_INTEGER: 'Budget must be a whole number (in cents). Check your budget settings.',
  INVALID_FIELD_VALUE: 'A required field has an invalid value. Check budget, targeting, and dates.',
  INVALID_CAMPAIGN_SETTINGS: 'Invalid campaign settings. Review your configuration and try again.',
  INSUFFICIENT_PERMISSIONS_AD_ACCOUNT: 'Insufficient permissions for this ad account.',
  API_VERSION_OUTDATED: 'Meta API version is outdated. Please contact support.',
  API_RATE_LIMIT: 'Too many requests to Meta. Wait a moment and try again.',
  CONNECTION_EXPIRED: 'Meta connection expired. Reconnect your Meta account in Settings.',

  // Pixel creation (6200/6202 fallbacks when Meta does not return a message)
  PIXEL_CREATE_FAILED: 'Pixel creation failed',
  PIXEL_ALREADY_EXISTS:
    'Meta rejected pixel creation. Try a different name or use an existing pixel from the list.',
  PIXEL_MULTIPLE_EXIST:
    'Meta rejected pixel creation. Use an existing pixel from the list or check Meta Business settings.',
  PIXEL_PERMISSION_DENIED: 'Insufficient permissions to create a pixel',
  PIXEL_INVALID_NAME: 'Invalid pixel name',

  // Fallback messages for parseMetaErrorMessage
  CAMPAIGN_CREATION_FAILED: 'Campaign creation failed',
  AD_SET_CREATION_FAILED: 'Ad set creation failed',
  AD_CREATIVE_CREATION_FAILED: 'Ad creative creation failed',
  AD_CREATION_FAILED: 'Ad creation failed',
  AD_RULE_CREATION_FAILED: 'Ad rule creation failed',

  // Other integration errors
  IMAGE_UPLOAD_NO_IMAGES: 'Image upload returned no images',
  MISSING_META_AD_ID: 'Missing meta_ad_id for ad rule creation',

  // Fetch/API error labels (used in BadRequestException)
  FETCH_AD_ACCOUNTS_FAILED: 'Failed to fetch ad accounts',
  FETCH_PAGES_FAILED: 'Failed to fetch pages',
  FETCH_PIXELS_FAILED: 'Failed to fetch pixels',
  FETCH_INSTAGRAM_ACCOUNTS_FAILED: 'Failed to fetch Instagram accounts',
  FETCH_INSTAGRAM_ACCOUNTS_FOR_AD_ACCOUNT_FAILED:
    'Failed to fetch Instagram accounts for ad account',
  ASSET_FEED_CREATIVE_CREATION: 'Meta asset-feed creative creation',

  FETCH_CUSTOM_AUDIENCES_FAILED: 'Failed to fetch custom audiences',
  CUSTOM_AUDIENCE_CREATE_FAILED: 'Failed to create custom audience',
  LOOKALIKE_CREATE_FAILED: 'Failed to create lookalike audience',
  FETCH_CUSTOM_CONVERSIONS_FAILED: 'Failed to fetch custom conversions',
  CUSTOM_CONVERSION_CREATE_FAILED: 'Failed to create custom conversion',

  // Fetch existing entities from Meta
  FETCH_META_CAMPAIGNS_FAILED: 'Failed to fetch campaigns from Meta',
  FETCH_META_AD_SETS_FAILED: 'Failed to fetch ad sets from Meta',
  FETCH_META_ADS_FAILED: 'Failed to fetch ads from Meta',
  FETCH_META_CREATIVE_FAILED: 'Failed to fetch ad creative from Meta',
  SYNC_META_ADS_FAILED: 'Failed to sync ads from Meta',
} as const

export type MetaErrorCode = keyof typeof META_ERRORS
