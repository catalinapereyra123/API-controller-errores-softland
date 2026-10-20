import { useEffect, useState } from 'react'
import { AuthProvider } from './auth/AuthProvider'
import { useAuth } from './auth/useAuth'
import { colors, textStyles } from './styles'
import BandejaErrores from './pages/BandejaErrores'
import ErrorDetail from './pages/ErrorDetail'
import Historial from './pages/Historial'
import Home from './pages/Home'
import Login from './pages/Login'
import Registro from './pages/Registro'
import type { AppPage } from './types'

function App() {
  return (
    <AuthProvider>
      <Contenido />
    </AuthProvider>
  )
}

/** Elige qué mostrar según haya o no sesión iniciada. */
function Contenido() {
  const { usuario, cargando } = useAuth()

  if (cargando) return <Pantalla texto="Cargando tu sesión…" />
  return usuario ? <AppAutenticada /> : <PantallasDeAuth />
}

function PantallasDeAuth() {
  const [pantalla, setPantalla] = useState<'login' | 'registro'>('login')

  return pantalla === 'registro' ? (
    <Registro onIrALogin={() => setPantalla('login')} />
  ) : (
    <Login onIrARegistro={() => setPantalla('registro')} />
  )
}

/** Lo que se ve: cada navegación es una entrada del historial del navegador. */
interface Vista {
  page: AppPage
  /** Qué error está abierto en la pantalla de detalle. */
  errorId: string | null
  /** Desde dónde se llegó; null si se entró directo (no hay a dónde volver). */
  origen: AppPage | null
}

const VISTA_INICIO: Vista = { page: 'home', errorId: null, origen: null }

/** Al recargar, el navegador conserva el estado de la entrada actual. */
function vistaGuardada(): Vista {
  const estado = window.history.state as Partial<Vista> | null
  return estado?.page ? { ...VISTA_INICIO, ...estado } : VISTA_INICIO
}

function AppAutenticada() {
  const [vista, setVista] = useState<Vista>(vistaGuardada)

  // Así el "atrás" del navegador (o del mouse) recorre las pantallas de la app.
  useEffect(() => {
    window.history.replaceState(vistaGuardada(), '')
    function alVolver(event: PopStateEvent) {
      setVista((event.state as Vista | null) ?? VISTA_INICIO)
    }
    window.addEventListener('popstate', alVolver)
    return () => window.removeEventListener('popstate', alVolver)
  }, [])

  function navegar(page: AppPage, errorId: string | null = null) {
    if (page === vista.page && errorId === vista.errorId) return
    const nueva: Vista = { page, errorId, origen: vista.page }
    window.history.pushState(nueva, '')
    setVista(nueva)
  }

  const abrirDetalle = (id: string) => navegar('detalle', id)

  // Volver = la entrada anterior del historial, con sus filtros y su scroll.
  function volverDelDetalle() {
    if (vista.origen) window.history.back()
    else navegar('bandeja')
  }

  if (vista.page === 'bandeja') {
    return <BandejaErrores onNavigate={navegar} onOpenError={abrirDetalle} />
  }

  if (vista.page === 'detalle') {
    return (
      <ErrorDetail
        errorId={vista.errorId}
        onNavigate={navegar}
        volverA={vista.origen === 'home' ? 'home' : 'bandeja'}
        onVolver={volverDelDetalle}
      />
    )
  }

  if (vista.page === 'historial') {
    return <Historial onNavigate={navegar} />
  }

  return <Home onNavigate={navegar} onOpenError={abrirDetalle} />
}

function Pantalla({ texto }: { texto: string }) {
  return (
    <div
      style={{ backgroundColor: colors.background.page }}
      className="flex min-h-screen w-full items-center justify-center"
    >
      <span style={{ ...textStyles.body, color: colors.gray.medium }}>
        {texto}
      </span>
    </div>
  )
}

export default App
