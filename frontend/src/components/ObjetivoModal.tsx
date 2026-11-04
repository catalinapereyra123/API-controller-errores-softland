import { useEffect, useState, type ReactNode } from 'react'
import { MODULOS, SENTIDO_LABEL } from '../constants/objetivos'
import { getEmpresas } from '../services/empresas.service'
import { colors, radius, spacing, textStyles } from '../styles'
import type {
  Empresa,
  IndicadorInfo,
  IndicadorObjetivo,
  Objetivo,
  ObjetivoInput,
  SentidoMeta,
  TipoObjetivo,
} from '../types'
import Button from './Button'
import Dropdown from './Dropdown'
import FormField from './FormField'
import { InfoIcon, TrashIcon } from './icons'
import Modal from './Modal'
import Switch from './Switch'
import Tabs from './Tabs'

interface ObjetivoModalProps {
  open: boolean
  onClose: () => void
  /** null = alta. */
  objetivo: Objetivo | null
  /** Con qué tipo arranca un alta. */
  tipoInicial: TipoObjetivo
  catalogo: IndicadorInfo[]
  /** Las NSM a las que puede aportar un KR. */
  northStars: Objetivo[]
  onGuardar: (input: ObjetivoInput, id?: string) => Promise<unknown>
  onBorrar: (id: string) => Promise<void>
}

const TIPOS = [
  { id: 'NSM', label: 'North Star' },
  { id: 'KR', label: 'Key Result' },
]

const PERIODOS = [
  { id: '7', label: '7 días' },
  { id: '30', label: '30 días' },
  { id: '90', label: '90 días' },
]

const SENTIDOS = (Object.keys(SENTIDO_LABEL) as SentidoMeta[]).map((id) => ({
  id,
  label: SENTIDO_LABEL[id],
}))

const UNIDAD_CAMPO: Record<IndicadorInfo['unidad'], string> = {
  '%': '%',
  h: 'horas',
  errores: 'errores',
  valor: 'valor',
}

/** Los números van como texto mientras se tipean ("4," no es un número todavía). */
interface Formulario {
  tipo: TipoObjetivo
  nombre: string
  descripcion: string
  indicador: IndicadorObjetivo
  meta: string
  sentido: SentidoMeta
  periodoDias: string
  umbralHoras: string
  modulo: string
  empresaCodigo: string
  valorManual: string
  activo: boolean
  padreId: string
}

function formularioDe(
  objetivo: Objetivo | null,
  tipo: TipoObjetivo,
  catalogo: IndicadorInfo[],
  northStars: Objetivo[],
): Formulario {
  if (objetivo) {
    return {
      tipo: objetivo.tipo,
      nombre: objetivo.nombre,
      descripcion: objetivo.descripcion ?? '',
      indicador: objetivo.indicador,
      meta: String(objetivo.meta),
      sentido: objetivo.sentido,
      periodoDias: String(objetivo.periodoDias),
      umbralHoras: objetivo.umbralHoras ? String(objetivo.umbralHoras) : '48',
      modulo: objetivo.modulo ?? '',
      empresaCodigo: objetivo.empresaCodigo ?? '',
      valorManual:
        objetivo.valorManual === null ? '' : String(objetivo.valorManual),
      activo: objetivo.activo,
      padreId: objetivo.padreId ?? '',
    }
  }
  const primero = catalogo[0]
  return {
    tipo,
    nombre: '',
    descripcion: '',
    indicador: primero?.id ?? 'RESUELTOS_A_TIEMPO',
    meta: '',
    sentido: primero?.sentido ?? 'AL_MENOS',
    periodoDias: '30',
    umbralHoras: '48',
    modulo: '',
    empresaCodigo: '',
    valorManual: '',
    activo: true,
    // Un KR nuevo aporta a la North Star activa, si hay.
    padreId: northStars.find((n) => n.activo)?.id ?? '',
  }
}

const aNumero = (texto: string): number | null => {
  const limpio = texto.trim().replace(',', '.')
  if (limpio === '') return null
  const valor = Number(limpio)
  return Number.isFinite(valor) ? valor : null
}

/** Empresas para el filtro: se piden una vez por sesión. */
let empresasGuardadas: Empresa[] | null = null

