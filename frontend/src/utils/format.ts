export function formatMinutes(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  if (hours === 0) return `${rest}min`
  if (rest === 0) return `${hours}h`
  return `${hours}h ${rest}m`
}

export function minutesSince(isoDate: string): number {
  return (Date.now() - new Date(isoDate).getTime()) / 60_000
}

export function formatElapsedSince(isoDate: string): string {
  return formatMinutes(minutesSince(isoDate))
}

export function formatDetectedAt(isoDate: string): string {
  const date = new Date(isoDate)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day}/${month} ${hours}:${minutes}`
}

export function formatTodayEs(date: Date = new Date()): string {
  const formatted = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
    .format(date)
    .replace(',', '')
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}
