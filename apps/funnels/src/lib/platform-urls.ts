export const ROAS_API_URL = 'https://api.roas.io'
export const ROAS_MARKETING_URL = 'https://roas.io'

export function resolveBackendUrl(): string {
  return (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ROAS_API_URL
  ).replace(/\/+$/, '')
}

export function resolveMarketingSiteUrl(): string {
  return ROAS_MARKETING_URL
}
