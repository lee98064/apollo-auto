const checkIn = async (): Promise<boolean> => {
  console.log('[Apollo-CheckIn] Check-in task executed.')
  return true
}

const checkOut = async (): Promise<boolean> => {
  console.log('[Apollo-CheckIn] Check-out task executed.')
  return true
}

export { checkIn, checkOut }
