import { useAuth } from '../auth/useAuth'
import { colors } from '../styles'
import Sidebar, { type SidebarItemId, type SidebarNavItem } from './Sidebar'

interface AppSidebarProps {
  activeItem: SidebarItemId
  onItemSelect: (item: SidebarNavItem) => void
}

/**
 * `Sidebar` ya cableado con los colores de la app, el usuario de la sesión y
 * el cierre de sesión. Las pantallas sólo dicen qué ítem está activo.
 */
function AppSidebar({ activeItem, onItemSelect }: AppSidebarProps) {
  const { usuario, salir } = useAuth()

  return (
    <Sidebar
      logoText="S"
      logoColor={colors.primary.dark}
      logoBackground={colors.primary.lightest}
      title="API Errores Softland"
      subtitle="Softland · Errores"
      titleColor={colors.gray.darkest}
      subtitleColor={colors.gray.medium}
      backgroundColor={colors.background.surface}
      dividerColor={colors.background.border}
      sectionTitleColor={colors.gray.default}
      itemColor={colors.gray.dark}
      itemHoverBackground={colors.background.page}
      itemActiveColor={colors.primary.dark}
      itemActiveBackground={colors.primary.lightest}
      activeItem={activeItem}
      onItemSelect={onItemSelect}
      onLogout={salir}
      user={
        usuario
          ? {
              name: usuario.nombre,
              role: usuario.rol,
              avatarText: usuario.avatarIniciales,
              avatarColor: colors.primary.dark,
              avatarBackground: colors.primary.lightest,
            }
          : undefined
      }
    />
  )
}

export default AppSidebar
