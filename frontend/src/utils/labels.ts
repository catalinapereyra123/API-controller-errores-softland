import type { Empresa, Usuario } from '../types'

export function empresaLabel(empresas: Empresa[], empresaId: string): string {
  return (
    empresas.find((empresa) => empresa.id === empresaId)?.nombre ?? empresaId
  )
}

export function usuarioNombre(
  usuarios: Usuario[],
  usuarioId: string | null,
): string | null {
  if (!usuarioId) return null
  return (
    usuarios.find((usuario) => usuario.id === usuarioId)?.nombre ?? usuarioId
  )
}
