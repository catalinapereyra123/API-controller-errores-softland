import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, TransaccionError } from '../../generated/prisma/client';
import { EstadoApp, Modulo } from '../../generated/prisma/client';
import {
  AsignarDto,
  CambiarEstadoDto,
  CrearObservacionDto,
  SolicitarReprocesoDto,
} from './dto/mutaciones.dto';
import { ResultadoReprocesoDto } from './dto/resultado-reproceso.dto';
import { SyncErrorDto } from './dto/sync-error.dto';
import {
  ResultadoReprocesoResultadoDto,
  SyncResultadoDto,
} from './dto/sync-resultado.dto';
import { QueryErroresDto } from './dto/query-errores.dto';
import { ErroresRepository } from './errores.repository';
import {
  ErrorTransaccionDto,
  ESTADO_LABEL,
  ESTADOS_ABIERTOS,
  ESTADOS_MANUALES,
  MODULO_LABEL,
  extractArchivoLog,
  parseModulo,
  statusEsError,
  tipoEventoPorEstado,
  toErrorTransaccion,
} from './errores.mapper';

const ORDEN_MODULOS: Modulo[] = [
  Modulo.FACTURACION,
  Modulo.COMPRAS,
  Modulo.COBRANZAS,
];

@Injectable()
export class ErroresService {
  private readonly logger = new Logger(ErroresService.name);

  constructor(private readonly repo: ErroresRepository) {}

