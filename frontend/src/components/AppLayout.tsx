import {
  Fragment,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
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
  /** Si viene, el scroll de la pantalla se guarda con esta clave y se repone al volver. */
  recordarScroll?: string
  children: ReactNode
}

const PAGE_POR_ITEM: Record<SidebarItemId, AppPage> = {
  inicio: 'home',
  bandeja: 'bandeja',
  metricas: 'metricas',
  historial: 'historial',
}

/** Desde acá hay sidebar fija; abajo, cajón. */
const QUERY_ESCRITORIO = '(min-width: 768px)'
/** Desde acá el sidebar arranca abierto; abajo, en riel de íconos. */
const QUERY_AMPLIO = '(min-width: 1280px)'

function useMedia(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
  )
}

// Cada pantalla monta su propio layout: la preferencia del sidebar vive a
// nivel módulo para que no se pierda al navegar. null = no la tocó: sigue el
// ancho de la pantalla (y el zoom, que lo cambia).
let sidebarExpandidoGuardado: boolean | null = null

// Por la misma razón, el scroll de las pantallas que lo piden (clave → px).
const scrollGuardado = new Map<string, number>()

/**
 * Marco de las pantallas con sesión: sidebar (expandido, riel de íconos o
 * cajón en celulares) + barra superior fija con la ubicación actual.
 */
function AppLayout({
  activeItem,
  onNavigate,
  migas,
  maxWidth = '90rem',
  recordarScroll,
  children,
}: AppLayoutProps) {
  const esEscritorio = useMedia(QUERY_ESCRITORIO)
  const esAmplio = useMedia(QUERY_AMPLIO)
  const [eleccion, setEleccion] = useState(sidebarExpandidoGuardado)
  const expandido = eleccion ?? esAmplio
  const [cajonAbierto, setCajonAbierto] = useState(false)
  const mainRef = useRef<HTMLElement>(null)

  // Antes de pintar, para que no se vea el salto desde arriba.
  useLayoutEffect(() => {
    const guardado = recordarScroll && scrollGuardado.get(recordarScroll)
    if (guardado && mainRef.current) mainRef.current.scrollTop = guardado
  }, [recordarScroll])

  function toggleSidebar() {
    if (!esEscritorio) {
      setCajonAbierto((abierto) => !abierto)
      return
    }
    sidebarExpandidoGuardado = !expandido
    setEleccion(sidebarExpandidoGuardado)
  }

  function handleSelectNavItem(item: SidebarNavItem) {
    setCajonAbierto(false)
    onNavigate(PAGE_POR_ITEM[item.id])
  }

  function irABandeja() {
    setCajonAbierto(false)
    onNavigate('bandeja')
  }

  const menuVisible = esEscritorio ? expandido : cajonAbierto

  return (
    <div
      style={{ backgroundColor: colors.background.page }}
      className="flex h-screen w-full md:gap-xs md:p-sm"
    >
      {esEscritorio ? (
        <div
          className={cn(
            'shrink-0 overflow-hidden rounded-xxxl bg-background-surface shadow-soft ring-1 ring-slate-900/[0.04] transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
            expandido ? 'w-[16.75rem]' : 'w-[5rem]',
          )}
        >
          <AppSidebar
            activeItem={activeItem}
            onItemSelect={handleSelectNavItem}
            onIrABandeja={irABandeja}
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
            <div className="relative h-full w-[17rem] max-w-[85vw] animate-deslizar overflow-hidden rounded-r-xxxl shadow-lift">
              <AppSidebar
                activeItem={activeItem}
                onItemSelect={handleSelectNavItem}
                onIrABandeja={irABandeja}
              />
            </div>
          </div>
        )
      )}

      <main
        ref={mainRef}
        onScroll={(event) => {
          if (recordarScroll) {
            scrollGuardado.set(recordarScroll, event.currentTarget.scrollTop)
          }
        }}
        className="relative min-w-0 flex-1 overflow-y-auto md:rounded-xxxl"
      >
        {/* Luz verde muy suave arriba: le quita lo plano al fondo. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60%_100%_at_20%_0%,rgba(22,163,74,0.09),transparent)]"
        />

        <header className="sticky top-0 z-20 flex h-16 items-center gap-sm bg-background-page/75 px-md backdrop-blur-md md:px-lg 2xl:px-xl">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={menuVisible ? 'Ocultar menú' : 'Mostrar menú'}
            aria-expanded={menuVisible}
            title={menuVisible ? 'Ocultar menú' : 'Mostrar menú'}
            style={{ color: colors.gray.medium }}
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-background-surface shadow-soft ring-1 ring-slate-900/[0.04] transition-colors hover:text-primary-dark focus-visible:ring-2 focus-visible:ring-primary-default/50 focus-visible:outline-none"
          >
            <PanelLeftIcon className="h-5 w-5" />
          </button>

          <nav
            aria-label="Ubicación"
            className="flex h-10 min-w-0 items-center rounded-full bg-background-surface px-sm shadow-soft ring-1 ring-slate-900/[0.04]"
          >
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
                          className="cursor-pointer rounded-full px-sm py-xxs font-semibold text-gray-medium transition-colors hover:bg-primary-lightest hover:text-primary-dark"
                        >
                          {miga.label}
                        </button>
                      ) : (
                        <span
                          aria-current={esActual ? 'page' : undefined}
                          className={cn(
                            'block truncate px-xs font-semibold text-gray-darkest',
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
          className="@container relative mx-auto flex animate-entrar flex-col gap-lg px-md pt-sm pb-xl md:px-lg 2xl:px-xl"
        >
          {children}
        </div>
      </main>
    </div>
  )
}

export default AppLayout
