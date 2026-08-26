import { currentUserIdMock, usuariosMock } from '../mocks/usuarios.mock'
import { mockDelay } from './mockDelay'
import type { Usuario } from '../types'

export async function getCurrentUser(): Promise<Usuario> {
  await mockDelay()
  const usuario = usuariosMock.find((item) => item.id === currentUserIdMock)
  if (!usuario) throw new Error('Usuario actual no encontrado')
  return usuario
  // return api<Usuario>('/users/me')
}

export async function getUsuarios(): Promise<Usuario[]> {
  await mockDelay()
  return usuariosMock
  // return api<Usuario[]>('/users')
}
