import { useState } from 'react'
import AccionesTodoMenu from '../components/AccionesTodoMenu'
import AppLayout from '../components/AppLayout'
import Button from '../components/Button'
import Card from '../components/Card'
import {
  PencilIcon,
  PlusIcon,
  RefreshIcon,
  StarIcon,
  TargetIcon,
  TrashIcon,
} from '../components/icons'
import EliminarObjetivoModal from '../components/EliminarObjetivoModal'
import NorthStarActivaModal from '../components/NorthStarActivaModal'
import ObjetivoCreadoModal from '../components/ObjetivoCreadoModal'
import ObjetivoModal from '../components/ObjetivoModal'
import PageHeader from '../components/PageHeader'
import Panel from '../components/Panel'
import Switch from '../components/Switch'
import Tag from '../components/Tag'
import {
  ESTADO_OBJETIVO,
  formatValor,
  tendenciaObjetivo,
  textoAlcance,
  textoMeta,
} from '../constants/objetivos'
import { useObjetivos } from '../hooks/useObjetivos'
import { colors, spacing } from '../styles'
import type { AppPage, IndicadorInfo, Objetivo, TipoObjetivo } from '../types'
import { cn } from '../utils/cn'

interface ModalAbierto {
  objetivo: Objetivo | null
  tipo: TipoObjetivo
}

const idTarjeta = (id: string) => `objetivo-${id}`

/** Lleva la tarjeta a la vista y la hace titilar para que se encuentre. */
function irATarjeta(id: string) {
  const tarjeta = document.getElementById(idTarjeta(id))
  if (!tarjeta) return
  tarjeta.scrollIntoView({ behavior: 'smooth', block: 'center' })
  const brillo = 'rgba(141, 198, 63, 0.55)'
  tarjeta.animate(
    [
      { boxShadow: `0 0 0 0 ${brillo}` },
      { boxShadow: `0 0 0 6px ${brillo}` },
      { boxShadow: '0 0 0 0 rgba(141, 198, 63, 0)' },
    ],
    { duration: 1100, delay: 350, iterations: 2, easing: 'ease-out' },
  )
}

