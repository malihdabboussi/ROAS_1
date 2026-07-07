export function isChatTimingLogsEnabled(): boolean {
  const setting =
    process.env.OPENCLAW_STREAM_TIMING_LOGS ??
    process.env.CHAT_PRE_STREAM_TIMING_LOGS ??
    process.env.CHAT_TIMING_LOGS
  if (setting === undefined) {
    return process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test'
  }
  return !['0', 'false', 'off', 'no'].includes(setting.toLowerCase())
}
