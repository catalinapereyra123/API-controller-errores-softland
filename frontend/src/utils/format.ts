export function formatMinutes(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  if (hours === 0) return `${rest}min`
  if (rest === 0) return `${hours}h`
  return `${hours}h ${rest}m`
}

export function formatElapsedSince(isoDate: string): string {
  const diffMinutes = (Date.now() - new Date(isoDate).getTime()) / 60_000
  return formatMinutes(diffMinutes)
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