/**
 * Alta y edición de una North Star o un KR. El form sale de las props al
 * montarse: el padre lo monta con un `key` por métrica para que cada apertura
 * arranque limpia.
 */
function ObjetivoModal({
  open,
  onClose,
  objetivo,
  tipoInicial,
  catalogo,
  northStars,
  onGuardar,
  onBorrar,
}: ObjetivoModalProps) {
  const [form, setForm] = useState<Formulario>(() =>
    formularioDe(objetivo, tipoInicial, catalogo, northStars),
  )
  const [empresas, setEmpresas] = useState<Empresa[]>(empresasGuardadas ?? [])
  const [guardando, setGuardando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const [intentoGuardar, setIntentoGuardar] = useState(false)
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)

  useEffect(() => {
    if (!open || empresasGuardadas) return
    getEmpresas()
      .then((lista) => {
        empresasGuardadas = lista
        setEmpresas(lista)
      })
      .catch(() => {
        // Sin empresas el filtro queda en "Todas": no frena el alta.
      })
  }, [open])

  const info = catalogo.find((i) => i.id === form.indicador)
  const unidad = info?.unidad ?? 'valor'
  const meta = aNumero(form.meta)
  const errorNombre =
    intentoGuardar && form.nombre.trim() === ''
      ? 'Ponele un nombre corto.'
      : undefined
  const errorMeta =
    intentoGuardar && (meta === null || meta < 0)
      ? 'Tiene que ser un número (0 o más).'
      : undefined
  const umbral = aNumero(form.umbralHoras)
  const errorUmbral =
    intentoGuardar &&
    info?.usaUmbral &&
    (umbral === null || umbral < 1 || umbral > 720 || !Number.isInteger(umbral))
      ? 'Horas enteras, entre 1 y 720.'
      : undefined
  const otraNsmActiva = northStars.find(
    (n) => n.activo && n.id !== objetivo?.id,
  )

  const set = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) =>
    setForm((actual) => ({ ...actual, [campo]: valor }))

  function elegirIndicador(id: string) {
    const nuevo = catalogo.find((i) => i.id === id)
    if (!nuevo) return
    setForm((actual) => {
      const anterior = catalogo.find((i) => i.id === actual.indicador)
      // Si el nombre era el del indicador anterior (o nada), sigue al nuevo.
      const nombreAutomatico =
        actual.nombre.trim() === '' || actual.nombre === anterior?.nombre
      return {
        ...actual,
        indicador: nuevo.id,
        sentido: nuevo.sentido,
        nombre: nombreAutomatico ? nuevo.nombre : actual.nombre,
      }
    })
  }

  async function guardar() {
    setIntentoGuardar(true)
    if (!info || form.nombre.trim() === '' || meta === null || meta < 0) return
    if (info.usaUmbral && (umbral === null || errorUmbral)) return

    setGuardando(true)
    setErrorEnvio(null)
    try {
      await onGuardar(
        {
          tipo: form.tipo,
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || null,
          indicador: form.indicador,
          meta,
          sentido: form.sentido,
          periodoDias: Number(form.periodoDias),
          umbralHoras: info.usaUmbral ? umbral : null,
          modulo: info.filtrable
            ? ((form.modulo || null) as ObjetivoInput['modulo'])
            : null,
          empresaCodigo: info.filtrable ? form.empresaCodigo || null : null,
          valorManual:
            info.alcance === 'manual' ? aNumero(form.valorManual) : null,
          activo: form.activo,
          padreId: form.tipo === 'KR' ? form.padreId || null : null,
        },
        objetivo?.id,
      )
      onClose()
    } catch (e) {
      setErrorEnvio(
        e instanceof Error ? e.message : 'No pudimos guardar la métrica.',
      )
    } finally {
      setGuardando(false)
    }
  }

  async function borrar() {
    if (!objetivo) return
    setGuardando(true)
    setErrorEnvio(null)
    try {
      await onBorrar(objetivo.id)
      onClose()
    } catch (e) {
      setErrorEnvio(
        e instanceof Error ? e.message : 'No pudimos eliminar la métrica.',
      )
    } finally {
      setGuardando(false)
    }
  }

  const dropdown = {
    color: colors.background.border,
    textColor: colors.gray.darkest,
    backgroundColor: colors.background.surface,
    size: { padding: `${spacing.md} ${spacing.lg}` },
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={objetivo ? 'Editar métrica' : 'Nueva métrica'}
      maxWidth="600px"
    >
      <form
        className="flex flex-col gap-lg"
        onSubmit={(event) => {
          event.preventDefault()
          void guardar()
        }}
      >
        <Campo
          label="Tipo"
          ayuda={
            form.tipo === 'NSM'
              ? 'El número que resume el valor que da el equipo. Hay una sola activa a la vez.'
              : 'Un resultado concreto que empuja a la North Star.'
          }
        >
          <Tabs
            items={TIPOS}
            value={form.tipo}
            onChange={(id) => set('tipo', id as TipoObjetivo)}
            activeColor={colors.gray.darkest}
            inactiveColor={colors.gray.medium}
            className="self-start"
          />
        </Campo>

        <Campo label="Qué mide">
          <Dropdown
            text="Elegí un indicador"
            options={catalogo.map((i) => ({ value: i.id, label: i.nombre }))}
            value={form.indicador}
            onChange={elegirIndicador}
            {...dropdown}
          />
          {info && (
            <span className="flex gap-sm rounded-xl bg-background-subtle px-md py-sm text-caption text-gray-dark">
              <InfoIcon
                aria-hidden
                className="mt-px h-4 w-4 shrink-0 text-gray-default"
              />
              {info.descripcion}
            </span>
          )}
        </Campo>

        <FormField
          label="Nombre"
          value={form.nombre}
          onChange={(event) => set('nombre', event.target.value)}
          maxLength={80}
          placeholder="p. ej. Asignar en menos de 4 h"
          error={errorNombre}
        />

        <div className="grid grid-cols-1 gap-lg sm:grid-cols-2">
          <Campo label="Meta">
            <Tabs
              items={SENTIDOS}
              value={form.sentido}
              onChange={(id) => set('sentido', id as SentidoMeta)}
              activeColor={colors.gray.darkest}
              inactiveColor={colors.gray.medium}
              className="self-start"
            />
          </Campo>
          <FormField
            label={`Valor de la meta (${UNIDAD_CAMPO[unidad]})`}
            value={form.meta}
            onChange={(event) => set('meta', event.target.value)}
            inputMode="decimal"
            placeholder={unidad === '%' ? '80' : '4'}
            error={errorMeta}
          />
        </div>

        {info?.alcance === 'periodo' && (
          <div className="grid grid-cols-1 gap-lg sm:grid-cols-2">
            <Campo label="Período que se mira">
              <Tabs
                items={PERIODOS}
                value={form.periodoDias}
                onChange={(id) => set('periodoDias', id)}
                activeColor={colors.gray.darkest}
                inactiveColor={colors.gray.medium}
                className="self-start"
              />
            </Campo>
            {info.usaUmbral && (
              <FormField
                label="A tiempo = antes de (horas)"
                value={form.umbralHoras}
                onChange={(event) => set('umbralHoras', event.target.value)}
                inputMode="numeric"
                error={errorUmbral}
              />
            )}
          </div>
        )}

        {info?.alcance === 'manual' && (
          <FormField
            label="Valor actual"
            value={form.valorManual}
            onChange={(event) => set('valorManual', event.target.value)}
            inputMode="decimal"
            ayuda="Lo actualizás editando la métrica. Vacío = sin datos."
          />
        )}

        {info?.filtrable && (
          <div className="grid grid-cols-1 gap-lg sm:grid-cols-2">
            <Campo label="Módulo">
              <Dropdown
                text="Todos los módulos"
                options={[
                  { value: '', label: 'Todos los módulos' },
                  ...MODULOS,
                ]}
                value={form.modulo}
                onChange={(valor) => set('modulo', valor)}
                {...dropdown}
              />
            </Campo>
            <Campo label="Empresa">
              <Dropdown
                text="Todas las empresas"
                options={[
                  { value: '', label: 'Todas las empresas' },
                  ...empresas.map((e) => ({ value: e.id, label: e.nombre })),
                ]}
                value={form.empresaCodigo}
                onChange={(valor) => set('empresaCodigo', valor)}
                {...dropdown}
              />
            </Campo>
          </div>
        )}

        {form.tipo === 'KR' && (
          <Campo label="Aporta a">
            <Dropdown
              text="Ninguna North Star"
              options={[
                { value: '', label: 'Ninguna North Star' },
                ...northStars.map((n) => ({
                  value: n.id,
                  label: n.activo ? n.nombre : `${n.nombre} (pausada)`,
                })),
              ]}
              value={form.padreId}
              onChange={(valor) => set('padreId', valor)}
              {...dropdown}
            />
          </Campo>
        )}

        <Campo label="Por qué importa" opcional>
          <textarea
            value={form.descripcion}
            onChange={(event) => set('descripcion', event.target.value)}
            rows={2}
            maxLength={300}
            placeholder="Una línea para que el equipo sepa qué se busca."
            style={{
              ...textStyles.bodySmall,
              color: colors.gray.darkest,
              borderColor: colors.background.border,
              borderRadius: radius.lg,
            }}
            className="w-full resize-none border p-md outline-none focus:border-primary-default"
          />
        </Campo>

        <div className="flex items-center justify-between gap-md rounded-xl bg-background-subtle px-md py-sm">
          <span className="flex flex-col gap-xxs">
            <span className="text-bodySmall font-semibold text-gray-darkest">
              {form.activo ? 'Activa' : 'Pausada'}
            </span>
            <span className="text-caption text-gray-medium">
              {form.activo && form.tipo === 'NSM' && otraNsmActiva
                ? `Al guardar se pausa "${otraNsmActiva.nombre}".`
                : form.activo
                  ? 'Se muestra arriba, con su avance.'
                  : 'Queda guardada en "Pausadas" sin seguimiento.'}
            </span>
          </span>
          <Switch
            checked={form.activo}
            onChange={(activo) => set('activo', activo)}
            label={form.activo ? 'Pausar' : 'Activar'}
          />
        </div>

        {errorEnvio && (
          <p
            role="alert"
            className="rounded-xl bg-label-red-background px-md py-sm text-bodySmall font-semibold text-label-red-text"
          >
            {errorEnvio}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-sm">
          {objetivo ? (
            confirmarBorrado ? (
              <span className="flex flex-wrap items-center gap-xs text-bodySmall text-gray-dark">
                ¿Eliminarla?
                <Button
                  text="Sí, eliminar"
                  color={colors.status.error}
                  onClick={() => void borrar()}
                  disabled={guardando}
                  size={{ padding: `${spacing.xs} ${spacing.md}` }}
                />
                <Button
                  text="No"
                  variant="text"
                  color={colors.gray.medium}
                  onClick={() => setConfirmarBorrado(false)}
                  size={{ padding: `${spacing.xs} ${spacing.sm}` }}
                />
              </span>
            ) : (
              <Button
                text="Eliminar"
                variant="text"
                color={colors.status.error}
                icon={<TrashIcon className="h-4 w-4" />}
                onClick={() => setConfirmarBorrado(true)}
                size={{ padding: `${spacing.xs} ${spacing.sm}` }}
              />
            )
          ) : (
            <span />
          )}
          <span className="flex gap-sm">
            <Button
              text="Cancelar"
              variant="outline"
              color={colors.gray.medium}
              onClick={onClose}
              size={{ padding: `${spacing.sm} ${spacing.lg}` }}
            />
            <Button
              type="submit"
              text={guardando ? 'Guardando…' : objetivo ? 'Guardar' : 'Crear'}
              color={colors.primary.default}
              disabled={guardando}
              size={{ padding: `${spacing.sm} ${spacing.lg}` }}
            />
          </span>
        </div>
      </form>
    </Modal>
  )
}

function Campo({
  label,
  ayuda,
  opcional = false,
  children,
}: {
  label: string
  ayuda?: string
  opcional?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-xs">
      <span className="text-bodySmall font-semibold text-gray-darkest">
        {label}
        {opcional && (
          <span className="font-normal text-gray-medium"> · opcional</span>
        )}
      </span>
      {children}
      {ayuda && <span className="text-caption text-gray-medium">{ayuda}</span>}
    </div>
  )
}

export default ObjetivoModal
