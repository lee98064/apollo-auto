const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

type TimeOfDay = {
  hours: number
  minutes: number
}

type ZonedDateInfo = {
  year: number
  month: number
  day: number
  hours: number
  minutes: number
  seconds: number
}

const SECONDS_PER_DAY = 24 * 60 * 60

const formatterCache = new Map<string, Intl.DateTimeFormat>()

const getFormatter = (timeZone: string): Intl.DateTimeFormat => {
  if (!formatterCache.has(timeZone)) {
    formatterCache.set(
      timeZone,
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    )
  }

  return formatterCache.get(timeZone) as Intl.DateTimeFormat
}

const parseTimeString = (value: string): TimeOfDay => {
  if (!TIME_PATTERN.test(value)) {
    throw new Error(`Invalid time format: ${value}`)
  }

  const [, hourString, minuteString] = value.match(TIME_PATTERN) ?? []
  const hours = Number.parseInt(hourString, 10)
  const minutes = Number.parseInt(minuteString, 10)

  return { hours, minutes }
}

const toSecondsOfDay = (time: TimeOfDay): number =>
  time.hours * 3600 + time.minutes * 60

const getZonedDateInfo = (date: Date, timeZone: string): ZonedDateInfo => {
  const formatter = getFormatter(timeZone)
  const parts = formatter.formatToParts(date)
  const map = parts.reduce<Record<string, string>>((acc, part) => {
    if (part.type !== 'literal') {
      acc[part.type] = part.value
    }
    return acc
  }, {})

  return {
    year: Number.parseInt(map.year ?? '1970', 10),
    month: Number.parseInt(map.month ?? '1', 10),
    day: Number.parseInt(map.day ?? '1', 10),
    hours: Number.parseInt(map.hour ?? '0', 10),
    minutes: Number.parseInt(map.minute ?? '0', 10),
    seconds: Number.parseInt(map.second ?? '0', 10),
  }
}

const getTimezoneOffsetInMilliseconds = (
  date: Date,
  timeZone: string
): number => {
  const info = getZonedDateInfo(date, timeZone)
  const utcEquivalent = Date.UTC(
    info.year,
    info.month - 1,
    info.day,
    info.hours,
    info.minutes,
    info.seconds
  )

  return utcEquivalent - date.getTime()
}

const zonedTimeToUtcMilliseconds = (
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  seconds: number,
  timeZone: string
): number => {
  const utcGuess = Date.UTC(year, month - 1, day, hours, minutes, seconds, 0)
  const initialOffset = getTimezoneOffsetInMilliseconds(
    new Date(utcGuess),
    timeZone
  )
  const adjustedGuess = utcGuess - initialOffset
  const adjustedOffset = getTimezoneOffsetInMilliseconds(
    new Date(adjustedGuess),
    timeZone
  )

  if (initialOffset !== adjustedOffset) {
    return utcGuess - adjustedOffset
  }

  return adjustedGuess
}

const buildFutureDateFromSeconds = (
  secondsOfDay: number,
  reference: Date,
  timeZone: string
): Date => {
  const nowInfo = getZonedDateInfo(reference, timeZone)
  const nowSeconds =
    nowInfo.hours * 3600 + nowInfo.minutes * 60 + nowInfo.seconds

  const dayOffset = secondsOfDay <= nowSeconds ? 1 : 0
  const referenceForTarget =
    dayOffset === 0
      ? reference
      : new Date(reference.getTime() + dayOffset * SECONDS_PER_DAY * 1000)
  const targetInfo = getZonedDateInfo(referenceForTarget, timeZone)

  const hours = Math.floor(secondsOfDay / 3600)
  const minutes = Math.floor((secondsOfDay % 3600) / 60)
  const seconds = secondsOfDay % 60

  const timestamp = zonedTimeToUtcMilliseconds(
    targetInfo.year,
    targetInfo.month,
    targetInfo.day,
    hours,
    minutes,
    seconds,
    timeZone
  )

  const candidate = new Date(timestamp)

  if (candidate <= reference) {
    const nextDayInfo = getZonedDateInfo(
      new Date(reference.getTime() + SECONDS_PER_DAY * 1000),
      timeZone
    )
    const nextTimestamp = zonedTimeToUtcMilliseconds(
      nextDayInfo.year,
      nextDayInfo.month,
      nextDayInfo.day,
      hours,
      minutes,
      seconds,
      timeZone
    )
    return new Date(nextTimestamp)
  }

  return candidate
}

const calculateNextExecutionAt = (
  startAt: string,
  endAt: string | null | undefined,
  reference: Date,
  timeZone: string = 'UTC'
): Date => {
  const startSeconds = toSecondsOfDay(parseTimeString(startAt))
  const endSeconds = endAt
    ? toSecondsOfDay(parseTimeString(endAt))
    : null

  if (endSeconds !== null && endSeconds > startSeconds) {
    const range = endSeconds - startSeconds
    const offset = Math.floor(Math.random() * (range + 1))

    return buildFutureDateFromSeconds(
      startSeconds + offset,
      reference,
      timeZone
    )
  }

  if (endSeconds !== null && endSeconds < startSeconds) {
    const range = SECONDS_PER_DAY - startSeconds + endSeconds
    const offset = Math.floor(Math.random() * (range + 1))
    const targetSeconds = (startSeconds + offset) % SECONDS_PER_DAY

    return buildFutureDateFromSeconds(targetSeconds, reference, timeZone)
  }

  return buildFutureDateFromSeconds(startSeconds, reference, timeZone)
}

const validateTimeString = (value: string): string => {
  if (!TIME_PATTERN.test(value)) {
    throw new Error(`Invalid time format: ${value}`)
  }

  return value
}

export {
  TIME_PATTERN,
  calculateNextExecutionAt,
  parseTimeString,
  toSecondsOfDay,
  validateTimeString,
}
