import { useState } from 'react'
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

function AppAutenticada() {
  const [page, setPage] = useState<AppPage>('home')
  // Qué error está abierto en la pantalla de detalle.
  const [errorId, setErrorId] = useState<string | null>(null)

  function abrirDetalle(id: string) {
    setErrorId(id)
    setPage('detalle')
  }

  if (page === 'bandeja') {
    return <BandejaErrores onNavigate={setPage} onOpenError={abrirDetalle} />
  }

  if (page === 'detalle') {
    return <ErrorDetail errorId={errorId} onNavigate={setPage} />
  }

  if (page === 'historial') {
    return <Historial onNavigate={setPage} />
  }

  return <Home onNavigate={setPage} onOpenError={abrirDetalle} />
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
