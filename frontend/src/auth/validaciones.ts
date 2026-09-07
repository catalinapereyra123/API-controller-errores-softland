/**
 * Validaciones de los formularios de auth. Son funciones puras: devuelven un
 * objeto con el mensaje por campo (vacío = todo bien). Las reglas replican las
 * del backend (`RegistroDto`) para avisar antes de hacer el request.
 */

export const LARGO_MINIMO_PASSWORD = 8

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type CamposLogin = {
  email: string
  password: string
}

export type CamposRegistro = CamposLogin & {
  nombre: string
  confirmacion: string
}

export type ErroresLogin = Partial<Record<keyof CamposLogin, string>>
export type ErroresRegistro = Partial<Record<keyof CamposRegistro, string>>

export function validarLogin(campos: CamposLogin): ErroresLogin {
  const email = errorDeEmail(campos.email)

  return {
    ...(email ? { email } : {}),
    ...(campos.password ? {} : { password: 'Ingresá tu contraseña.' }),
  }
}

export function validarRegistro(campos: CamposRegistro): ErroresRegistro {
  const email = errorDeEmail(campos.email)
  const password = errorDePassword(campos.password)

  return {
    ...(campos.nombre.trim().length >= 2
      ? {}
      : { nombre: 'Escribí tu nombre y apellido.' }),
    ...(email ? { email } : {}),
    ...(password ? { password } : {}),
    ...(campos.confirmacion === campos.password
      ? {}
      : { confirmacion: 'Las contraseñas no coinciden.' }),
  }
}

function errorDeEmail(email: string): string | null {
  if (!email.trim()) return 'Ingresá tu email.'
  if (!EMAIL_VALIDO.test(email.trim())) return 'Ese email no parece válido.'
  return null
}

function errorDePassword(password: string): string | null {
  if (!password) return 'Elegí una contraseña.'
  if (password.length < LARGO_MINIMO_PASSWORD) {
    return `Necesita al menos ${LARGO_MINIMO_PASSWORD} caracteres.`
  }
  return null
}
