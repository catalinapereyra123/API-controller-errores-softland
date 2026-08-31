import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Modulo, Prisma } from '../../generated/prisma/client';
import { ESTADOS_ABIERTOS } from './errores.mapper';

type Db = PrismaService | Prisma.TransactionClient;

/**
 * Acceso a datos de la bandeja de errores. Todo lo que toca la base pasa
 * por acá; el service no conoce Prisma directamente.
 */
@Injectable()
export class ErroresRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Ejecuta un bloque dentro de una transacción de base. */
  transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  // ---------- Sync (flujo 1) ----------

  upsertEmpresa(codigo: string, nombre: string, db: Db = this.prisma) {
    return db.empresa.upsert({
      where: { codigo },
      create: { codigo, nombre },
      update: { nombre },
    });
  }

  /** Marca como "no vista" toda transacción de las empresas indicadas. */
  marcarNoPresentes(empresaCodigos: string[], tx: Prisma.TransactionClient) {
    return tx.transaccionError.updateMany({
      where: { empresaCodigo: { in: empresaCodigos } },
      data: { presenteEnUltimaSync: false },
    });
  }

  buscarPorOrigen(
    empresaCodigo: string,
    modulo: Modulo,
    identi: string,
    db: Db = this.prisma,
  ) {
    return db.transaccionError.findUnique({
      where: { origenUnico: { empresaCodigo, modulo, identi } },
    });
  }

  crearTransaccion(
    data: Prisma.TransaccionErrorCreateInput,
    db: Db = this.prisma,
  ) {
    return db.transaccionError.create({ data });
  }

  actualizarTransaccion(
    id: string,
    data: Prisma.TransaccionErrorUpdateInput,
    db: Db = this.prisma,
  ) {
    return db.transaccionError.update({ where: { id }, data });
  }

  crearEvento(
    data: Prisma.EventoTrazabilidadUncheckedCreateInput,
    db: Db = this.prisma,
  ) {
    return db.eventoTrazabilidad.create({ data });
  }

  crearObservacion(
    data: Prisma.ObservacionUncheckedCreateInput,
    db: Db = this.prisma,
  ) {
    return db.observacion.create({ data });
  }

  crearIntento(
    data: Prisma.ErrorIntentoUncheckedCreateInput,
    db: Db = this.prisma,
  ) {
    return db.errorIntento.create({ data });
  }

  /** Último intento de reproceso sin resultado todavía. */
  intentoAbierto(errorId: string, db: Db = this.prisma) {
    return db.errorIntento.findFirst({
      where: { errorId, cerradoAt: null },
      orderBy: { numeroIntento: 'desc' },
    });
  }

  cerrarIntento(
    id: string,
    data: Prisma.ErrorIntentoUpdateInput,
    db: Db = this.prisma,
  ) {
    return db.errorIntento.update({ where: { id }, data });
  }

  contarDesaparecidos(empresaCodigos: string[], tx: Prisma.TransactionClient) {
    return tx.transaccionError.count({
      where: {
        empresaCodigo: { in: empresaCodigos },
        presenteEnUltimaSync: false,
        estadoApp: { in: ESTADOS_ABIERTOS.filter((e) => e !== 'REPROCESANDO') },
      },
    });
  }

  /**
   * Reprocesos en curso que dejaron de figurar en el feed y todavía no se
   * marcaron como alarma. NO se resuelven acá (lo confirma el flujo 4).
   */
  reprocesandoDesaparecidos(
    empresaCodigos: string[],
    tx: Prisma.TransactionClient,
  ) {
    return tx.transaccionError.findMany({
      where: {
        empresaCodigo: { in: empresaCodigos },
        estadoApp: 'REPROCESANDO',
        presenteEnUltimaSync: false,
        reprocesoDesaparecioAt: null,
      },
    });
  }

  // ---------- Lectura ----------

  obtenerBasico(id: string) {
    return this.prisma.transaccionError.findUnique({ where: { id } });
  }

  buscarUsuario(id: string) {
    return this.prisma.usuario.findUnique({ where: { id } });
  }

  listar(where: Prisma.TransaccionErrorWhereInput) {
    return this.prisma.transaccionError.findMany({
      where,
      include: { responsable: true, empresa: true },
      orderBy: { fechaDeteccion: 'desc' },
    });
  }

  obtener(id: string) {
    return this.prisma.transaccionError.findUnique({
      where: { id },
      include: {
        responsable: true,
        empresa: true,
        observaciones: { orderBy: { createdAt: 'asc' } },
        eventos: { orderBy: { createdAt: 'asc' } },
        intentosReproceso: { orderBy: { numeroIntento: 'asc' } },
      },
    });
  }

  listarEmpresas() {
    return this.prisma.empresa.findMany({ orderBy: { nombre: 'asc' } });
  }

  contarPorEstado(where: Prisma.TransaccionErrorWhereInput = {}) {
    return this.prisma.transaccionError.groupBy({
      by: ['estadoApp'],
      where,
      _count: { _all: true },
    });
  }

  contar(where: Prisma.TransaccionErrorWhereInput) {
    return this.prisma.transaccionError.count({ where });
  }

  resueltosDesde(fecha: Date) {
    return this.prisma.transaccionError.findMany({
      where: { estadoApp: 'RESUELTO', fechaResolucion: { gte: fecha } },
      select: { fechaDeteccion: true, fechaResolucion: true },
    });
  }

  resueltosParaPromedio() {
    return this.prisma.transaccionError.findMany({
      where: { estadoApp: 'RESUELTO', fechaResolucion: { not: null } },
      select: { fechaDeteccion: true, fechaResolucion: true },
    });
  }
}
