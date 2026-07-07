export type ReportingToolbarApi = {
  refresh: () => void | Promise<void>
  refreshing: boolean
  /** Ads: Meta connection; `null` while checking. Omitted for non-ads reporting views. */
  metaAdsConnected?: boolean | null
  /** Social: current platform account; `null` while loading. Omitted for non-social reporting views. */
  socialAccountConnected?: boolean | null
}
