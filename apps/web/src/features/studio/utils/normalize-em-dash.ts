/** Replace Unicode em dash (U+2014) with ASCII hyphen-minus for display and export. */
export function normalizeEmDashToHyphen(input: string): string {
  return input.replace(/\u2014/g, '-')
}
