export function normalizeEmDashToHyphen(input: string): string {
  return input.replace(/\u2014/g, '-')
}
