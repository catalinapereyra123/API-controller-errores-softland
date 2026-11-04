import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  EventoMetrica,
  Objetivo,
  Prisma,
} from '../../generated/prisma/client';
import { IndicadorObjetivo, TipoObjetivo } from '../../generated/prisma/client';
import { ESTADOS_ABIERTOS, MODULO_LABEL } from '../errores/errores.mapper';
import { PrismaService } from '../prisma/prisma.service';
import { estadoDe, progreso, valorDePeriodo, ventanas } from './calculo';
import {
  CATALOGO,
  INFO_INDICADOR,
  PROPUESTA,
  UMBRAL_HORAS_DEFAULT,
} from './catalogo';
import {
  ActualizarObjetivoDto,
  CrearObjetivoDto,
  ObjetivoDto,
  ObjetivosDto,
} from './dto/objetivos.dto';

type Db = PrismaService | Prisma.TransactionClient;

/**
 * NSM y KR del equipo. Los valores no se guardan: se calculan en cada pedido
 * a partir de los hitos (`EventoMetrica`) y de la bandeja, así una meta nueva
 * ya muestra cómo viene sin esperar a que junte datos.
 */
@Injectable()
export class ObjetivosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(): Promise<ObjetivosDto> {
    const ahora = new Date();
    const objetivos = await this.prisma.objetivo.findMany({
      orderBy: [{ tipo: 'asc' }, { orden: 'asc' }, { createdAt: 'asc' }],
    });

