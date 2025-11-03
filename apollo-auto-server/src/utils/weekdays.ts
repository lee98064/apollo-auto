const parseWeekdays = (weekdaysJson: string | null): number[] | null => {
  if (!weekdaysJson) {
    return null
  }

  try {
    const parsed = JSON.parse(weekdaysJson)
    if (!Array.isArray(parsed)) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

const getWeekdayInTimezone = (date: Date, timeZone: string): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = Number.parseInt(
    parts.find((p) => p.type === 'year')?.value ?? '1970',
    10
  )
  const month =
    Number.parseInt(parts.find((p) => p.type === 'month')?.value ?? '1', 10) -
    1
  const day = Number.parseInt(
    parts.find((p) => p.type === 'day')?.value ?? '1',
    10
  )

  return new Date(year, month, day).getDay()
}

const isDateInAllowedWeekdays = (
  date: Date,
  weekdaysJson: string | null,
  timeZone: string
): boolean => {
  const allowedWeekdays = parseWeekdays(weekdaysJson)

  if (!allowedWeekdays || allowedWeekdays.length === 0) {
    return true
  }

  const weekday = getWeekdayInTimezone(date, timeZone)

  return allowedWeekdays.includes(weekday)
}

const getNextDateInAllowedWeekdays = (
  startDate: Date,
  weekdaysJson: string | null,
  timeZone: string,
  maxDaysToCheck: number = 14
): Date | null => {
  const allowedWeekdays = parseWeekdays(weekdaysJson)

  if (!allowedWeekdays || allowedWeekdays.length === 0) {
    return startDate
  }

  let candidate = new Date(startDate)

  for (let i = 0; i < maxDaysToCheck; i++) {
    if (isDateInAllowedWeekdays(candidate, weekdaysJson, timeZone)) {
      return candidate
    }

    candidate = new Date(candidate.getTime() + 24 * 60 * 60 * 1000)
  }

  return null
}

export {
  getNextDateInAllowedWeekdays,
  getWeekdayInTimezone,
  isDateInAllowedWeekdays,
  parseWeekdays,
}
