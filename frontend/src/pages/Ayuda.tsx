import type { ReactNode } from 'react'
import AppLayout from '../components/AppLayout'
import Card from '../components/Card'
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  BarChartIcon,
  HelpIcon,
  HistoryIcon,
  InboxIcon,
  InfoIcon,
  LightbulbIcon,
  ReceiptIcon,
  TargetIcon,
} from '../components/icons'
import PageHeader from '../components/PageHeader'
import {
  AsignadoTag,
  DescartadoTag,
  EnProgresoTag,
  ErrorTag,
  ReprocesandoTag,
  RequiereCorreccionTag,
  ResueltoTag,
} from '../components/Tag'
import { ESTADOS_SOFTLAND } from '../constants/estadosSoftland'
import { MINUTO_SYNC } from '../constants/sincronizacion'
import { colors } from '../styles'
import type { AppPage } from '../types'
import { cn } from '../utils/cn'

/** Secciones de la página, en orden; el índice de arriba salta a cada una. */
const SECCIONES: {
  id: string
  titulo: string
  icono: ReactNode
  tono: { background: string; text: string }
}[] = [
  {
    id: 'que-es',
    titulo: 'Qué es IRIS',
    icono: <HelpIcon className="h-5 w-5" />,
    tono: colors.label.green,
  },
  {
    id: 'bandeja',
    titulo: 'Bandeja de errores',
    icono: <InboxIcon className="h-5 w-5" />,
    tono: colors.label.red,
  },
  {
    id: 'rendimiento',
    titulo: 'Rendimiento',
    icono: <BarChartIcon className="h-5 w-5" />,
    tono: colors.label.blue,
  },
  {
    id: 'objetivos',
    titulo: 'Objetivos',
    icono: <TargetIcon className="h-5 w-5" />,
    tono: colors.label.purple,
  },
  {
    id: 'sin-cae',
    titulo: 'Sin CAE',
    icono: <ReceiptIcon className="h-5 w-5" />,
    tono: colors.label.orange,
  },
  {
    id: 'historial',
    titulo: 'Historial',
    icono: <HistoryIcon className="h-5 w-5" />,
    tono: colors.label.gray,
  },
  {
    id: 'que-cuenta',
    titulo: 'Qué entra en cada cuenta',
    icono: <InfoIcon className="h-5 w-5" />,
    tono: colors.label.blue,
  },
  {
    id: 'cuidado',
    titulo: 'Para tener en cuenta',
    icono: <LightbulbIcon className="h-5 w-5" />,
    tono: colors.label.orange,
  },
  {
    id: 'glosario',
    titulo: 'Glosario',
    icono: <InfoIcon className="h-5 w-5" />,
    tono: colors.label.gray,
  },
]

// Como en el popup de "Posibles estados": primero los que hay que corregir.
const ORDEN_STATUS = ['E', 'D', 'B', 'N', 'S', 'X']
const STATUS_ORDENADOS = [...ESTADOS_SOFTLAND].sort(
  (a, b) => ORDEN_STATUS.indexOf(a.code) - ORDEN_STATUS.indexOf(b.code),
)

const ESTADOS_GESTION: { tag: () => ReactNode; texto: string }[] = [
  { tag: ErrorTag, texto: 'Llegó de Softland y nadie lo tomó todavía.' },
  { tag: AsignadoTag, texto: 'Tiene un responsable.' },
  { tag: EnProgresoTag, texto: 'El responsable lo está mirando.' },
  {
    tag: ReprocesandoTag,
    texto:
      'Se marcó como corregido: Softland lo vuelve a procesar y se espera el resultado.',
  },
  {
    tag: RequiereCorreccionTag,
    texto: 'Se reprocesó pero volvió a fallar: hay que revisarlo de nuevo.',
  },
  {
    tag: ResueltoTag,
    texto: 'Softland lo procesó bien (status S).',
  },
  {
    tag: DescartadoTag,
    texto:
      'No interesa resolverlo desde IRIS. Sale de la bandeja y no vuelve aunque siga en error.',
  },
]

