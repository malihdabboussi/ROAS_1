function zonedParts(date: Date, timeZone: string): Record<string, number> {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  )
}

export function slackTeamLimitDayStartIso(now: Date, timeZone: string): string {
  const current = zonedParts(now, timeZone)
  const targetLocalEpoch = Date.UTC(current.year, current.month - 1, current.day)
  let candidate = targetLocalEpoch

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const local = zonedParts(new Date(candidate), timeZone)
    const candidateLocalEpoch = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      local.second,
    )
    candidate += targetLocalEpoch - candidateLocalEpoch
  }

  return new Date(candidate).toISOString()
}
