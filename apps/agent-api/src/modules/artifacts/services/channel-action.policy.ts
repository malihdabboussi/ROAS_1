/**
 * Channel Action Policy
 *
 * Defines how each action behaves per channel.
 * All actions EXECUTE normally on every channel.
 * The only difference is how their UI results are delivered:
 *
 * - studio: full UI blocks (components render in the web app)
 * - slack/telegram: UI blocks are converted to text by openclaw-proxy.service.ts
 *
 * Actions listed in PROMPT_BLOCKED are handled at the prompt level:
 * the channel instruction file tells the agent not to use them,
 * and the proxy converts any that slip through.
 *
 * Actions listed in TRULY_BLOCKED cannot work at all outside a browser.
 * These are documented here for reference but NOT enforced at runtime
 * (the agent simply doesn't have access to them as actions).
 */

export type Channel = 'studio' | 'slack' | 'telegram'

export const PROMPT_BLOCKED_ON_TEXT_CHANNELS: readonly string[] = [
  'ask_clarification',
  'create_chat_plan',
  'update_chat_plan',
]

export const UI_BLOCK_ACTIONS: readonly string[] = [
  'check_meta_connection',
  'check_integration_connection',
  'list_meta_ad_accounts',
  'list_meta_pages',
  'publish_ad_to_meta',
  'get_meta_ad_status',
]

export const BROWSER_ONLY_CAPABILITIES: readonly string[] = [
  'visual_ad_preview_rendering',
  'interactive_funnel_builder',
  'media_picker_modal',
  'drag_drop_upload',
]

export function isTextChannel(channel: Channel): boolean {
  return channel === 'slack' || channel === 'telegram'
}
