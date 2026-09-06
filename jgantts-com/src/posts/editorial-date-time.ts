function ordinalSuffix(day: number): string {
  const remainder = day % 100
  if (remainder >= 11 && remainder <= 13) return 'th'
  const finalDigit = day % 10
  if (finalDigit === 1) return 'st'
  if (finalDigit === 2) return 'nd'
  if (finalDigit === 3) return 'rd'
  return 'th'
}

function dayPeriod(time: string): string {
  const hour = Number(time.slice(0, 2))
  if (hour === 0 || hour === 24) return 'midnight'
  if (hour < 5) return 'at night'
  if (hour < 12) return 'in the morning'
  if (hour === 12) return 'noon'
  if (hour < 17) return 'in the afternoon'
  if (hour < 21) return 'in the evening'
  return 'at night'
}

export function formatEditorialDateTime(date: number | null, time: string | null): string | null {
  let formatted = ''
  if (date) {
    const value = String(date)
    const year = Number(value.slice(0, 4))
    const month = Number(value.slice(4, 6))
    const day = Number(value.slice(6, 8))
    const monthName = new Intl.DateTimeFormat(undefined, { month: 'long', timeZone: 'UTC' })
      .format(new Date(Date.UTC(year, month - 1, day)))
    formatted = `${year}, ${monthName} ${day}${ordinalSuffix(day)}`
  }
  if (time) {
    const formattedTime = `${time} ${dayPeriod(time)}`
    formatted = formatted ? `${formatted}, ${formattedTime}` : formattedTime
  }
  return formatted || null
}

export function machineEditorialDateTime(date: number | null, time: string | null): string | undefined {
  if (!date) return time || undefined
  const value = String(date)
  const machineDate = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
  return `${machineDate}${time ? `T${time}` : ''}`
}