function Objetivos({ onNavigate }: { onNavigate: (page: AppPage) => void }) {
  const {
    data,
    loading,
    error,
    refetch,
    guardar,
    borrar,
    activar,
    usarPropuesta,
    pausarTodo,
    borrarTodo,
  } = useObjetivos()
  const [modal, setModal] = useState<ModalAbierto | null>(null)
  /** La que se acaba de crear: muestra el popup de éxito. */
  const [creado, setCreado] = useState<Objetivo | null>(null)
  /** North Star pausada que se quiso activar habiendo otra activa. */
  const [conflicto, setConflicto] = useState<Objetivo | null>(null)
  /** La que se pidió borrar desde "Pausadas": espera la confirmación. */
  const [aBorrar, setABorrar] = useState<Objetivo | null>(null)
  const [cargandoPropuesta, setCargandoPropuesta] = useState(false)

  const catalogo = data?.catalogo ?? []
  const objetivos = data?.objetivos ?? []
  const northStars = objetivos.filter((o) => o.tipo === 'NSM')
  const nsm = northStars.find((o) => o.activo) ?? null
  const krs = objetivos.filter((o) => o.tipo === 'KR' && o.activo)
  // Los que empujan a la North Star activa van primero.
  const krsOrdenados = [
    ...krs.filter((k) => nsm && k.padreId === nsm.id),
    ...krs.filter((k) => !nsm || k.padreId !== nsm.id),
  ]
  const pausadas = objetivos.filter((o) => !o.activo)
  const cumplidos = krs.filter((k) => k.estado === 'CUMPLIDO').length
  const alcanceDe = (o: Objetivo): IndicadorInfo['alcance'] =>
    catalogo.find((i) => i.id === o.indicador)?.alcance ?? 'periodo'

  const abrir = (objetivo: Objetivo | null, tipo: TipoObjetivo = 'KR') =>
    setModal({ objetivo, tipo: objetivo?.tipo ?? tipo })

  async function propuesta() {
    setCargandoPropuesta(true)
    await usarPropuesta()
    setCargandoPropuesta(false)
  }

  return (
    <AppLayout
      activeItem="objetivos"
      onNavigate={onNavigate}
      migas={[{ label: 'Inicio', page: 'home' }, { label: 'Objetivos' }]}
      recordarScroll="objetivos"
    >
      <PageHeader
        eyebrow="Hacia dónde va el equipo · North Star y Key Results"
        titulo="Objetivos"
        acciones={
          <>
            <Button
              text="Nueva métrica"
              color={colors.primary.default}
              icon={<PlusIcon className="h-4 w-4" />}
              onClick={() => abrir(null, nsm ? 'KR' : 'NSM')}
              disabled={!data}
              size={{ padding: `${spacing.sm} ${spacing.lg}` }}
            />
            {objetivos.length > 0 && (
              <AccionesTodoMenu
                northStars={northStars.length}
                krs={objetivos.length - northStars.length}
                activos={objetivos.length - pausadas.length}
                onPausarTodo={pausarTodo}
                onEliminarTodo={borrarTodo}
              />
            )}
            <Button
              text=""
              color={colors.primary.default}
              onClick={refetch}
              disabled={loading}
              aria-label={loading ? 'Actualizando…' : 'Actualizar'}
              title="Actualizar"
              icon={
                <RefreshIcon
                  className={cn('h-5 w-5', loading && 'animate-spin')}
                />
              }
              size={{ padding: spacing.sm }}
            />
          </>
        }
      />

      {error && (
        <div className="flex items-center justify-between gap-md rounded-xxl border border-label-red-outline bg-label-red-background px-lg py-md text-bodySmall font-semibold text-label-red-text">
          {error}
          <button type="button" className="underline" onClick={refetch}>
            Reintentar
          </button>
        </div>
      )}

      {!data ? (
        <div className="flex flex-col gap-lg">
          <div className="h-64 animate-pulse rounded-xxl bg-background-subtle" />
          <div className="grid grid-cols-1 gap-lg @2xl:grid-cols-2 @6xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-56 animate-pulse rounded-xxl bg-background-subtle"
              />
            ))}
          </div>
        </div>
      ) : objetivos.length === 0 ? (
        <SinObjetivos
          cargando={cargandoPropuesta}
          onPropuesta={() => void propuesta()}
          onDeCero={() => abrir(null, 'NSM')}
        />
      ) : (
        <>
          {nsm ? (
            <NorthStar
              nsm={nsm}
              alcance={alcanceDe(nsm)}
              krs={krs.filter((k) => k.padreId === nsm.id)}
              onEditar={() => abrir(nsm)}
              onActivar={(activo) => activar(nsm.id, activo)}
            />
          ) : (
            <SinNorthStar
              hayPausadas={northStars.length > 0}
              onCrear={() => abrir(null, 'NSM')}
            />
          )}

          <section className="flex flex-col gap-md">
            <div className="flex flex-wrap items-end justify-between gap-md">
              <div className="flex flex-col gap-xxs">
                <h2 className="text-h4 font-medium text-gray-darkest">
                  Key Results
                </h2>
                <p className="text-bodySmall text-gray-medium">
                  {krs.length
                    ? `${cumplidos} de ${krs.length} cumplidos`
                    : 'Los resultados concretos que empujan a la North Star'}
                </p>
              </div>
              <Button
                text="Agregar KR"
                variant="outline"
                color={colors.primary.dark}
                icon={<PlusIcon className="h-4 w-4" />}
                onClick={() => abrir(null, 'KR')}
                size={{ padding: `${spacing.xs} ${spacing.md}` }}
              />
            </div>

            {krsOrdenados.length ? (
              <div className="grid grid-cols-1 gap-lg @2xl:grid-cols-2 @6xl:grid-cols-3">
                {krsOrdenados.map((kr) => (
                  <KrCard
                    key={kr.id}
                    kr={kr}
                    alcance={alcanceDe(kr)}
                    suelto={Boolean(nsm) && kr.padreId !== nsm?.id}
                    onEditar={() => abrir(kr)}
                    onActivar={(activo) => activar(kr.id, activo)}
                  />
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => abrir(null, 'KR')}
                className="flex cursor-pointer flex-col items-center gap-xs rounded-xxl border-2 border-dashed border-background-border px-lg py-xl text-center transition-colors hover:border-primary-light hover:bg-primary-lightest/40"
              >
                <span className="text-body font-semibold text-gray-dark">
                  Todavía no hay KR activos
                </span>
                <span className="text-bodySmall text-gray-medium">
                  Agregá uno o activá alguno de los pausados.
                </span>
              </button>
            )}
          </section>

          {pausadas.length > 0 && (
            <Panel
              titulo="Pausadas"
              subtitulo="Guardadas sin seguimiento: activalas cuando quieras volver a medirlas"
              padding="none"
            >
              <ul className="flex flex-col gap-xs px-sm pb-sm">
                {pausadas.map((o) => (
                  <li
                    key={o.id}
                    id={idTarjeta(o.id)}
                    className="flex items-center gap-md rounded-full px-sm py-sm transition-colors hover:bg-background-subtle"
                  >
                    <span
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                        o.tipo === 'NSM'
                          ? 'bg-primary-lightest text-primary-dark'
                          : 'bg-background-subtle text-gray-medium',
                      )}
                    >
                      {o.tipo === 'NSM' ? (
                        <StarIcon className="h-4 w-4" />
                      ) : (
                        <TargetIcon className="h-4 w-4" />
                      )}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-body font-semibold text-gray-darkest">
                        {o.nombre}
                      </span>
                      <span className="truncate text-caption text-gray-medium">
                        {o.tipo === 'NSM' ? 'North Star' : 'KR'} · meta{' '}
                        {textoMeta(o)} · hoy {formatValor(o.valor, o.unidad)}
                      </span>
                    </span>
                    <BotonEliminar
                      label={`Eliminar "${o.nombre}"`}
                      onClick={() => setABorrar(o)}
                    />
                    <BotonEditar onClick={() => abrir(o)} />
                    <Switch
                      checked={false}
                      onChange={() => {
                        // Sólo una North Star activa: si ya hay otra, se pregunta.
                        if (o.tipo === 'NSM' && nsm) setConflicto(o)
                        else activar(o.id, true)
                      }}
                      label={`Activar "${o.nombre}"`}
                    />
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </>
      )}

      {modal && data && (
        <ObjetivoModal
          key={modal.objetivo?.id ?? `nuevo-${modal.tipo}`}
          open
          onClose={() => setModal(null)}
          objetivo={modal.objetivo}
          tipoInicial={modal.tipo}
          catalogo={catalogo}
          northStars={northStars}
          onGuardar={async (input, id) => {
            const guardado = await guardar(input, id)
            if (!id && guardado) setCreado(guardado)
          }}
          onBorrar={borrar}
        />
      )}

      {aBorrar && (
        <EliminarObjetivoModal
          objetivo={aBorrar}
          krsQueAportan={
            objetivos.filter((o) => o.padreId === aBorrar.id).length
          }
          onConfirmar={() => borrar(aBorrar.id)}
          onClose={() => setABorrar(null)}
        />
      )}

      {conflicto && nsm && (
        <NorthStarActivaModal
          nueva={conflicto}
          actual={nsm}
          onClose={() => setConflicto(null)}
          onVerActual={() => {
            setConflicto(null)
            irATarjeta(nsm.id)
          }}
          onReemplazar={() => {
            setConflicto(null)
            activar(conflicto.id, true)
            // La tarjeta de arriba pasa a ser la nueva: se espera a que pinte.
            window.setTimeout(() => irATarjeta(conflicto.id), 60)
          }}
        />
      )}

      {creado && (
        <ObjetivoCreadoModal
          objetivo={creado}
          onClose={() => setCreado(null)}
          onVer={() => {
            setCreado(null)
            irATarjeta(creado.id)
          }}
        />
      )}
    </AppLayout>
  )
}

/** La tarjeta verde oscura de arriba: la North Star activa y sus KR. */
function NorthStar({
  nsm,
  alcance,
  krs,
  onEditar,
  onActivar,
}: {
  nsm: Objetivo
  alcance: IndicadorInfo['alcance']
  krs: Objetivo[]
  onEditar: () => void
  onActivar: (activo: boolean) => void
}) {
  const estado = ESTADO_OBJETIVO[nsm.estado]
  const tendencia = tendenciaObjetivo(nsm)

  return (
    <section
      id={idTarjeta(nsm.id)}
      className="relative overflow-hidden rounded-xxl bg-[linear-gradient(160deg,#14532d,#0b2e18)] p-lg text-white shadow-lift @2xl:p-xl"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full border-[40px] border-white/[0.05]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-brand-lime/20 blur-3xl"
      />

      <div className="relative grid grid-cols-1 gap-xl @4xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-lg">
          <div className="flex items-start justify-between gap-md">
            <span className="inline-flex items-center gap-xs text-caption font-semibold tracking-wide text-brand-limeSoft uppercase">
              <StarIcon className="h-3.5 w-3.5" />
              North Star Metric
            </span>
            <span className="flex items-center gap-sm">
              <Switch
                checked
                onChange={onActivar}
                tono="oscuro"
                label="Pausar la North Star"
              />
              <BotonEditar tono="oscuro" onClick={onEditar} />
            </span>
          </div>

          <div className="flex flex-col gap-xs">
            <h2 className="text-h2 font-medium tracking-tight">{nsm.nombre}</h2>
            {nsm.descripcion && (
              <p className="max-w-[60ch] text-body text-white/70">
                {nsm.descripcion}
              </p>
            )}
            <span className="text-caption text-white/55">
              {textoAlcance(nsm, alcance)}
            </span>
          </div>

          <div className="flex flex-col gap-sm">
            <div className="flex flex-wrap items-end justify-between gap-md">
              <span className="flex items-baseline gap-sm">
                {nsm.valor === null ? (
                  <span className="text-h3 font-medium text-white/60">
                    Sin datos en el período
                  </span>
                ) : (
                  <span className="text-cifra font-medium tracking-tight tabular-nums">
                    {formatValor(nsm.valor, nsm.unidad)}
                  </span>
                )}
                <span className="text-bodySmall text-white/65">
                  meta: {textoMeta(nsm)}
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-sm">
                {tendencia && (
                  <span
                    className={cn(
                      'rounded-full px-sm py-xxs text-caption font-semibold',
                      tendencia.mejora === null
                        ? 'bg-white/10 text-white/75'
                        : tendencia.mejora
                          ? 'bg-brand-lime/20 text-brand-limeSoft'
                          : 'bg-[#f59e0b]/20 text-[#fcd34d]',
                    )}
                  >
                    {tendencia.text}
                  </span>
                )}
                <span className="inline-flex items-center gap-xs rounded-full bg-white/10 px-sm py-xxs text-caption font-semibold tracking-wide uppercase">
                  <span
                    aria-hidden
                    style={{ backgroundColor: estado.barra }}
                    className="h-1.5 w-1.5 rounded-full"
                  />
                  {estado.label}
                </span>
              </span>
            </div>
            <Barra progreso={nsm.progreso} color={colors.brand.lime} oscura />
          </div>
        </div>

        <div className="flex flex-col gap-sm rounded-xl bg-white/[0.06] p-md ring-1 ring-white/10">
          <span className="text-caption font-semibold tracking-wide text-white/60 uppercase">
            KR que la empujan
          </span>
          {krs.length ? (
            <ul className="flex flex-col gap-xs">
              {krs.map((kr) => (
                <li
                  key={kr.id}
                  className="flex items-center justify-between gap-sm rounded-full bg-white/[0.06] py-xs pr-sm pl-md"
                >
                  <span className="flex min-w-0 items-center gap-sm">
                    <span
                      aria-hidden
                      style={{
                        backgroundColor: ESTADO_OBJETIVO[kr.estado].barra,
                      }}
                      className="h-2 w-2 shrink-0 rounded-full"
                    />
                    <span className="truncate text-bodySmall font-semibold">
                      {kr.nombre}
                    </span>
                  </span>
                  <span className="shrink-0 text-caption text-white/70 tabular-nums">
                    {kr.progreso === null ? '—' : `${kr.progreso} %`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-bodySmall text-white/60">
              Todavía no tiene KR. Creá uno y elegí esta North Star en "Aporta
              a".
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function KrCard({
  kr,
  alcance,
  suelto,
  onEditar,
  onActivar,
}: {
  kr: Objetivo
  alcance: IndicadorInfo['alcance']
  /** No aporta a la North Star activa. */
  suelto: boolean
  onEditar: () => void
  onActivar: (activo: boolean) => void
}) {
  const estado = ESTADO_OBJETIVO[kr.estado]
  const tendencia = tendenciaObjetivo(kr)

  return (
    <Card
      id={idTarjeta(kr.id)}
      padding="none"
      className="relative flex flex-col gap-md overflow-hidden p-lg"
    >
      <span
        aria-hidden
        style={{ backgroundColor: estado.background }}
        className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full opacity-60 blur-2xl"
      />
      <div className="relative flex items-start justify-between gap-sm">
        <span
          style={{ color: estado.color, backgroundColor: estado.background }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        >
          <TargetIcon className="h-4 w-4" />
        </span>
        <span className="flex items-center gap-sm">
          <Switch
            checked
            onChange={onActivar}
            label={`Pausar "${kr.nombre}"`}
          />
          <BotonEditar onClick={onEditar} />
        </span>
      </div>

      <div className="relative flex flex-col gap-xxs">
        <h3 className="text-bodyLarge font-semibold text-gray-darkest">
          {kr.nombre}
        </h3>
        <span className="text-caption text-gray-medium">
          {textoAlcance(kr, alcance)}
          {suelto && ' · no aporta a la North Star activa'}
        </span>
      </div>

      <div className="relative mt-auto flex flex-col gap-sm">
        <div className="flex items-end justify-between gap-sm">
          <span className="text-cifra-sm font-medium tracking-tight text-gray-darkest tabular-nums">
            {formatValor(kr.valor, kr.unidad)}
          </span>
          <Tag
            text={estado.label}
            color={estado.color}
            backgroundColor={estado.background}
          />
        </div>
        <Barra progreso={kr.progreso} color={estado.barra} />
        <div className="flex flex-wrap items-center justify-between gap-x-md gap-y-xxs text-caption">
          <span className="text-gray-medium">
            Meta: <b className="text-gray-dark">{textoMeta(kr)}</b>
          </span>
          {tendencia && (
            <span
              style={{
                color:
                  tendencia.mejora === null
                    ? colors.gray.medium
                    : tendencia.mejora
                      ? colors.status.success
                      : colors.status.error,
              }}
              className="font-semibold"
            >
              {tendencia.text}
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}

function Barra({
  progreso,
  color,
  oscura = false,
}: {
  progreso: number | null
  color: string
  oscura?: boolean
}) {
  return (
    <span
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progreso ?? undefined}
      aria-label="Avance hacia la meta"
      className={cn(
        'block h-2.5 overflow-hidden rounded-full',
        oscura ? 'bg-white/15' : 'bg-background-subtle',
      )}
    >
      <span
        style={{ width: `${progreso ?? 0}%`, backgroundColor: color }}
        className={cn(
          'block h-full rounded-full transition-[width] duration-700',
          progreso ? 'min-w-2' : '',
        )}
      />
    </span>
  )
}

function BotonEliminar({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-background-surface text-gray-dark ring-1 ring-background-border transition-all duration-200 hover:bg-status-error hover:text-white hover:ring-status-error',
        'focus-visible:ring-2 focus-visible:ring-status-error/50 focus-visible:ring-offset-2 focus-visible:outline-none',
      )}
    >
      <TrashIcon className="h-4 w-4" />
    </button>
  )
}

function BotonEditar({
  onClick,
  tono = 'claro',
}: {
  onClick: () => void
  tono?: 'claro' | 'oscuro'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Editar"
      title="Editar"
      className={cn(
        'flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all duration-200',
        tono === 'claro'
          ? 'bg-background-surface text-gray-dark ring-1 ring-background-border hover:bg-primary-default hover:text-white hover:ring-primary-default'
          : 'bg-white/15 text-white ring-1 ring-white/25 hover:bg-white hover:text-primary-dark',
        'focus-visible:ring-2 focus-visible:ring-primary-default/50 focus-visible:ring-offset-2 focus-visible:outline-none',
      )}
    >
      <PencilIcon className="h-4 w-4" />
    </button>
  )
}

function SinNorthStar({
  hayPausadas,
  onCrear,
}: {
  hayPausadas: boolean
  onCrear: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-md rounded-xxl border-2 border-dashed border-primary-light bg-primary-lightest/50 px-lg py-lg">
      <span className="flex items-center gap-md">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-default text-white">
          <StarIcon className="h-4 w-4" />
        </span>
        <span className="flex flex-col gap-xxs">
          <span className="text-body font-semibold text-gray-darkest">
            No hay una North Star activa
          </span>
          <span className="text-bodySmall text-gray-medium">
            {hayPausadas
              ? 'Activá una de las pausadas o creá una nueva.'
              : 'Es el número que resume el valor que da el equipo.'}
          </span>
        </span>
      </span>
      <Button
        text="Crear North Star"
        color={colors.primary.default}
        icon={<PlusIcon className="h-4 w-4" />}
        onClick={onCrear}
        size={{ padding: `${spacing.sm} ${spacing.lg}` }}
      />
    </div>
  )
}

// Lo mismo que carga POST /objetivos/propuesta (backend/src/objetivos/catalogo.ts).
const PROPUESTA = {
  nsm: 'Errores resueltos en 48 h · al menos 80 %',
  krs: [
    'Asignar en menos de 4 h',
    'Reprocesos que salen bien · al menos 90 %',
    'Bandeja sin huérfanos · a lo sumo 5 sin responsable',
    'Que no vuelvan · a lo sumo 3 reapariciones',
    'Resolver en menos de 24 h (pausado)',
  ],
}

function SinObjetivos({
  cargando,
  onPropuesta,
  onDeCero,
}: {
  cargando: boolean
  onPropuesta: () => void
  onDeCero: () => void
}) {
  return (
    <Card className="grid grid-cols-1 gap-xl @4xl:grid-cols-[minmax(0,1fr)_24rem] @4xl:items-center">
      <div className="flex flex-col gap-md">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-lightest text-primary-dark">
          <StarIcon className="h-5 w-5" />
        </span>
        <h2 className="text-h3 font-medium text-gray-darkest">
          Definí hacia dónde va el equipo
        </h2>
        <p className="max-w-[60ch] text-body text-gray-medium">
          La <b className="text-gray-dark">North Star</b> resume en un número el
          valor que da el equipo. Los{' '}
          <b className="text-gray-dark">Key Results</b> son los resultados
          concretos que la empujan. Todo se calcula solo con lo que ya registra
          IRIS; vos ponés las metas y elegís cuáles seguir.
        </p>
        <div className="flex flex-wrap gap-sm">
          <Button
            text={cargando ? 'Cargando…' : 'Usar la propuesta'}
            color={colors.primary.default}
            onClick={onPropuesta}
            disabled={cargando}
            size={{ padding: `${spacing.sm} ${spacing.lg}` }}
          />
          <Button
            text="Empezar de cero"
            variant="outline"
            color={colors.gray.medium}
            onClick={onDeCero}
            size={{ padding: `${spacing.sm} ${spacing.lg}` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-sm rounded-xl bg-background-subtle p-md">
        <span className="text-caption font-semibold tracking-wide text-gray-medium uppercase">
          La propuesta
        </span>
        <span className="flex items-center gap-sm rounded-full bg-primary-default py-xs pr-md pl-sm text-bodySmall font-semibold text-white">
          <StarIcon className="h-4 w-4 shrink-0" />
          {PROPUESTA.nsm}
        </span>
        <ul className="flex flex-col gap-xs">
          {PROPUESTA.krs.map((kr) => (
            <li
              key={kr}
              className="flex items-center gap-sm rounded-full bg-background-surface py-xs pr-md pl-sm text-bodySmall text-gray-dark"
            >
              <TargetIcon className="h-4 w-4 shrink-0 text-primary-dark" />
              {kr}
            </li>
          ))}
        </ul>
        <span className="text-caption text-gray-medium">
          Después podés cambiar metas, pausar o agregar las tuyas.
        </span>
      </div>
    </Card>
  )
}

export default Objetivos
