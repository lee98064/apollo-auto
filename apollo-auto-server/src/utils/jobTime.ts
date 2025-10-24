const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

type TimeOfDay = {
  hours: number
  minutes: number
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

const buildFutureDateFromSeconds = (
  secondsOfDay: number,
  reference: Date
): Date => {
  const candidate = new Date(reference)
  candidate.setHours(0, 0, 0, 0)
  candidate.setSeconds(secondsOfDay, 0)

  if (candidate <= reference) {
    candidate.setDate(candidate.getDate() + 1)
  }

  return candidate
}

const calculateNextExecutionAt = (
  startAt: string,
  endAt: string | null | undefined,
  reference: Date
): Date => {
  const startSeconds = toSecondsOfDay(parseTimeString(startAt))
  const endSeconds = endAt
    ? toSecondsOfDay(parseTimeString(endAt))
    : null

  const secondsPerDay = 24 * 60 * 60

  if (endSeconds !== null && endSeconds > startSeconds) {
    const range = endSeconds - startSeconds
    const offset = Math.floor(Math.random() * (range + 1))

    return buildFutureDateFromSeconds(startSeconds + offset, reference)
  }

  if (endSeconds !== null && endSeconds < startSeconds) {
    const range = secondsPerDay - startSeconds + endSeconds
    const offset = Math.floor(Math.random() * (range + 1))
    const targetSeconds = (startSeconds + offset) % secondsPerDay

    return buildFutureDateFromSeconds(targetSeconds, reference)
  }

  return buildFutureDateFromSeconds(startSeconds, reference)
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
