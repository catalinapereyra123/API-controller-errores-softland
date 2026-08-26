import type { Usuario } from '../types'

// Usuarios con cuenta creada en la aplicación (vendrá de GET /users).
export const usuariosMock: Usuario[] = [
  {
    id: 'catalina-pereyra',
    nombre: 'Catalina Pereyra',
    rol: 'Soporte funcional',
    avatarIniciales: 'CP',
  },
  {
    id: 'martin-lopez',
    nombre: 'Martín López',
    rol: 'Soporte funcional',
    avatarIniciales: 'ML',
  },
  {
    id: 'catalina-ruiz',
    nombre: 'Catalina Ruiz',
    rol: 'Soporte funcional',
    avatarIniciales: 'CR',
  },
  {
    id: 'juan-perez',
    nombre: 'Juan Pérez',
    rol: 'Soporte funcional',
    avatarIniciales: 'JP',
  },
]

// Usuario con la sesión activa (vendrá de GET /users/me una vez exista auth).
export const currentUserIdMock = 'catalina-pereyra'
