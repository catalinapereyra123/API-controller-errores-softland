import type { ErrorTransaccion } from '../types'
import { formatDate } from '../utils/format'

export interface PasoASeguir {
  texto: string
  /** Ruta o código que se muestra en monoespaciado, con botón de copiar. */
  copiable?: string
}

export interface Recomendacion {
  /** Diagnóstico corto que encabeza la tarjeta. */
  diagnostico: string
  pasos: PasoASeguir[]
}

/** Devuelve la recomendación si el error encaja en el caso, o null. */
type Regla = (error: ErrorTransaccion) => Recomendacion | null

const MARCAR_COMO_CORREGIDO = '“Marcar como corregido”'

// Los mensajes de Softland pueden llegar sin tildes o con la codificación
// rota, por eso los patrones usan `.` en las letras acentuadas.
const PERIODO_NO_HABILITADO = /per.odo de registraci.n(?:.*?m.dulo\s+(\w+))?/i

/** "Se ha producido un error, verificar el archivo c:\padron\...txt" */
const archivoDeLog: Regla = (error) => {
  // El back ya extrae la ruta del mensaje a `archivoLog`.
  if (!error.archivoLog) return null

  return {
    diagnostico: 'El motivo del error quedó en un archivo de log',
    pasos: [
      {
        texto:
          'Abrí este archivo en el servidor de Softland (si no tenés acceso, pedíselo a sistemas):',
        copiable: error.archivoLog,
      },
      {
        texto:
          'Ahí está el motivo real del rechazo: el mensaje de Softland solo indica dónde buscarlo.',
      },
      {
        texto:
          'Anotá en Observaciones lo que encontraste, así nadie tiene que volver a abrir el archivo.',
      },
      {
        texto: `Corregí el dato en Softland y tocá ${MARCAR_COMO_CORREGIDO}.`,
      },
    ],
  }
}

/** "No se encuentra habilitado el período de registración para el módulo VT" */
const periodoNoHabilitado: Regla = (error) => {
  const match = error.descripcion.match(PERIODO_NO_HABILITADO)
  if (!match) return null

  const modulo = match[1]
    ? `módulo ${match[1].toUpperCase()}`
    : `módulo de ${error.modulo}`
  const fecha = error.fechaMovimiento
    ? ` (${formatDate(error.fechaMovimiento)})`
    : ''

  return {
    diagnostico: 'Período de registración no habilitado',
    pasos: [
      {
        texto: `Revisá la fecha del movimiento${fecha}: si está mal cargada, lo que hay que corregir es el comprobante, no el período.`,
      },
      {
        texto: `Si la fecha es correcta, revisá en Softland que el período de registración del ${modulo} esté habilitado para esa fecha.`,
      },
      {
        texto:
          'Si está cerrado, pedile a quien administra los períodos que lo habilite.',
      },
      {
        texto: `Cuando esté resuelto, tocá ${MARCAR_COMO_CORREGIDO} para reprocesar la transacción.`,
      },
    ],
  }
}

/** Reglas por mensaje: se evalúan en orden y gana la primera que aplica. */
const REGLAS_POR_MENSAJE: Regla[] = [archivoDeLog, periodoNoHabilitado]

/** Si el mensaje no encaja en ninguna regla, se sugiere según el status. */
const POR_STATUS: Partial<
  Record<string, (error: ErrorTransaccion) => Recomendacion>
> = {
  D: (error) => ({
    diagnostico: 'Diferencia o inconsistencia en la transacción',
    pasos: [
      {
        texto: `Compará los importes de la transacción ${error.codigo} en Softland con el comprobante original.`,
      },
      {
        texto:
          'Revisá alícuotas, percepciones y redondeos: suelen ser el origen de las diferencias.',
      },
      {
        texto: `Corregí la diferencia y tocá ${MARCAR_COMO_CORREGIDO}.`,
      },
    ],
  }),
  B: () => ({
    diagnostico: 'Bloqueada por una regla de negocio',
    pasos: [
      {
        texto:
          'Identificá qué regla frenó la transacción: el mensaje de Softland suele indicarla.',
      },
      {
        texto:
          'Confirmá con el área responsable si el bloqueo corresponde o hay que liberarla.',
      },
      {
        texto: `Si se libera, tocá ${MARCAR_COMO_CORREGIDO} para reprocesarla.`,
      },
    ],
  }),
  X: (error) => ({
    diagnostico: 'Excluida del proceso automático',
    pasos: [
      {
        texto:
          'Confirmá si la exclusión fue intencional: en ese caso no hace falta reprocesarla.',
      },
      {
        texto: `Si no lo fue, revisá en Softland por qué la transacción ${error.codigo} quedó afuera.`,
      },
      {
        texto: `Para volver a incluirla, tocá ${MARCAR_COMO_CORREGIDO}: vuelve a estado N y se reprocesa.`,
      },
    ],
  }),
}

/** Para errores técnicos (E) o mensajes sin una regla específica. */
function revisionGeneral(error: ErrorTransaccion): Recomendacion {
  const cuenta = error.cuenta?.trim()

  return {
    diagnostico: 'Revisión general',
    pasos: [
      {
        texto: `Buscá la transacción ${error.codigo} en Softland y leé el mensaje completo del error.`,
      },
      {
        texto: `Revisá que ${cuenta ? `la cuenta ${cuenta} y ` : ''}los datos maestros que usa la transacción existan y estén activos.`,
      },
      {
        texto:
          'Si no sabés cómo resolverlo, dejá una observación y asignáselo a quien corresponda.',
      },
      {
        texto: `Cuando esté corregido en Softland, tocá ${MARCAR_COMO_CORREGIDO}.`,
      },
    ],
  }
}

/**
 * Pasos sugeridos para un error: primero por mensaje, después por status de
 * Softland y, si nada encaja, una revisión general. Son heurísticas: para
 * cubrir un caso nuevo, se suma una regla acá.
 */
export function recomendacionPara(error: ErrorTransaccion): Recomendacion {
  for (const regla of REGLAS_POR_MENSAJE) {
    const recomendacion = regla(error)
    if (recomendacion) return recomendacion
  }
  return (POR_STATUS[error.statusSoftland] ?? revisionGeneral)(error)
}
