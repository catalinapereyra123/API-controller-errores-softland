import type { Usuario } from '../types'

export function usuarioNombre(
  usuarios: Usuario[],
  usuarioId: string | null,
): string | null {
  if (!usuarioId) return null
  return (
    usuarios.find((usuario) => usuario.id === usuarioId)?.nombre ?? usuarioId
  )
}
