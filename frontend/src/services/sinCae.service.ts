import { api } from './api'
import type { ResumenSinCae, SinCaeLista } from '../types'

/** Comprobantes sin CAE con su diagnóstico; por defecto, sólo los abiertos. */
export function getSinCae(soloAbiertos = true): Promise<SinCaeLista> {
  return api<SinCaeLista>(
    soloAbiertos ? '/sin-cae' : '/sin-cae?soloAbiertos=false',
  )
}

/** Abiertos y cuántos traban un punto de venta, para el menú. */
export function getResumenSinCae(): Promise<ResumenSinCae> {
  return api<ResumenSinCae>('/sin-cae/resumen')
}