  // ==========================================================================
  //  FLUJO 1 — SYNC (n8n manda TODOS los errores en un POST, cada 3 h)
  // ==========================================================================
  async sync(
    registros: SyncErrorDto[],
    empresasConsultadas: string[] = [],
  ): Promise<SyncResultadoDto> {
    const empresas = new Map<string, string>();
    for (const r of registros) {
      empresas.set(r.empresa, r.empresaNombre ?? r.empresa);
    }
    const empresaCodigos = [
      ...new Set([
        ...empresasConsultadas.map((codigo) => codigo.trim()).filter(Boolean),
        ...empresas.keys(),
      ]),
    ];

    let creados = 0;
    let actualizados = 0;
    let reaparecidos = 0;
    let reprocesadosOk = 0;
    let regresiones = 0;
    let reprocesandoSinConfirmar = 0;
    let desaparecidos = 0;
    const detalleIgnorados: SyncResultadoDto['detalleIgnorados'] = [];

    await this.repo.transaction(async (tx) => {
      for (const [codigo, nombre] of empresas) {
        await this.repo.upsertEmpresa(codigo, nombre, tx);
      }

      // Todo lo de estas empresas pasa a "no visto"; abajo se re-marca lo que llegó.
      await this.repo.marcarNoPresentes(empresaCodigos, tx);

      for (const r of registros) {
        let modulo: Modulo;
        try {
          modulo = parseModulo(r.modulo);
        } catch {
          detalleIgnorados.push({
            identi: r.identi,
            empresa: r.empresa,
            motivo: `Módulo no reconocido: "${r.modulo}"`,
          });
          continue;
        }

        const ahora = new Date();
        const fechaMovimiento = r.fecha ? new Date(r.fecha) : null;
        const archivoLog = extractArchivoLog(r.error);

        const existente = await this.repo.buscarPorOrigen(
          r.empresa,
          modulo,
          r.identi,
          tx,
        );

        if (!existente) {
          const creado = await this.repo.crearTransaccion(
            {
              empresa: { connect: { codigo: r.empresa } },
              modulo,
              moduloOrigen: r.modulo,
              identi: r.identi,
              cuenta: r.cuenta ?? null,
              fechaMovimiento,
              statusSoftland: r.statusSoftland,
              errorMensaje: r.error ?? null,
              archivoLog,
              fechaDeteccion: ahora,
              ultimaDeteccion: ahora,
              presenteEnUltimaSync: true,
            },
            tx,
          );
          await this.repo.crearEvento(
            {
              transaccionId: creado.id,
              tipo: 'error',
              titulo: 'Error detectado',
              detalle: `Status Softland: ${r.statusSoftland}`,
            },
            tx,
          );
          creados++;
          continue;
        }

        const enReproceso = existente.estadoApp === EstadoApp.REPROCESANDO;
        const estabaResuelto = existente.estadoApp === EstadoApp.RESUELTO;
        const esError = statusEsError(r.statusSoftland);
        const esOk = r.statusSoftland === 'S';

        const data: Prisma.TransaccionErrorUpdateInput = {
          moduloOrigen: r.modulo,
          cuenta: r.cuenta ?? null,
          fechaMovimiento,
          statusSoftland: r.statusSoftland,
          errorMensaje: r.error ?? null,
          archivoLog,
          ultimaDeteccion: ahora,
          presenteEnUltimaSync: true,
        };
        let evento: { tipo: string; titulo: string; detalle: string } | null =
          null;

        if (enReproceso && esOk) {
          data.estadoApp = EstadoApp.RESUELTO;
          data.fechaResolucion = ahora;
          evento = {
            tipo: 'reproceso',
            titulo: 'Reproceso confirmado',
            detalle: 'Softland procesó la transacción (status S).',
          };
          await this.cerrarIntentoAbierto(existente.id, 'S', tx);
          reprocesadosOk++;
        } else if (enReproceso && esError) {
          data.estadoApp = EstadoApp.REQUIERE_CORRECCION;
          evento = {
            tipo: 'error',
            titulo: 'El reproceso no resolvió el error',
            detalle: `Volvió a status ${r.statusSoftland}.`,
          };
          await this.cerrarIntentoAbierto(existente.id, r.statusSoftland, tx);
          regresiones++;
        } else if (estabaResuelto && esError) {
          data.estadoApp = EstadoApp.ERROR;
          data.fechaResolucion = null;
          evento = {
            tipo: 'error',
            titulo: 'El error volvió a aparecer en Softland',
            detalle: `Status Softland: ${r.statusSoftland}`,
          };
          reaparecidos++;
        } else {
          // en cola (N), excluida sin reproceso, o simple refresco de datos
          actualizados++;
        }

        await this.repo.actualizarTransaccion(existente.id, data, tx);
        if (evento) {
          await this.repo.crearEvento(
            { transaccionId: existente.id, ...evento },
            tx,
          );
        }
      }

      // Reproceso en curso cuyo error ya no figura en el feed. NO se resuelve
      // solo: desaparecer del listado de errores no prueba status S (pudo pasar
      // a N u otro estado fuera del WHERE). Es una ALARMA; la verdad la trae el
      // flujo 4 (POST /errores/resultado-reproceso) consultando el IDENTI.
      for (const t of await this.repo.reprocesandoDesaparecidos(
        empresaCodigos,
        tx,
      )) {
        await this.repo.actualizarTransaccion(
          t.id,
          { reprocesoDesaparecioAt: new Date() },
          tx,
        );
        await this.repo.crearEvento(
          {
            transaccionId: t.id,
            tipo: 'reproceso',
            titulo: 'El error dejó de figurar en Softland',
            detalle:
              'Sin confirmación de reproceso. Verificar el IDENTI (flujo 4).',
          },
          tx,
        );
        reprocesandoSinConfirmar++;
      }

      desaparecidos = await this.repo.contarDesaparecidos(empresaCodigos, tx);
    });

    const resultado: SyncResultadoDto = {
      recibidos: registros.length,
      empresas: empresaCodigos.length,
      creados,
      actualizados,
      reaparecidos,
      reprocesadosOk,
      regresiones,
      reprocesandoSinConfirmar,
      ignorados: detalleIgnorados.length,
      desaparecidos,
      detalleIgnorados,
      procesadoEn: new Date().toISOString(),
    };

    this.logger.log(
      `Sync: ${resultado.recibidos} recibidos · ${creados} nuevos · ${actualizados} act. · ${reaparecidos} reaparecidos · ${reprocesadosOk} reproc. OK · ${regresiones} regresiones · ${reprocesandoSinConfirmar} alarmas · ${resultado.ignorados} ignorados`,
    );

    return resultado;
  }