/** Filas de la tabla "Qué entra en cada cuenta". */
const CUENTAS: {
  que: string
  bandeja: string
  rendimiento: string
  objetivos: string
  historial: string
}[] = [
  {
    que: 'Errores (E y B)',
    bandeja: 'Sí',
    rendimiento: 'Sí',
    objetivos: 'Sí',
    historial: 'Sí',
  },
  {
    que: 'Diferencias (D)',
    bandeja: 'Pestaña aparte, no suma',
    rendimiento: 'Bloque aparte',
    objetivos: 'No',
    historial: 'Sí',
  },
  {
    que: 'Excluidas (X)',
    bandeja: 'Pestaña aparte, no suma',
    rendimiento: 'Bloque aparte',
    objetivos: 'No',
    historial: 'Sí',
  },
  {
    que: 'Sin CAE',
    bandeja: 'No, tiene su sección',
    rendimiento: 'No',
    objetivos: 'No',
    historial: 'Sólo en la actividad del equipo',
  },
]

const GLOSARIO: { termino: string; definicion: string }[] = [
  {
    termino: 'Corregido',
    definicion:
      'Lo arreglaste y lo mandaste a reprocesar desde IRIS. Todavía no sabemos si Softland lo aceptó.',
  },
  {
    termino: 'Resuelto',
    definicion: 'Softland lo procesó bien: quedó en status S.',
  },
  {
    termino: 'Cerrado solo',
    definicion:
      'La verificación automática lo encontró en S sin que nadie lo reprocesara desde IRIS: se arregló por fuera.',
  },
  {
    termino: 'Reproceso',
    definicion:
      'Pedirle a Softland que vuelva a procesar una transacción. La pasa a status N y la toma en la próxima corrida.',
  },
  {
    termino: 'Efectividad',
    definicion:
      'De los reprocesos que se mandaron desde IRIS, cuántos terminaron en S en vez de volver a fallar.',
  },
  {
    termino: 'North Star (NSM)',
    definicion:
      'El indicador principal del equipo: el que dice si vamos bien. Hay una sola activa.',
  },
  {
    termino: 'Key Result (KR)',
    definicion: 'Una meta concreta y medible que ayuda a mover la North Star.',
  },
]

