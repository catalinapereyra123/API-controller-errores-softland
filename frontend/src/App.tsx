import { useState } from 'react'
import BandejaErrores from './pages/BandejaErrores'
import ErrorDetail from './pages/ErrorDetail'
import Historial from './pages/Historial'
import Home from './pages/Home'
import type { AppPage } from './types'

function App() {
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

export default App