  // ==========================================================================
  //  FLUJO 2 — REPROCESAR (acción de la app: guarda y avisa a n8n)
  // ==========================================================================
  async solicitarReproceso(id: string, dto: SolicitarReprocesoDto) {
    const t = await this.requerir(id);
    const autor = await this.resolverAutor(dto.autorId);
    const numeroIntento = t.intentos + 1;

    await this.repo.transaction(async (tx) => {
      await this.repo.actualizarTransaccion(
        id,
        {
          estadoApp: EstadoApp.REPROCESANDO,
          ...(autor.id
            ? { corregidoPor: { connect: { id: autor.id } } }
            : { corregidoPor: { disconnect: true } }),
          corregidoPorNombre: autor.nombre,
          fechaCorreccion: new Date(),
          reprocesoNotificadoAt: null,
          reprocesoDesaparecioAt: null,
          intentos: { increment: 1 },
        },
        tx,
      );
      await this.repo.crearIntento(
        {
          errorId: id,
          numeroIntento,
          statusAntes: t.statusSoftland,
          usuarioId: autor.id,
          usuarioNombre: autor.nombre,
          observacion: dto.observacion ?? null,
        },
        tx,
      );
      await this.repo.crearEvento(
        {
          transaccionId: id,
          tipo: 'reproceso',
          titulo: `Reproceso solicitado (intento ${numeroIntento})`,
          detalle: [dto.observacion, `Por ${autor.nombre}`]
            .filter(Boolean)
            .join(' · '),
        },
        tx,
      );
      if (dto.observacion) {
        await this.repo.crearObservacion(
          {
            transaccionId: id,
            autor: autor.nombre,
            autorIniciales: autor.iniciales,
            texto: dto.observacion,
          },
          tx,
        );
      }
    });

    const notificado = await this.notificarN8nReproceso(t);
    if (notificado) {
      await this.repo.actualizarTransaccion(id, {
        reprocesoNotificadoAt: new Date(),
      });
    }

    return { ...(await this.detalle(id)), reprocesoNotificado: notificado };
  }

  /** Lista para que n8n levante qué reprocesar (fallback del webhook). */
  async reprocesoPendientes() {
    const items = await this.repo.listar({ estadoApp: EstadoApp.REPROCESANDO });
    return items.map((t) => ({
      id: t.id,
      empresa: t.empresaCodigo,
      modulo: t.modulo,
      moduloOrigen: t.moduloOrigen,
      identi: t.identi,
      solicitadoEn: t.fechaCorreccion?.toISOString() ?? null,
      notificado: t.reprocesoNotificadoAt !== null,
      intentos: t.intentos,
    }));
  }

  // ==========================================================================
  //  FLUJO 4 — VERIFICAR RESULTADO (n8n consulta Softland y lo reporta acá)
  // ==========================================================================
  async registrarResultadoReproceso(
    dto: ResultadoReprocesoDto,
  ): Promise<ResultadoReprocesoResultadoDto> {
    const modulo = parseModulo(dto.modulo);
    const t = await this.repo.buscarPorOrigen(dto.empresa, modulo, dto.identi);
    if (!t) {
      throw new NotFoundException(
        `No existe el error ${dto.empresa} / ${dto.modulo} / ${dto.identi}`,
      );
    }

    if (dto.statusSoftland === 'N') {
      return {
        ok: true,
        estadoApp: t.estadoApp,
        statusSoftland: 'N',
        mensaje: 'Sigue en cola (status N), sin cambios.',
      };
    }

    const esOk = dto.statusSoftland === 'S';
    const data: Prisma.TransaccionErrorUpdateInput = {
      statusSoftland: dto.statusSoftland,
    };
    let evento: { tipo: string; titulo: string; detalle: string };

    if (esOk) {
      data.estadoApp = EstadoApp.RESUELTO;
      data.fechaResolucion = new Date();
      data.reprocesoDesaparecioAt = null;
      evento = {
        tipo: 'reproceso',
        titulo: 'Reproceso confirmado',
        detalle: 'n8n verificó status S en Softland.',
      };
    } else {
      data.estadoApp = EstadoApp.REQUIERE_CORRECCION;
      data.errorMensaje = dto.error ?? t.errorMensaje;
      data.reprocesoDesaparecioAt = null;
      evento = {
        tipo: 'error',
        titulo: 'El reproceso no resolvió el error',
        detalle: `Volvió a status ${dto.statusSoftland}.`,
      };
    }

    await this.repo.transaction(async (tx) => {
      await this.repo.actualizarTransaccion(t.id, data, tx);
      await this.cerrarIntentoAbierto(t.id, dto.statusSoftland, tx);
      await this.repo.crearEvento({ transaccionId: t.id, ...evento }, tx);
    });

    return {
      ok: true,
      estadoApp: esOk ? EstadoApp.RESUELTO : EstadoApp.REQUIERE_CORRECCION,
      statusSoftland: dto.statusSoftland,
      mensaje: esOk
        ? 'Marcado como RESUELTO.'
        : 'Marcado como REQUIERE_CORRECCION.',
    };
  }

