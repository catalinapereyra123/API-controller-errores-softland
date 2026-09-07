/** Un evento de trazabilidad tal como lo muestra la pantalla de Historial. */
export interface HistorialEventoDto {
  id: string;
  /** ISO. El front decide cómo mostrarla. */
  hora: string;
  /** error | asignacion | observacion | reproceso */
  tipo: string;
  titulo: string;
  detalle: string;
  transaccionId: string;
  /** IDENTI de Softland. */
  codigo: string;
  empresa: string;
}

export interface HistorialDiaDto {
  /** yyyy-mm-dd, sirve de key. */
  id: string;
  /** "Hoy", "Ayer" o el día de la semana. */
  etiqueta: string;
  /** dd/mm/yyyy */
  fecha: string;
  eventos: HistorialEventoDto[];
}

export interface HistorialResumenDto {
  periodo: string;
  desde: string;
  resueltos: number;
  reprocesos: number;
  observaciones: number;
  reasignaciones: number;
  dias: HistorialDiaDto[];
}
