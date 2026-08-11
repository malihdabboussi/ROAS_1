export function shouldEnableInProcessScheduling(
  vercel: string | undefined = process.env.VERCEL,
): boolean {
  return vercel !== '1'
}