  // ==========================================================================
  //  LECTURA (la consume el front)
  // ==========================================================================

  /** Bandeja plana: lista de errores (tipo `ErrorTransaccion` del front). */
  async listar(query: QueryErroresDto): Promise<ErrorTransaccionDto[]> {
    const items = await this.repo.listar(this.buildWhere(query));
    return items.map(toErrorTransaccion);
  }

  /** Errores separados por empresa y, dentro de cada una, por módulo. */
  async agrupadoPorEmpresa(query: QueryErroresDto) {
    const items = await this.repo.listar(this.buildWhere(query));

    const porEmpresa = new Map<
      string,
      {
        empresa: { id: string; nombre: string };
        modulos: Map<Modulo, ErrorTransaccionDto[]>;
      }
    >();

    for (const t of items) {
      if (!porEmpresa.has(t.empresaCodigo)) {
        porEmpresa.set(t.empresaCodigo, {
          empresa: {
            id: t.empresaCodigo,
            nombre: t.empresa?.nombre ?? t.empresaCodigo,
          },
          modulos: new Map(),
        });
      }
      const grupo = porEmpresa.get(t.empresaCodigo)!;
      const lista = grupo.modulos.get(t.modulo) ?? [];
      lista.push(toErrorTransaccion(t));
      grupo.modulos.set(t.modulo, lista);
    }

    return [...porEmpresa.values()]
      .map((grupo) => {
        const totalesPorModulo = Object.fromEntries(
          ORDEN_MODULOS.map((m) => [m, grupo.modulos.get(m)?.length ?? 0]),
        ) as Record<Modulo, number>;

        return {
          empresa: grupo.empresa,
          totalErrores: [...grupo.modulos.values()].reduce(
            (acc, l) => acc + l.length,
            0,
          ),
          totalesPorModulo,
          modulos: ORDEN_MODULOS.filter((m) => grupo.modulos.has(m)).map(
            (m) => ({
              modulo: m,
              label: MODULO_LABEL[m],
              totalErrores: grupo.modulos.get(m)!.length,
              errores: grupo.modulos.get(m)!,
            }),
          ),
        };
      })
      .sort((a, b) => a.empresa.nombre.localeCompare(b.empresa.nombre));
  }

  async detalle(id: string) {
    const t = await this.repo.obtener(id);
    if (!t) throw new NotFoundException(`No existe el error ${id}`);
    return {
      ...toErrorTransaccion(t),
      observaciones: t.observaciones.map((o) => ({
        id: o.id,
        autor: o.autor,
        iniciales: o.autorIniciales,
        hace: o.createdAt.toISOString(),
        texto: o.texto,
      })),
      trazabilidad: t.eventos.map((e) => ({
        id: e.id,
        hora: e.createdAt.toISOString(),
        titulo: e.titulo,
        detalle: e.detalle ?? '',
        tipo: e.tipo,
      })),
      intentos: t.intentosReproceso.map((i) => ({
        id: i.id,
        numeroIntento: i.numeroIntento,
        statusAntes: i.statusAntes,
        statusDespues: i.statusDespues,
        usuarioId: i.usuarioId,
        usuario: i.usuarioNombre,
        observacion: i.observacion,
        fecha: i.createdAt.toISOString(),
        cerradoAt: i.cerradoAt ? i.cerradoAt.toISOString() : null,
      })),
    };
  }

