export function shouldEnableInProcessScheduling(
  env: Pick<NodeJS.ProcessEnv, 'VERCEL'> = process.env,
): boolean {
  return env.VERCEL !== '1'
}