function Seccion({
  id,
  ir,
  children,
}: {
  id: string
  /** Botón a la derecha del título que lleva a esa pantalla. */
  ir?: { texto: string; onClick: () => void }
  children: ReactNode
}) {
  const s = SECCIONES.find((x) => x.id === id)!
  return (
    <section id={`ayuda-${id}`} className="scroll-mt-24">
      <Card className="flex flex-col gap-md">
        <div className="flex flex-wrap items-center gap-md">
          <span
            style={{ backgroundColor: s.tono.background, color: s.tono.text }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          >
            {s.icono}
          </span>
          <h2 className="flex-1 text-h3 text-gray-darkest">{s.titulo}</h2>
          {ir && <IrA texto={ir.texto} onClick={ir.onClick} />}
        </div>
        <div className="flex flex-col gap-sm text-body text-gray-dark">
          {children}
        </div>
      </Card>
    </section>
  )
}

function Lista({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-xs">
      {items.map((item, i) => (
        <li key={i} className="flex gap-sm">
          <span
            aria-hidden
            className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-gray-default"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function IrA({ texto, onClick }: { texto: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ borderColor: colors.background.border }}
      className="group inline-flex cursor-pointer items-center gap-sm rounded-full border bg-background-surface py-xxs pr-xxs pl-md text-bodySmall font-semibold text-gray-dark transition-colors hover:border-primary-default hover:text-primary-dark"
    >
      {texto}
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-background-subtle transition-transform duration-200 group-hover:rotate-45">
        <ArrowUpRightIcon className="h-3.5 w-3.5" />
      </span>
    </button>
  )
}

const b = (texto: string) => (
  <strong className="font-semibold text-gray-darkest">{texto}</strong>
)

/** Ayuda de IRIS: qué hace cada pantalla y qué entra en cada cuenta. */
function Ayuda({ onNavigate }: { onNavigate: (page: AppPage) => void }) {
  function irASeccion(id: string) {
    document
      .getElementById(`ayuda-${id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <AppLayout
      activeItem="inicio"
      onNavigate={onNavigate}
      migas={[{ label: 'Inicio', page: 'home' }, { label: 'Ayuda' }]}
    >
      <div id="ayuda-arriba" className="scroll-mt-24">
        <PageHeader
          titulo="Ayuda"
          descripcion="Cómo funciona IRIS y qué muestra cada pantalla"
        />
      </div>

      <nav aria-label="Secciones de la ayuda" className="flex flex-wrap gap-sm">
        {SECCIONES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => irASeccion(s.id)}
            className="cursor-pointer rounded-full bg-background-surface px-md py-xs text-bodySmall font-semibold text-gray-dark shadow-soft ring-1 ring-slate-900/[0.04] transition-colors hover:text-primary-dark"
          >
            {s.titulo}
          </button>
        ))}
      </nav>

      <Seccion id="que-es">
        <p>
          IRIS junta en un solo lugar las transacciones que Softland no pudo
          procesar en todas las empresas, para que el equipo las reparta, las
          corrija y siga cómo quedan. También muestra los comprobantes que ARCA
          todavía no autorizó.
        </p>
        <Lista
          items={[
            <>
              Los errores se actualizan {b('cada hora en punto')}; los Sin CAE,{' '}
              {b(`cada hora a los ${MINUTO_SYNC.sinCae} minutos`)}. Arriba a la
              derecha de cada pantalla ves cuándo es la próxima.
            </>,
            <>
              IRIS no cambia nada en Softland salvo cuando marcás un error como
              corregido: ahí pide el reproceso.
            </>,
          ]}
        />
      </Seccion>

      <Seccion
        id="bandeja"
        ir={{ texto: 'Ir a la bandeja', onClick: () => onNavigate('bandeja') }}
      >
        <p>
          La lista de transacciones con problemas. Desde acá te asignás un
          error, lo corregís y lo mandás a reprocesar.
        </p>
        <h3 className="mt-xs text-body font-semibold text-gray-darkest">
          Status de Softland
        </h3>
        <ul className="grid grid-cols-1 gap-sm @xl:grid-cols-2 @5xl:grid-cols-3">
          {STATUS_ORDENADOS.map((e) => (
            <li
              key={e.code}
              className="flex items-center gap-md rounded-2xl bg-background-subtle px-md py-sm"
            >
              <span
                style={{ color: e.color, backgroundColor: e.background }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-semibold"
              >
                {e.code}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-bodySmall font-semibold text-gray-darkest">
                  {e.label}
                </span>
                <span className="text-caption text-gray-medium">
                  {e.code === 'D'
                    ? 'Se corrige en Softland: no se reprocesa desde IRIS.'
                    : e.code === 'X'
                      ? 'Quedó fuera del proceso. No es un error a resolver.'
                      : e.description}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <h3 className="mt-xs text-body font-semibold text-gray-darkest">
          Estados en IRIS
        </h3>
        <ul className="flex flex-col gap-sm">
          {ESTADOS_GESTION.map(({ tag: Tag, texto }, i) => (
            <li
              key={i}
              className="grid grid-cols-1 items-center gap-xs @md:grid-cols-[180px_1fr] @md:gap-md"
            >
              <span>
                <Tag />
              </span>
              <span className="text-bodySmall text-gray-dark">{texto}</span>
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion
        id="rendimiento"
        ir={{
          texto: 'Ir a Rendimiento',
          onClick: () => onNavigate('metricas'),
        }}
      >
        <p>
          Cómo viene el equipo con los errores en el período que elijas (7, 30 o
          90 días), comparado con el período anterior.
        </p>
        <Lista
          items={[
            <>
              {b('Llegadas, asignaciones, correcciones y resoluciones')}:
              cuántos errores entraron y qué se hizo con ellos.
            </>,
            <>
              {b('Tiempos')}: cuánto se tarda, desde que se detecta el error, en
              asignarlo, corregirlo y resolverlo.
            </>,
            <>
              {b('Efectividad')}: de los reprocesos mandados desde IRIS, qué
              porcentaje terminó en S.
            </>,
            <>
              Sólo cuenta los {b('errores (E y B)')}. Las diferencias (D) y las
              excluidas (X) se muestran en un bloque aparte, sin mezclarse. Los
              Sin CAE no entran.
            </>,
          ]}
        />
      </Seccion>

      <Seccion
        id="objetivos"
        ir={{ texto: 'Ir a Objetivos', onClick: () => onNavigate('objetivos') }}
      >
        <p>
          Las metas del equipo: una North Star y los Key Results que la empujan.
          Los valores se calculan solos con los datos de la bandeja y se
          actualizan cada vez que entrás; no hay que cargar nada.
        </p>
        <h3 className="mt-xs text-body font-semibold text-gray-darkest">
          Cómo se arman
        </h3>
        <Lista
          items={[
            <>
              {b('North Star')}: el indicador principal, el que dice si el
              equipo va bien. Hay {b('una sola activa')}: si activás otra, IRIS
              te pregunta y pausa la anterior.
            </>,
            <>
              {b('Key Results')}: metas más chicas que aportan a la North Star.
              Si borrás la North Star, sus KR no se borran: quedan sueltos.
            </>,
            <>
              Cada meta se arma eligiendo {b('qué medir')} (por ejemplo,
              resueltos a tiempo, tiempo hasta asignar, errores sin responsable
              o efectividad de reprocesos), {b('el valor a alcanzar')} y si
              tiene que quedar {b('al menos')} o {b('como mucho')} en ese valor.
            </>,
            <>
              Se puede acotar a un {b('módulo')} o a una {b('empresa')} y elegir
              {b(' cuántos días')} mira hacia atrás (30 por defecto). Las que
              miran la bandeja de ahora, como errores sin responsable, usan la
              foto del momento.
            </>,
            <>
              Para algo que IRIS no mide (por ejemplo, una encuesta) está la{' '}
              {b('carga manual')}: ese valor sí se actualiza a mano.
            </>,
            <>
              Si todavía no hay metas, IRIS ofrece una {b('propuesta armada')}{' '}
              para arrancar, que después se puede editar.
            </>,
          ]}
        />
        <h3 className="mt-xs text-body font-semibold text-gray-darkest">
          Pausar o borrar
        </h3>
        <Lista
          items={[
            <>
              Cualquier meta se puede {b('pausar (desactivar)')} con su
              interruptor: deja de medirse y pasa a la lista de {b('Pausadas')},
              abajo de todo. Queda guardada tal cual y la activás cuando
              quieras.
            </>,
            <>
              Desde el menú de más acciones se puede {b('pausar todo')} junto o{' '}
              {b('eliminar todo')} para empezar de cero. Eliminar no se puede
              deshacer.
            </>,
          ]}
        />
        <h3 className="mt-xs text-body font-semibold text-gray-darkest">
          Cómo leer el avance
        </h3>
        <Lista
          items={[
            <>{b('Cumplida')}: llegó a la meta (100% o más).</>,
            <>{b('En camino')}: hizo el 70% o más del camino.</>,
            <>{b('En riesgo')}: está por debajo del 70%.</>,
            <>{b('Sin datos')}: todavía no hay datos para calcularla.</>,
            <>
              Igual que Rendimiento, sólo mira los errores (E y B). Ni las D, ni
              las X, ni los Sin CAE suman.
            </>,
          ]}
        />
      </Seccion>

      <Seccion
        id="sin-cae"
        ir={{ texto: 'Ir a Sin CAE', onClick: () => onNavigate('sin-cae') }}
      >
        <p>
          Comprobantes emitidos que ARCA todavía no autorizó (no tienen CAE). Es
          otro circuito, aparte de los errores de integración.
        </p>
        <Lista
          items={[
            <>
              Cada uno trae un {b('diagnóstico')}: si traba el punto de venta,
              si ARCA lo rechazó, si no se llegó a enviar, etc.
            </>,
            <>
              Marcarlo como corregido o descartarlo{' '}
              {b('sólo cambia el estado en IRIS')}: no toca Softland ni ARCA. Lo
              que cerrás a mano no se vuelve a abrir solo.
            </>,
            <>{b('No entra')} en Rendimiento ni en Objetivos.</>,
          ]}
        />
      </Seccion>

      <Seccion
        id="historial"
        ir={{
          texto: 'Ir al Historial',
          onClick: () => onNavigate('historial'),
        }}
      >
        <p>Qué se corrigió y qué se resolvió en cada período.</p>
        <Lista
          items={[
            <>
              {b('Mi actividad')}: lo que tenés asignado, lo que corregiste y
              cómo te fue.
            </>,
            <>
              {b('Todo el equipo')}: los cierres de todos y la actividad día por
              día. Esa actividad muestra todo lo que pasó, también lo de las D,
              las X y los Sin CAE.
            </>,
          ]}
        />
      </Seccion>

      <Seccion id="que-cuenta">
        <p>Dónde aparece cada tipo de caso.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-separate border-spacing-0 text-left text-bodySmall">
            <thead>
              <tr className="text-caption font-semibold tracking-wide text-gray-default uppercase">
                {['', 'Bandeja', 'Rendimiento', 'Objetivos', 'Historial'].map(
                  (h) => (
                    <th key={h} className="px-sm pb-sm font-semibold">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {CUENTAS.map((fila) => (
                <tr key={fila.que}>
                  <td
                    style={{ borderColor: colors.background.border }}
                    className="border-t px-sm py-sm font-semibold text-gray-darkest"
                  >
                    {fila.que}
                  </td>
                  {[
                    fila.bandeja,
                    fila.rendimiento,
                    fila.objetivos,
                    fila.historial,
                  ].map((valor, i) => (
                    <td
                      key={i}
                      style={{ borderColor: colors.background.border }}
                      className={cn(
                        'border-t px-sm py-sm',
                        valor === 'Sí'
                          ? 'font-semibold text-label-green-text'
                          : valor === 'No'
                            ? 'text-gray-default'
                            : 'text-gray-dark',
                      )}
                    >
                      {valor}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Seccion>

      <Seccion id="cuidado">
        <Lista
          items={[
            <>
              {b('Marcar como corregido manda el reproceso')}: Softland vuelve
              la transacción a status N y la procesa de nuevo. Hacelo sólo
              cuando ya la arreglaste.
            </>,
            <>
              Las {b('diferencias (D)')} se corrigen en Softland. Desde IRIS no
              se pueden reprocesar.
            </>,
            <>
              Si un error resuelto vuelve a aparecer en Softland, IRIS lo{' '}
              {b('reabre')} solo y lo avisa en su historial.
            </>,
            <>
              Si un error se arregla por fuera de IRIS, la verificación
              automática lo encuentra en S y lo cierra solo.
            </>,
          ]}
        />
      </Seccion>

      <Seccion id="glosario">
        <dl className="flex flex-col gap-sm">
          {GLOSARIO.map((g) => (
            <div
              key={g.termino}
              className="grid grid-cols-1 gap-xxs @md:grid-cols-[180px_1fr] @md:gap-md"
            >
              <dt className="font-semibold text-gray-darkest">{g.termino}</dt>
              <dd className="text-gray-dark">{g.definicion}</dd>
            </div>
          ))}
        </dl>
      </Seccion>

      <div className="flex justify-center pb-lg">
        <button
          type="button"
          onClick={() => irASeccion('arriba')}
          style={{ borderColor: colors.background.border }}
          className="group inline-flex cursor-pointer items-center gap-sm rounded-full border bg-background-surface py-xxs pr-md pl-xxs text-bodySmall font-semibold text-gray-dark shadow-soft transition-colors hover:border-primary-default hover:text-primary-dark"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-background-subtle transition-transform duration-200 group-hover:-translate-y-0.5">
            <ArrowLeftIcon className="h-4 w-4 rotate-90" />
          </span>
          Volver arriba
        </button>
      </div>
    </AppLayout>
  )
}

export default Ayuda