  async empresas(): Promise<{ id: string; nombre: string }[]> {
    const empresas = await this.repo.listarEmpresas();
    return empresas.map((e) => ({ id: e.codigo, nombre: e.nombre }));
  }

  // ==========================================================================
  //  MUTACIONES (desde la app: se guardan en la DB, no vienen de n8n)
  // ==========================================================================

  async asignar(id: string, dto: AsignarDto) {
    const t = await this.requerir(id);
    const autor = await this.resolverAutor(dto.autorId);
    const responsable = dto.responsableId
      ? await this.repo.buscarUsuario(dto.responsableId)
      : null;
    if (dto.responsableId && !responsable) {
      throw new NotFoundException(`No existe el usuario ${dto.responsableId}`);
    }

    await this.repo.transaction(async (tx) => {
      await this.repo.actualizarTransaccion(
        id,
        {
          responsable: responsable
            ? { connect: { id: responsable.id } }
            : { disconnect: true },
          ...(responsable && t.estadoApp === EstadoApp.ERROR
            ? { estadoApp: EstadoApp.ASIGNADO }
            : {}),
          ...(!responsable && t.estadoApp === EstadoApp.ASIGNADO
            ? { estadoApp: EstadoApp.ERROR }
            : {}),
        },
        tx,
      );
      await this.repo.crearEvento(
        {
          transaccionId: id,
          tipo: 'asignacion',
          titulo: responsable
            ? `Asignado a ${responsable.nombre}`
            : 'Se quitó el responsable',
          detalle: `Por ${autor.nombre}`,
        },
        tx,
      );
    });

    return this.detalle(id);
  }

  async cambiarEstado(id: string, dto: CambiarEstadoDto) {
    if (!ESTADOS_MANUALES.includes(dto.estado)) {
      throw new BadRequestException(
        `El estado ${dto.estado} lo controla el flujo de reproceso, no se setea a mano. ` +
          `Manuales: ${ESTADOS_MANUALES.join(', ')}.`,
      );
    }

    const t = await this.requerir(id);
    const autor = await this.resolverAutor(dto.autorId);

    const data: Prisma.TransaccionErrorUpdateInput = { estadoApp: dto.estado };
    // Reabrir un RESUELTO a mano (p. ej. a EN_PROGRESO) limpia la resolución.
    if (t.estadoApp === EstadoApp.RESUELTO) data.fechaResolucion = null;

    await this.repo.transaction(async (tx) => {
      await this.repo.actualizarTransaccion(id, data, tx);
      await this.repo.crearEvento(
        {
          transaccionId: id,
          tipo: tipoEventoPorEstado(dto.estado),
          titulo: `Estado: ${ESTADO_LABEL[dto.estado]}`,
          detalle: [dto.nota, `Por ${autor.nombre}`]
            .filter(Boolean)
            .join(' · '),
        },
        tx,
      );
    });

    return this.detalle(id);
  }

  async agregarObservacion(id: string, dto: CrearObservacionDto) {
    await this.requerir(id);
    const autor = await this.resolverAutor(dto.autorId);

    await this.repo.transaction(async (tx) => {
      await this.repo.crearObservacion(
        {
          transaccionId: id,
          autor: autor.nombre,
          autorIniciales: autor.iniciales,
          texto: dto.texto,
        },
        tx,
      );
      await this.repo.crearEvento(
        {
          transaccionId: id,
          tipo: 'observacion',
          titulo: 'Observación agregada',
          detalle: `Por ${autor.nombre}`,
        },
        tx,
      );
    });

    return this.detalle(id);
  }

  // ==========================================================================
  //  DASHBOARD
  // ==========================================================================
  async dashboard() {
    const abiertoWhere: Prisma.TransaccionErrorWhereInput = {
      estadoApp: { in: ESTADOS_ABIERTOS },
    };
    const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);

