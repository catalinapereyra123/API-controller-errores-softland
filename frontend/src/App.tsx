import { useState } from 'react'
import BandejaErrores from './pages/BandejaErrores'
import ErrorDetail from './pages/ErrorDetail'
import Historial from './pages/Historial'
import Home from './pages/Home'
import type { AppPage } from './types'

function App() {
  const [page, setPage] = useState<AppPage>('home')

  if (page === 'bandeja') {
    return <BandejaErrores onNavigate={setPage} />
  }

  if (page === 'detalle') {
    return <ErrorDetail onNavigate={setPage} />
  }

  if (page === 'historial') {
    return <Historial onNavigate={setPage} />
  }

  return <Home onNavigate={setPage} />
}

export default App
