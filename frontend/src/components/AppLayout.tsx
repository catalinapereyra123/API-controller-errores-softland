import { Fragment, useState, useSyncExternalStore, type ReactNode } from 'react'
import { colors } from '../styles'
import type { AppPage } from '../types'
import { cn } from '../utils/cn'
import AppSidebar from './AppSidebar'
import { ChevronRightIcon, PanelLeftIcon } from './icons'
import type { SidebarItemId, SidebarNavItem } from './Sidebar'

export interface Miga {
  label: string
  /** Si viene, la miga es un link a esa pantalla. */
  page?: AppPage
  mono?: boolean
}

interface AppLayoutProps {
  activeItem: SidebarItemId
  onNavigate: (page: AppPage) => void
  /** Ubicación en la barra superior; la última es la pantalla actual. */
  migas: Miga[]
  /** Ancho máximo del contenido (cualquier unidad CSS). */
  maxWidth?: string
  children: ReactNode
}

const PAGE_POR_ITEM: Record<SidebarItemId, AppPage> = {
  inicio: 'home',
  bandeja: 'bandeja',
  historial: 'historial',
}

const QUERY_ESCRITORIO = '(min-width: 768px)'

function suscribirEscritorio(onChange: () => void) {
  const mql = window.matchMedia(QUERY_ESCRITORIO)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

function useEsEscritorio() {
  return useSyncExternalStore(
    suscribirEscritorio,
    () => window.matchMedia(QUERY_ESCRITORIO).matches,
  )
}

// Cada pantalla monta su propio layout: la preferencia del sidebar vive a
// nivel módulo para que no se pierda al navegar.
let sidebarExpandidoGuardado = true

/**
 * Marco de las pantallas con sesión: sidebar (expandido, riel de íconos o
 * cajón en celulares) + barra superior fija con la ubicación actual.
 */
function AppLayout({
  activeItem,
  onNavigate,
  migas,
  maxWidth = '1400px',
  children,
}: AppLayoutProps) {
  const esEscritorio = useEsEscritorio()
  const [expandido, setExpandido] = useState(sidebarExpandidoGuardado)
  const [cajonAbierto, setCajonAbierto] = useState(false)

  function toggleSidebar() {
    if (!esEscritorio) {
      setCajonAbierto((abierto) => !abierto)
      return
    }
    sidebarExpandidoGuardado = !expandido
    setExpandido(sidebarExpandidoGuardado)
  }

  function handleSelectNavItem(item: SidebarNavItem) {
    setCajonAbierto(false)
    onNavigate(PAGE_POR_ITEM[item.id])
  }

  const menuVisible = esEscritorio ? expandido : cajonAbierto

  return (
    <div
      style={{ backgroundColor: colors.background.page }}
      className="flex h-screen w-full"
    >
      {esEscritorio ? (
        <div
          style={{ borderColor: colors.background.border }}
          className={cn(
            'shrink-0 overflow-hidden border-r transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
            expandido ? 'w-[264px]' : 'w-[76px]',
          )}
        >
          <AppSidebar
            activeItem={activeItem}
            onItemSelect={handleSelectNavItem}
            collapsed={!expandido}
          />
        </div>
      ) : (
        cajonAbierto && (
          <div className="fixed inset-0 z-40">
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setCajonAbierto(false)}
              className="absolute inset-0 animate-fundido bg-slate-900/40 backdrop-blur-sm"
            />
            <div className="relative h-full w-[264px] animate-deslizar shadow-lift">
              <AppSidebar
                activeItem={activeItem}
                onItemSelect={handleSelectNavItem}
              />
            </div>
          </div>
        )
      )}

      <main className="relative min-w-0 flex-1 overflow-y-auto">
        {/* Luz verde muy suave arriba: le quita lo plano al fondo. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_20%_0%,rgba(22,163,74,0.07),transparent)]"
        />

        <header
          style={{ borderColor: colors.background.border }}
          className="sticky top-0 z-20 flex h-14 items-center gap-sm border-b bg-white/70 px-md backdrop-blur-md md:px-xl"
        >
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={menuVisible ? 'Ocultar menú' : 'Mostrar menú'}
            aria-expanded={menuVisible}
            title={menuVisible ? 'Ocultar menú' : 'Mostrar menú'}
            style={{ color: colors.gray.medium }}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-background-subtle focus-visible:ring-2 focus-visible:ring-primary-default/50 focus-visible:outline-none"
          >
            <PanelLeftIcon className="h-5 w-5" />
          </button>

          <span
            aria-hidden
            style={{ backgroundColor: colors.background.border }}
            className="h-5 w-px"
          />

          <nav aria-label="Ubicación" className="min-w-0">
            <ol className="flex min-w-0 items-center gap-xs text-bodySmall">
              {migas.map((miga, index) => {
                const esActual = index === migas.length - 1

                return (
                  <Fragment key={`${miga.label}-${index}`}>
                    {index > 0 && (
                      <li aria-hidden className="shrink-0 text-gray-default">
                        <ChevronRightIcon className="h-3.5 w-3.5" />
                      </li>
                    )}
                    <li className={cn('min-w-0', !esActual && 'shrink-0')}>
                      {miga.page && !esActual ? (
                        <button
                          type="button"
                          onClick={() => miga.page && onNavigate(miga.page)}
                          className="cursor-pointer rounded-md px-xs py-xxs font-semibold text-gray-medium transition-colors hover:bg-background-subtle hover:text-gray-darkest"
                        >
                          {miga.label}
                        </button>
                      ) : (
                        <span
                          aria-current={esActual ? 'page' : undefined}
                          className={cn(
                            'block truncate px-xs font-bold text-gray-darkest',
                            miga.mono && 'font-mono',
                          )}
                        >
                          {miga.label}
                        </span>
                      )}
                    </li>
                  </Fragment>
                )
              })}
            </ol>
          </nav>
        </header>

        <div
          style={{ maxWidth }}
          className="relative mx-auto flex animate-entrar flex-col gap-xl px-md py-lg md:px-xl md:py-xl"
        >
          {children}
        </div>
      </main>
    </div>
  )
}

export default AppLayout