    const [
      porEstado,
      erroresAbiertos,
      sinResponsable,
      nuevos24h,
      resueltosHoy,
      resueltosPromedio,
    ] = await Promise.all([
      this.repo.contarPorEstado(),
      this.repo.contar(abiertoWhere),
      this.repo.contar({ ...abiertoWhere, responsableId: null }),
      this.repo.contar({ ...abiertoWhere, fechaDeteccion: { gte: hace24h } }),
      this.repo.resueltosDesde(inicioHoy),
      this.repo.resueltosParaPromedio(),
    ]);

    const conteo = (estado: EstadoApp) =>
      porEstado.find((p) => p.estadoApp === estado)?._count._all ?? 0;

    const promedioMin = resueltosPromedio.length
      ? Math.round(
          resueltosPromedio.reduce(
            (acc, r) =>
              acc +
              (r.fechaResolucion!.getTime() - r.fechaDeteccion.getTime()) /
                60000,
            0,
          ) / resueltosPromedio.length,
        )
      : 0;

    return {
      erroresAbiertos,
      erroresAbiertosDelta: nuevos24h,
      pendientesReproceso: conteo(EstadoApp.REPROCESANDO),
      resueltosHoy: resueltosHoy.length,
      resueltosHoyDelta: 0,
      sinResponsable,
      tiempoPromedioResolucionMinutos: promedioMin,
      tiempoPromedioResolucionDeltaMinutos: 0,
      bandejaPendientes: sinResponsable,
    };
  }

  // ==========================================================================
  private async cerrarIntentoAbierto(
    errorId: string,
    statusDespues: string,
    tx: Prisma.TransactionClient,
  ) {
    const intento = await this.repo.intentoAbierto(errorId, tx);
    if (intento) {
      await this.repo.cerrarIntento(
        intento.id,
        { statusDespues, cerradoAt: new Date() },
        tx,
      );
    }
  }

  private async notificarN8nReproceso(t: TransaccionError): Promise<boolean> {
    const url = process.env.N8N_REPROCESO_WEBHOOK_URL?.trim();
    if (!url) {
      this.logger.warn(
        'N8N_REPROCESO_WEBHOOK_URL no configurada: el reproceso queda para que n8n lo levante por GET /errores/reproceso-pendientes.',
      );
      return false;
    }
    const apiKey = process.env.INGEST_API_KEY?.trim();
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {}),
        },
        body: JSON.stringify({
          empresa: t.empresaCodigo,
          modulo: t.moduloOrigen,
          moduloCodigo: t.modulo,
          identi: t.identi,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        this.logger.error(
          `n8n respondió ${res.status} al reproceso de ${t.identi}.`,
        );
        return false;
      }
      return true;
    } catch (e) {
      this.logger.error(
        `No se pudo avisar a n8n el reproceso de ${t.identi}: ${String(e)}`,
      );
      return false;
    }
  }

  private async requerir(id: string) {
    const t = await this.repo.obtenerBasico(id);
    if (!t) throw new NotFoundException(`No existe el error ${id}`);
    return t;
  }

  private async resolverAutor(autorId?: string) {
    if (autorId) {
      const u = await this.repo.buscarUsuario(autorId);
      if (u) {
        return {
          id: u.id as string | null,
          nombre: u.nombre,
          iniciales: u.avatarIniciales,
        };
      }
    }
    return { id: null as string | null, nombre: 'Sistema', iniciales: 'SYS' };
  }

  private buildWhere(
    query: QueryErroresDto,
  ): Prisma.TransaccionErrorWhereInput {
    const where: Prisma.TransaccionErrorWhereInput = {};

    if (query.empresa) where.empresaCodigo = query.empresa;
    if (query.modulo) where.modulo = query.modulo;

    if (query.estado) {
      where.estadoApp = query.estado;
    } else if (query.soloAbiertos !== 'false') {
      where.estadoApp = { in: ESTADOS_ABIERTOS };
    }

    if (query.responsableId === 'sin-asignar') {
      where.responsableId = null;
    } else if (query.responsableId) {
      where.responsableId = query.responsableId;
    }

    return where;
  }
}
