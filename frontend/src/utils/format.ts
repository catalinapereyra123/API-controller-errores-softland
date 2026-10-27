export function formatMinutes(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  if (hours === 0) return `${rest}min`
  if (rest === 0) return `${hours}h`
  return `${hours}h ${rest}m`
}

/** Como formatMinutes, pero desde un día en días: "3 d 4 h". */
export function formatDuracion(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes))
  if (minutes < 24 * 60) return formatMinutes(minutes)
  const days = Math.floor(minutes / (24 * 60))
  const hours = Math.floor((minutes % (24 * 60)) / 60)
  return hours ? `${days} d ${hours} h` : `${days} d`
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

/** HH:mm de una fecha ISO. */
export function formatTime(isoDate: string): string {
  const date = new Date(isoDate)
  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`
}

/** dd/mm/yyyy de una fecha ISO. Devuelve '—' si viene null. */
export function formatDate(isoDate: string | null): string {
  if (!isoDate) return '—'
  const date = new Date(isoDate)
  return `${String(date.getDate()).padStart(2, '0')}/${String(
    date.getMonth() + 1,
  ).padStart(2, '0')}/${date.getFullYear()}`
}

const dosDigitos = (n: number) => String(n).padStart(2, '0')

/** yyyy-mm-dd en hora local (o yyyy-mm-ddThh): mismas claves que la serie del back. */
export function claveDia(isoDate: string, porHora = false): string {
  const date = new Date(isoDate)
  const dia = `${date.getFullYear()}-${dosDigitos(date.getMonth() + 1)}-${dosDigitos(date.getDate())}`
  return porHora ? `${dia}T${dosDigitos(date.getHours())}` : dia
}

const DIAS_SEMANA = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
]

/** "Hoy", "Ayer", el día de la semana (últimos 7 días) o dd/mm/yyyy. */
export function etiquetaDia(isoDate: string, hoy: Date = new Date()): string {
  const clave = claveDia(isoDate)
  if (clave === claveDia(hoy.toISOString())) return 'Hoy'

  const ayer = new Date(hoy)
  ayer.setDate(ayer.getDate() - 1)
  if (clave === claveDia(ayer.toISOString())) return 'Ayer'

  const haceUnaSemana = new Date(hoy)
  haceUnaSemana.setHours(0, 0, 0, 0)
  haceUnaSemana.setDate(haceUnaSemana.getDate() - 6)
  const date = new Date(isoDate)
  if (date >= haceUnaSemana) return DIAS_SEMANA[date.getDay()]

  return formatDate(isoDate)
}

/** Iniciales para el avatar: "Catalina Pereyra" → "CP". */
export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('')
}