    // Una sola consulta de hitos para todos: desde la ventana anterior del
    // período más largo hasta ahora.
    const masLargo = Math.max(7, ...objetivos.map((o) => o.periodoDias));
    const [eventos, empresas] = await Promise.all([
      this.prisma.eventoMetrica.findMany({
        where: {
          createdAt: { gte: ventanas(masLargo, ahora).anterior.desde },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.empresa.findMany(),
    ]);
    const nombreEmpresa = new Map(empresas.map((e) => [e.codigo, e.nombre]));

    return {
      catalogo: CATALOGO,
      objetivos: await Promise.all(
        objetivos.map((o) => this.calcular(o, eventos, nombreEmpresa, ahora)),
      ),
      calculadoEn: ahora.toISOString(),
    };
  }

  async crear(
    dto: CrearObjetivoDto,
    usuario?: { id: string; nombre: string },
  ): Promise<ObjetivosDto> {
    await this.prisma.$transaction(async (tx) => {
      const datos = await this.normalizar(dto, tx);
      const ultimo = await tx.objetivo.findFirst({
        where: { tipo: datos.tipo },
        orderBy: { orden: 'desc' },
      });
      const creado = await tx.objetivo.create({
        data: {
          ...datos,
          orden: (ultimo?.orden ?? -1) + 1,
          creadoPorId: usuario?.id ?? null,
          creadoPorNombre: usuario?.nombre ?? null,
        },
      });
      await this.unaSolaNsmActiva(creado, tx);
    });
    return this.listar();
  }

  async actualizar(
    id: string,
    dto: ActualizarObjetivoDto,
  ): Promise<ObjetivosDto> {
    await this.prisma.$transaction(async (tx) => {
      const actual = await this.requerir(id, tx);
      // Sólo pisa lo que vino en el body (un PATCH con `activo` no toca el resto).
      const cambios = Object.fromEntries(
        Object.entries(dto).filter(([, valor]) => valor !== undefined),
      );
      const datos = await this.normalizar({ ...actual, ...cambios }, tx, id);
      const guardado = await tx.objetivo.update({ where: { id }, data: datos });

      // Una NSM que pasa a KR deja sueltos a los KR que colgaban de ella.
      if (
        actual.tipo === TipoObjetivo.NSM &&
        guardado.tipo === TipoObjetivo.KR
      ) {
        await tx.objetivo.updateMany({
          where: { padreId: id },
          data: { padreId: null },
        });
      }
      await this.unaSolaNsmActiva(guardado, tx);
    });
    return this.listar();
  }

  async borrar(id: string): Promise<ObjetivosDto> {
    await this.requerir(id);
    await this.prisma.objetivo.delete({ where: { id } });
    return this.listar();
  }

  /** Pausa la NSM y todos los KR; quedan guardados para reactivarlos. */
  async pausarTodo(): Promise<ObjetivosDto> {
    await this.prisma.objetivo.updateMany({
      where: { activo: true },
      data: { activo: false },
    });
    return this.listar();
  }

  /** Borra la NSM y todos los KR: la pantalla vuelve a ofrecer la propuesta. */
  async borrarTodo(): Promise<ObjetivosDto> {
    await this.prisma.objetivo.deleteMany();
    return this.listar();
  }

  /** Carga la NSM y los KR sugeridos. Sólo si todavía no hay ninguno. */
  async cargarPropuesta(usuario?: {
    id: string;
    nombre: string;
  }): Promise<ObjetivosDto> {
    if ((await this.prisma.objetivo.count()) > 0) {
      throw new ConflictException(
        'Ya hay métricas cargadas: la propuesta sólo se usa para arrancar.',
      );
    }
    const autor = {
      creadoPorId: usuario?.id ?? null,
      creadoPorNombre: usuario?.nombre ?? null,
    };
    await this.prisma.$transaction(async (tx) => {
      const nsm = await tx.objetivo.create({
        data: { ...(await this.normalizar(PROPUESTA.nsm, tx)), ...autor },
      });
      for (const [orden, kr] of PROPUESTA.krs.entries()) {
        await tx.objetivo.create({
          data: {
            ...(await this.normalizar({ ...kr, padreId: nsm.id }, tx)),
            ...autor,
            orden,
          },
        });
      }
    });
    return this.listar();
  }

  // -------- Internos --------

  private async requerir(id: string, db: Db = this.prisma) {
    const objetivo = await db.objetivo.findUnique({ where: { id } });
    if (!objetivo) throw new NotFoundException(`No existe la métrica ${id}`);
    return objetivo;
  }

  /**
   * Deja los campos coherentes con el indicador: lo que no aplica va en null
   * (umbral fuera de "a tiempo", filtros en los manuales, padre en una NSM).
   */
  private async normalizar(
    dto: CrearObjetivoDto,
    db: Db,
    id?: string,
  ): Promise<Prisma.ObjetivoUncheckedCreateInput> {
    const info = INFO_INDICADOR.get(dto.indicador)!;
    const esKr = dto.tipo === TipoObjetivo.KR;
    const padreId = esKr ? (dto.padreId ?? null) : null;

    if (padreId) {
      if (padreId === id) {
        throw new BadRequestException('Un KR no puede aportarse a sí mismo.');
      }
      const padre = await db.objetivo.findUnique({ where: { id: padreId } });
      if (!padre || padre.tipo !== TipoObjetivo.NSM) {
        throw new BadRequestException(
          'Un KR sólo puede aportar a una North Star.',
        );
      }
    }

    return {
      tipo: dto.tipo,
      nombre: dto.nombre,
      descripcion: dto.descripcion || null,
      indicador: dto.indicador,
      meta: dto.meta,
      sentido: dto.sentido,
      periodoDias: dto.periodoDias ?? 30,
      umbralHoras: info.usaUmbral
        ? (dto.umbralHoras ?? UMBRAL_HORAS_DEFAULT)
        : null,
      modulo: info.filtrable ? (dto.modulo ?? null) : null,
      empresaCodigo: info.filtrable ? (dto.empresaCodigo ?? null) : null,
      valorManual: info.alcance === 'manual' ? (dto.valorManual ?? null) : null,
      activo: dto.activo ?? true,
      padreId,
    };
  }

  /** Si esta NSM quedó activa, las demás se pausan. */
  private async unaSolaNsmActiva(objetivo: Objetivo, db: Db) {
    if (objetivo.tipo !== TipoObjetivo.NSM || !objetivo.activo) return;
    await db.objetivo.updateMany({
      where: { tipo: TipoObjetivo.NSM, activo: true, id: { not: objetivo.id } },
      data: { activo: false },
    });
  }

  private async calcular(
    o: Objetivo,
    eventos: EventoMetrica[],
    nombreEmpresa: Map<string, string>,
    ahora: Date,
  ): Promise<ObjetivoDto> {
    const info = INFO_INDICADOR.get(o.indicador)!;
    let valor: number | null = null;
    let anterior: number | null = null;

    if (info.alcance === 'manual') {
      valor = o.valorManual;
    } else if (info.alcance === 'ahora') {
      valor = await this.fotoBandeja(o);
    } else {
      const propios = eventos.filter(
        (e) =>
          (!o.modulo || e.modulo === o.modulo) &&
          (!o.empresaCodigo || e.empresaCodigo === o.empresaCodigo),
      );
      const { actual, anterior: previa } = ventanas(o.periodoDias, ahora);
      const opciones = { umbralHoras: o.umbralHoras, ahora };
      valor = valorDePeriodo(o.indicador, propios, actual, opciones);
      anterior = valorDePeriodo(o.indicador, propios, previa, opciones);
    }

    const avance = progreso(valor, o.meta, o.sentido);
    const alcance = [
      o.modulo ? MODULO_LABEL[o.modulo] : null,
      o.empresaCodigo
        ? (nombreEmpresa.get(o.empresaCodigo) ?? o.empresaCodigo)
        : null,
    ].filter(Boolean);

    return {
      id: o.id,
      tipo: o.tipo,
      nombre: o.nombre,
      descripcion: o.descripcion,
      indicador: o.indicador,
      unidad: info.unidad,
      meta: o.meta,
      sentido: o.sentido,
      periodoDias: o.periodoDias,
      umbralHoras: o.umbralHoras,
      modulo: o.modulo,
      empresaCodigo: o.empresaCodigo,
      alcance: alcance.length ? alcance.join(' · ') : null,
      valorManual: o.valorManual,
      activo: o.activo,
      padreId: o.padreId,
      valor,
      anterior,
      progreso: avance,
      estado: estadoDe(avance),
      creadoPorNombre: o.creadoPorNombre,
      actualizadoEn: o.updatedAt.toISOString(),
    };
  }

  /** ABIERTOS / SIN_RESPONSABLE: igual que el "Ahora en la bandeja" de Métricas. */
  private fotoBandeja(o: Objetivo): Promise<number> {
    return this.prisma.transaccionError.count({
      where: {
        estadoApp: { in: ESTADOS_ABIERTOS },
        statusSoftland: { not: 'X' },
        ...(o.modulo ? { modulo: o.modulo } : {}),
        ...(o.empresaCodigo ? { empresaCodigo: o.empresaCodigo } : {}),
        ...(o.indicador === IndicadorObjetivo.SIN_RESPONSABLE
          ? { responsableId: null }
          : {}),
      },
    });
  }
}
